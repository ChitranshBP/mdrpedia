/**
 * Ethics Seal SVG — Pure string renderer for embeddable badges
 * Extracted from SealRound.astro for use in API endpoints
 */

export type SealKind = 'legend' | 'guardian' | 'advocate';

interface SealConfig {
    label: string;
    color: string;
    letter: string;
}

const SEAL_CONFIGS: Record<SealKind, SealConfig> = {
    legend:   { label: 'LEGEND \u00B7 ETHICS I',    color: '#2d6a4f', letter: 'L' },
    guardian: { label: 'GUARDIAN \u00B7 ETHICS II',  color: '#1b4332', letter: 'G' },
    advocate: { label: 'ADVOCATE \u00B7 ETHICS III', color: '#40916c', letter: 'A' },
};

interface SealOptions {
    kind: SealKind;
    certId: string;
    size?: number;
    doctorName?: string;
    suspended?: boolean;
}

export function renderEthicsSealSVG(options: SealOptions): string {
    const { kind, certId, size = 200, doctorName, suspended = false } = options;
    const config = SEAL_CONFIGS[kind] || SEAL_CONFIGS.advocate;
    const { label, color, letter } = config;
    const circText = `${label} \u00B7 ${label} \u00B7`;
    const arcId = `arc-${kind}-${certId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const displayColor = suspended ? '#9ca3af' : color;
    const statusLabel = suspended ? 'SUSPENDED' : 'VERIFIED';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  <defs>
    <path id="${arcId}" d="M 100 100 m -82 0 a 82 82 0 1 1 164 0 a 82 82 0 1 1 -164 0"/>
  </defs>
  <circle cx="100" cy="100" r="95" fill="none" stroke="${displayColor}" stroke-width="1"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="${displayColor}" stroke-width="0.6" stroke-dasharray="1 3"/>
  <circle cx="100" cy="100" r="60" fill="none" stroke="${displayColor}" stroke-width="1"/>
  <text font-family="monospace" font-size="8" letter-spacing="4" fill="${displayColor}">
    <textPath href="#${arcId}" startOffset="0">${escapeXml(circText)}</textPath>
  </text>
  <text x="100" y="96" text-anchor="middle" font-family="serif" font-size="58" font-weight="400" fill="${displayColor}">${letter}</text>
  <text x="100" y="122" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="2" fill="${displayColor}">MDRPEDIA</text>
  <text x="100" y="134" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.5" fill="${displayColor}" opacity="0.7">\u2116 ${escapeXml(certId)}</text>
  <line x1="70" y1="145" x2="130" y2="145" stroke="${displayColor}" stroke-width="0.5"/>
  <text x="100" y="156" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.5" fill="${displayColor}" opacity="0.7">${statusLabel}</text>
</svg>`;
}

/** Render a clinic variant badge (building icon instead of letter) */
export function renderClinicSealSVG(options: {
    kind: SealKind;
    certId: string;
    clinicName?: string;
    size?: number;
    suspended?: boolean;
}): string {
    const { kind, certId, size = 200, suspended = false } = options;
    const config = SEAL_CONFIGS[kind] || SEAL_CONFIGS.advocate;
    const { label, color } = config;
    const circText = `${label} \u00B7 CLINIC \u00B7`;
    const arcId = `arc-clinic-${certId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const displayColor = suspended ? '#9ca3af' : color;
    const statusLabel = suspended ? 'SUSPENDED' : 'CERTIFIED';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  <defs>
    <path id="${arcId}" d="M 100 100 m -82 0 a 82 82 0 1 1 164 0 a 82 82 0 1 1 -164 0"/>
  </defs>
  <circle cx="100" cy="100" r="95" fill="none" stroke="${displayColor}" stroke-width="1"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="${displayColor}" stroke-width="0.6" stroke-dasharray="1 3"/>
  <circle cx="100" cy="100" r="60" fill="none" stroke="${displayColor}" stroke-width="1"/>
  <text font-family="monospace" font-size="8" letter-spacing="4" fill="${displayColor}">
    <textPath href="#${arcId}" startOffset="0">${escapeXml(circText)}</textPath>
  </text>
  <path d="M85 110V80l15-8 15 8v30M92 110v-12h16v12" fill="none" stroke="${displayColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="100" y="122" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="2" fill="${displayColor}">MDRPEDIA</text>
  <text x="100" y="134" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.5" fill="${displayColor}" opacity="0.7">\u2116 ${escapeXml(certId)}</text>
  <line x1="70" y1="145" x2="130" y2="145" stroke="${displayColor}" stroke-width="0.5"/>
  <text x="100" y="156" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.5" fill="${displayColor}" opacity="0.7">${statusLabel}</text>
</svg>`;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
