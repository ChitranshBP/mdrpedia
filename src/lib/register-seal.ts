/**
 * Register seal (claude.ai/design "Seal"): a ring of mono text around a serif
 * letter, with an optional number under a rule. Pure string so it can be used
 * by Astro components, React islands and the embeddable seal.js.
 */

export interface RegisterSealOptions {
    size?: number;
    color?: string;
    ring?: string;
    letter?: string;
    no?: string;
    uid: string;
    title?: string;
}

export const SEAL_GOLD = '#b08a35';
export const SEAL_GREEN = '#1f5c45';

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderRegisterSeal({
    size = 120,
    color = SEAL_GOLD,
    ring = "THE PHYSICIANS' REGISTER · MDRPEDIA · VERIFIED ·",
    letter = 'M',
    no = '',
    uid,
    title,
}: RegisterSealOptions): string {
    const id = `arc-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const sw = size < 80 ? 3 : 1.4;
    const mono = 'Spline Sans Mono, ui-monospace, monospace';
    const a11y = title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true"';
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" ${a11y} style="display:block;color:${esc(color)}">` +
        `<defs><path id="${id}" d="M 100 100 m -80 0 a 80 80 0 1 1 160 0 a 80 80 0 1 1 -160 0"/></defs>` +
        `<circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" stroke-width="${sw}"/>` +
        `<circle cx="100" cy="100" r="66" fill="none" stroke="currentColor" stroke-width="1"/>` +
        `<text font-family="${mono}" font-size="8.4" letter-spacing="3.2" fill="currentColor"><textPath href="#${id}">${esc(ring)}</textPath></text>` +
        `<text x="100" y="${no ? 112 : 122}" text-anchor="middle" font-family="Bodoni Moda, Georgia, serif" font-size="64" font-weight="500" fill="currentColor">${esc(letter)}</text>` +
        (no
            ? `<line x1="72" y1="124" x2="128" y2="124" stroke="currentColor" stroke-width="0.6"/>` +
              `<text x="100" y="138" text-anchor="middle" font-family="${mono}" font-size="8" letter-spacing="2" fill="currentColor">${esc(no)}</text>`
            : '') +
        `</svg>`
    );
}

const TIER_SEAL: Record<string, { ring: string; letter: string; label: string }> = {
    TITAN: { ring: 'TITAN · TIER I · MDRPEDIA ·', letter: 'T', label: 'Titan · Tier I' },
    ELITE: { ring: 'ELITE · TIER II · MDRPEDIA ·', letter: 'E', label: 'Elite · Tier II' },
    MASTER: { ring: 'MASTER · TIER III · MDRPEDIA ·', letter: 'M', label: 'Master · Tier III' },
};

/** Ring, letter and label for a profile's register tier; unranked records get the plain register mark. */
export function tierSeal(tier: string | null | undefined) {
    return TIER_SEAL[tier ?? ''] ?? { ring: "THE PHYSICIANS' REGISTER · MDRPEDIA ·", letter: 'M', label: 'Listed' };
}

const ETHICS_SEAL: Record<string, { ring: string; letter: string; name: string; min: number }> = {
    LEGEND: { ring: 'LEGEND · ETHICS I · MDRPEDIA ·', letter: 'L', name: 'Legend', min: 90 },
    GUARDIAN: { ring: 'GUARDIAN · ETHICS II · MDRPEDIA ·', letter: 'G', name: 'Guardian', min: 75 },
    ADVOCATE: { ring: 'ADVOCATE · ETHICS III · MDRPEDIA ·', letter: 'A', name: 'Advocate', min: 60 },
};

export function ethicsSeal(tier: string | null | undefined) {
    return ETHICS_SEAL[tier ?? ''] ?? ETHICS_SEAL.ADVOCATE;
}
