const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting DB Synchronization...');

    const doctorsDir = path.join(__dirname, '../src/content/doctors');
    if (!fs.existsSync(doctorsDir)) {
        console.error('No doctors directory found.');
        return;
    }

    // 1. Get valid slugs from JSON files
    const jsonFiles = fs.readdirSync(doctorsDir).filter((f) => f.endsWith('.json'));
    const validSlugs = new Set(jsonFiles.map(f => f.replace('.json', '')));

    console.log(`Found ${validSlugs.size} valid profiles in file system.`);

    // 2. Get all slugs from DB
    const dbProfiles = await prisma.profile.findMany({
        select: { id: true, slug: true }
    });

    console.log(`Found ${dbProfiles.length} profiles in database.`);

    // 3. Identify and Delete Orphans (Bad Slugs)
    const orphans = dbProfiles.filter(p => !validSlugs.has(p.slug));

    if (orphans.length > 0) {
        console.log(`Found ${orphans.length} orphaned/bad profiles in DB. Deleting...`);
        // Batch delete
        const orphanIds = orphans.map(p => p.id);
        const deleteResult = await prisma.profile.deleteMany({
            where: { id: { in: orphanIds } }
        });
        console.log(`Deleted ${deleteResult.count} records.`);
    } else {
        console.log('No orphaned profiles found.');
    }

    // 4. Run Seed Logic to Upsert valid profiles
    console.log('Upserting clean data...');
    // We can import the logic from seed.ts, but since it's TS and this is CJS, 
    // I'll replicate the core upsert logic efficiently here.

    let processed = 0;
    for (const file of jsonFiles) {
        const filePath = path.join(doctorsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const slug = file.replace('.json', '');

        // Geography Upsert
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

        // Profile Upsert
        await prisma.profile.upsert({
            where: { slug: slug },
            update: {
                // Update basic fields to ensure content matches JSON
                full_name: data.fullName,
                title: data.title,
                biography: data.biography,
                specialty: data.specialty,
                sub_specialty: data.subSpecialty,
                status: data.status,
                tier: data.tier,
                ranking_score: data.rankingScore,
                h_index: data.hIndex ?? 0,
                years_active: data.yearsActive ?? 0,
                verified_surgeries: data.verifiedSurgeries ?? 0,
                medical_specialty: data.medicalSpecialty || [],
                knows_about: data.knowsAbout || [],
                ai_summary: data.aiSummary,
                portrait_url: data.portraitUrl,
                date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                date_of_death: data.dateOfDeath ? new Date(data.dateOfDeath) : null,
                affiliations: { deleteMany: {} },
            },
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
                ai_summary: data.aiSummary,
                medical_specialty: data.medicalSpecialty || [],
                knows_about: data.knowsAbout || [],
            },
        });

        // Upsert affiliations (after wipe in update, or create)
        // We need to re-fetch the profile ID
        const profile = await prisma.profile.findUnique({ where: { slug } });

        if (data.affiliations) {
            for (const aff of data.affiliations) {
                const hospitalSlug = aff.hospitalName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const hospital = await prisma.hospital.upsert({
                    where: { slug: hospitalSlug },
                    update: {},
                    create: {
                        name: aff.hospitalName,
                        slug: hospitalSlug,
                        sector: 'PRIVATE',
                        website: aff.hospitalUrl,
                    }
                });
                await prisma.doctorHospitalAffiliation.create({
                    data: {
                        profile_id: profile.id,
                        hospital_id: hospital.id,
                        role: aff.role,
                        is_primary: true
                    }
                });
            }
        }

        process.stdout.write('.');
        processed++;
    }

    console.log(`\n✅ Sync complete. Processed ${processed} profiles.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
