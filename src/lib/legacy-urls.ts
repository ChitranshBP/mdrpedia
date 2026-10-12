import slugRedirects from '../data/slug-redirects.json';

/** Top-level paths of the previous agency site that ever lived on this domain and no longer exist. */
const GONE_PREFIXES = [
    'services', 'industries', 'locations', 'problems', 'answers', 'glossary', 'guides',
    'solutions', 'blog', 'case-studies', 'tools', 'vs', 'how-it-works', 'marketing-for',
    'hospital-marketing-agency', 'webinars', 'frameworks', 'compliance',
];

const GONE_PATH = new RegExp(`^/(?:${GONE_PREFIXES.join('|')})(?:/|$)`, 'i');

/** Genuine one-to-one equivalents of legacy agency URLs. Intentionally empty: none exist. */
const LEGACY_REDIRECTS = new Map<string, string>();

export function legacyRedirect(pathname: string): string | undefined {
    return LEGACY_REDIRECTS.get(pathname);
}

export function isGone(pathname: string): boolean {
    return GONE_PATH.test(pathname);
}

export function goneResponse(): Response {
    return new Response('410 Gone\n', {
        status: 410,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'noindex',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}

const SLUG_MAP = new Map<string, string>(Object.entries(slugRedirects as Record<string, string>));

/**
 * Old->new profile slug redirect. Only active once the DB has been migrated
 * (scripts/fix-unicode-slugs.ts --apply) and SLUG_REDIRECTS=1 is set, because
 * /doctors/[slug] resolves the DB first and the new slug 404s before then.
 */
export function profileSlugRedirect(pathname: string): string | undefined {
    if (SLUG_MAP.size === 0 || process.env.SLUG_REDIRECTS !== '1') return undefined;
    if (!pathname.startsWith('/doctors/')) return undefined;
    const old = pathname.slice('/doctors/'.length).replace(/\/$/, '');
    const next = SLUG_MAP.get(old);
    return next ? `/doctors/${next}` : undefined;
}
