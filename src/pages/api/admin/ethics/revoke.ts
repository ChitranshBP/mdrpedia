/**
 * POST /api/admin/ethics/revoke — Revoke a doctor's ethics certification
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { requireSuperAdmin } from '../../../../lib/rbac';
import { logAdminAction } from '../../../../lib/audit';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { profile_id, reason } = body;

        if (!profile_id) return json({ error: 'profile_id is required' }, 400);

        const profile = await prisma.profile.findUnique({
            where: { id: profile_id },
            include: {
                affiliations: {
                    include: {
                        hospital: {
                            include: { ethics_certification: true },
                        },
                    },
                },
            },
        });

        if (!profile) return json({ error: 'Profile not found' }, 404);

        // Revoke certification
        await prisma.profile.update({
            where: { id: profile_id },
            data: {
                ethics_status: 'REVOKED',
                ethics_score: 0,
            },
        });

        // Revoke active applications
        await prisma.ethicsApplication.updateMany({
            where: {
                profile_id,
                status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
            },
            data: { status: 'REVOKED' },
        });

        // Cascade to clinic certifications
        const affectedClinics: string[] = [];
        for (const aff of profile.affiliations) {
            if (aff.hospital.ethics_certification) {
                affectedClinics.push(aff.hospital.id);
                // Recalculate clinic status
                await recalculateClinicCert(aff.hospital.id);
            }
        }

        await logAdminAction('REVOKE_ETHICS_CERTIFICATION', profile.slug, {
            profileId: profile_id,
            reason,
            affectedClinics,
        }, request);

        return json({ success: true, affected_clinics: affectedClinics.length });
    } catch (e) {
        return apiError('admin/ethics/revoke', e);
    }
}

/** Recalculate clinic certification after a doctor revocation */
async function recalculateClinicCert(hospitalId: string) {
    const affiliations = await prisma.doctorHospitalAffiliation.findMany({
        where: { hospital_id: hospitalId },
        include: {
            profile: {
                select: {
                    ethics_status: true,
                    ethics_tier: true,
                },
            },
        },
    });

    const certifiedDoctors = affiliations.filter(a => a.profile.ethics_status === 'APPROVED');
    const allDoctorsCount = affiliations.length;

    if (certifiedDoctors.length === 0 || certifiedDoctors.length < allDoctorsCount) {
        // Not all doctors are certified — suspend clinic
        await prisma.clinicCertification.update({
            where: { hospital_id: hospitalId },
            data: {
                status: 'SUSPENDED',
                certified_doctors: certifiedDoctors.length,
                total_doctors: allDoctorsCount,
            },
        });
        return;
    }

    // All doctors certified — find lowest tier
    const tierRank: Record<string, number> = { ADVOCATE: 1, GUARDIAN: 2, LEGEND: 3 };
    let lowestTier = 'LEGEND';
    for (const doc of certifiedDoctors) {
        const tier = doc.profile.ethics_tier as string;
        if (tierRank[tier] < tierRank[lowestTier]) {
            lowestTier = tier;
        }
    }

    await prisma.clinicCertification.update({
        where: { hospital_id: hospitalId },
        data: {
            status: 'CERTIFIED',
            tier: lowestTier as any,
            certified_doctors: certifiedDoctors.length,
            total_doctors: allDoctorsCount,
        },
    });
}
