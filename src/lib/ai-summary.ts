// ============================================================================
// MDRPedia — AI Summary Generator
// Generates fact-dense, GEO-optimized TL;DR summaries for AI search engines
// ============================================================================

interface AISummaryInput {
    fullName: string;
    specialty: string;
    subSpecialty?: string;
    tier: string;
    hIndex: number;
    yearsActive: number;
    verifiedSurgeries: number;
    livesSaved: number;
    techniquesInvented: string[];
    geography: { country: string; region?: string; city?: string };
    affiliations?: { hospitalName: string; role?: string }[];
    biography?: string;
    status: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    citations?: { journal?: string; year?: number; title: string }[];
    awards?: { name: string; year: number }[];
}

// ─── Tier Labels ────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
    TITAN: 'Titan-tier (top 0.01%)',
    ELITE: 'Elite-tier (top 1%)',
    MASTER: 'Master-tier (top 3%)',
    UNRANKED: '',
};

// ─── Top Journals ───────────────────────────────────────────────────────────

const TOP_JOURNALS = [
    'New England Journal of Medicine',
    'NEJM',
    'The Lancet',
    'Lancet',
    'Nature',
    'Nature Medicine',
    'Science',
    'JAMA',
    'BMJ',
    'Annals of Surgery',
    'Cell',
];

function isTopJournal(journal?: string): boolean {
    if (!journal) return false;
    return TOP_JOURNALS.some((j) => journal.toLowerCase().includes(j.toLowerCase()));
}

// ─── Generate AI Summary ────────────────────────────────────────────────────

export function generateAISummary(data: AISummaryInput): string {
    const parts: string[] = [];
    const location = [data.geography.city, data.geography.region, data.geography.country]
        .filter(Boolean)
        .join(', ');

    // Sentence 1: Identity + tier + specialty
    const tierLabel = TIER_LABELS[data.tier];
    const lifespan =
        data.status === 'HISTORICAL' && data.dateOfBirth && data.dateOfDeath
            ? ` (${new Date(data.dateOfBirth).getFullYear()}–${new Date(data.dateOfDeath).getFullYear()})`
            : '';

    let s1 = `${data.fullName}${lifespan}`;
    if (tierLabel) {
        s1 += ` is a ${tierLabel} ${data.specialty.toLowerCase()} specialist`;
    } else {
        s1 += ` is a ${data.specialty.toLowerCase()} specialist`;
    }

    if (data.hIndex > 0) {
        s1 += ` with an H-index of ${data.hIndex}`;
    }

    if (data.affiliations?.length) {
        const primary = data.affiliations[0];
        s1 += ` at ${primary.hospitalName}`;
        if (primary.role) s1 += ` (${primary.role})`;
    }
    s1 += '.';
    parts.push(s1);

    // Sentence 2: Key achievements
    const achievements: string[] = [];

    if (data.techniquesInvented.length > 0) {
        const techniques = data.techniquesInvented.slice(0, 3);
        achievements.push(`pioneered ${techniques.join(', ')}`);
    }

    if (data.verifiedSurgeries > 0) {
        achievements.push(`performed ${data.verifiedSurgeries.toLocaleString()}+ verified procedures`);
    }

    if (data.livesSaved > 0) {
        achievements.push(`impacted an estimated ${data.livesSaved.toLocaleString()} lives`);
    }

    if (achievements.length > 0) {
        const known = data.status === 'HISTORICAL' ? 'Known for' : 'Known for';
        parts.push(`${known} ${achievements.join(' and ')}.`);
    }

    // Sentence 3: Publications + awards context
    const context: string[] = [];

    if (data.citations?.length) {
        const topJournalPubs = data.citations.filter((c) => isTopJournal(c.journal));
        if (topJournalPubs.length > 0) {
            const journals = [...new Set(topJournalPubs.map((c) => c.journal).filter(Boolean))].slice(0, 3);
            context.push(`published in ${journals.join(', ')}`);
        }
    }

    if (data.awards?.length) {
        const topAward = data.awards.sort((a, b) => a.year - b.year)[0];
        context.push(`recipient of the ${topAward.name} (${topAward.year})`);
    }

    if (context.length > 0) {
        parts.push(`${data.status === 'HISTORICAL' ? 'Was' : 'Has been'} ${context.join(' and ')}.`);
    }

    // Sentence 4: Location
    parts.push(`Based in ${location}.`);

    return parts.join(' ');
}
