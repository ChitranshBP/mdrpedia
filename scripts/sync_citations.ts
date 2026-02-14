
import fs from 'fs';
import path from 'path';

// Manual .env loading
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val) {
                process.env[key.trim()] = val.join('=').trim().replace(/^["'](.*)["']$/, '$1');
            }
        });
    }
} catch (e) {
    console.warn("Could not load .env file");
}

// Configuration
const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const MAX_PAPERS = 5;

// Helper: fetch with delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPapers(authorName: string) {
    if (!NCBI_API_KEY) {
        throw new Error("NCBI_API_KEY is missing in .env");
    }

    console.log(`🔍 Searching PubMed for: ${authorName}...`);

    // 1. Search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(authorName + "[Author]")}&sort=relevance&retmax=${MAX_PAPERS}&retmode=json&api_key=${NCBI_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.statusText}`);
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    console.log(`📄 Found ${ids.length} papers. Fetching details...`);

    // 2. Fetch Summaries
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&api_key=${NCBI_API_KEY}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) throw new Error(`Summary failed: ${summaryRes.statusText}`);
    const summaryData = await summaryRes.json();

    const papers = ids.map((id: string) => {
        const doc = summaryData.result[id];
        return {
            title: doc.title,
            journal: doc.source,
            year: new Date(doc.pubdate).getFullYear() || 2024,
            citationCount: 0, // NCBI doesn't provide this easily in esummary
            doi: doc.elocationid?.replace('doi: ', ''),
            pubmedId: id,
            verified: true, // It's from PubMed
            sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        };
    });

    return papers;
}

async function main() {
    // Check for target slug argument
    const targetSlug = process.argv[2];

    const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
        if (targetSlug && file !== `${targetSlug}.json`) continue;

        const filePath = path.join(DOCTORS_DIR, file);
        const profile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Skip if already has citations (unless forced? We'll assume strict sync adds/overwrites)
        // Actually user said "fetch the top 5".

        try {
            const papers = await fetchPapers(profile.fullName);
            if (papers.length > 0) {
                profile.citations = papers;
                fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
                console.log(`✅ Updated ${profile.fullName} with ${papers.length} papers.`);
            } else {
                console.log(`⚠️ No papers found for ${profile.fullName}.`);
            }
        } catch (e) {
            console.error(`❌ Failed to sync ${profile.fullName}:`, e);
        }

        // Rate limit respect
        await delay(1000); // 1s delay
    }
}

main();
