/**
 * Strict allowlist HTML sanitizer for user-submitted rich text (biography etc.).
 * Allowed: p, br, strong, em, b, i, ul, ol, li, a[href http/https/mailto, rel=nofollow].
 * Everything else is removed (text content kept, except script/style-like elements,
 * which are dropped entirely). All attributes other than a[href] are discarded.
 * Output is canonical, balanced HTML safe to inject with set:html.
 */

const ALLOWED = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a']);
const VOID = new Set(['br']);

const DROP_WITH_CONTENT =
    /<(script|style|iframe|object|embed|noscript|template|svg|math|textarea|title|xmp|noembed|noframes)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n' };

function decodeEntities(v: string): string {
    return v
        .replace(/&#x([0-9a-f]+);?/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);?/g, (_, d) => safeFromCodePoint(parseInt(d, 10)))
        .replace(/&([a-z]+);?/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

function safeFromCodePoint(cp: number): string {
    try {
        return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    } catch {
        return '';
    }
}

function escapeAttr(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(v: string): string {
    return v.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeHref(attrs: string): string | null {
    const m = attrs.match(/(?:^|[\s"'\/])href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
    if (!m) return null;
    const raw = decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
    // eslint-disable-next-line no-control-regex
    const cleaned = raw.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
    if (!/^(https?:\/\/|mailto:)/i.test(cleaned)) return null;
    return cleaned.length > 2048 ? null : cleaned;
}

export function sanitizeHtml(input: unknown): string {
    if (typeof input !== 'string' || !input) return '';

    let html = input.replace(/<!--[\s\S]*?(?:-->|$)/g, '').replace(DROP_WITH_CONTENT, '');

    const out: string[] = [];
    const stack: string[] = [];
    let last = 0;

    for (const m of html.matchAll(TAG_RE)) {
        out.push(escapeText(html.slice(last, m.index)));
        last = m.index! + m[0].length;

        const closing = m[1] === '/';
        const name = m[2].toLowerCase();
        if (!ALLOWED.has(name)) continue;

        if (VOID.has(name)) {
            if (!closing) out.push('<br>');
            continue;
        }

        if (closing) {
            const idx = stack.lastIndexOf(name);
            if (idx === -1) continue;
            while (stack.length > idx) out.push(`</${stack.pop()}>`);
            continue;
        }

        if (name === 'a') {
            const href = safeHref(m[3]);
            if (!href) continue;
            out.push(`<a href="${escapeAttr(href)}" rel="nofollow">`);
        } else {
            out.push(`<${name}>`);
        }
        stack.push(name);
    }

    out.push(escapeText(html.slice(last)));
    while (stack.length) out.push(`</${stack.pop()}>`);
    return out.join('');
}
