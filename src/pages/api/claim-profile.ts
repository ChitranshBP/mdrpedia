import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { isValidEmail } from "../../lib/utils";
import crypto from "crypto";

export const prerender = false;

const MAX_BODY_SIZE = 64 * 1024;

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

        const data = await request.json();

        // Bots fill the hidden field. Report success so they don't retry.
        if (data.honeypot_filled) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        const { profile_slug, email, registration_number, document_name } = data;

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

        await prisma.profileEdit.create({
            data: {
                profile_slug,
                field_name: CLAIM_FIELD,
                new_value: JSON.stringify({
                    registration_number,
                    document_name: document_name || null,
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
