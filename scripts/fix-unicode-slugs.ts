/**
 * Repairs profile slugs that were mangled by the old accent-stripping slugify
 * (albert-szent-gy-rgyi), merges the duplicate profiles that produced, and
 * repairs full_name values that were glued to an institution at import.
 *
 *   npx tsx --env-file=.env scripts/fix-unicode-slugs.ts              # dry run, read-only
 *   npx tsx --env-file=.env scripts/fix-unicode-slugs.ts --write-map  # dry run + regenerate src/data/slug-redirects.json
 *   npx tsx --env-file=.env scripts/fix-unicode-slugs.ts --apply      # writes DB rows + renames content files
 *
 * Idempotent: a second run finds nothing left to change.
 */
import fs from 'fs';
import path from 'path';
import { createPrismaClient } from '../src/lib/prisma-factory';
import { slugify } from '../src/lib/slug';

const APPLY = process.argv.includes('--apply');
const WRITE_MAP = process.argv.includes('--write-map') || APPLY;

const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/doctors');
const MAP_FILE = path.resolve(process.cwd(), 'src/data/slug-redirects.json');

/** Names glued to an institution at import, keyed by the slug they produced. */
const OVERRIDES: Record<string, { slug: string; fullName: string }> = {
    'jan-evangelista-purkyn-charles-university': { slug: 'jan-evangelista-purkyne', fullName: 'Jan Evangelista Purkyně' },
    'jaroslav-heyrovsk-charles-university': { slug: 'jaroslav-heyrovsky', fullName: 'Jaroslav Heyrovský' },
    'william-kaelin-jr-dana-farber-cancer-institute': { slug: 'william-kaelin-jr', fullName: 'William Kaelin Jr.' },
    'anton-n-hol-institute-of-organic-chemistry': { slug: 'antonin-holy', fullName: 'Antonín Holý' },
    'joan-massagu-sloan-kettering-spain-origin': { slug: 'joan-massague', fullName: 'Joan Massagué' },
    'katalin-karik-university-of-pennsylvaniam': { slug: 'katalin-kariko', fullName: 'Katalin Karikó' },
    'miros-aw-wielgo-medical-university-of-warsaw': { slug: 'miroslaw-wielgos', fullName: 'Mirosław Wielgoś' },
    'victor-babe-university-of-bucharest': { slug: 'victor-babes', fullName: 'Victor Babeș' },
};

interface Entry {
    source: 'db' | 'content';
    id?: string;
    slug: string;
    fullName: string;
    score: number;
}

interface Plan {
    entry: Entry;
    target: string;
    cleanName: string;
}

function planFor(e: Entry): Plan | null {
    const override = OVERRIDES[e.slug];
    const cleanName = override?.fullName ?? e.fullName.split('**')[0].trim();
    const needsFix = override || e.fullName.includes('**') || /[^\x00-\x7f]/.test(e.fullName);
    if (!needsFix) return null;
    const target = override?.slug ?? slugify(cleanName);
    if (target === e.slug && cleanName === e.fullName) return null;
    return { entry: e, target, cleanName };
}

const prisma = createPrismaClient();

