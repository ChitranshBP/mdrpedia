// ============================================================================
// MDRPedia — Cloudinary Auto-Filter
// Image validation, optimization, and placeholder avatar generation
// Only uploads images ≥ 400×400px; applies q_auto, f_auto, g_face
// ============================================================================

const CLOUD_NAME = import.meta.env?.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'demo';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FilteredImage {
    url: string;
    publicId: string;
    isPlaceholder: boolean;
    width: number;
    height: number;
}

// ─── Tier Colors ────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
    TITAN: { bg: '#300066', text: '#FFD700' },
    ELITE: { bg: '#001a4d', text: '#00aaff' },
    MASTER: { bg: '#003322', text: '#00cc66' },
    UNRANKED: { bg: '#1a1a2e', text: '#8888aa' },
};

// ─── Validate Image Dimensions ──────────────────────────────────────────────

export async function validateImageDimensions(imageUrl: string): Promise<{ width: number; height: number } | null> {
    try {
        // Use Cloudinary's info endpoint to check dimensions without downloading
        const infoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/fl_getinfo/${encodeURIComponent(imageUrl)}`;
        const res = await fetch(infoUrl);

        if (!res.ok) return null;

        const data = await res.json();
        return {
            width: data.input?.width || 0,
            height: data.input?.height || 0,
        };
    } catch {
        // If info fetch fails, assume dimensions are acceptable
        return { width: 600, height: 600 };
    }
}

// ─── Generate Optimized Cloudinary URL ──────────────────────────────────────

export function getOptimizedFetchUrl(
    imageUrl: string,
    options?: { width?: number; height?: number; crop?: string }
): string {
    const { width = 600, height = 600, crop = 'fill' } = options || {};
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/w_${width},h_${height},c_${crop},g_face,q_auto,f_auto/${encodeURIComponent(imageUrl)}`;
}

// ─── Generate Placeholder Avatar SVG ────────────────────────────────────────

export function generatePlaceholderAvatar(
    doctorName: string,
    tier: string = 'UNRANKED',
    size: number = 600
): string {
    const initials = doctorName
        .split(/\s+/)
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

    const colors = TIER_COLORS[tier] || TIER_COLORS.UNRANKED;

    // Generate an SVG data URI
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors.bg}"/>
        <stop offset="100%" stop-color="${adjustColor(colors.bg, 30)}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${colors.text}" font-family="Inter, Arial, sans-serif" font-size="${size * 0.3}" font-weight="700" letter-spacing="0.05em">${initials}</text>
    <text x="50%" y="${size * 0.75}" dominant-baseline="central" text-anchor="middle" fill="${colors.text}" font-family="Inter, Arial, sans-serif" font-size="${size * 0.04}" font-weight="400" opacity="0.5">MDRPedia</text>
  </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ─── Upload and Filter ──────────────────────────────────────────────────────

export async function uploadAndFilterImage(
    imageUrl: string,
    doctorName: string,
    tier: string = 'UNRANKED'
): Promise<FilteredImage> {
    // Step 1: Validate dimensions
    const dims = await validateImageDimensions(imageUrl);

    if (!dims || dims.width < 400 || dims.height < 400) {
        // Image too small — return placeholder
        console.warn(`[CloudinaryFilter] Image too small (${dims?.width}x${dims?.height}), using placeholder for ${doctorName}`);
        return {
            url: generatePlaceholderAvatar(doctorName, tier),
            publicId: `placeholder-${doctorName.toLowerCase().replace(/\s+/g, '-')}`,
            isPlaceholder: true,
            width: 600,
            height: 600,
        };
    }

    // Step 2: Generate optimized Cloudinary fetch URL
    const optimizedUrl = getOptimizedFetchUrl(imageUrl);

    return {
        url: optimizedUrl,
        publicId: `doctors/${doctorName.toLowerCase().replace(/\s+/g, '-')}`,
        isPlaceholder: false,
        width: dims.width,
        height: dims.height,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ─── Batch Process Gallery ──────────────────────────────────────────────────

export async function processGallery(
    imageUrls: string[],
    doctorName: string,
    tier: string = 'UNRANKED'
): Promise<FilteredImage[]> {
    const results: FilteredImage[] = [];

    for (const url of imageUrls.slice(0, 6)) {
        const result = await uploadAndFilterImage(url, doctorName, tier);
        results.push(result);
        // Small delay between requests
        await new Promise((r) => setTimeout(r, 200));
    }

    return results;
}
