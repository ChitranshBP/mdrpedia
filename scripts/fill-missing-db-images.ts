import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FETCH_OPTIONS = {
    headers: {
        'User-Agent': 'MDRPediaBot/1.0 (Contact: brandingpioneers@gmail.com)',
    },
};

const MEDICAL_KEYWORDS = [
    'physician',
    'doctor',
    'surgeon',
    'medical',
    'researcher',
    'professor',
    'nurse',
    'pathologist',
    'pharmacologist',
    'epidemiologist',
    'immunologist',
    'neurologist',
    'cardiologist',
    'oncologist',
    'psychiatrist',
    'radiologist',
    'anesthesiologist',
    'pediatrician',
    'obstetrician',
    'dermatologist',
    'ophthalmologist',
    'urologist',
    'gastroenterologist',
    'pulmonologist',
    'endocrinologist',
    'rheumatologist',
    'nobel',
    'medicine',
    'hospital',
    'clinical',
    'biomedical',
];

async function findImageForProfile(profile: {
    id: string;
    full_name: string;
    specialty: string;
    portrait_url: string | null;
}): Promise<'updated' | 'skipped' | 'failed'> {
    try {
        console.log(`[SEARCH] Looking for image for ${profile.full_name}...`);

        // Step 1: Search Wikipedia
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(profile.full_name)}&utf8=&format=json`;
        const searchRes = await fetch(searchUrl, FETCH_OPTIONS);

        if (!searchRes.ok) {
            console.error(`[ERROR] Search failed for ${profile.full_name} — HTTP ${searchRes.status}`);
            return 'failed';
        }

        const searchData: any = await searchRes.json();
        const results = searchData.query?.search;

        if (!results || results.length === 0) {
            console.log(`[MISSING] No Wikipedia articles found for ${profile.full_name}`);
            return 'skipped';
        }

        // Step 2: Verify medical context in top 3 results
        let targetTitle: string | null = null;
        const specialtyPrefix = profile.specialty.toLowerCase().split(' ')[0];

        for (const result of results.slice(0, 3)) {
            const snippet = result.snippet.toLowerCase();
            if (
                MEDICAL_KEYWORDS.some((kw) => snippet.includes(kw)) ||
                snippet.includes(specialtyPrefix)
            ) {
                targetTitle = result.title;
                break;
            }
        }

        // Fallback: exact name match on top result
        if (!targetTitle && results[0].title.toLowerCase() === profile.full_name.toLowerCase()) {
            targetTitle = results[0].title;
        }

        if (!targetTitle) {
            console.log(`[SKIP] Found articles for ${profile.full_name} but could not verify medical context.`);
            return 'skipped';
        }

        console.log(`[MATCH] Verified page: "${targetTitle}" for ${profile.full_name}`);

        // Step 3: Fetch page summary for thumbnail
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`;
        const summaryRes = await fetch(summaryUrl, FETCH_OPTIONS);

        if (!summaryRes.ok) {
            console.error(`[ERROR] Summary fetch failed for ${targetTitle} — HTTP ${summaryRes.status}`);
            return 'failed';
        }

        const data: any = await summaryRes.json();

        if (!data.thumbnail?.source) {
            console.log(`[NO IMAGE] Verified page found but no thumbnail for ${profile.full_name}`);
            return 'skipped';
        }

        // Step 4: Update database
        await prisma.profile.update({
            where: { id: profile.id },
            data: { portrait_url: data.thumbnail.source },
        });

        console.log(`[SUCCESS] Updated ${profile.full_name}: ${data.thumbnail.source}`);
        return 'updated';
    } catch (error) {
        console.error(`[ERROR] Exception for ${profile.full_name}:`, error);
        return 'failed';
    }
}

async function main() {
    console.log('--- FILLING MISSING DB PORTRAIT IMAGES (WIKIPEDIA) ---\n');

    // Fetch profiles with missing or placeholder portrait URLs
    const profiles = await prisma.profile.findMany({
        where: {
            OR: [
                { portrait_url: null },
                { portrait_url: '' },
                { portrait_url: { startsWith: 'data:image/svg' } },
            ],
        },
        select: {
            id: true,
            full_name: true,
            specialty: true,
            portrait_url: true,
        },
    });

    console.log(`Found ${profiles.length} profiles with missing images.\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < profiles.length; i++) {
        const result = await findImageForProfile(profiles[i]);

        if (result === 'updated') updated++;
        else if (result === 'skipped') skipped++;
        else failed++;

        // Progress log every 25 profiles
        if ((i + 1) % 25 === 0) {
            console.log(`\n--- Progress: ${i + 1}/${profiles.length} ---\n`);
        }

        // Rate limit: 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
    }

    console.log('\n--- RESULTS ---');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${profiles.length}`);
    console.log('--- DONE ---');

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Fatal error:', err);
    prisma.$disconnect();
    process.exit(1);
});
