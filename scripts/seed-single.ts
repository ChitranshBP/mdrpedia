
import { createPrismaClient } from '../src/lib/prisma-factory';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = createPrismaClient();

async function seedSingle(slug: string) {
    console.log(`🌱 Seeding single profile: ${slug}...`);

    const doctorsDir = path.join(__dirname, '../src/content/doctors');
    const filePath = path.join(doctorsDir, `${slug}.json`);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Processing ${data.fullName}...`);

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
        update: {
            // Update fields if they changed in JSON
            h_index: data.hIndex ?? 0,
            verified_surgeries: data.verifiedSurgeries ?? 0,
            biography: data.biography,
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
        },
    });

    // 3. Citations
    if (data.citations) {
        console.log(`  Upserting ${data.citations.length} citations...`);
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
            update: { lives_saved: data.livesSaved },
            create: {
                profile_id: profile.id,
                lives_saved: data.livesSaved,
                data_source: 'Hospital Records',
            },
        });
    }

    console.log(`✅ Seeded ${slug} successfully.`);
}

const target = process.argv[2];
if (target) {
    seedSingle(target)
        .catch(e => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
} else {
    console.log("Usage: npx tsx scripts/seed-single.ts <slug>");
}
