// ============================================================================
// MDRPedia — Patient-Friendly Summary Generator
// Generates plain-English bullet points from profile data
// ============================================================================

interface PatientSummaryInput {
    fullName: string;
    specialty: string;
    subSpecialty?: string | null;
    yearsActive: number;
    verifiedSurgeries: number;
    livesSaved: number;
    techniquesInvented: string[];
    hIndex: number;
    totalCitations: number;
    geography: { country: string; region?: string | null; city?: string | null };
    affiliations?: { hospitalName: string; role?: string | null }[];
    status: string;
    dateOfBirth?: string | null;
    dateOfDeath?: string | null;
}

export interface PatientBullet {
    icon: string; // SVG path for the bullet icon
    text: string;
}

const ICON_PATHS = {
    stethoscope: 'M4.8 2.65V6a2.8 2.8 0 1 0 5.6 0V2.65M4.8 2.65H2v1.4h2.8m2.8-1.4H10.4v1.4H7.6M7 6v1.4a4.2 4.2 0 0 0 4.2 4.2h0A4.2 4.2 0 0 0 15.4 7.4V6',
    procedures: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    innovation: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    research: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    lives: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10m-3 0a3 3 0 106 0 3 3 0 00-6 0',
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
    return n.toLocaleString();
}

export function generatePatientSummary(data: PatientSummaryInput): PatientBullet[] {
    const bullets: PatientBullet[] = [];
    const isHistorical = data.status === 'HISTORICAL';
    const pastTense = isHistorical;
    const firstName = data.fullName.split(' ')[0];

    // 1. Years of practice + specialty
    if (data.yearsActive > 0) {
        const specLabel = data.subSpecialty || data.specialty;
        if (pastTense) {
            bullets.push({
                icon: ICON_PATHS.stethoscope,
                text: `${firstName} practiced ${specLabel.toLowerCase()} for over ${data.yearsActive} years`,
            });
        } else {
            bullets.push({
                icon: ICON_PATHS.stethoscope,
                text: `Practicing ${specLabel.toLowerCase()} specialist with ${data.yearsActive}+ years of experience`,
            });
        }
    }

    // 2. Procedure count
    if (data.verifiedSurgeries > 0) {
        const context = data.verifiedSurgeries >= 10_000
            ? ' — among the most experienced in the field'
            : data.verifiedSurgeries >= 5_000
            ? ' — highly experienced'
            : '';
        const verb = pastTense ? 'Performed' : 'Has performed';
        bullets.push({
            icon: ICON_PATHS.procedures,
            text: `${verb} over ${formatNumber(data.verifiedSurgeries)} verified procedures${context}`,
        });
    }

    // 3. Techniques invented
    if (data.techniquesInvented.length > 0) {
        const techList = data.techniquesInvented.slice(0, 3);
        const verb = pastTense ? 'Pioneered' : 'Pioneered';
        if (techList.length === 1) {
            bullets.push({
                icon: ICON_PATHS.innovation,
                text: `${verb} the ${techList[0]}, a technique still used by doctors worldwide`,
            });
        } else {
            bullets.push({
                icon: ICON_PATHS.innovation,
                text: `${verb} ${techList.length} medical techniques including ${techList.slice(0, 2).join(' and ')}`,
            });
        }
    }

    // 4. Research impact (citations)
    if (data.totalCitations > 0) {
        const verb = pastTense ? 'was' : 'is';
        const context = data.totalCitations >= 50_000
            ? `, making them one of the most influential researchers in ${data.specialty.toLowerCase()}`
            : data.totalCitations >= 10_000
            ? ', indicating significant influence on medical research'
            : '';
        bullets.push({
            icon: ICON_PATHS.research,
            text: `Research ${verb} cited ${formatNumber(data.totalCitations)} times by other doctors and scientists${context}`,
        });
    }

    // 5. Lives impacted
    if (data.livesSaved > 0) {
        const verb = pastTense ? 'Impacted' : 'Has impacted';
        bullets.push({
            icon: ICON_PATHS.lives,
            text: `${verb} an estimated ${formatNumber(data.livesSaved)} lives through clinical work and research`,
        });
    }

    // 6. Current institution + location
    const primaryAff = data.affiliations?.[0];
    if (primaryAff) {
        const locationParts = [data.geography.city, data.geography.country].filter(Boolean).filter(v => v !== 'Unknown');
        const locStr = locationParts.length > 0 ? ` in ${locationParts.join(', ')}` : '';
        if (pastTense) {
            bullets.push({
                icon: ICON_PATHS.location,
                text: `Based at ${primaryAff.hospitalName}${locStr}`,
            });
        } else {
            bullets.push({
                icon: ICON_PATHS.location,
                text: `Currently at ${primaryAff.hospitalName}${locStr}`,
            });
        }
    } else if (data.geography.city || data.geography.country) {
        const locationParts = [data.geography.city, data.geography.country].filter(Boolean).filter(v => v !== 'Unknown');
        if (locationParts.length > 0) {
            const verb = pastTense ? 'Based' : 'Based';
            bullets.push({
                icon: ICON_PATHS.location,
                text: `${verb} in ${locationParts.join(', ')}`,
            });
        }
    }

    return bullets;
}
