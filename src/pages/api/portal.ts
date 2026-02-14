// ============================================================================
// MDRPedia — Doctor Portal API
// Handles identity verification and profile updates from the portal
// ============================================================================

import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'verify') {
            return handleVerify(body);
        }

        if (action === 'update') {
            return handleUpdate(body);
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[Portal API] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// ─── Verify Identity ────────────────────────────────────────────────────────

async function handleVerify(body: {
    fullName?: string;
    npiNumber?: string;
    orcidId?: string;
    googleScholarId?: string;
}) {
    const { fullName, npiNumber, orcidId, googleScholarId } = body;

    if (!fullName) {
        return new Response(JSON.stringify({ error: 'Full name is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Validate ORCID format if provided
    if (orcidId && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcidId)) {
        return new Response(JSON.stringify({ error: 'Invalid ORCID format. Expected: 0000-0002-1234-5678' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Validate NPI format if provided (10 digits)
    if (npiNumber && !/^\d{10}$/.test(npiNumber)) {
        return new Response(JSON.stringify({ error: 'Invalid NPI number. Expected 10 digits.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // In production, you'd look up the profile in the database
    // For now, return success to indicate the portal is functional
    return new Response(
        JSON.stringify({
            success: true,
            message: 'Identity verification initiated',
            data: {
                fullName,
                npiNumber: npiNumber || null,
                orcidId: orcidId || null,
                googleScholarId: googleScholarId || null,
                status: 'PENDING',
            },
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

// ─── Update Profile ─────────────────────────────────────────────────────────

async function handleUpdate(body: {
    philosophy?: string;
    availability?: string;
    consultationFee?: string;
    insurance?: string[];
    languages?: string[];
    bookingUrl?: string;
}) {
    const { philosophy, availability, consultationFee, insurance, languages, bookingUrl } = body;

    // Validate availability
    const validAvailability = ['PRIVATE_CONSULTANT', 'PUBLIC_FACULTY', 'BOTH'];
    if (availability && !validAvailability.includes(availability)) {
        return new Response(JSON.stringify({ error: 'Invalid availability option' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Validate booking URL
    if (bookingUrl && bookingUrl.length > 0) {
        try {
            new URL(bookingUrl);
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid booking URL' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    // In production, save to DoctorPortal table via Prisma
    return new Response(
        JSON.stringify({
            success: true,
            message: 'Profile updated successfully',
            data: {
                philosophy: philosophy || null,
                availability: availability || 'PUBLIC_FACULTY',
                consultationFee: consultationFee || null,
                insurance: insurance || [],
                languages: languages || [],
                bookingUrl: bookingUrl || null,
            },
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
