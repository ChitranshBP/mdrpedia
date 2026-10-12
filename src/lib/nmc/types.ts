export type Severity = 'High' | 'Medium' | 'Low';

export interface NmcFinding {
    severity: Severity;
    clause: string;
    title: string;
    excerpt: string;
    why: string;
    fix: string;
}

export interface NmcScreenResult {
    summary: string;
    findings: NmcFinding[];
    passed: string[];
    /** 'ai' when Claude screened the text, 'rules' for the deterministic fallback. */
    engine: 'ai' | 'rules';
}

export const CHANNEL_KEYS = ['web', 'ig', 'fb', 'yt', 'gbp', 'li'] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];
export type Channels = Partial<Record<ChannelKey, string>>;

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
    web: 'Website',
    ig: 'Instagram',
    fb: 'Facebook page',
    yt: 'YouTube channel',
    gbp: 'Google Business profile',
    li: 'LinkedIn',
};

export const GUIDELINES_NAME = 'NMC Guidelines on Ethical Advertising and Public Communication';
export const GUIDELINES_DATE = '6 Oct 2026';

const SEVERITY_ORDER: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };

export function sortFindings(findings: NmcFinding[]): NmcFinding[] {
    return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function verdictFor(findings: NmcFinding[]): { verdict: string; level: 'ok' | 'med' | 'high' } {
    const n = findings.length;
    if (n === 0) return { verdict: 'No issues found in this content', level: 'ok' };
    const high = findings.some((f) => f.severity === 'High');
    return {
        verdict: `${high ? 'Likely non-compliant' : 'Needs attention'} · ${n} ${n === 1 ? 'issue' : 'issues'}`,
        level: high ? 'high' : 'med',
    };
}
