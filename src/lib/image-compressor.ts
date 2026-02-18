/**
 * MDRPedia — Client-Side Image Compression
 * Compresses images before uploading to Cloudinary to:
 * - Reduce upload time
 * - Save bandwidth
 * - Prevent 10MB+ uploads from slowing down the admin panel
 */

export interface CompressionOptions {
    /** Maximum width in pixels (default: 1200) */
    maxWidth?: number;
    /** Maximum height in pixels (default: 1200) */
    maxHeight?: number;
    /** JPEG quality 0-1 (default: 0.85) */
    quality?: number;
    /** Maximum file size in bytes (default: 500KB) */
    maxSizeBytes?: number;
    /** Output format (default: 'image/jpeg') */
    outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressionResult {
    blob: Blob;
    dataUrl: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85,
    maxSizeBytes: 500 * 1024, // 500KB
    outputFormat: 'image/jpeg',
};

/**
 * Compresses an image file for upload.
 * Automatically handles resizing and quality reduction.
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<CompressionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // Load image
    const img = await loadImage(file);

    // Calculate new dimensions
    const { width, height } = calculateDimensions(
        img.width,
        img.height,
        opts.maxWidth,
        opts.maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Compress with quality reduction if needed
    let blob = await canvasToBlob(canvas, opts.outputFormat, opts.quality);
    let currentQuality = opts.quality;

    // Progressively reduce quality if still too large
    while (blob.size > opts.maxSizeBytes && currentQuality > 0.3) {
        currentQuality -= 0.1;
        blob = await canvasToBlob(canvas, opts.outputFormat, currentQuality);
    }

    // If still too large after quality reduction, resize further
    if (blob.size > opts.maxSizeBytes) {
        const scale = Math.sqrt(opts.maxSizeBytes / blob.size);
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        blob = await canvasToBlob(canvas, opts.outputFormat, currentQuality);
    }

    const dataUrl = await blobToDataUrl(blob);

    return {
        blob,
        dataUrl,
        originalSize,
        compressedSize: blob.size,
        compressionRatio: originalSize / blob.size,
        width: canvas.width,
        height: canvas.height,
    };
}

/**
 * Validates an image file before compression.
 * Returns errors if the file is invalid.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, GIF`,
        };
    }

    // Check file size (max 20MB raw - we'll compress it)
    const maxRawSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxRawSize) {
        return {
            valid: false,
            error: `File too large: ${formatBytes(file.size)}. Maximum: 20MB`,
        };
    }

    return { valid: true };
}

/**
 * Creates a preview thumbnail from a file.
 */
export async function createThumbnail(
    file: File,
    size: number = 150
): Promise<string> {
    const result = await compressImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.7,
        outputFormat: 'image/jpeg',
    });
    return result.dataUrl;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if exceeds max dimensions
    if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
    }
    if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
    }

    return { width, height };
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            },
            type,
            quality
        );
    });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
