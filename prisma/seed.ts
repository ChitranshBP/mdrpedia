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

    for (const file of files) {
        const filePath = path.join(doctorsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Derive slug from filename since it's not in the JSON body
        const slug = file.replace('.json', '');

        console.log(`Processing ${data.fullName} (${slug})...`);

        // 1. Geography
        const geography = await prisma.geography.upsert({
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
        const profile = await prisma.profile.upsert({
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

                // Flags
                has_technique_invention: data.hasInvention ?? false,
                license_verified: true,
            },
        });

        // 3. Citations
        if (data.citations) {
            for (const cit of data.citations) {
                if (cit.doi) {
                    await prisma.citation.upsert({
                        where: { doi: cit.doi },
                        update: {},
                        create: {
                            profile_id: profile.id,
                            doi: cit.doi,
                            pubmed_id: cit.pubmedId,
                            title: cit.title,
                            journal: cit.journal,
                            publication_date: cit.year ? new Date(cit.year, 0, 1) : null,
                            verification_status: cit.verified ? 'VERIFIED' : 'PENDING',
                        },
                    });
                }
            }
        }

        // 4. Impact Metrics
        if (data.livesSaved) {
            await prisma.impactMetric.upsert({
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
            const existing = await prisma.technique.findFirst({
                where: { profile_id: profile.id, name: data.techniquesInvented[0] }
            });

            if (!existing) {
                for (const tech of data.techniquesInvented) {
                    await prisma.technique.create({
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
        if (data.awards) {
            const existingAward = await prisma.award.findFirst({
                where: { profile_id: profile.id }
            });
            if (!existingAward) {
                for (const award of data.awards) {
                    await prisma.award.create({
                        data: {
                            profile_id: profile.id,
                            name: award.name,
                            year_awarded: award.year,
                            issuing_body: award.issuingBody,
                        },
                    });
                }
            }
        }

        // 7. Timeline
        if (data.timeline) {
            const existingLegacy = await prisma.legacyTimeline.findFirst({
                where: { profile_id: profile.id }
            });
            if (!existingLegacy) {
                for (const event of data.timeline) {
                    await prisma.legacyTimeline.create({
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
            await prisma.profile.update({
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

                const hospital = await prisma.hospital.upsert({
                    where: { slug: hospitalSlug },
                    update: {},
                    create: {
                        name: aff.hospitalName,
                        slug: hospitalSlug,
                        sector: 'PRIVATE', // Default
                        website: aff.hospitalUrl,
                    }
                });

                await prisma.doctorHospitalAffiliation.upsert({
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

    } // End of for loop

    console.log('✅ Seed complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
