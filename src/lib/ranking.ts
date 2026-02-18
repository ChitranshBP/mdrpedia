
import fs from 'node:fs';
import path from 'node:path';

// Types
export interface DoctorRank {
    slug: string;
    fullName: string;
    rank: number;
    totalInSpecialty: number;
    specialty: string;
    score: number;
    tier?: string;
}

// Cache
let _rankingCache: Record<string, DoctorRank> | null = null;
const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');

/**
 * Returns a map of doctor slug -> Ranking Info
 */
export function getDoctorRankings(): Record<string, DoctorRank> {
    if (_rankingCache) return _rankingCache;

    const rankings: Record<string, DoctorRank> = {};
    const doctorsBySpecialty: Record<string, { slug: string; fullName: string; score: number; tier: string }[]> = {};

    if (!fs.existsSync(DOCTORS_DIR)) return {};

    const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DOCTORS_DIR, file), 'utf-8'));
            const specialty = data.specialty || 'General Practice';
            const score = data.rankingScore || data.hIndex || 0; // Fallback to H-Index if no score
            const slug = data.slug || file.replace('.json', '');
            const fullName = data.fullName || slug;

            const tier = data.tier || 'UNRANKED';

            if (!doctorsBySpecialty[specialty]) {
                doctorsBySpecialty[specialty] = [];
            }
            doctorsBySpecialty[specialty]?.push({ slug, fullName, score, tier });
        } catch (e) {
            console.error(`Error parsing ${file} for rankings`);
        }
    }

    // Sort and assign ranks
    for (const [specialty, doctors] of Object.entries(doctorsBySpecialty)) {
        // Sort descending by score
        doctors.sort((a, b) => b.score - a.score);

        doctors.forEach((doc, index) => {
            rankings[doc.slug] = {
                slug: doc.slug,
                fullName: doc.fullName, // Now available
                rank: index + 1,
                totalInSpecialty: doctors.length,
                specialty,
                score: doc.score,
                tier: (doc as any).tier
            };
        });
    }

    _rankingCache = rankings;
    return rankings;
}

export function getTopDoctors(specialty?: string, limit = 10): DoctorRank[] {
    const all = getDoctorRankings();
    let list = Object.values(all);

    if (specialty) {
        list = list.filter(d => d.specialty === specialty);
    }

    return list.sort((a, b) => {
        if (a.specialty !== b.specialty && !specialty) return 0; // Mixed sort is hard, stick to score
        return b.score - a.score;
    }).slice(0, limit);
}
