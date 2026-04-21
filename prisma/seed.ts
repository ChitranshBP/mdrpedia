import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    const doctorsDir = path.join(__dirname, '../src/content/doctors');
    if (!fs.existsSync(doctorsDir)) {
        console.log('No doctors directory found.');
        return;
    }
    const files = fs.readdirSync(doctorsDir).filter((f) => f.endsWith('.json'));

    let seeded = 0;
    let failed = 0;

    for (const file of files) {
        const filePath = path.join(doctorsDir, file);
        const slug = file.replace('.json', '');

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            console.log(`Processing ${data.fullName} (${slug})...`);

            // Wrap each doctor's seed in a transaction for atomicity
            await prisma.$transaction(async (tx) => {
                // 1. Geography
                const geography = await tx.geography.upsert({
                    where: {
                        country_region_city: {
                            city: data.geography.city || '',
                            region: data.geography.region || '',
                            country: data.geography.country,
                        },
                    },
                    update: {},
                    create: {
                        city: data.geography.city || '',
                        region: data.geography.region || '',
                        country: data.geography.country,
                    },
                });

                // 2. Profile
                const profile = await tx.profile.upsert({
                    where: { slug: slug },
                    update: {},
                    create: {
                        slug: slug,
                        full_name: data.fullName,
                        title: data.title,
                        specialty: data.specialty,
                        sub_specialty: data.subSpecialty,
                        status: data.status,
                        tier: data.tier,
                        ranking_score: data.rankingScore,
                        h_index: data.hIndex ?? 0,
                        years_active: data.yearsActive ?? 0,
                        verified_surgeries: data.verifiedSurgeries ?? 0,
                        biography: data.biography,
                        portrait_url: data.portraitUrl,
                        date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                        date_of_death: data.dateOfDeath ? new Date(data.dateOfDeath) : null,
                        geography_id: geography.id,
                        has_technique_invention: data.hasInvention ?? false,
                        license_verified: true,
                    },
                });

                // 3. Citations
                if (data.citations) {
                    for (const cit of data.citations) {
                        if (cit.doi) {
                            await tx.citation.upsert({
                                where: { doi: cit.doi },
                                update: {},
                                create: {
                                    doi: cit.doi,
                                    pubmed_id: cit.pubmedId ?? null,
                                    title: cit.title || 'Untitled',
                                    journal: cit.journal,
                                    publication_date: cit.year ? new Date(cit.year, 0, 1) : null,
                                    verification_status: cit.verified ? 'VERIFIED' : 'PENDING',
                                    profile: { connect: { id: profile.id } },
                                },
                            });
                        }
                    }
                }

                // 4. Impact Metrics
                if (data.livesSaved) {
                    await tx.impactMetric.upsert({
                        where: { profile_id: profile.id },
                        update: {},
                        create: {
                            profile_id: profile.id,
                            lives_saved: data.livesSaved,
                            data_source: 'Hospital Records',
                        },
                    });
                }

                // 5. Techniques
                if (data.techniquesInvented) {
                    const existing = await tx.technique.findFirst({
                        where: { profile_id: profile.id, name: data.techniquesInvented[0] }
                    });
                    if (!existing) {
                        for (const tech of data.techniquesInvented) {
                            await tx.technique.create({
                                data: {
                                    profile_id: profile.id,
                                    name: tech,
                                    description: 'Invented technique',
                                    is_gold_standard: true,
                                    technique_acknowledged: true,
                                },
                            });
                        }
                    }
                }

                // 6. Awards
                if (data.awards && data.awards.length > 0) {
                    const existingAward = await tx.award.findFirst({
                        where: { profile_id: profile.id }
                    });
                    if (!existingAward) {
                        for (const award of data.awards) {
                            const awardName = typeof award === 'string' ? award : award.name;
                            const awardYear = typeof award === 'string' ? 0 : (award.year || 0);
                            const awardIssuer = typeof award === 'string' ? 'Unknown' : (award.issuingBody || 'Unknown');
                            if (!awardName) continue;
                            await tx.award.create({
                                data: {
                                    profile_id: profile.id,
                                    name: awardName,
                                    year_awarded: awardYear,
                                    issuing_body: awardIssuer,
                                },
                            });
                        }
                    }
                }

                // 7. Timeline
                if (data.timeline) {
                    const existingLegacy = await tx.legacyTimeline.findFirst({
                        where: { profile_id: profile.id }
                    });
                    if (!existingLegacy) {
                        for (const event of data.timeline) {
                            await tx.legacyTimeline.create({
                                data: {
                                    profile_id: profile.id,
                                    year: event.year,
                                    title: event.title,
                                    description: event.description,
                                },
                            });
                        }
                    }
                }

                // 8. New Fields (AI Summary, Affiliations, etc.)
                if (data.aiSummary || data.medicalSpecialty || data.knowsAbout) {
                    await tx.profile.update({
                        where: { id: profile.id },
                        data: {
                            ai_summary: data.aiSummary,
                            medical_specialty: data.medicalSpecialty || [],
                            knows_about: data.knowsAbout || [],
                        }
                    });
                }

                // 9. Affiliations
                if (data.affiliations) {
                    for (const aff of data.affiliations) {
                        const hospitalSlug = aff.hospitalName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const hospital = await tx.hospital.upsert({
                            where: { slug: hospitalSlug },
                            update: {},
                            create: {
                                name: aff.hospitalName,
                                slug: hospitalSlug,
                                sector: 'PRIVATE',
                                website: aff.hospitalUrl,
                            }
                        });
                        await tx.doctorHospitalAffiliation.upsert({
                            where: {
                                profile_id_hospital_id: {
                                    profile_id: profile.id,
                                    hospital_id: hospital.id
                                }
                            },
                            update: {},
                            create: {
                                profile_id: profile.id,
                                hospital_id: hospital.id,
                                role: aff.role,
                                is_primary: true
                            }
                        });
                    }
                }
            }); // End transaction

            seeded++;
        } catch (err) {
            failed++;
            console.error(`Failed to seed ${slug}:`, err instanceof Error ? err.message : err);
        }
    } // End of for loop

    console.log(`Seed results: ${seeded} succeeded, ${failed} failed out of ${files.length} files`);

    // ============================================
    // ETHICS CHECKLIST TEMPLATES (21 items, 100 points)
    // ============================================
    console.log('Seeding ethics checklist templates...');

    const allAuditTypes = ['INITIAL', 'QUARTERLY', 'ANNUAL'] as const;
    const allTiers = ['ADVOCATE', 'GUARDIAN', 'LEGEND'] as const;

    const ethicsTemplates = [
        // Category A — Patient Transparency (35 pts)
        { item_key: 'fee_disclosure', label: 'Fee Disclosure', description: 'Transparent fee schedules publicly available', category: 'PATIENT_TRANSPARENCY', max_points: 8, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: true, sort_order: 1 },
        { item_key: 'conflict_disclosure', label: 'Conflict of Interest Declaration', description: 'Written disclosure of all financial conflicts of interest', category: 'PATIENT_TRANSPARENCY', max_points: 7, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: true, sort_order: 2 },
        { item_key: 'outcome_data', label: 'Outcome Data Published', description: 'Patient outcome statistics published and updated', category: 'PATIENT_TRANSPARENCY', max_points: 7, audit_types: ['INITIAL', 'ANNUAL'], tiers: ['GUARDIAN', 'LEGEND'], is_required: false, sort_order: 3 },
        { item_key: 'informed_consent', label: 'Informed Consent Process', description: 'Documented informed consent exceeding legal minimum', category: 'PATIENT_TRANSPARENCY', max_points: 6, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: false, sort_order: 4 },
        { item_key: 'complaint_resolution', label: 'Complaint Resolution Policy', description: 'Formal patient complaint policy with response timeline', category: 'PATIENT_TRANSPARENCY', max_points: 4, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 5 },
        { item_key: 'wait_time_disclosed', label: 'Wait Time Disclosed', description: 'Average wait times published for patients', category: 'PATIENT_TRANSPARENCY', max_points: 2, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 6 },
        { item_key: 'language_access', label: 'Language Access', description: 'Multi-language support or interpreter services', category: 'PATIENT_TRANSPARENCY', max_points: 1, audit_types: ['INITIAL'], tiers: ['GUARDIAN', 'LEGEND'], is_required: false, sort_order: 7 },

        // Category B — Peer Review & Compliance (40 pts)
        { item_key: 'board_active', label: 'Board Certification Active', description: 'Current board certification in primary specialty', category: 'PEER_REVIEW_COMPLIANCE', max_points: 10, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: true, sort_order: 8 },
        { item_key: 'license_clean', label: 'License Clean / No Sanctions', description: 'No active sanctions, suspensions, or disciplinary actions', category: 'PEER_REVIEW_COMPLIANCE', max_points: 10, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: true, sort_order: 9 },
        { item_key: 'cme_hours', label: 'CME Hours Met', description: 'Continuing medical education requirements met or exceeded', category: 'PEER_REVIEW_COMPLIANCE', max_points: 7, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 10 },
        { item_key: 'malpractice_disclosed', label: 'Malpractice History Disclosed', description: 'Full malpractice history disclosed voluntarily', category: 'PEER_REVIEW_COMPLIANCE', max_points: 6, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 11 },
        { item_key: 'peer_review', label: 'Peer Review Participation', description: 'Active participation in institutional peer review', category: 'PEER_REVIEW_COMPLIANCE', max_points: 4, audit_types: ['INITIAL', 'ANNUAL'], tiers: ['GUARDIAN', 'LEGEND'], is_required: false, sort_order: 12 },
        { item_key: 'hospital_privileges', label: 'Hospital Privileges', description: 'Active hospital privileges in good standing', category: 'PEER_REVIEW_COMPLIANCE', max_points: 2, audit_types: ['INITIAL'], tiers: [...allTiers], is_required: false, sort_order: 13 },
        { item_key: 'not_excluded', label: 'Not Excluded from Programs', description: 'Not excluded from federal/state healthcare programs', category: 'PEER_REVIEW_COMPLIANCE', max_points: 1, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 14 },

        // Category C — Community & Pro-bono (25 pts)
        { item_key: 'probono_hours', label: 'Pro-Bono Hours', description: 'Regular pro-bono clinical hours documented', category: 'COMMUNITY_PROBONO', max_points: 8, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: false, sort_order: 15 },
        { item_key: 'community_health', label: 'Community Health Program', description: 'Active participation in community health initiatives', category: 'COMMUNITY_PROBONO', max_points: 6, audit_types: ['INITIAL', 'ANNUAL'], tiers: [...allTiers], is_required: false, sort_order: 16 },
        { item_key: 'active_mentorship', label: 'Active Mentorship', description: 'Documented mentorship of medical trainees or junior physicians', category: 'COMMUNITY_PROBONO', max_points: 5, audit_types: [...allAuditTypes], tiers: ['GUARDIAN', 'LEGEND'], is_required: false, sort_order: 17 },
        { item_key: 'humanitarian_work', label: 'Global/Humanitarian Work', description: 'International humanitarian medical missions or programs', category: 'COMMUNITY_PROBONO', max_points: 3, audit_types: ['INITIAL', 'ANNUAL'], tiers: ['LEGEND'], is_required: false, sort_order: 18 },
        { item_key: 'public_health_ed', label: 'Public Health Education', description: 'Public health education outreach or content creation', category: 'COMMUNITY_PROBONO', max_points: 2, audit_types: [...allAuditTypes], tiers: [...allTiers], is_required: false, sort_order: 19 },
        { item_key: 'open_access_research', label: 'Open-Access Research', description: 'Published open-access research papers', category: 'COMMUNITY_PROBONO', max_points: 1, audit_types: ['INITIAL', 'ANNUAL'], tiers: ['GUARDIAN', 'LEGEND'], is_required: false, sort_order: 20 },
    ];

    for (const tpl of ethicsTemplates) {
        await prisma.ethicsChecklistTemplate.upsert({
            where: { item_key: tpl.item_key },
            update: {
                label: tpl.label,
                description: tpl.description,
                category: tpl.category as any,
                max_points: tpl.max_points,
                audit_types: tpl.audit_types as any,
                tiers: tpl.tiers as any,
                is_required: tpl.is_required,
                sort_order: tpl.sort_order,
            },
            create: {
                item_key: tpl.item_key,
                label: tpl.label,
                description: tpl.description,
                category: tpl.category as any,
                max_points: tpl.max_points,
                audit_types: tpl.audit_types as any,
                tiers: tpl.tiers as any,
                is_required: tpl.is_required,
                sort_order: tpl.sort_order,
            },
        });
    }

    console.log(`Seeded ${ethicsTemplates.length} ethics checklist templates.`);
    console.log('Seed complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