async function main() {
    console.log(APPLY ? 'MODE: APPLY (writes enabled)' : 'MODE: DRY RUN (read-only)');

    const dbRows = await prisma.profile.findMany({
        select: {
            id: true, slug: true, full_name: true, h_index: true,
            _count: { select: { citations: true, awards: true, techniques: true, affiliations: true, views: true, media: true, impact_votes: true } },
        },
    });
    const dbEntries: Entry[] = dbRows.map(r => ({
        source: 'db', id: r.id, slug: r.slug, fullName: r.full_name,
        score: (r.h_index ?? 0) + r._count.citations * 2 + r._count.awards + r._count.techniques + r._count.affiliations,
    }));
    const counts = new Map(dbRows.map(r => [r.id, r._count]));

    const contentFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
    const contentEntries: Entry[] = contentFiles.map(f => {
        const j = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
        return { source: 'content', slug: f.replace(/\.json$/, ''), fullName: j.fullName ?? '', score: j.hIndex ?? 0 };
    });

    const dbSlugs = new Set(dbEntries.map(e => e.slug));
    const contentSlugs = new Set(contentEntries.map(e => e.slug));
    console.log(`DB profiles: ${dbEntries.length}   content files: ${contentEntries.length}\n`);

    const dbPlans = dbEntries.map(planFor).filter((p): p is Plan => !!p);
    const contentPlans = contentEntries.map(planFor).filter((p): p is Plan => !!p);

    const redirects: Record<string, string> = {};
    const dbOps: Array<{ kind: 'rename' | 'merge'; plan: Plan; winner?: Entry }> = [];

    console.log(`== DB: ${dbPlans.length} profile(s) need changes ==`);
    const claimed = new Map<string, Plan>();
    for (const plan of dbPlans.sort((a, b) => b.entry.score - a.entry.score)) {
        const { entry, target, cleanName } = plan;
        const holder = dbEntries.find(e => e.slug === target && e.id !== entry.id);
        const rival = claimed.get(target);
        const winner = holder ?? rival?.entry;
        const nameNote = cleanName !== entry.fullName ? `  name: ${JSON.stringify(entry.fullName)} -> ${JSON.stringify(cleanName)}` : '';
        if (winner) {
            const c = counts.get(entry.id!)!;
            console.log(`MERGE  ${entry.slug} (score ${entry.score}) -> ${winner.slug} (score ${winner.score})${nameNote}`);
            console.log(`       loser carries: ${c.citations} citations, ${c.awards} awards, ${c.techniques} techniques, ${c.affiliations} affiliations, ${c.media} media, ${c.views} views, ${c.impact_votes} votes`);
            dbOps.push({ kind: 'merge', plan, winner });
            redirects[entry.slug] = target;
        } else {
            console.log(`RENAME ${entry.slug} -> ${target}${nameNote}`);
            dbOps.push({ kind: 'rename', plan });
            claimed.set(target, plan);
            if (target !== entry.slug) redirects[entry.slug] = target;
        }
    }

    console.log(`\n== Content: ${contentPlans.length} file(s) need changes ==`);
    const contentOps: Array<{ from: string; to: string; cleanName: string; drop: boolean }> = [];
    const taken = new Set<string>();
    for (const { entry, target, cleanName } of contentPlans.sort((a, b) => b.entry.score - a.entry.score)) {
        const clash = (contentSlugs.has(target) || taken.has(target)) && target !== entry.slug;
        taken.add(target);
        console.log(`${clash ? 'DROP  ' : 'RENAME'} ${entry.slug}.json -> ${target}.json${clash ? '  (target file already exists; duplicate removed)' : ''}${cleanName !== entry.fullName ? `  name -> ${JSON.stringify(cleanName)}` : ''}`);
        contentOps.push({ from: entry.slug, to: target, cleanName, drop: clash });
        if (target !== entry.slug) redirects[entry.slug] ??= target;
    }

    const suspicious = dbEntries.filter(e => e.fullName.includes('**') && !dbPlans.some(p => p.entry.id === e.id));
    if (suspicious.length) console.log(`\nWARNING: ${suspicious.length} DB name(s) contain ** but produced no plan`);

    for (const [from, to] of Object.entries(redirects)) {
        if (redirects[to]) redirects[from] = redirects[to];
    }
    const sorted = Object.fromEntries(Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b)));
    console.log(`\n== Redirect map: ${Object.keys(sorted).length} entries ==`);
    for (const [from, to] of Object.entries(sorted)) console.log(`  /doctors/${from} -> /doctors/${to}`);

    if (WRITE_MAP) {
        fs.writeFileSync(MAP_FILE, JSON.stringify(sorted, null, 2) + '\n');
        console.log(`\nwrote ${path.relative(process.cwd(), MAP_FILE)}`);
    }

    if (!APPLY) {
        console.log('\nDry run only. Re-run with --apply to write.');
        return;
    }

    for (const op of dbOps) {
        const { entry, target, cleanName } = op.plan;
        if (op.kind === 'merge') {
            const winner = await prisma.profile.findUnique({ where: { id: op.winner!.id! }, select: { id: true, slug: true } });
            if (!winner) continue;
            await prisma.$transaction(async tx => {
                const from = { profile_id: entry.id! };
                const to = { profile_id: winner.id };
                await tx.citation.updateMany({ where: from, data: to });
                await tx.award.updateMany({ where: from, data: to });
                await tx.technique.updateMany({ where: from, data: to });
                await tx.boardCertification.updateMany({ where: from, data: to });
                await tx.historicalArtifact.updateMany({ where: from, data: to });
                await tx.legacyTimeline.updateMany({ where: from, data: to });
                await tx.tierVerification.updateMany({ where: from, data: to });
                await tx.profileMedia.updateMany({ where: from, data: to });
                const have = new Set((await tx.doctorHospitalAffiliation.findMany({ where: to, select: { hospital_id: true } })).map(a => a.hospital_id));
                for (const a of await tx.doctorHospitalAffiliation.findMany({ where: from, select: { id: true, hospital_id: true } })) {
                    if (!have.has(a.hospital_id)) await tx.doctorHospitalAffiliation.update({ where: { id: a.id }, data: to });
                }
                for (const model of [tx.impactMetric, tx.doctorPortal, tx.ethicsSubscription] as any[]) {
                    if (!(await model.findUnique({ where: to }))) await model.updateMany({ where: from, data: to });
                }
                await tx.profile.updateMany({ where: { mentored_by_id: entry.id! }, data: { mentored_by_id: winner.id } });
                await tx.profile.delete({ where: { id: entry.id! } });
                if (winner.slug !== target) await tx.profile.update({ where: { id: winner.id }, data: { slug: target } });
            });
            console.log(`merged ${entry.slug} -> ${target}`);
        } else {
            await prisma.profile.update({ where: { id: entry.id! }, data: { slug: target, full_name: cleanName } });
            console.log(`renamed ${entry.slug} -> ${target}`);
        }
    }

    for (const op of contentOps) {
        const fromFile = path.join(CONTENT_DIR, `${op.from}.json`);
        if (!fs.existsSync(fromFile)) continue;
        if (op.drop) {
            fs.unlinkSync(fromFile);
            continue;
        }
        const j = JSON.parse(fs.readFileSync(fromFile, 'utf8'));
        j.slug = op.to;
        j.fullName = op.cleanName;
        fs.writeFileSync(path.join(CONTENT_DIR, `${op.to}.json`), JSON.stringify(j, null, 2) + '\n');
        if (op.from !== op.to) fs.unlinkSync(fromFile);
    }
    console.log('\nApplied. Set SLUG_REDIRECTS=1 and restart to activate the 301s.');
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
