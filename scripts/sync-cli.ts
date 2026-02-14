
import fs from 'node:fs';
import path from 'node:path';
import { syncDoctorPapers } from '../src/lib/pubmed-sync';
import { calculateMDRScore } from '../src/lib/mdr-score-engine';
import { Tier } from '../src/lib/types'; // Assuming types is pure

// ─── Load .env manually ─────────────────────────────────────────────────────
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env: Record<string, string> = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch {
        return {};
    }
}

const env = loadEnv();
const NCBI_API_KEY = env.NCBI_API_KEY || process.env.NCBI_API_KEY;
const CROSSREF_MAILTO = env.CROSSREF_MAILTO || process.env.CROSSREF_MAILTO;

// ─── Utils ──────────────────────────────────────────────────────────────────

function calculateHIndex(citations: number[]): number {
    citations.sort((a, b) => b - a);
    let h = 0;
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) {
            h = i + 1;
        } else {
            break;
        }
    }
    return h;
}

function calculateYearsActive(papers: any[]): number {
    if (papers.length === 0) return 0;
    const years = papers.map(p => p.publicationYear || new Date(p.publicationDate).getFullYear()).filter(y => !isNaN(y));
    if (years.length === 0) return 0;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return max - min + 1;
}

// ─── Main Sync Logic ────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Starting MDR Global Authority Engine Sync...');
    console.log(`🔑 NCBI Key: ${NCBI_API_KEY ? 'Present' : 'Missing'}`);

    const doctorsDir = path.resolve(process.cwd(), 'src/content/doctors');
    if (!fs.existsSync(doctorsDir)) {
        console.error('❌ Doctors directory not found:', doctorsDir);
        process.exit(1);
    }

    const files = fs.readdirSync(doctorsDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} profiles to sync.`);

    for (const file of files) {
        const filePath = path.join(doctorsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const doctor = JSON.parse(content);

        console.log(`\n🔄 Syncing ${doctor.fullName} (${file})...`);

        try {
            // Run PubMed Sync
            const syncResult = await syncDoctorPapers({
                doctorName: doctor.fullName,
                orcid: doctor.orcidId,
                ncbiApiKey: NCBI_API_KEY,
                crossrefMailto: CROSSREF_MAILTO,
                maxPapers: 200
            });

            console.log(`   - Found ${syncResult.papers.length} papers`);

            // Calculate Stats
            const citationCounts = syncResult.papers.map(p => p.citationCount || 0);
            const hIndex = calculateHIndex(citationCounts);
            const yearsActive = calculateYearsActive(syncResult.papers);

            // Update Citations Schema
            const citations = syncResult.papers.map(p => ({
                doi: p.doi || '',
                title: p.title,
                journal: p.journal,
                year: p.publicationYear || new Date().getFullYear(),
                verified: true,
                citationCount: p.citationCount || 0,
                journalImpactFactor: p.journalImpactFactor,
                evidenceClassification: p.evidenceLabel,
                isOpenAccess: p.isOpenAccess,
                openAccessUrl: p.openAccessUrl
            }));

            // Recalculate Score
            const scoreInput = {
                citations: citations.length,
                yearsActive: yearsActive,
                hIndex: hIndex,
                verifiedSurgeries: doctor.verifiedSurgeries || 0,
                liveSaved: doctor.livesSaved || 0,
                techniquesInvented: doctor.techniquesInvented?.length || 0,
                hasInvention: doctor.hasInvention || false,
                licenseVerified: true,
                boardCertifications: 1,
                manualVerifications: 0,
                techniqueInventionBonus: doctor.techniquesInvented?.length > 0 ? 1 : 0,
                pillars: {
                    clinicalMasteryIndex: 0,
                    intellectualLegacy: 0,
                    globalMentorshipScore: 0,
                    humanitarianImpact: 0
                },
                isHistorical: doctor.status === 'HISTORICAL',
                yearOfDeath: doctor.dateOfDeath ? new Date(doctor.dateOfDeath).getFullYear() : undefined,

                // V2 Fields
                honors: doctor.awards || [],
                journalImpactFactors: citations.map(c => ({
                    journal: c.journal,
                    citationCount: c.citationCount || 0
                })),
                isPioneer: doctor.isPioneer || false, // Should update?
                isLeader: doctor.isLeader || false,
                hasRetraction: false // Default to false unless check
            };

            const scoreResult = calculateMDRScore(scoreInput);

            console.log(`   - New H-Index: ${hIndex}`);
            console.log(`   - New Score: ${scoreResult.score} (${scoreResult.tier})`);

            // Update Data
            const updatedData = {
                ...doctor,
                hIndex: hIndex,
                yearsActive: yearsActive,
                citations: citations,
                rankingScore: scoreResult.score,
                tier: scoreResult.tier || doctor.tier,
                lastSyncedAt: new Date().toISOString()
            };

            fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
            console.log(`   ✅ Updated ${file}`);

        } catch (error) {
            console.error(`   ❌ Failed to sync ${doctor.fullName}:`, error);
        }
    }

    console.log('\n✨ All syncs complete.');
}

main().catch(console.error);
