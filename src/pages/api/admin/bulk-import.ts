/**
 * MDRPedia — Bulk Import API
 * Import a single doctor profile from CSV data
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { logAdminAction } from '../../../lib/audit';
import type { ProfileStatus, Tier } from '@prisma/client';

// Validate admin key
function validateAdminKey(request: Request): boolean {
    const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
    if (!adminKey) return false;

    const providedKey = request.headers.get('x-admin-key');
    return providedKey === adminKey;
}

// Generate slug from name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

export async function POST({ request }: { request: Request }) {
    if (!validateAdminKey(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { profile, skipDuplicates } = body;

        if (!profile || !profile.fullName || !profile.specialty) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: fullName and specialty'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const slug = generateSlug(profile.fullName);

        // Check for duplicates
        if (skipDuplicates) {
            const existing = await prisma.profile.findFirst({
                where: {
                    OR: [
                        { slug },
                        { full_name: profile.fullName }
                    ]
                }
            });

            if (existing) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Profile already exists',
                    skipped: true
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Create geography if provided
        let geographyId = null;
        if (profile.country) {
            const geo = await prisma.geography.upsert({
                where: {
                    country_region_city: {
                        country: profile.country,
                        region: profile.region || '',
                        city: profile.city || ''
                    }
                },
                update: {},
                create: {
                    country: profile.country,
                    region: profile.region || null,
                    city: profile.city || null
                }
            });
            geographyId = geo.id;
        }

        // Map tier and status
        const tierMap: Record<string, Tier> = {
            'TITAN': 'TITAN',
            'ELITE': 'ELITE',
            'MASTER': 'MASTER',
            'UNRANKED': 'UNRANKED'
        };

        const statusMap: Record<string, ProfileStatus> = {
            'LIVING': 'LIVING',
            'HISTORICAL': 'HISTORICAL'
        };

        const tier = tierMap[profile.tier?.toUpperCase()] || 'UNRANKED';
        const status = statusMap[profile.status?.toUpperCase()] || 'LIVING';

        // Create the profile
        const newProfile = await prisma.profile.create({
            data: {
                slug,
                full_name: profile.fullName,
                title: profile.title || null,
                specialty: profile.specialty,
                sub_specialty: profile.subSpecialty || null,
                biography: profile.biography || null,
                status,
                tier,
                h_index: parseInt(profile.hIndex) || 0,
                years_active: parseInt(profile.yearsActive) || 0,
                ranking_score: parseFloat(profile.rankingScore) || 0,
                npi_number: profile.npiNumber || null,
                orcid_id: profile.orcidId || null,
                portrait_url: profile.portraitUrl || null,
                medical_specialty: profile.medicalSpecialty?.split(',').map((s: string) => s.trim()).filter(Boolean) || [profile.specialty],
                knows_about: profile.knowsAbout?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
                geography_id: geographyId
            }
        });

        // Log the action
        await logAdminAction('BULK_IMPORT_PROFILE', slug, {
            fullName: profile.fullName,
            tier,
            status
        }, request);

        return new Response(JSON.stringify({
            success: true,
            profile: {
                id: newProfile.id,
                slug: newProfile.slug,
                fullName: newProfile.full_name
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Import failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
