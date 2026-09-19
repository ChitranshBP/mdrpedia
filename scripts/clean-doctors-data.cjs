const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../doctors_list.txt');
const outputDir = path.join(__dirname, '../src/content/doctors');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
}

function generateSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function processDoctors() {
    console.log('Reading source file...');
    const rawData = fs.readFileSync(sourceFile, 'utf-8');
    const lines = rawData.split('\n');

    let processedCount = 0;
    let skippedCount = 0;

    console.log(`Found ${lines.length} lines. Processing...`);

    for (const line of lines) {
        if (!line.trim()) continue;

        let parts = [];
        let method = '';

        // 1. Try Tab
        if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim()).filter(p => p);
            method = 'tab';
        }

        // 2. Try Multiple Spaces (if tab didn't work or gave 1 part)
        if (parts.length < 2) {
            parts = line.trim().split(/\s{2,}/).map(p => p.trim()).filter(p => p);
            method = 'spaces';
        }

        // 3. Try CamelCase Boundary (Last Resort for concatenated lines)
        // e.g. "Aaron CiechanoverTechnionBiochemistry..."
        // Look for [a-z][A-Z] transitions
        if (parts.length < 2) {
            // Split by the boundary between lowercase and uppercase
            // We use a regex with lookbehind/lookahead equivalent logic
            // creating a split but keeping the delimiters is hard in JS split, 
            // so we replace the boundary with a delimiter first.
            const spaced = line.replace(/([a-z])([A-Z])/g, '$1|$2');
            parts = spaced.split('|').map(p => p.trim()).filter(p => p);
            method = 'camel';
        }

        // FAIL CHECK
        if (parts.length < 2) {
            console.warn(`[SKIP] Could not parse line: "${line.substring(0, 50)}..."`);
            skippedCount++;
            continue;
        }

        const fullName = cleanText(parts[0]);
        // Sanity check: Name shouldn't be too long. 
        // If it's > 50 chars, it's probably still concatenated junk that survived the split.
        if (fullName.length > 50) {
            console.warn(`[SKIP] Name too long (${fullName.length}): "${fullName.substring(0, 50)}..."`);
            skippedCount++;
            continue;
        }

        // Skip common false positives if splitting by camel case
        // e.g. "McDonald" -> "Mc", "Donald". 
        // Heuristic: If part 0 is very short (< 4 chars) and part 1 is short, maybe it's a name part.
        // But most doctors have full names. "Li Bin" is 6 chars. "A. K. Jain" is 10.
        // "Mc" is 2. 
        if (fullName.length < 4 && method === 'camel') {
            // Risky. Let's skip for safety or try to merge?
            // Actually, "Li Bin" might be split if written as "LiBin".
            // "LiBin" -> "Li", "Bin". Name="Li". 
            // If the name is just "Li", that's weird.
            // We'll trust the length check for now.
        }

        const institution = parts.length > 1 ? cleanText(parts[1]) : '';
        const specialty = parts.length > 2 ? cleanText(parts[2]) : 'Medicine';
        const notes = parts.length > 3 ? cleanText(parts[3]) : '';

        const slug = generateSlug(fullName);
        const fileName = `${slug}.json`;
        const filePath = path.join(outputDir, fileName);

        const doctorData = {
            fullName: fullName,
            slug: slug,
            title: "MD",
            specialty: specialty,
            subSpecialty: null,
            geography: {
                country: "Global",
                city: null,
                region: null
            },
            status: "LIVING",
            tier: "UNRANKED",
            rankingScore: 0,
            hIndex: 0,
            yearsActive: 0,
            verifiedSurgeries: 0,
            livesSaved: 0,
            biography: notes ? `${notes}. Associated with ${institution}.` : `Specialist in ${specialty} at ${institution}.`,
            aiSummary: notes,
            portraitUrl: null,
            techniquesInvented: [],
            hasInvention: false,
            dateOfBirth: null,
            dateOfDeath: null,
            education: institution ? [institution] : [],
            socialMedia: {},
            affiliations: institution ? [{
                hospitalName: institution,
                role: "Member",
                hospitalUrl: "#"
            }] : [],
            medicalSpecialty: [specialty],
            knowsAbout: notes ? [notes] : [],
            citations: [],
            awards: [],
            timeline: []
        };

        try {
            fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2));
            processedCount++;
        } catch (err) {
            console.error(`Error writing file for ${fullName}:`, err);
            skippedCount++;
        }
    }

    console.log(`Migration complete.`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

processDoctors();
