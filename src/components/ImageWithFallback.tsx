
import React, { useState } from "react";

// Tier Themes for Avatar Background
const TIER_COLORS = {
    TITAN: "linear-gradient(135deg, #300066 0%, #1a0033 100%)", // Deep Purple
    ELITE: "linear-gradient(135deg, #001a4d 0%, #001133 100%)", // Navy
    MASTER: "linear-gradient(135deg, #003322 0%, #002211 100%)", // Green
    UNRANKED: "linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)", // Dark
};

const TIER_TEXT = {
    TITAN: "#FFD700", // Gold
    ELITE: "#00AAFF",
    MASTER: "#00CC66",
    UNRANKED: "#8888AA"
};

// Thumbnail size presets for responsive images
const SIZE_PRESETS = {
    xs: { width: 40, height: 40 },
    sm: { width: 64, height: 64 },
    md: { width: 120, height: 120 },
    lg: { width: 200, height: 200 },
    xl: { width: 320, height: 320 },
} as const;

type SizePreset = keyof typeof SIZE_PRESETS;

interface Props {
    src?: string | null;
    alt: string;
    tier: "TITAN" | "ELITE" | "MASTER" | "UNRANKED" | string;
    fullName: string;
    className?: string;
    width?: number | string;
    height?: number | string;
    /** Use a preset size for consistent thumbnails */
    size?: SizePreset;
    /** Priority loading for above-the-fold images */
    priority?: boolean;
    /** Aspect ratio for consistent layouts (e.g., "1/1", "4/3") */
    aspectRatio?: string;
}

/**
 * Optimizes Cloudinary URLs for responsive loading
 * Adds width, height, crop, format, and quality transformations
 */
function getOptimizedUrl(src: string, targetWidth: number): string {
    // Skip optimization for data URLs or non-Cloudinary URLs
    if (src.startsWith('data:') || !src.includes('cloudinary.com')) {
        return src;
    }

    // Check if already has transformations
    if (src.includes('/upload/')) {
        // Insert transformations after /upload/
        const transforms = `w_${targetWidth},h_${targetWidth},c_fill,f_auto,q_auto`;
        return src.replace('/upload/', `/upload/${transforms}/`);
    }

    return src;
}

/**
 * Generates srcset for responsive images
 */
function generateSrcSet(src: string, baseWidth: number): string {
    const widths = [baseWidth, baseWidth * 1.5, baseWidth * 2].map(Math.round);
    return widths
        .map(w => `${getOptimizedUrl(src, w)} ${w}w`)
        .join(', ');
}

export default function ImageWithFallback({
    src,
    alt,
    tier,
    fullName,
    className,
    width,
    height,
    size,
    priority = false,
    aspectRatio,
}: Props) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Apply size preset if provided
    const resolvedWidth = size ? SIZE_PRESETS[size].width : width ?? "100%";
    const resolvedHeight = size ? SIZE_PRESETS[size].height : height ?? "auto";

    // Numeric width for optimization (default to 200 if percentage)
    const numericWidth = typeof resolvedWidth === 'number' ? resolvedWidth : 200;

    // Initials generator
    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .filter((_, i) => i < 2) // Max 2 chars
        .join("")
        .toUpperCase();

    const tierKey = (Object.keys(TIER_COLORS).includes(tier) ? tier : "UNRANKED") as keyof typeof TIER_COLORS;

    // Calculate font size based on container size
    const fontSize = typeof resolvedWidth === "number"
        ? `${resolvedWidth * 0.35}px`
        : size
            ? `${SIZE_PRESETS[size].width * 0.35}px`
            : "2rem";

    // Fallback placeholder styles
    const placeholderStyles: React.CSSProperties = {
        width: resolvedWidth,
        height: resolvedHeight,
        background: TIER_COLORS[tierKey],
        color: TIER_TEXT[tierKey],
        fontSize,
        fontWeight: "bold",
        border: `1px solid ${TIER_TEXT[tierKey]}33`,
        aspectRatio: aspectRatio,
    };

    if (!src || error) {
        return (
            <div
                className={`flex items-center justify-center rounded-lg shadow-inner ${className ?? ''}`}
                style={placeholderStyles}
                title={fullName}
                role="img"
                aria-label={alt}
            >
                {initials}
            </div>
        );
    }

    // Optimized image URL
    const optimizedSrc = getOptimizedUrl(src, numericWidth);
    const srcSet = generateSrcSet(src, numericWidth);

    return (
        <div
            className={`relative overflow-hidden ${className ?? ''}`}
            style={{
                width: resolvedWidth,
                height: resolvedHeight,
                aspectRatio: aspectRatio,
            }}
        >
            {/* Skeleton placeholder while loading */}
            {!loaded && (
                <div
                    className="absolute inset-0 animate-pulse"
                    style={{ background: TIER_COLORS[tierKey] }}
                />
            )}
            <img
                src={optimizedSrc}
                srcSet={srcSet}
                sizes={`${numericWidth}px`}
                alt={alt}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: "cover",
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.2s ease-in-out',
                }}
                loading={priority ? "eager" : "lazy"}
                decoding={priority ? "sync" : "async"}
                fetchPriority={priority ? "high" : "auto"}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />
        </div>
    );
}
