import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
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

        // Rate limiting check (basic IP based)
        // In a real app, use a proper rate limit library (upstash/redis)
        // keeping it simple: max 5 edits per hour per IP
        const recentEdits = await prisma.profileEdit.count({
            where: {
                ip_address: clientAddress,
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
                ip_address: clientAddress,
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
