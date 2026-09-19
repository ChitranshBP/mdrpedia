const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../doctors_list_part2.txt');
const outputDir = path.join(__dirname, '../src/content/doctors');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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
        let fullName = line.trim();
        if (!fullName) continue;
        if (fullName === 'Institution') continue; // Skip header

        // Clean up common issues
        fullName = fullName.replace(/[\t\r]/g, '');

        const slug = generateSlug(fullName);
        const fileName = `${slug}.json`;
        const filePath = path.join(outputDir, fileName);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping existing: ${fullName}`);
            skippedCount++;
            continue;
        }

        const doctorData = {
            fullName: fullName,
            slug: slug,
            title: "MD",
            specialty: "Medicine", // Placeholder
            subSpecialty: null,
            geography: {
                country: "Unknown",
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
            biography: `${fullName} is a noted medical professional.`,
            aiSummary: null,
            portraitUrl: null,
            techniquesInvented: [],
            hasInvention: false,
            dateOfBirth: null,
            dateOfDeath: null,
            education: [],
            socialMedia: {},
            affiliations: [],
            medicalSpecialty: ["Medicine"],
            knowsAbout: [],
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

    console.log(`Ingestion complete.`);
    console.log(`New Profiles: ${processedCount}`);
    console.log(`Skipped (Duplicates): ${skippedCount}`);
}

processDoctors();
