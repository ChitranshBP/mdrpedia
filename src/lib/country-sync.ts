/**
 * Client-side: keep a country-scoped listing in step with the header's
 * country picker (localStorage `mdr-country`). Pages render from the URL only,
 * so they stay cacheable; the browser adds ?country= when the visitor's
 * choice differs from what was rendered.
 */
const SLUGS: Record<string, string> = {
    India: 'india',
    'United States': 'united-states',
    'United Kingdom': 'united-kingdom',
};

function stored(): string | null {
    try {
        const v = localStorage.getItem('mdr-country');
        return v && SLUGS[v] ? v : null;
    } catch {
        return null;
    }
}

function guess(): string {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/Kolkata|Calcutta/.test(tz)) return 'India';
    if (tz.startsWith('America/')) return 'United States';
    if (tz === 'Europe/London') return 'United Kingdom';
    return 'India';
}

function urlFor(name: string, reset: string[]): string {
    const url = new URL(location.href);
    url.searchParams.set('country', SLUGS[name]);
    for (const k of reset) url.searchParams.delete(k);
    return url.pathname + url.search;
}

export function syncCountry({ fallbackToGuess, reset }: { fallbackToGuess: boolean; reset: string[] }): void {
    const root = document.querySelector<HTMLElement>('.r-listing[data-country]');
    if (!root) return;
    const rendered = root.dataset.country;

    if (!root.dataset.countryParam) {
        const target = stored() ?? (fallbackToGuess ? guess() : null);
        if (target && target !== rendered) {
            location.replace(urlFor(target, reset));
            return;
        }
    }

    window.addEventListener('mdr-country', () => {
        const name = stored();
        if (name && name !== rendered) location.assign(urlFor(name, reset));
    });

    root.querySelectorAll<HTMLAnchorElement>('a[data-country-link]').forEach((a) =>
        a.addEventListener('click', () => {
            try {
                localStorage.setItem('mdr-country', a.dataset.countryLink!);
            } catch {
                /* storage blocked */
            }
        }),
    );
}
