/**
 * Right-sized portrait URLs. Wikimedia originals run to several MB, so they are
 * swapped for Wikimedia's own thumbnails (it only serves a fixed set of widths
 * and rate-limits third-party fetchers). Other remote images go through
 * Cloudinary's fetch delivery, cropped to the face.
 */
const WIKI_WIDTHS = [120, 250, 330, 500, 960];
const WIKI_RE = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/([\w-]+)\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/]+)(?:\/\d+px-[^/]+)?$/;

const CLOUD = (import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();

function wikiThumb(m: RegExpMatchArray, width: number): string {
    const [, project, a, ab, file] = m;
    const w = WIKI_WIDTHS.find((x) => x >= width) ?? WIKI_WIDTHS[WIKI_WIDTHS.length - 1];
    const name = /\.svg$/i.test(file) ? `${file}.png` : /\.tiff?$/i.test(file) ? `lossy-page1-${file}.jpg` : file;
    return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${a}/${ab}/${file}/${w}px-${name}`;
}

/** URL for a portrait displayed at `width` CSS pixels (and `height`, for a face crop). */
export function portraitSrc(url: string | null | undefined, width: number, height?: number): string | null {
    if (!url || url.startsWith('data:')) return url ?? null;
    const wiki = url.match(WIKI_RE);
    if (wiki) return wikiThumb(wiki, width);
    if (!CLOUD || !/^https?:\/\//i.test(url) || url.includes('res.cloudinary.com')) return url;
    const crop = height ? `c_fill,g_face,w_${width},h_${height}` : `c_limit,w_${width}`;
    return `https://res.cloudinary.com/${CLOUD}/image/fetch/f_auto,q_auto,${crop}/${encodeURI(url)}`;
}

/** src + 2x srcset for an <img> of the given display size. */
export function portraitAttrs(url: string | null | undefined, width: number, height?: number) {
    const src = portraitSrc(url, width, height);
    const hi = portraitSrc(url, width * 2, height ? height * 2 : undefined);
    return { src: src ?? undefined, srcset: src && hi && hi !== src ? `${src} 1x, ${hi} 2x` : undefined };
}
