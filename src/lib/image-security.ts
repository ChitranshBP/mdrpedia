
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME,
    api_key: import.meta.env.CLOUDINARY_API_KEY,
    api_secret: import.meta.env.CLOUDINARY_API_SECRET,
});

/**
 * Generates a signed Cloudinary URL for an image.
 * If the image is external (http), it uses the 'fetch' type.
 * Signs the URL to prevent tampering and hotlinking (if strict).
 */
export function getSignedImage(imageUrl: string, options: { width?: number; height?: number; crop?: string; gravity?: string } = {}) {
    if (!imageUrl) return '';

    // If it's already a Cloudinary URL, we can sign it or optimize it.
    // For this implementation, we assume we want to proxy/cache external images securely.

    const isExternal = imageUrl.startsWith('http');

    try {
        const url = cloudinary.url(imageUrl, {
            type: isExternal ? 'fetch' : 'upload',
            sign_url: true, // IMPORTANT: Generates signature
            secure: true,
            width: options.width || 600,
            height: options.height || 600,
            crop: options.crop || 'fill',
            gravity: options.gravity || 'face', // Allow override, default to face
            fetch_format: 'auto',
            quality: 'auto'
        });
        return url;
    } catch (e) {
        console.error('Cloudinary Signing Error:', e);
        return imageUrl; // Fallback
    }
}
