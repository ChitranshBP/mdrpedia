import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
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
                ip_address: clientAddress,
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
