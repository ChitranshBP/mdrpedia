/**
 * GET  /api/admin/ethics/clinics — List clinic certifications
 * POST /api/admin/ethics/clinics — (via action: recalculate) Recompute clinic eligibility
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

export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const clinics = await prisma.clinicCertification.findMany({
            include: {
                hospital: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        geography: {
                            select: { country: true, city: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return json({ clinics });
    } catch (e) {
        return apiError('admin/ethics/clinics GET', e);
    }
}

export async function POST({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminSync);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { action, hospital_id } = body;

        if (action === 'recalculate') {
            const clinics = hospital_id
                ? await prisma.clinicCertification.findMany({ where: { hospital_id } })
                : await prisma.clinicCertification.findMany();

            let updated = 0;

            // Batch-load all affiliations in ONE query to avoid N+1
            const hospitalIds = clinics.map(c => c.hospital_id);
            const allAffiliations = await prisma.doctorHospitalAffiliation.findMany({
                where: { hospital_id: { in: hospitalIds } },
                include: {
                    profile: {
                        select: { ethics_status: true, ethics_tier: true },
                    },
                },
            });

            // Group affiliations by hospital_id
            const affiliationsByHospital = new Map<string, typeof allAffiliations>();
            for (const aff of allAffiliations) {
                const list = affiliationsByHospital.get(aff.hospital_id) || [];
                list.push(aff);
                affiliationsByHospital.set(aff.hospital_id, list);
            }

            const tierRank: Record<string, number> = { ADVOCATE: 1, GUARDIAN: 2, LEGEND: 3 };

            for (const clinic of clinics) {
                const affiliations = affiliationsByHospital.get(clinic.hospital_id) || [];
                const allCount = affiliations.length;
                const certified = affiliations.filter(a => a.profile.ethics_status === 'APPROVED');

                if (certified.length === allCount && allCount > 0) {
                    let lowestTier = 'LEGEND';
                    for (const doc of certified) {
                        const t = doc.profile.ethics_tier as string;
                        if (tierRank[t] < tierRank[lowestTier]) lowestTier = t;
                    }

                    await prisma.clinicCertification.update({
                        where: { id: clinic.id },
                        data: {
                            status: 'CERTIFIED',
                            tier: lowestTier as any,
                            certified_doctors: certified.length,
                            total_doctors: allCount,
                        },
                    });
                } else {
                    await prisma.clinicCertification.update({
                        where: { id: clinic.id },
                        data: {
                            status: allCount === 0 ? 'PENDING' : 'SUSPENDED',
                            certified_doctors: certified.length,
                            total_doctors: allCount,
                        },
                    });
                }

                updated++;
            }

            await logAdminAction('RECALCULATE_CLINIC_CERTS', 'system', {
                clinicsUpdated: updated,
                hospitalId: hospital_id || 'all',
            }, request);

            return json({ success: true, clinics_updated: updated });
        }

        return json({ error: 'Unknown action' }, 400);
    } catch (e) {
        return apiError('admin/ethics/clinics POST', e);
    }
}
