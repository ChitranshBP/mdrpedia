
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '../doctors_list.txt'), 'utf-8');
const outDir = path.join(__dirname, '../src/content/doctors');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const lines = raw.split('\n').filter(l => l.trim().length > 0);

lines.forEach(line => {
    // Handling tab separated values or multiple spaces
    let parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length < 2) {
        parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    }

    const name = parts[0] || "";
    const institution = parts[1] || "";
    const specialty = parts[2] || "General Practice";
    const impact = parts[3] || "";

    if (!name) return;

    const slug = name.toLowerCase()
        .replace(/^[a-z]\.\s+/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const doctor = {
        fullName: name,
        title: "MD", // Default
        specialty: specialty,
        status: "LIVING", // Default
        tier: "UNRANKED", // Default
        rankingScore: 0,
        hIndex: 0,
        yearsActive: 0,
        verifiedSurgeries: 0,
        biography: impact ? `Known for ${impact}. Associated with ${institution}.` : `Specialist in ${specialty} at ${institution}.`,
        livesSaved: 0,
        techniquesInvented: [],
        hasInvention: false,
        geography: {
            country: "India", // Default based on list context
        },
        citations: [],
        awards: [],
        timeline: [],
        // New fields
        aiSummary: impact || "",
        affiliations: institution ? [{
            hospitalName: institution,
            role: "Primary Affiliation"
        }] : [],
        medicalSpecialty: [specialty],
        knowsAbout: impact ? [impact] : []
    };

    fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(doctor, null, 2));
    console.log(`Created ${slug}.json`);
});
