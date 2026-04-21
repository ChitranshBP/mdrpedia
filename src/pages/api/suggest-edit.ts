import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";
import { isValidEmail } from "../../lib/utils";
import crypto from 'crypto';

export const prerender = false;

const MAX_BODY_SIZE = 256 * 1024; // 256KB
const ALLOWED_FIELDS = [
    'full_name', 'specialty', 'subSpecialty', 'biography', 'country', 'city',
    'hospital', 'title', 'orcid_id', 'npi_number', 'portraitUrl', 'bookingUrl'
];

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
        // Check body size
        const contentLength = parseInt(request.headers.get('content-length') || '0');
        if (contentLength > MAX_BODY_SIZE) {
            return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
        }

        const data = await request.json();

        // Anti-bot checks
        if (data.honeypot_filled) {
            // Silently reject bots
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        const {
            profile_slug,
            field_name,
            old_value,
            new_value,
            reason,
            contributor_name,
            contributor_email,
            contributor_social
        } = data;

        if (!profile_slug || !field_name || !new_value || !contributor_name || !contributor_email) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Validate field name against allowlist
        if (!ALLOWED_FIELDS.includes(field_name)) {
            return new Response(JSON.stringify({ error: "Invalid field name" }), { status: 400 });
        }

        // Validate email format
        if (!isValidEmail(contributor_email)) {
            return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400 });
        }

        // Validate field lengths
        if (new_value.length > 5000) {
            return new Response(JSON.stringify({ error: "Value too long (max 5000 chars)" }), { status: 400 });
        }

        if (contributor_name.length > 200) {
            return new Response(JSON.stringify({ error: "Name too long" }), { status: 400 });
        }

        // Rate limiting check (basic IP based)
        // In a real app, use a proper rate limit library (upstash/redis)
        // keeping it simple: max 5 edits per hour per IP
        const ipHash = crypto.createHash('sha256').update(clientAddress || 'unknown').digest('hex').slice(0, 32);

        const recentEdits = await prisma.profileEdit.count({
            where: {
                ip_address: ipHash,
                createdAt: {
                    gte: new Date(Date.now() - 60 * 60 * 1000)
                }
            }
        });

        if (recentEdits >= 10) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429 });
        }

        // Create the edit record
        await prisma.profileEdit.create({
            data: {
                profile_slug,
                field_name,
                old_value,
                new_value,
                reason,
                contributor_name,
                contributor_email,
                contributor_social, // Optional
                ip_address: ipHash,
                status: "PENDING"
            }
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error submitting edit:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
