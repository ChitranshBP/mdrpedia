/**
 * Fetching public pages for the NMC channel scan, guarded against SSRF:
 * every hop is resolved and rejected if it points at a private address.
 */
import dns from 'node:dns/promises';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const UA = 'MDRPediaComplianceBot/1.0 (+https://mdrpedia.com/nmc-compliance-check)';

export function isPrivateIp(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        return (
            a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 198 && (b === 18 || b === 19))
        );
    }
    const v6 = ip.toLowerCase();
    if (v6.startsWith('::ffff:')) {
        const tail = v6.slice(7);
        if (net.isIPv4(tail)) return isPrivateIp(tail);
        const [hi, lo] = tail.split(':').map((h) => parseInt(h, 16));
        return isPrivateIp([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'));
    }
    return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublicHost(url: URL): Promise<void> {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported protocol');
    if (url.username || url.password) throw new Error('Credentials in URL');
    if (url.port && !['80', '443'].includes(url.port)) throw new Error('Non-standard port');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('Host resolves to a private address');
}

/** Fetch a public URL as text, re-validating every redirect hop against SSRF. */
export async function safeFetchText(input: string): Promise<{ url: string; html: string }> {
    let url = new URL(input);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await assertPublicHost(url);
        const res = await fetch(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        });
        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (!loc) throw new Error(`Redirect without location (${res.status})`);
            url = new URL(loc, url);
            continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get('content-type') || '';
        if (!/text\/html|application\/xhtml/.test(type)) throw new Error(`Not an HTML page (${type || 'unknown type'})`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('Empty response');
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) {
                await reader.cancel();
                break;
            }
            chunks.push(value);
        }
        return { url: url.href, html: Buffer.concat(chunks).toString('utf8') };
    }
    throw new Error('Too many redirects');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };

function decode(s: string): string {
    return s
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function metaContent(html: string, name: string): string {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
    const m = html.match(re);
    return decode((m?.[1] ?? m?.[2] ?? '').trim());
}

export function extractText(html: string): string {
    const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
    const description = metaContent(html, 'description') || metaContent(html, 'og:description');
    const body = decode(
        html
            .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)\b[^>]*>/gi, '\n')
            .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, ' $1 ')
            .replace(/<[^>]+>/g, ' '),
    )
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
    return [title, description, body].filter(Boolean).join('\n');
}
