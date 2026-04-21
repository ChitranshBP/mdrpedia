import { PrismaClient } from '@prisma/client';
import { calculateTotalImpact } from '../src/lib/impact-calculator';

const prisma = new PrismaClient();

async function recalculateScores() {
    console.log('Starting ranking score recalculation...\n');

    const profiles = await prisma.profile.findMany({
        select: {
            id: true,
            slug: true,
            full_name: true,
            h_index: true,
            years_active: true,
            verified_surgeries: true,
            tier: true,
            ranking_score: true,
            impact_metrics: { select: { lives_saved: true } },
            citations: { select: { total_citation_count: true, citation_count: true } },
            awards: { select: { id: true } },
            techniques: { select: { id: true } }
        }
    });

    console.log(`Found ${profiles.length} profiles to recalculate\n`);

    let updated = 0;
    let unchanged = 0;

    for (const profile of profiles) {
        const citationCount = profile.citations.length;
        const techniqueCount = profile.techniques.length;
        const awardCount = profile.awards.length;

        // MDR ranking score (0-100 normalized) for tier assignment
        const hIndexScore = Math.min((profile.h_index / 100) * 100, 100) * 0.35;
        const citationScoreNorm = Math.min((citationCount / 500) * 100, 100) * 0.25;
        const yearsScore = Math.min((profile.years_active / 50) * 100, 100) * 0.15;
        const techniqueScore = Math.min((techniqueCount / 10) * 100, 100) * 0.15;
        const awardScore = Math.min((awardCount / 10) * 100, 100) * 0.10;

        const rawScore = hIndexScore + citationScoreNorm + yearsScore + techniqueScore + awardScore;
        const newScore = Math.round(rawScore * 100) / 100;

        if (Math.abs(newScore - (profile.ranking_score ?? 0)) < 0.01) {
            unchanged++;
            continue;
        }

        await prisma.profile.update({
            where: { id: profile.id },
            data: { ranking_score: newScore }
        });

        console.log(`${profile.full_name}: ${profile.ranking_score} → ${newScore} (h:${profile.h_index}, citations:${citationCount})`);
        updated++;
    }

    console.log(`\nRecalculation complete!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Unchanged: ${unchanged}`);
    console.log(`  Total: ${profiles.length}`);
}

recalculateScores()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
