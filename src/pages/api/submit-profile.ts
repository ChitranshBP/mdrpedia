import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { isValidEmail } from "../../lib/utils";
import crypto from 'crypto';

export const prerender = false;

const MAX_BODY_SIZE = 512 * 1024; // 512KB

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
        // Check body size
        const contentLength = parseInt(request.headers.get('content-length') || '0');
        if (contentLength > MAX_BODY_SIZE) {
            return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
        }

        const data = await request.json();

        // Anti-bot check
        if (data.honeypot_filled) {
            return new Response(JSON.stringify({ success: true }), { status: 200 }); // Silent fail
        }

        const {
            full_name,
            specialty,
            country,
            city,
            hospital,
            biography,
            orcid_id,
            npi_number,
            contributor_name,
            contributor_email
        } = data;

        // Input validation
        if (!full_name || !specialty || !country || !contributor_name || !contributor_email) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        if (full_name.length > 200 || specialty.length > 200 || country.length > 100) {
            return new Response(JSON.stringify({ error: "Field length exceeds maximum" }), { status: 400 });
        }

        if (biography && biography.length > 5000) {
            return new Response(JSON.stringify({ error: "Biography too long (max 5000 chars)" }), { status: 400 });
        }

        if (!isValidEmail(contributor_email)) {
            return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400 });
        }

        if (orcid_id && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid_id)) {
            return new Response(JSON.stringify({ error: "Invalid ORCID format" }), { status: 400 });
        }

        if (npi_number && !/^\d{10}$/.test(npi_number)) {
            return new Response(JSON.stringify({ error: "Invalid NPI format (10 digits required)" }), { status: 400 });
        }

        // Build pending profile record
        await prisma.pendingProfile.create({
            data: {
                full_name,
                specialty,
                country,
                city,
                hospital,
                biography,
                orcid_id,
                npi_number,
                contributor_name,
                contributor_email,
                ip_address: crypto.createHash('sha256').update(clientAddress || 'unknown').digest('hex').slice(0, 32),
                status: "PENDING"
            }
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error submitting profile:", error);
        return new Response(JSON.stringify({ error: "Failed to submit profile" }), { status: 500 });
    }
};
