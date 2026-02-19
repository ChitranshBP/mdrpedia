
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Rate limiting and state tracking
const STATUS_FILE = path.join(process.cwd(), 'generation_status.json');

async function saveStatus(status: any) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

async function loadStatus() {
    if (fs.existsSync(STATUS_FILE)) {
        return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    return { processed: [], errors: [] };
}

async function generateBio(doctor: any): Promise<string | null> {
    if (!OPENROUTER_API_KEY) {
        console.error('MISSING_KEY: No OpenRouter API Key found.');
        return null;
    }

    // Using a powerful free model from OpenRouter
    const MODEL = "google/gemini-2.0-flash-001";

    const prompt = `
    You are an expert medical biographer. Write a comprehensive, 1500-word biography for Dr. ${doctor.fullName}.
    
    Data to use:
    - Specialty: ${doctor.specialty}
    - Sub-specialty: ${doctor.subSpecialty || 'N/A'}
    - Practice: ${doctor.institution?.name || 'Private Practice'}
    - Location: ${doctor.location || 'Unknown'}
    - Known for: ${doctor.bio || 'General medical excellence'}
    
    Structure the biography with the following markdown H2 sections:
    1. **Early Life and Education**: Academic background, early influences, and medical training.
    2. **Medical Philosophy**: Their approach to patient care, innovative thinking, and practice ethics.
    3. **Key Procedures & Clinical Expertise**: Detailed exploration of their technical skills and specialization in ${doctor.specialty}.
    4. **Academic Contributions & Research**: Key publications, research focus areas, and impact on medical science.
    5. **Patient Impact & Community Work**: Notable achievements in patient outcomes and social/community contributions.
    6. **Legacy and Future Outlook**: Overall standing in the medical community and their lasting influence.

    Tone: Professional, authoritative, yet accessible. Avoid generic AI fluff; focus on factual-sounding clinical and academic depth.
    Format: Markdown.
    Length: Aim for 1200-1500 words. Expand deeply on each section.
    `;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://mdrpedia.com', // Optional, for OpenRouter tracking
                'X-Title': 'MDRPedia Content Generator'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
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

async function main() {
    console.log('--- STARTING DETAILED CONTENT GENERATION (OPENROUTER) ---');

    if (!OPENROUTER_API_KEY) {
        console.log('⚠️  NO OPENROUTER API KEY DETECTED. SKIPPING GENERATION.');
        return;
    }

    const files = await glob(`${DOCTORS_DIR}/*.json`);
    const status = await loadStatus();

    console.log(`Found ${files.length} profiles. Checking priority...`);

    let count = 0;
    for (const file of files) {
        if (status.processed.includes(file)) {
            continue;
        }

        const rawData = fs.readFileSync(file, 'utf-8');
        const content = JSON.parse(rawData);

        // Skip if already has long bio (length > 4000 chars for ~1000+ words)
        if (content.bio && content.bio.length > 4000) {
            console.log(`Skipping ${content.fullName} (already has long bio)`);
            status.processed.push(file);
            await saveStatus(status);
            continue;
        }

        console.log(`[${count + 1}] Generating bio for ${content.fullName}...`);
        const longBio = await generateBio(content);

        if (longBio) {
            content.bio = longBio;
            content.bioGenerated = true;
            fs.writeFileSync(file, JSON.stringify(content, null, 2));
            console.log(`✅ Updated ${content.fullName} (${longBio.length} chars)`);
            status.processed.push(file);
        } else {
            console.log(`❌ Failed to generate for ${content.fullName}`);
            status.errors.push(file);
        }

        await saveStatus(status);

        // Polite delay for rate limits on free models
        await new Promise(r => setTimeout(r, 2000));

        count++;
    }

    console.log('--- GENERATION PASS COMPLETE ---');
}

main();
