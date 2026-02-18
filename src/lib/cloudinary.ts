import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME,
    api_key: import.meta.env.CLOUDINARY_API_KEY,
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
 * Generates an optimized URL for a doctor's portrait
 * @param publicId The doctor's public ID (usually the slug)
 * @param options Transformations (width, height, crop)
 */
export function getOptimizedImageUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}) {
    // Using the fetch API format for auto-optimization if no detailed transformation is needed
    // Or build using the cloudinary SDK url builder if complex.
    // For simplicity allowing raw access or standard fetch:

    const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return '';

    const { width = 400, height = 400, crop = 'fill' } = options;

    return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_${crop},f_auto,q_auto/doctors/${publicId}`;
}

export default cloudinary;
