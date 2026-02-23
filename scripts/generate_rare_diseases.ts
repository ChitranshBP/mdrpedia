import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { glob } from 'glob';

dotenv.config();

const RARE_DISEASES_DIR = path.join(process.cwd(), 'src/content/rareDiseases');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-001";

async function fetchLLM(prompt: string, expectJson: boolean = false): Promise<string | null> {
    if (!OPENROUTER_API_KEY) {
        console.error('MISSING_KEY: No OpenRouter API Key found.');
        return null;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://mdrpedia.com',
                'X-Title': 'MDRPedia Content Generator'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: expectJson ? { type: "json_object" } : undefined
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`API Error (${response.status}): ${error}`);
            return null;
        }

        const data: any = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

const JSON_SCHEMA = `
{
    "name": "string (Official Disease Name)",
    "slug": "string (kebab-case)",
    "aliases": ["string"],
    "description": "string (1 paragraph overview)",
    "category": "string (e.g. NEUROLOGICAL, GENETIC, METABOLIC, AUTOIMMUNE, ONCOLOGICAL)",
    "icdCode": "string",
    "orphaCode": "string",
    "omimCode": "string",
    "prevalence": "string",
    "estimatedCases": number,
    "ageOfOnset": "string",
    "inheritance": "string (e.g. AUTOSOMAL_RECESSIVE, AUTOSOMAL_DOMINANT, X_LINKED, SPORADIC)",
    "symptoms": ["string"],
    "affectedSystems": ["string"],
    "prognosis": "string",
    "lifeExpectancy": "string",
    "diagnosticMethods": ["string"],
    "treatmentOptions": [
        {
            "name": "string",
            "type": "string (MEDICATION, SUPPORTIVE, THERAPY, GENE_THERAPY, SURGERY)",
            "effectiveness": "string (MODERATELY_EFFECTIVE, HIGHLY_EFFECTIVE, EXPERIMENTAL, SUPPORTIVE)",
            "fdaApproved": boolean,
            "approvalYear": number | null
        }
    ],
    "researchStatus": "string (ACTIVE_TRIALS, OBSERVATIONAL, PRECLINICAL)",
    "clinicalTrialsCount": number,
    "keyResearchCenters": ["string"],
    "patientOrganizations": [
        {
            "name": "string",
            "url": "string",
            "country": "string"
        }
    ],
    "relatedConditions": ["string"],
    "specialistTypes": ["string"],
    "eli5Summary": "string (Explain like I'm 5)",
    "clinicalSummary": "string (Detailed medical pathology and clinical overview)",
    "historicalBackground": "string",
    "recentBreakthroughs": [
        {
            "year": number,
            "title": "string",
            "description": "string",
            "sourceUrl": null
        }
    ],
    "heroImage": null,
    "diagrams": [],
    "lastUpdated": "2024-12-01",
    "reviewedBy": "MDRPedia Medical Team",
    "sources": [
        {
            "name": "string",
            "url": "string"
        }
    ]
}
`;

function cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('\`\`\`json')) {
        clean = clean.replace(/^\`\`\`json\n/, '');
    }
    if (clean.startsWith('\`\`\`')) {
        clean = clean.replace(/^\`\`\`\n/, '');
    }
    if (clean.endsWith('\`\`\`')) {
        clean = clean.replace(/\n\`\`\`$/, '');
    }
    return clean;
}

async function main() {
    console.log('--- STARTING RARE DISEASE GENERATOR ---');

    if (!fs.existsSync(RARE_DISEASES_DIR)) {
        fs.mkdirSync(RARE_DISEASES_DIR, { recursive: true });
    }

    const existingFiles = await glob(`${RARE_DISEASES_DIR}/*.json`);
    const existingNames = existingFiles.map((f: string) => path.basename(f, '.json'));

    console.log(`Found ${existingNames.length} existing rare diseases.`);

    const targetCount = 100;

    // Step 1: Get a list of 120 rare diseases to ensure we have enough new ones
    console.log('\n[1] Requesting list of 120 unique rare diseases from LLM...');
    const listPrompt = `
    Please provide a massive list of exactly 120 distinct Rare Diseases.
    Try to cover different categories: genetic, neurological, autoimmune, metabolic, and rare cancers.
    Skip the following diseases because they are already created: ${existingNames.join(', ')}.
    Return ONLY a JSON array of strings containing the official disease titles. No markdown blocks, just the raw JSON array.
    Example: ["Acromegaly", "Alkaptonuria", "Behcet's Disease"]
    `;

    const listRaw = await fetchLLM(listPrompt, true);
    if (!listRaw) {
        console.log('Failed to fetch list immediately.');
        return;
    }

    let diseaseNames: string[] = [];
    try {
        diseaseNames = JSON.parse(cleanJsonString(listRaw));
    } catch (e) {
        console.log('Failed to parse the JSON array array.', e);
        console.log(listRaw);
        return;
    }

    console.log(`Successfully received array of ${diseaseNames.length} diseases.`);

    // Filter out any we already have, just in case
    const toGenerate = diseaseNames
        .filter(name => !existingNames.includes(name.toLowerCase().replace(/[^a-z0-9]+/g, '-')))
        .slice(0, targetCount);

    console.log(`\n[2] Proceeding to generate JSON files for ${toGenerate.length} diseases...\n`);

    let count = 0;
    for (const d of toGenerate) {
        count++;
        const slug = d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const filename = path.join(RARE_DISEASES_DIR, `${slug}.json`);

        if (fs.existsSync(filename)) {
            console.log(`[${count}/${toGenerate.length}] Skipping ${d} (already exists)`);
            continue;
        }

        console.log(`[${count}/${toGenerate.length}] Generating content for: ${d} ...`);

        const prompt = `
        You are a clinical geneticist and expert medical writer for MDRPedia, an advanced medical encyclopedia.
        Your task is to generate a highly detailed, medically accurate, comprehensive JSON profile for the rare disease: "${d}".
        Ensure all information is up-to-date as of 2024. Provide real ICD, ORPHA, and OMIM codes where available.
        List real, accurate treatment options and recent breakthroughs.

        The JSON output must exactly map to the following schema:
        ${JSON_SCHEMA}

        Return ONLY valid JSON. No markdown wrappings (\`\`\`json) outside of the object.
        `;

        const resultJsonStr = await fetchLLM(prompt, true);
        if (!resultJsonStr) {
            console.log(`❌ Failed to fetch generation for ${d}. Retrying in 2 seconds...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
        }

        try {
            const data = JSON.parse(cleanJsonString(resultJsonStr));
            // Force the correct slug in the file just in case LLM got it slightly wrong
            data.slug = slug;
            fs.writeFileSync(filename, JSON.stringify(data, null, 4));
            console.log(`✅ Saved ${slug}.json`);
        } catch (err) {
            console.error(`❌ Failed to parse JSON for ${d}:`, err);
        }

        // Delay 1 second to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n--- ALL GENERATIONS COMPLETED ---');
}

main();
