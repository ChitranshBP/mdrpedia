/**
 * Fix tier assignments based on h-index
 * Run: node scripts/fix-tiers.cjs
 */
const fs = require('fs');
const path = require('path');

const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');

// Tier assignment based on h-index (when other data is missing)
function assignTierByHIndex(hIndex) {
    if (!hIndex || hIndex === 0) return 'UNRANKED';
    if (hIndex >= 150) return 'TITAN';   // Top researchers
    if (hIndex >= 80) return 'ELITE';    // Highly cited
    if (hIndex >= 40) return 'MASTER';   // Established
    return 'UNRANKED';
}

// Process all doctor files
const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));

let updated = 0;
let titans = 0;
let elites = 0;
let masters = 0;

for (const file of files) {
    const filePath = path.join(DOCTORS_DIR, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const doctor = JSON.parse(content);

        const hIndex = doctor.hIndex || 0;
        const newTier = assignTierByHIndex(hIndex);

        // Only update if tier would change to something higher
        const tierRank = { 'TITAN': 4, 'ELITE': 3, 'MASTER': 2, 'UNRANKED': 1 };
        const currentRank = tierRank[doctor.tier] || 1;
        const newRank = tierRank[newTier] || 1;

        if (newRank > currentRank) {
            doctor.tier = newTier;
            fs.writeFileSync(filePath, JSON.stringify(doctor, null, 2));
            console.log(`Updated ${doctor.fullName}: ${doctor.tier} (h-index: ${hIndex})`);
            updated++;
        }

        // Count final tiers
        if (doctor.tier === 'TITAN') titans++;
        else if (doctor.tier === 'ELITE') elites++;
        else if (doctor.tier === 'MASTER') masters++;

    } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
    }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated} doctors`);
console.log(`Titans: ${titans}`);
console.log(`Elite: ${elites}`);
console.log(`Master: ${masters}`);
console.log(`Total: ${files.length}`);
