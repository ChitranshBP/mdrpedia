import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { isValidEmail } from "../../lib/utils";
import { uploadPrivateDocument } from "../../lib/cloudinary";
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

function hashIp(address: string | undefined) {
    const salt = import.meta.env.IP_HASH_SALT ?? "";
    return crypto
        .createHash("sha256")
        .update(`${salt}:${address || "unknown"}`)
        .digest("hex")
        .slice(0, 32);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
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

        const { profile_slug, email, registration_number } = data as {
            profile_slug?: string;
            email?: string;
            registration_number?: string;
        };

        if (documentFile) {
            if (!ALLOWED_DOCUMENT_TYPES.includes(documentFile.type)) {
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

        if (String(registration_number).length > 64) {
            return new Response(
                JSON.stringify({ error: "Registration number is too long." }),
                { status: 400 },
            );
        }

        const profile = await prisma.profile.findUnique({
            where: { slug: profile_slug },
            select: { slug: true, full_name: true },
        });

        if (!profile) {
            return new Response(JSON.stringify({ error: "Profile not found." }), { status: 404 });
        }

        const ipHash = hashIp(clientAddress);

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

        await prisma.profileEdit.create({
            data: {
                profile_slug,
                field_name: CLAIM_FIELD,
                new_value: JSON.stringify({
                    registration_number,
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
