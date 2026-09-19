import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
    api_secret: import.meta.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Uploads an image to MDRPedia's Cloudinary bucket
 * @param filePath Local path or URL to the image
 * @param publicId Optional custom public ID (e.g., doctor-slug)
 * @param folder defaults to 'doctors'
 */
export async function uploadImage(filePath: string, publicId?: string, folder = 'doctors') {
    try {
        const options: UploadApiOptions = {
            folder,
            overwrite: true,
            resource_type: 'image',
        };

        if (publicId) {
            options.public_id = publicId;
        }

        const result = await cloudinary.uploader.upload(filePath, options);
        return result;
    } catch (error) {
        // Re-throw without logging - let caller handle error
        throw error;
    }
}

/**
 * Uploads a private verification document (medical licence, registration
 * certificate) to a restricted Cloudinary folder.
 *
 * These are identity documents, so they are uploaded as `authenticated`:
 * the returned URL is not publicly fetchable and must be signed to be read.
 *
 * @param file    The uploaded file from a multipart form
 * @param folder  Cloudinary folder, defaults to 'claim-documents'
 */
export async function uploadPrivateDocument(file: File, folder = 'claim-documents') {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    return cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'auto',
        type: 'authenticated',
        access_mode: 'authenticated',
        overwrite: false,
        use_filename: true,
        unique_filename: true,
    });
}

/**
 * Builds a short-lived signed URL for a private document.
 * Authenticated assets are not publicly fetchable, so reviewers need this
 * rather than the raw `secure_url`.
 *
 * @param publicId     The asset's Cloudinary public_id
 * @param resourceType 'image' or 'raw' (PDFs upload as 'image' via resource_type:'auto')
 * @param ttlSeconds   How long the link stays valid, default 10 minutes
 */
export function getSignedDocumentUrl(
    publicId: string,
    resourceType: 'image' | 'raw' | 'video' = 'image',
    ttlSeconds = 600,
) {
    return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
}

/**
 * Generates an optimized URL for a doctor's portrait
 * @param publicId The doctor's public ID (usually the slug)
 * @param options Transformations (width, height, crop)
 */
export function getOptimizedImageUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}) {
    // Using the fetch API format for auto-optimization if no detailed transformation is needed
    // Or build using the cloudinary SDK url builder if complex.
    // For simplicity allowing raw access or standard fetch:

    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return '';

    const { width = 400, height = 400, crop = 'fill' } = options;

    return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_${crop},f_auto,q_auto/doctors/${publicId}`;
}

export default cloudinary;
