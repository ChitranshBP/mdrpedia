import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { isValidEmail, getClientIP } from "../../lib/utils";
import { uploadPrivateDocument } from "../../lib/cloudinary";
import { lookupNPI } from "../../lib/npi-registry";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from "../../lib/rate-limit";
import { sniffFileType } from "../../lib/file-sniff";
import crypto from "crypto";

export const prerender = false;

// Raised from 64KB to admit a verification document alongside the fields.
const MAX_BODY_SIZE = 11 * 1024 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
];

/**
 * Claim requests are stored in the same review queue as suggested edits, under a
 * reserved field name, so admins triage them in one place. Nothing here mutates
 * the profile itself — a claim only ever creates a PENDING record.
 */
const CLAIM_FIELD = "__claim_request";

const REGISTRIES = ["NMC", "SMC", "NPI", "GMC", "OTHER"] as const;
type Registry = (typeof REGISTRIES)[number];

interface RegistryCheck {
    source: string;
    found: boolean;
    name_match?: boolean;
    status?: string;
    registered_name?: string;
}

const lastName = (name: string) =>
    name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z\s-]/g, " ").trim().split(/\s+/).pop() ?? "";

/**
 * US NPIs are checked against NPPES so reviewers see the result next to the
 * claim. Other registries (NMC/SMC, GMC) have no open API and are checked by hand.
 */
async function checkRegistry(registry: Registry, number: string, profileName: string): Promise<RegistryCheck | null> {
    if (registry !== "NPI" || !/^\d{10}$/.test(number)) return null;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    const npi = await Promise.race([lookupNPI(number), timeout]).catch(() => null);
    if (!npi) return { source: "NPPES", found: false };
    const registered = `${npi.firstName} ${npi.lastName}`.trim();
    return {
        source: "NPPES",
        found: true,
        status: npi.status,
        registered_name: registered,
        name_match: lastName(registered) !== "" && lastName(registered) === lastName(profileName),
    };
}

function hashIp(address: string | undefined) {
    const salt = import.meta.env.IP_HASH_SALT ?? "";
    return crypto
        .createHash("sha256")
        .update(`${salt}:${address || "unknown"}`)
        .digest("hex")
        .slice(0, 32);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const rate = checkRateLimit(getClientIdentifier(request, clientAddress), RATE_LIMITS.submission);
    if (!rate.allowed) return rateLimitResponse(rate.resetTime);

    try {
        const contentLength = parseInt(request.headers.get("content-length") || "0");
        if (contentLength > MAX_BODY_SIZE) {
            return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413 });
        }

        // The form posts multipart so the verification document actually
        // reaches the server. JSON is still accepted for API callers.
        const contentType = request.headers.get("content-type") || "";
        const isMultipart = contentType.includes("multipart/form-data");

        let data: Record<string, unknown>;
        let documentFile: File | null = null;

        if (isMultipart) {
            const form = await request.formData();
            data = Object.fromEntries(
                [...form.entries()].filter(([, v]) => typeof v === "string"),
            );
            data.honeypot_filled = data.honeypot_filled === "true";
            const candidate = form.get("document");
            if (candidate instanceof File && candidate.size > 0) {
                documentFile = candidate;
            }
        } else {
            data = await request.json();
        }

        // Bots fill the hidden field. Report success so they don't retry.
        if (data.honeypot_filled) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        const { profile_slug, email } = data as {
            profile_slug?: string;
            email?: string;
        };
        const registration_number = String(data.registration_number ?? "").trim();
        const registry: Registry = REGISTRIES.includes(data.registry as Registry)
            ? (data.registry as Registry)
            : "OTHER";

        if (documentFile) {
            if (!ALLOWED_DOCUMENT_TYPES.includes(documentFile.type)) {
                return new Response(
                    JSON.stringify({ error: "Document must be a PDF, JPG or PNG." }),
                    { status: 400 },
                );
            }
            const sniffed = sniffFileType(new Uint8Array(await documentFile.slice(0, 16).arrayBuffer()));
            if (!sniffed || !ALLOWED_DOCUMENT_TYPES.includes(sniffed)) {
                return new Response(
                    JSON.stringify({ error: "Document must be a PDF, JPG or PNG." }),
                    { status: 400 },
                );
            }
            if (documentFile.size > MAX_FILE_SIZE) {
                return new Response(
                    JSON.stringify({ error: "Document is larger than 10MB." }),
                    { status: 400 },
                );
            }
        }

        if (!profile_slug || !email || !registration_number) {
            return new Response(
                JSON.stringify({ error: "Email and registration number are required." }),
                { status: 400 },
            );
        }

        if (!isValidEmail(email)) {
            return new Response(
                JSON.stringify({ error: "That email address doesn't look valid." }),
                { status: 400 },
            );
        }

        if (registration_number.length > 64 || String(email).length > 254) {
            return new Response(
                JSON.stringify({ error: "Registration number or email is too long." }),
                { status: 400 },
            );
        }

        if (registry === "NPI" && !/^\d{10}$/.test(registration_number)) {
            return new Response(JSON.stringify({ error: "An NPI is 10 digits." }), { status: 400 });
        }

        const profile = await prisma.profile.findUnique({
            where: { slug: profile_slug },
            select: { slug: true, full_name: true },
        });

        if (!profile) {
            return new Response(JSON.stringify({ error: "Profile not found." }), { status: 404 });
        }

        const realIp = getClientIP(request);
        const ipHash = hashIp(realIp !== 'unknown' ? realIp : clientAddress);

        const recentClaims = await prisma.profileEdit.count({
            where: {
                ip_address: ipHash,
                field_name: CLAIM_FIELD,
                createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            },
        });

        if (recentClaims >= 5) {
            return new Response(
                JSON.stringify({ error: "Too many claim requests. Please try again later." }),
                { status: 429 },
            );
        }

        // One open claim per profile per email.
        const duplicate = await prisma.profileEdit.findFirst({
            where: {
                profile_slug,
                field_name: CLAIM_FIELD,
                contributor_email: email,
                status: "PENDING",
            },
            select: { id: true },
        });

        if (duplicate) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "A claim for this profile from that address is already under review.",
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        // Store the document before recording the claim, so a review record
        // never promises evidence that was never persisted.
        let documentId: string | null = null;
        let documentType: string | null = null;
        let documentName: string | null = null;

        if (documentFile) {
            try {
                const uploaded = await uploadPrivateDocument(documentFile);
                documentId = uploaded.public_id;
                documentType = uploaded.resource_type;
                documentName = documentFile.name;
            } catch (uploadError) {
                console.error("Claim document upload failed:", uploadError);
                return new Response(
                    JSON.stringify({
                        error: "We couldn't store your verification document. Please try again.",
                    }),
                    { status: 502 },
                );
            }
        }

        const registryCheck = await checkRegistry(registry, registration_number, profile.full_name);

        await prisma.profileEdit.create({
            data: {
                profile_slug,
                field_name: CLAIM_FIELD,
                new_value: JSON.stringify({
                    registry,
                    registration_number,
                    registry_check: registryCheck,
                    document_name: documentName,
                    document_id: documentId,
                    document_type: documentType,
                }),
                reason: "Profile ownership claim",
                contributor_name: profile.full_name,
                contributor_email: email,
                ip_address: ipHash,
                status: "PENDING",
            },
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Verification request received. We'll email you once it's reviewed.",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("Error submitting claim request:", error);
        return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
            status: 500,
        });
    }
};
