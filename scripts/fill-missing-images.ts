
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import fetch from 'node-fetch';

const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');

// Helper: Normalize name for Wikipedia search
function normalizeForWiki(name: string) {
    return name.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('_');
}

async function findImageForDoctor(doctorPath: string) {
    const content = fs.readFileSync(doctorPath, 'utf-8');
    const doctor = JSON.parse(content);

    if (doctor.portraitUrl && !doctor.portraitUrl.startsWith('data:image/svg')) {
        console.log(`[SKIP] ${doctor.fullName} already has an image.`);
        return;
    }

    console.log(`[SEARCH] Looking for image for ${doctor.fullName}...`);

    try {
        // 1. Try Wikipedia API
        const wikiName = normalizeForWiki(doctor.fullName);
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`;

        const res = await fetch(wikiUrl);
        if (res.ok) {
            const data: any = await res.json();
            if (data.thumbnail && data.thumbnail.source) {
                console.log(`[FOUND] Wikipedia image for ${doctor.fullName}: ${data.thumbnail.source}`);
                doctor.portraitUrl = data.thumbnail.source;
                fs.writeFileSync(doctorPath, JSON.stringify(doctor, null, 2));
                return;
            }
        }

        // 2. Try OpenAlex if OpenAlex ID exists
        if (doctor.openalexId) {
            // Logic to fetch from OpenAlex if they provide images (rarely directly, usually via wikidata)
            // For now, we rely on the main sync script for deep openalex integration.
        }

    } catch (error) {
        console.error(`[ERROR] Failed to fetch for ${doctor.fullName}:`, error);
    }
}

async function main() {
    const files = await glob(`${DOCTORS_DIR}/*.json`);
    console.log(`Found ${files.length} profiles. Scanning for missing images...`);

    for (const file of files) {
        await findImageForDoctor(file);
    }
}

main();
