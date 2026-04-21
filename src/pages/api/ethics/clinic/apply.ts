/**
 * POST /api/ethics/clinic/apply — Clinic applies for ethics certification
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsApply);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { hospital_id, contact_email } = body;

        if (!hospital_id || !contact_email) {
            return json({ error: 'hospital_id and contact_email are required' }, 400);
        }

        const hospital = await prisma.hospital.findUnique({ where: { id: hospital_id } });
        if (!hospital) return json({ error: 'Hospital not found' }, 404);

        // Check if certification already exists
        const existing = await prisma.clinicCertification.findUnique({
            where: { hospital_id },
        });

        if (existing) {
            return json({ error: 'Clinic certification already exists', certification: existing }, 409);
        }

        // Count affiliated doctors and their ethics status
        const affiliations = await prisma.doctorHospitalAffiliation.findMany({
            where: { hospital_id },
            include: {
                profile: {
                    select: { ethics_status: true, ethics_tier: true },
                },
            },
        });

        const totalDoctors = affiliations.length;
        const certifiedDoctors = affiliations.filter(a => a.profile.ethics_status === 'APPROVED').length;

        const certification = await prisma.clinicCertification.create({
            data: {
                hospital_id,
                status: 'PENDING',
                contact_email,
                certified_doctors: certifiedDoctors,
                total_doctors: totalDoctors,
            },
        });

        return json({ success: true, certification }, 201);
    } catch (e) {
        return apiError('ethics/clinic/apply', e);
    }
}
