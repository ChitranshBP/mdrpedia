const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');
const BATCH_SIZE = 50; // Respect API etiquette
const DELAY_MS = 1000; // 1 second between requests

// ----------------------------------------------------------------------------
// WIKIPEDIA REST API HELPER (Better for summaries/images)
// ----------------------------------------------------------------------------
async function fetchWikipediaData(doctorName) {
    try {
        // 1. Search for page title
        let searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(doctorName)}&limit=1&namespace=0&format=json`;
        let searchRes = await fetch(searchUrl);
        let searchData = await searchRes.json();

        // 2. Retry with "Firstname Lastname" if "F. Lastname" fails
        if ((!searchData[1] || searchData[1].length === 0) && doctorName.includes('.')) {
            // Try stripping initials: "A. C. Dhariwal" -> "Dhariwal" (Too broad?)
            // Better: If we have "A. C. Dhariwal", try "Anil Dhariwal" via search? No, we don't know "Anil".
            // Try searching just the last name + "doctor" or "medicine"? No, Wiki search is specific.

            // Not easy with opensearch.

            // Optimization: Try removing the middle initial. "Walter C. Willett" -> "Walter Willett"
            const cleanName = doctorName.replace(/ [A-Z]\. /g, ' ');
            if (cleanName !== doctorName) {
                console.log(`   [~] Retrying with: "${cleanName}"`);
                searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanName)}&limit=1&namespace=0&format=json`);
                searchData = await searchRes.json();
            }
        }

        // opensearch returns [term, [titles], [descriptions], [urls]]
        if (!searchData[1] || searchData[1].length === 0) return null;

        const title = searchData[1][0];
        const url = searchData[3][0];

        // Verify relevance (simple check)
        // Split name into parts and ensure at least the last name is in the title
        const nameParts = doctorName.split(' ');
        const lastName = nameParts[nameParts.length - 1].replace(/[^a-zA-Z]/g, '');

        // If the query was "A. C. Dhariwal" and result is "Dhariwal", we might accept it? 
        // Or if result is "Anil Dhariwal"?
        // Let's be slightly more lenient but still safe.
        // If the title contains the last name, we check if the first letter matches (if available in title).

        if (!title.toLowerCase().includes(lastName.toLowerCase())) {
            console.log(`   [?] Weak match: "${doctorName}" -> "${title}". Skipping.`);
            return null;
        }

        // 2. Fetch Summary via REST API
        // https://en.wikipedia.org/api/rest_v1/page/summary/{title}
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryRes = await fetch(summaryUrl);

        if (!summaryRes.ok) return null;

        const summaryData = await summaryRes.json();

        return {
            bio: summaryData.extract,
            imageUrl: summaryData.originalimage ? summaryData.originalimage.source : (summaryData.thumbnail ? summaryData.thumbnail.source : null),
            wikiUrl: url
        };

    } catch (e) {
        console.error(`   [!] Error fetching ${doctorName}:`, e.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// MAIN LOOP
// ----------------------------------------------------------------------------
async function main() {
    console.log('📚 Starting Wikipedia Enrichment...');

    // Get all JSON files
    if (!fs.existsSync(DOCTORS_DIR)) {
        console.error("Doctors directory not found.");
        return;
    }

    const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} profiles.`);

    let enrichedCount = 0;
    let skippedCount = 0;

    // Shuffle or sort? Let's just process.
    // Ideally we skip files that already have portraits to save time.

    for (const file of files) {
        const filePath = path.join(DOCTORS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Skip if already has portrait AND bio length > 100 (assume populated)
        if (data.portraitUrl && data.biography && data.biography.length > 150) {
            // console.log(`[OK] Skipping ${data.fullName} (Already enriched)`);
            continue;
        }

        console.log(`🔎 Enriching: ${data.fullName}...`);

        // Fetch
        await new Promise(r => setTimeout(r, DELAY_MS));
        const wikiData = await fetchWikipediaData(data.fullName);

        if (wikiData) {
            let updated = false;

            // Update Bio if current is placeholder
            if (wikiData.bio && (!data.biography || data.biography.length < 50 || data.biography.includes('noted medical professional'))) {
                data.biography = wikiData.bio;
                data.aiSummary = wikiData.bio.substring(0, 200) + '...';
                updated = true;
            }

            // Update Image if missing
            if (wikiData.imageUrl && !data.portraitUrl) {
                data.portraitUrl = wikiData.imageUrl;
                updated = true;
            }

            // Add Wiki Link to Social/KnowsAbout?
            // Optional.

            if (updated) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`   ✅ Updated ${data.fullName}`);
                enrichedCount++;
            } else {
                console.log(`   [-] Data found but no update needed.`);
            }
        } else {
            console.log(`   [x] No Wikipedia match.`);
            skippedCount++;
        }

        // Safety Break for Testing (remove later)
        // if (enrichedCount >= 50) break; 
    }

    console.log('------------------------------------------------');
    console.log(`Enrichment Complete.`);
    console.log(`Updated: ${enrichedCount}`);
    console.log(`No Match: ${skippedCount}`);
}

main();
