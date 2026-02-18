/**
 * Simple fix script - directly updates all doctor JSON files
 */

import fs from 'fs';
import path from 'path';

const DOCTORS_DIR = '/Users/taps/Desktop/MDRPEDIA/mdrpedia/src/content/doctors';
const TSV_PATH = '/Users/taps/Desktop/MDRPEDIA/mdrpedia/src/data/pioneers_clean.tsv';

const COUNTRY_MAP = {
    'USA': 'United States',
    'UK': 'United Kingdom',
    'Canada': 'Canada',
    'Germany': 'Germany',
    'France': 'France',
    'Japan': 'Japan',
    'China': 'China',
    'Australia': 'Australia',
    'Netherlands': 'Netherlands',
    'Italy': 'Italy',
    'Spain': 'Spain',
    'Switzerland': 'Switzerland',
    'Sweden': 'Sweden',
    'India': 'India',
    'Brazil': 'Brazil',
    'South Korea': 'South Korea',
    'Israel': 'Israel',
    'Singapore': 'Singapore',
    'South Africa': 'South Africa',
    'Finland': 'Finland',
};

function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function calculateTier(hIndex) {
    if (hIndex >= 200) return 'TITAN';
    if (hIndex >= 100) return 'ELITE';
    if (hIndex >= 50) return 'MASTER';
    return 'UNRANKED';
}

// Parse TSV
const tsvContent = fs.readFileSync(TSV_PATH, 'utf-8');
const lines = tsvContent.trim().split('\n');
const doctors = [];

for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|');
    if (parts.length >= 7) {
        doctors.push({
            name: parts[1]?.trim() || '',
            affiliation: parts[2]?.trim() || '',
            country: parts[3]?.trim() || '',
            hIndex: parseInt(parts[4]) || 0,
            specialty: parts[6]?.trim() || 'Medicine',
        });
    }
}

console.log(`Found ${doctors.length} doctors in TSV`);
console.log(`First doctor: ${doctors[0].name} - H-index: ${doctors[0].hIndex}`);
console.log('');

let updated = 0;
let created = 0;
let skipped = 0;

for (const doc of doctors) {
    const slug = createSlug(doc.name);
    const filePath = path.join(DOCTORS_DIR, `${slug}.json`);
    const tier = calculateTier(doc.hIndex);
    const rankingScore = Math.min(doc.hIndex / 5, 100);

    try {
        if (fs.existsSync(filePath)) {
            // Read existing
            const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Update fields
            existing.fullName = doc.name;
            existing.specialty = doc.specialty;
            existing.hIndex = doc.hIndex;
            existing.tier = tier;
            existing.rankingScore = rankingScore;
            existing.geography = {
                country: COUNTRY_MAP[doc.country] || doc.country,
                region: existing.geography?.region || null,
                city: existing.geography?.city || null
            };
            existing.medicalSpecialty = [doc.specialty];
            existing.affiliations = [{
                hospitalName: doc.affiliation,
                role: 'Faculty',
                hospitalUrl: '#'
            }];
            existing.subSpecialty = existing.subSpecialty || null;
            existing.lastFixedAt = new Date().toISOString();

            // Write back
            fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

            console.log(`✅ Updated ${doc.name}: H-index=${doc.hIndex}, tier=${tier}`);
            updated++;
        } else {
            // Create new
            const newData = {
                fullName: doc.name,
                slug: slug,
                title: 'MD',
                specialty: doc.specialty,
                subSpecialty: null,
                geography: {
                    country: COUNTRY_MAP[doc.country] || doc.country,
                    region: null,
                    city: null
                },
                status: 'LIVING',
                tier: tier,
                rankingScore: rankingScore,
                hIndex: doc.hIndex,
                yearsActive: 0,
                verifiedSurgeries: 0,
                livesSaved: 0,
                biography: `${doc.name} is a leading specialist in ${doc.specialty} at ${doc.affiliation}.`,
                aiSummary: null,
                techniquesInvented: [],
                hasInvention: false,
                portraitUrl: null,
                galleryUrls: [],
                npiNumber: null,
                orcidId: null,
                medicalSpecialty: [doc.specialty],
                knowsAbout: [],
                affiliations: [{
                    hospitalName: doc.affiliation,
                    role: 'Faculty',
                    hospitalUrl: '#'
                }],
                citations: [],
                awards: [],
                timeline: [],
                mentors: [],
                students: [],
                lastFixedAt: new Date().toISOString(),
            };

            fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
            console.log(`🆕 Created ${doc.name}: H-index=${doc.hIndex}, tier=${tier}`);
            created++;
        }
    } catch (e) {
        console.log(`❌ Error ${doc.name}: ${e.message}`);
        skipped++;
    }
}

console.log('');
console.log('Summary:');
console.log(`  Updated: ${updated}`);
console.log(`  Created: ${created}`);
console.log(`  Skipped: ${skipped}`);
