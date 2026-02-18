const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const slug = 'steven-a-rosenberg';
    const filePath = path.join(__dirname, '../src/content/doctors/steven-a-rosenberg.json');
    console.log(`Reading ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('File not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log('JSON parsed successfully.');

    // 1. Geography
    console.log('Upserting Geography...');
    try {
        const geography = await prisma.geography.upsert({
            where: {
                country_region_city: {
                    city: data.geography.city || '',
                    region: data.geography.region || '',
                    country: data.geography.country || 'Unknown',
                },
            },
            update: {},
            create: {
                city: data.geography.city || '',
                region: data.geography.region || '',
                country: data.geography.country || 'Unknown',
            },
        });
        console.log('Geography upserted:', geography.id);

        // 2. Profile
        console.log('Upserting Profile...');
        const profile = await prisma.profile.upsert({
            where: { slug: slug },
            update: {
                full_name: data.fullName,
                biography: data.biography,
                specialty: data.specialty,
                medical_specialty: data.medicalSpecialty || [],
                ai_summary: data.aiSummary,
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
        console.log('Profile upserted:', profile.id);

    } catch (e) {
        console.error('ERROR during upsert:', e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
