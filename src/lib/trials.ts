/**
 * MDRPedia — Clinical trial helpers
 *
 * A tracker is only useful if a trial can leave the "Active" state, so the
 * status vocabulary covers the whole lifecycle and both the index and the
 * detail page read their colours and counts from here.
 */

export const TRIAL_STATUS_COLORS: Record<string, string> = {
    active: '#10b981',
    recruiting: '#f59e0b',
    'not yet recruiting': '#94a3b8',
    completed: '#3b82f6',
    'readout reported': '#06b6d4',
    approved: '#8b5cf6',
    'under review': '#a78bfa',
    suspended: '#ef4444',
    discontinued: '#ef4444',
    terminated: '#ef4444',
};

export function getStatusColor(status: string): string {
    return TRIAL_STATUS_COLORS[(status || '').toLowerCase()] ?? '#94a3b8';
}

/** Statuses that mean the study is still running and enrolling or treating. */
const OPEN_STATUSES = new Set(['active', 'recruiting', 'not yet recruiting']);

export function isOpen(status: string): boolean {
    return OPEN_STATUSES.has((status || '').toLowerCase());
}

export function getPhaseColor(phase: string): string {
    if (phase.includes('4') || phase.includes('Post')) return '#8b5cf6';
    if (phase.includes('3')) return '#10b981';
    if (phase.includes('2')) return '#3b82f6';
    if (phase.includes('1')) return '#f59e0b';
    return '#94a3b8';
}

interface TrialLike {
    phase: string;
    status: string;
    enrollment?: number | null;
}

interface CompanyLike {
    trials: TrialLike[];
}

export function summarise(companies: CompanyLike[]) {
    const trials = companies.flatMap((c) => c.trials);
    return {
        totalTrials: trials.length,
        openTrials: trials.filter((t) => isOpen(t.status)).length,
        phase3Trials: trials.filter((t) => t.phase.includes('3')).length,
        totalEnrollment: trials.reduce((sum, t) => sum + (t.enrollment || 0), 0),
    };
}
