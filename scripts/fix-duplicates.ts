import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicatePair {
    sourceSlug: string;
    targetSlug: string;
    reason: string;
}

const DUPLICATES: DuplicatePair[] = [
    { sourceSlug: 'anil-d-cruz', targetSlug: 'anil-dcruz', reason: 'Duplicate with lower h-index' },
    { sourceSlug: 'anders-bj-rklund', targetSlug: 'anders-bjrklund', reason: 'Diacritic slug variant' },
    { sourceSlug: 'anthony-fauci', targetSlug: 'anthony-s-fauci', reason: 'Missing middle initial variant' },
];

async function mergeDuplicates() {
    console.log('Starting duplicate profile merge...\n');

    for (const pair of DUPLICATES) {
        const source = await prisma.profile.findUnique({
            where: { slug: pair.sourceSlug },
            include: { _count: { select: { citations: true, awards: true, techniques: true } } }
        });
        const target = await prisma.profile.findUnique({
            where: { slug: pair.targetSlug },
            include: { _count: { select: { citations: true, awards: true, techniques: true } } }
        });

        if (!source) {
            console.log(`SKIP: Source "${pair.sourceSlug}" not found`);
            continue;
        }
        if (!target) {
            console.log(`SKIP: Target "${pair.targetSlug}" not found`);
            continue;
        }

        console.log(`MERGING: "${pair.sourceSlug}" (h:${source.h_index}) → "${pair.targetSlug}" (h:${target.h_index})`);
        console.log(`  Reason: ${pair.reason}`);
        console.log(`  Source has: ${source._count.citations} citations, ${source._count.awards} awards, ${source._count.techniques} techniques`);

        // Move citations
        const movedCitations = await prisma.citation.updateMany({
            where: { profile_id: source.id },
            data: { profile_id: target.id }
        });
        console.log(`  Moved ${movedCitations.count} citations`);

        // Move awards
        const movedAwards = await prisma.award.updateMany({
            where: { profile_id: source.id },
            data: { profile_id: target.id }
        });
        console.log(`  Moved ${movedAwards.count} awards`);

        // Move techniques
        const movedTechniques = await prisma.technique.updateMany({
            where: { profile_id: source.id },
            data: { profile_id: target.id }
        });
        console.log(`  Moved ${movedTechniques.count} techniques`);

        // Delete source profile
        await prisma.profile.delete({ where: { id: source.id } });
        console.log(`  Deleted source profile "${pair.sourceSlug}"\n`);
    }

    console.log('Duplicate merge complete!');
}

mergeDuplicates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
