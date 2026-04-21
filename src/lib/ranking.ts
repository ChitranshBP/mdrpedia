/**
 * MDRPedia — Doctor Rankings
 * Database-first ranking system with static fallback
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma';

// Types
export interface DoctorRank {
    slug: string;
    fullName: string;
    rank: number;
    totalInSpecialty: number;
    specialty: string;
    score: number;
    tier: string;
    portraitUrl?: string;
    hIndex?: number;
    geography?: { country: string; city?: string | null };
}

// Cache
let _rankingCache: Record<string, DoctorRank> | null = null;
const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');

/**
 * Returns a map of doctor slug -> Ranking Info
 * Uses database first, falls back to static files
 */
export async function getDoctorRankingsAsync(): Promise<Record<string, DoctorRank>> {
    if (_rankingCache) return _rankingCache;

    const rankings: Record<string, DoctorRank> = {};
    const doctorsBySpecialty: Record<string, {
        slug: string;
        fullName: string;
        score: number;
        tier: string;
        portraitUrl?: string;
        hIndex?: number;
        geography?: { country: string; city?: string | null };
    }[]> = {};

    try {
        // Try database first
        const dbDoctors = await prisma.profile.findMany({
            select: {
                slug: true,
                full_name: true,
                specialty: true,
                ranking_score: true,
                h_index: true,
                tier: true,
                portrait_url: true,
                geography: {
                    select: {
                        country: true,
                        city: true
                    }
                }
            }
        });

        if (dbDoctors.length === 0) {
            throw new Error('No profiles in database');
        }

        for (const doc of dbDoctors) {
            const specialty = doc.specialty || 'General Practice';
            const score = doc.ranking_score || doc.h_index || 0;
            const tier = doc.tier || 'UNRANKED';

            if (!doctorsBySpecialty[specialty]) {
                doctorsBySpecialty[specialty] = [];
            }
            doctorsBySpecialty[specialty].push({
                slug: doc.slug,
                fullName: doc.full_name,
                score,
                tier,
                portraitUrl: doc.portrait_url || undefined,
                hIndex: doc.h_index,
                geography: doc.geography || undefined
            });
        }
    } catch (e) {
        // Fallback to static files when DB is unavailable

        // Fallback to static files
        if (!fs.existsSync(DOCTORS_DIR)) {
            _rankingCache = {};
            return {};
        }

        const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));

        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(DOCTORS_DIR, file), 'utf-8'));
                const specialty = data.specialty || 'General Practice';
                const score = data.rankingScore || data.hIndex || 0;
                const slug = data.slug || file.replace('.json', '');
                const fullName = data.fullName || slug;
                const tier = data.tier || 'UNRANKED';

                if (!doctorsBySpecialty[specialty]) {
                    doctorsBySpecialty[specialty] = [];
                }
                doctorsBySpecialty[specialty].push({
                    slug,
                    fullName,
                    score,
                    tier,
                    portraitUrl: data.portraitUrl,
                    hIndex: data.hIndex,
                    geography: data.geography
                });
            } catch (err) {
                // Skip unparseable file
            }
        }
    }

    // Sort and assign ranks
    for (const [specialty, doctors] of Object.entries(doctorsBySpecialty)) {
        // Sort descending by score
        doctors.sort((a, b) => b.score - a.score);

        doctors.forEach((doc, index) => {
            rankings[doc.slug] = {
                slug: doc.slug,
                fullName: doc.fullName,
                rank: index + 1,
                totalInSpecialty: doctors.length,
                specialty,
                score: doc.score,
                tier: doc.tier,
                portraitUrl: doc.portraitUrl,
                hIndex: doc.hIndex,
                geography: doc.geography
            };
        });
    }

    _rankingCache = rankings;
    return rankings;
}

/**
 * Synchronous version for static page generation
 * Only reads from static files (no database access)
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
            const score = data.rankingScore || data.hIndex || 0;
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
        doctors.sort((a, b) => b.score - a.score);

        doctors.forEach((doc, index) => {
            rankings[doc.slug] = {
                slug: doc.slug,
                fullName: doc.fullName,
                rank: index + 1,
                totalInSpecialty: doctors.length,
                specialty,
                score: doc.score,
                tier: doc.tier
            };
        });
    }

    _rankingCache = rankings;
    return rankings;
}

export async function getTopDoctorsAsync(specialty?: string, limit = 10): Promise<DoctorRank[]> {
    const all = await getDoctorRankingsAsync();
    let list = Object.values(all);

    if (specialty) {
        list = list.filter(d => d.specialty === specialty);
    }

    return list.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getTopDoctors(specialty?: string, limit = 10): DoctorRank[] {
    const all = getDoctorRankings();
    let list = Object.values(all);

    if (specialty) {
        list = list.filter(d => d.specialty === specialty);
    }

    return list.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Returns the top 100 doctors globally, with optional filters.
 * Tiebreaker: ranking_score DESC, h_index DESC, full_name ASC
 */
export async function getTop100(filters?: { specialty?: string; country?: string }): Promise<(DoctorRank & { globalRank: number })[]> {
    const all = await getDoctorRankingsAsync();
    let list = Object.values(all);

    // Sort globally first for rank assignment
    list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((b.hIndex || 0) !== (a.hIndex || 0)) return (b.hIndex || 0) - (a.hIndex || 0);
        return a.fullName.localeCompare(b.fullName);
    });

    // Assign global ranks
    const ranked = list.slice(0, 100).map((doc, i) => ({
        ...doc,
        globalRank: i + 1,
    }));

    // Apply filters after ranking
    let result = ranked;
    if (filters?.specialty) {
        result = result.filter(d => d.specialty === filters.specialty);
    }
    if (filters?.country) {
        result = result.filter(d => d.geography?.country === filters.country);
    }

    return result;
}

/**
 * Checks if a doctor is in the top 100 and returns their rank.
 * Returns null if not in top 100.
 */
export async function getTop100Rank(slug: string): Promise<number | null> {
    const top100 = await getTop100();
    const entry = top100.find(d => d.slug === slug);
    return entry ? entry.globalRank : null;
}
