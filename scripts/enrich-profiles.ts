
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuthorWorks, searchAuthors, usageStats } from '../src/lib/openalex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.join(__dirname, '../src/content/doctors');

async function enrichProfile(slug: string) {
    const filePath = path.join(CONTENT_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) {
        console.error(`Profile not found: ${slug}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    console.log(`Enriching ${data.fullName} (${slug})...`);

    let openalexId = data.openalexId;

    // 2. Fetch Works (if ID exists)
    if (openalexId) {
        console.log(`  Fetching works for ${openalexId}...`);
        const works = await getAuthorWorks(openalexId, { perPage: 10, sortBy: 'cited_by_count' });

        if (works.count === 0) {
            console.log(`  Existing ID ${openalexId} yielded 0 works. Retrying search...`);
            openalexId = undefined; // Force fallback to search
        } else {
            console.log(`  Found ${works.count} works. Top 10 fetched.`);

            const newCitations = works.results.map(w => ({
                title: w.title,
                journal: w.primary_location?.source?.display_name || 'Unknown Journal',
                year: w.publication_year,
                citationCount: w.cited_by_count,
                doi: w.doi ? w.doi.replace('https://doi.org/', '') : null,
                sourceUrl: w.doi || w.primary_location?.source?.issn_l ? `https://openalex.org/${w.id}` : null,
                verified: true
            }));

            data.citations = newCitations;
            data.openalexId = openalexId.startsWith('https') ? openalexId : `https://openalex.org/${openalexId}`;

            // Update metrics if new H-index is higher (or if missing)
            // We need to fetch author details for this, or trust partial data if available
            // Since we have the ID, let's just stick with citations for now unless we do a fresh search to get stats.
            // Actually, let's optimize: if we have ID, we can fetch author details separately or just use what we have.
            // For now, let's leave H-index update for the search path where we get summary_stats.

            data.lastEnrichedAt = new Date().toISOString();

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`  ✅ Updated ${slug}.json with ${newCitations.length} citations.`);
            return; // Done
        }
    }

    // 1. Discovery (Re-run if ID was bad or missing)
    if (!openalexId) {
        console.log(`  Searching for ${data.fullName}...`);

        let searchRes = { results: [], count: 0 };
        const strategies = [];

        // Strategy 1: Exact Match (Name + Specialty + Country)
        strategies.push(async () => searchAuthors({
            name: data.fullName,
            specialty: data.specialty,
            country: data.geography?.country
        }));

        // Strategy 2: Name + Specialty
        if (data.specialty) {
            strategies.push(async () => searchAuthors({
                name: data.fullName,
                specialty: data.specialty
            }));
        }

        // Strategy 3: Smart Name Variations
        const variations: string[] = [];

        // Original Name
        variations.push(data.fullName);

        // Remove dots: "Joel D. Dudley" -> "Joel D Dudley"
        if (data.fullName.includes('.')) {
            variations.push(data.fullName.replace(/\./g, ''));
        }

        // Remove suffixes
        const suffixes = ['Jr.', 'Sr.', 'III', 'MD', 'PhD'];
        let cleaned = data.fullName;
        suffixes.forEach(s => cleaned = cleaned.replace(new RegExp(`\\s${s}`, 'g'), '').trim());
        if (cleaned !== data.fullName) variations.push(cleaned);

        // Middle name removal (first + last)
        const parts = cleaned.replace(/\./g, '').split(' ');
        if (parts.length > 2) {
            variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
        }

        const uniqueVariations = [...new Set(variations)];

        for (const v of uniqueVariations) {
            strategies.push(async () => {
                console.log(`    Trying name: "${v}"...`);
                return searchAuthors({ name: v });
            });
        }

        // Execute strategies sequentially
        for (const strategy of strategies) {
            // @ts-ignore
            searchRes = await strategy();
            if (searchRes.count > 0) {
                // If we found something with decent stats, break
                const top = searchRes.results[0];
                if (top.works_count >= 5 || (top.summary_stats?.h_index || 0) >= 1) {
                    console.log(`    -> Match found using strategy!`);
                    break;
                }
            }
        }

        if (searchRes.count > 0) {
            const bestMatch = searchRes.results[0];
            console.log(`  Found candidate: ${bestMatch.display_name} (${bestMatch.id})`);
            console.log(`  Stats: Works ${bestMatch.works_count}, H-Index ${bestMatch.summary_stats?.h_index}, Cited ${bestMatch.cited_by_count}`);

            // Auto-accept if reasonably prominent
            if (bestMatch.works_count >= 5 || (bestMatch.summary_stats?.h_index || 0) >= 1) {
                console.log(`  -> Auto-accepting ID: ${bestMatch.id}`);

                // Fetch works for new ID
                const works = await getAuthorWorks(bestMatch.id, { perPage: 10, sortBy: 'cited_by_count' });
                const newCitations = works.results.map(w => ({
                    title: w.title,
                    journal: w.primary_location?.source?.display_name || 'Unknown Journal',
                    year: w.publication_year,
                    citationCount: w.cited_by_count,
                    doi: w.doi ? w.doi.replace('https://doi.org/', '') : null,
                    sourceUrl: w.doi || w.primary_location?.source?.issn_l ? `https://openalex.org/${w.id}` : null,
                    verified: true
                }));

                data.citations = newCitations;
                data.openalexId = bestMatch.id;

                // Update metrics if new H-index is higher (or if missing)
                const newHIndex = bestMatch.summary_stats?.h_index || 0;
                if (!data.hIndex || data.hIndex < newHIndex) {
                    console.log(`    Updating H-Index from ${data.hIndex} to ${newHIndex}`);
                    data.hIndex = newHIndex;
                }

                data.lastEnrichedAt = new Date().toISOString();

                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`  ✅ Enriched ${slug} with ID ${bestMatch.id} and ${newCitations.length} citations.`);
            } else {
                console.log(`  -> Candidate too weak (Works < 5). Skipping.`);
            }
        } else {
            console.log(`  No candidates found.`);
        }
    }
}

// Main execution
const target = process.argv[2];

if (target) {
    if (target === 'scan') {
        const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
        console.log(`Scanning ${files.length} profiles for missing citations...`);
        const targets: string[] = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
            try {
                const data = JSON.parse(content);
                // Enrich if citations are empty OR if they have an OpenAlex ID but 0 citations (re-check)
                if (!data.citations || data.citations.length === 0) {
                    targets.push(file.replace('.json', ''));
                }
            } catch (e) { }
        }

        console.log(`Found ${targets.length} profiles to enrich.`);

        (async () => {
            for (const t of targets) {
                await enrichProfile(t);
                // Polite delay
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        })();

    } else {
        enrichProfile(target);
    }
} else {
    console.log("Usage: npx tsx scripts/enrich-profiles.ts <slug|scan>");
}
