/**
 * MDRPedia — Fix Corrupted Doctor Data Script
 * Run with: node scripts/fix-doctor-data.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Country code mapping
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
    'Belgium': 'Belgium',
    'Austria': 'Austria',
    'Denmark': 'Denmark',
    'Norway': 'Norway',
    'Ireland': 'Ireland',
    'Taiwan': 'Taiwan',
};

// Parse TSV file
async function parseTSV() {
    const tsvPath = path.join(ROOT, 'src/data/pioneers_clean.tsv');
    const content = await fs.readFile(tsvPath, 'utf-8');
    const lines = content.trim().split('\n');

    const doctors = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('|');
        if (parts.length >= 7) {
            const hIndex = parseInt(parts[4]) || 0;
            doctors.push({
                rank: parseInt(parts[0]) || 0,
                name: parts[1]?.trim() || '',
                affiliation: parts[2]?.trim() || '',
                country: parts[3]?.trim() || '',
                hIndex: hIndex,
                citations: parseInt(parts[5]?.replace(/,/g, '')) || 0,
                specialty: parts[6]?.trim() || 'Medicine',
            });
        }
    }

    return doctors;
}

// Create slug from name
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Calculate tier based on H-index
function calculateTier(hIndex) {
    if (hIndex >= 200) return 'TITAN';
    if (hIndex >= 100) return 'ELITE';
    if (hIndex >= 50) return 'MASTER';
    return 'UNRANKED';
}

// Fix a single doctor profile
async function fixDoctorProfile(tsvDoctor) {
    const slug = createSlug(tsvDoctor.name);
    const jsonPath = path.join(ROOT, 'src/content/doctors', `${slug}.json`);

    const tier = calculateTier(tsvDoctor.hIndex);
    const rankingScore = Math.min(tsvDoctor.hIndex / 5, 100);

    try {
        // Check if file exists
        await fs.access(jsonPath);

        // Read existing data
        const content = await fs.readFile(jsonPath, 'utf-8');
        const existingData = JSON.parse(content);

        // Build updated data - explicitly set all fields AFTER spread to ensure override
        const updatedData = {
            // Spread existing data first
            ...existingData,
            // Then explicitly override the corrupted/important fields
            fullName: tsvDoctor.name,
            title: existingData.title || 'MD',
            specialty: tsvDoctor.specialty,
            subSpecialty: existingData.subSpecialty || null,
            geography: {
                country: COUNTRY_MAP[tsvDoctor.country] || tsvDoctor.country,
                region: existingData.geography?.region || null,
                city: existingData.geography?.city || null
            },
            // IMPORTANT: Force these values from TSV
            hIndex: tsvDoctor.hIndex,
            tier: tier,
            rankingScore: rankingScore,
            // Update other fields
            medicalSpecialty: [tsvDoctor.specialty],
            affiliations: [{
                hospitalName: tsvDoctor.affiliation,
                role: existingData.affiliations?.[0]?.role || 'Faculty',
                hospitalUrl: existingData.affiliations?.[0]?.hospitalUrl || '#'
            }],
            biography: existingData.biography || `${tsvDoctor.name} is a leading specialist in ${tsvDoctor.specialty} at ${tsvDoctor.affiliation}.`,
            lastFixedAt: new Date().toISOString(),
        };

        // Write back
        await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));

        // Verify the write
        const verifyContent = await fs.readFile(jsonPath, 'utf-8');
        const verifyData = JSON.parse(verifyContent);

        if (verifyData.hIndex !== tsvDoctor.hIndex) {
            return {
                success: false,
                action: 'error',
                message: `VERIFY FAILED ${tsvDoctor.name}: expected hIndex=${tsvDoctor.hIndex}, got ${verifyData.hIndex}`
            };
        }

        return {
            success: true,
            action: 'updated',
            message: `Fixed ${tsvDoctor.name}: specialty=${tsvDoctor.specialty}, H-index=${tsvDoctor.hIndex}, tier=${tier}`
        };
    } catch (e) {
        if (e.code === 'ENOENT') {
            // File doesn't exist - create it
            const newData = {
                fullName: tsvDoctor.name,
                slug: slug,
                title: 'MD',
                specialty: tsvDoctor.specialty,
                subSpecialty: null,
                geography: {
                    country: COUNTRY_MAP[tsvDoctor.country] || tsvDoctor.country,
                    region: null,
                    city: null
                },
                status: 'LIVING',
                tier: tier,
                rankingScore: rankingScore,
                hIndex: tsvDoctor.hIndex,
                yearsActive: 0,
                verifiedSurgeries: 0,
                livesSaved: 0,
                biography: `${tsvDoctor.name} is a leading specialist in ${tsvDoctor.specialty} at ${tsvDoctor.affiliation}.`,
                aiSummary: null,
                techniquesInvented: [],
                hasInvention: false,
                portraitUrl: null,
                galleryUrls: [],
                npiNumber: null,
                orcidId: null,
                medicalSpecialty: [tsvDoctor.specialty],
                knowsAbout: [],
                affiliations: [{
                    hospitalName: tsvDoctor.affiliation,
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

            await fs.writeFile(jsonPath, JSON.stringify(newData, null, 2));

            return {
                success: true,
                action: 'created',
                message: `Created ${tsvDoctor.name}: specialty=${tsvDoctor.specialty}, H-index=${tsvDoctor.hIndex}, tier=${tier}`
            };
        }

        return {
            success: false,
            action: 'error',
            message: `Error fixing ${tsvDoctor.name}: ${e.message}`
        };
    }
}

// Main function
async function main() {
    console.log('🔧 MDRPedia Data Fix Script');
    console.log('===========================\n');

    // Parse TSV
    console.log('📖 Reading pioneers_raw.tsv...');
    const tsvDoctors = await parseTSV();
    console.log(`   Found ${tsvDoctors.length} doctors in TSV`);

    // Show sample data
    console.log(`   Sample: ${tsvDoctors[0].name} - H-index: ${tsvDoctors[0].hIndex}, Specialty: ${tsvDoctors[0].specialty}\n`);

    // Stats
    let updated = 0;
    let created = 0;
    let errors = 0;

    // Fix each doctor
    console.log('🔄 Fixing doctor profiles...\n');

    for (const tsvDoctor of tsvDoctors) {
        const result = await fixDoctorProfile(tsvDoctor);

        if (result.success) {
            if (result.action === 'updated') {
                console.log(`✅ ${result.message}`);
                updated++;
            } else {
                console.log(`🆕 ${result.message}`);
                created++;
            }
        } else {
            console.log(`❌ ${result.message}`);
            errors++;
        }
    }

    // Summary
    console.log('\n===========================');
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   🆕 Created: ${created}`);
    console.log(`   ❌ Errors:  ${errors}`);
    console.log(`   📁 Total:   ${tsvDoctors.length}`);
    console.log('\n✨ Done!');
}

main().catch(console.error);
