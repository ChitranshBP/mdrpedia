/**
 * MDRPedia — Fix Corrupted Data API
 * Re-imports doctor data from pioneers_raw.tsv to fix specialty/h-index issues
 */

export const prerender = false;

import fs from 'node:fs/promises';
import path from 'node:path';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';

interface TSVDoctor {
    rank: number;
    name: string;
    affiliation: string;
    country: string;
    hIndex: number;
    citations: number;
    specialty: string;
}

// Parse TSV file
async function parseTSV(): Promise<TSVDoctor[]> {
    const tsvPath = path.join(process.cwd(), 'src/data/pioneers_clean.tsv');
    const content = await fs.readFile(tsvPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Skip header
    const doctors: TSVDoctor[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('|');
        if (parts.length >= 7) {
            doctors.push({
                rank: parseInt(parts[0]) || 0,
                name: parts[1]?.trim() || '',
                affiliation: parts[2]?.trim() || '',
                country: parts[3]?.trim() || '',
                hIndex: parseInt(parts[4]) || 0,
                citations: parseInt(parts[5]?.replace(/,/g, '')) || 0,
                specialty: parts[6]?.trim() || 'Medicine',
            });
        }
    }

    return doctors;
}

// Create slug from name
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Country code mapping
const COUNTRY_MAP: Record<string, string> = {
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

// Fix a single doctor profile
async function fixDoctorProfile(tsvDoctor: TSVDoctor): Promise<{ success: boolean; message: string }> {
    const slug = createSlug(tsvDoctor.name);
    const jsonPath = path.join(process.cwd(), 'src/content/doctors', `${slug}.json`);

    try {
        // Check if file exists
        await fs.access(jsonPath);

        // Read existing data
        const content = await fs.readFile(jsonPath, 'utf-8');
        const existingData = JSON.parse(content);

        // Fix the corrupted fields
        const updatedData = {
            ...existingData,
            fullName: tsvDoctor.name,
            title: 'MD', // Default title
            specialty: tsvDoctor.specialty,
            subSpecialty: null,
            geography: {
                country: COUNTRY_MAP[tsvDoctor.country] || tsvDoctor.country,
                region: null,
                city: null
            },
            hIndex: tsvDoctor.hIndex,
            medicalSpecialty: [tsvDoctor.specialty],
            affiliations: [{
                hospitalName: tsvDoctor.affiliation,
                role: 'Faculty',
                hospitalUrl: '#'
            }],
            biography: `${tsvDoctor.name} is a leading specialist in ${tsvDoctor.specialty} at ${tsvDoctor.affiliation}.`,
            // Calculate tier based on H-index
            tier: tsvDoctor.hIndex >= 200 ? 'TITAN' :
                  tsvDoctor.hIndex >= 100 ? 'ELITE' :
                  tsvDoctor.hIndex >= 50 ? 'MASTER' : 'UNRANKED',
            rankingScore: Math.min(tsvDoctor.hIndex / 5, 100),
            lastFixedAt: new Date().toISOString(),
        };

        // Write back
        await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));

        return {
            success: true,
            message: `Fixed ${tsvDoctor.name}: specialty=${tsvDoctor.specialty}, H-index=${tsvDoctor.hIndex}`
        };
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
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
                tier: tsvDoctor.hIndex >= 300 ? 'TITAN' :
                      tsvDoctor.hIndex >= 150 ? 'ELITE' :
                      tsvDoctor.hIndex >= 50 ? 'MASTER' : 'UNRANKED',
                rankingScore: Math.min(tsvDoctor.hIndex / 5, 100),
                hIndex: tsvDoctor.hIndex,
                yearsActive: 0,
                verifiedSurgeries: 0,
                livesSaved: 0,
                biography: `${tsvDoctor.name} is a leading specialist in ${tsvDoctor.specialty} at ${tsvDoctor.affiliation}.`,
                aiSummary: null,
                techniquesInvented: [],
                hasInvention: false,
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
                message: `Created ${tsvDoctor.name}: specialty=${tsvDoctor.specialty}, H-index=${tsvDoctor.hIndex}`
            };
        }

        return {
            success: false,
            message: `Error fixing ${tsvDoctor.name}: ${(e as Error).message}`
        };
    }
}

export async function POST({ request }: { request: Request }) {
    // Auth check
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const body = await request.json();
    const { action, slug } = body;

    await logAdminAction('FIX_DATA', slug || 'bulk', { action }, request);

    const encoder = new TextEncoder();

    // Parse TSV
    const tsvDoctors = await parseTSV();

    // Single fix
    if (action === 'fix_single' && slug) {
        const tsvDoctor = tsvDoctors.find(d => createSlug(d.name) === slug);
        if (!tsvDoctor) {
            return new Response(JSON.stringify({ success: false, message: "Doctor not found in TSV" }), { status: 404 });
        }

        const result = await fixDoctorProfile(tsvDoctor);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 400 });
    }

    // Bulk fix
    if (action === 'fix_all') {
        const stream = new ReadableStream({
            async start(controller) {
                const send = (msg: string, type = 'info') => {
                    controller.enqueue(encoder.encode(JSON.stringify({ message: msg, type }) + '\n'));
                };

                send(`Found ${tsvDoctors.length} doctors in TSV file`);

                let successCount = 0;
                let failCount = 0;

                for (const tsvDoctor of tsvDoctors) {
                    const result = await fixDoctorProfile(tsvDoctor);
                    if (result.success) {
                        send(`✅ ${result.message}`, 'success');
                        successCount++;
                    } else {
                        send(`❌ ${result.message}`, 'error');
                        failCount++;
                    }
                }

                send(`Fix complete: ${successCount} succeeded, ${failCount} failed`, 'success');
                controller.close();
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'application/x-ndjson' }
        });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'fix_single' or 'fix_all'" }), { status: 400 });
}

// GET handler - show TSV data preview
export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const tsvDoctors = await parseTSV();

        return new Response(JSON.stringify({
            totalInTSV: tsvDoctors.length,
            sample: tsvDoctors.slice(0, 20).map(d => ({
                name: d.name,
                specialty: d.specialty,
                affiliation: d.affiliation,
                country: d.country,
                hIndex: d.hIndex,
                slug: createSlug(d.name)
            }))
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
}
