
import React, { useState } from "react";
// import { getSignedImage } from "../lib/image-security";

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

interface Props {
    src?: string | null;
    alt: string;
    tier: "TITAN" | "ELITE" | "MASTER" | "UNRANKED" | string;
    fullName: string;
    className?: string;
    width?: number;
    height?: number;
}

export default function ImageWithFallback({
    src,
    alt,
    tier,
    fullName,
    className,
    width = 280,
    height = 280,
}: Props) {
    const [error, setError] = useState(false);

    // Initials generator
    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .filter((_, i) => i < 2) // Max 2 chars
        .join("")
        .toUpperCase();

    const tierKey = (Object.keys(TIER_COLORS).includes(tier) ? tier : "UNRANKED") as keyof typeof TIER_COLORS;

    // Construct signed URL if src exists (and logic isn't already handled by prop)
    // Assuming prop passes raw URL, we sign it here. 
    // Wait, getSignedImage is an Astro/Server utility using `cloudinary` SDK which might not work in Client React if it uses `process.env` or server secrets.
    // Actually, `getSignedImage` imports `cloudinary` which is a Node SDK. Client-side React CANNOT use it.
    // SOLUTION: The `src` passed to this component MUST be pre-signed by the server (Astro).
    // OR we use a simple Cloudinary URL construction if it's public.
    // Implementation Plan said: "Update DoctorProfile to use ImageWithFallback".
    // DoctorProfile is server-side. It can pass the Signed URL.
    // So `src` here is ALREADY signed.

    if (!src || error) {
        return (
            <div
                className={`flex items-center justify-center rounded-lg shadow-inner ${className}`}
                style={{
                    width: width,
                    height: height,
                    background: TIER_COLORS[tierKey],
                    color: TIER_TEXT[tierKey],
                    fontSize: width ? width * 0.35 : "2rem",
                    fontWeight: "bold",
                    border: `1px solid ${TIER_TEXT[tierKey]}33`, // 20% opacity border
                }}
                title={fullName}
            >
                {initials}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            loading="lazy" // or eager
            onError={() => setError(true)}
        />
    );
}
