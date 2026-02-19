
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');

// Helper: Normalize name for Wikipedia search
function normalizeForWiki(name: string) {
    return name.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('_');
}

async function findImageForDoctor(file: string) {
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const doctor = JSON.parse(content);

        // Skip if already has a valid image URL
        if (doctor.portraitUrl && !doctor.portraitUrl.startsWith('data:image/svg') && doctor.portraitUrl.length > 50) {
            return;
        }

        console.log(`[SEARCH] Looking for image for ${doctor.fullName}...`);

        // 1. Try Wikipedia API
        const wikiName = normalizeForWiki(doctor.fullName);
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`;

        const res = await fetch(wikiUrl);
        if (res.ok) {
            const data: any = await res.json();
            if (data.thumbnail && data.thumbnail.source) {
                console.log(`[FOUND] Wikipedia image for ${doctor.fullName}: ${data.thumbnail.source}`);
                doctor.portraitUrl = data.thumbnail.source;
                fs.writeFileSync(file, JSON.stringify(doctor, null, 2));
                return;
            }
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 500));

    } catch (error) {
        console.error(`[ERROR] Failed to fetch for ${file}:`, error);
    }
}

async function main() {
    console.log('--- STARTING IMAGE FETCHING SCAN ---');
    const files = await glob(`${DOCTORS_DIR}/*.json`);
    console.log(`Found ${files.length} profiles. Scanning for missing images...`);

    let processed = 0;
    for (const file of files) {
        await findImageForDoctor(file);
        processed++;
        if (processed % 50 === 0) console.log(`Processed ${processed}/${files.length} profiles...`);
    }
    console.log('--- IMAGE FETCHING COMPLETE ---');
}

main();
