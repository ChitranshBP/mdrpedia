/**
 * MDRPedia — Image Upload Component
 * Handles client-side compression before upload to Cloudinary.
 * Prevents large uploads and provides visual feedback.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    compressImage,
    validateImageFile,
    formatBytes,
    type CompressionResult,
} from '../lib/image-compressor';

interface ImageUploadProps {
    /** Called when image is ready (compressed) */
    onImageReady: (result: CompressionResult) => void;
    /** Called on error */
    onError?: (error: string) => void;
    /** Current image URL (for preview) */
    currentImage?: string;
    /** Label text */
    label?: string;
    /** Maximum dimensions */
    maxWidth?: number;
    maxHeight?: number;
    /** Class name for container */
    className?: string;
}

type UploadState = 'idle' | 'validating' | 'compressing' | 'ready' | 'error';

export default function ImageUpload({
    onImageReady,
    onError,
    currentImage,
    label = 'Upload Portrait',
    maxWidth = 800,
    maxHeight = 800,
    className = '',
}: ImageUploadProps) {
    const [state, setState] = useState<UploadState>('idle');
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [stats, setStats] = useState<{
        original: number;
        compressed: number;
        ratio: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        setError(null);
        setState('validating');

        // Validate
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            setState('error');
            onError?.(validation.error || 'Invalid file');
            return;
        }

        // Compress
        setState('compressing');
        try {
            const result = await compressImage(file, {
                maxWidth,
                maxHeight,
                quality: 0.85,
                maxSizeBytes: 500 * 1024, // 500KB
            });

            setPreview(result.dataUrl);
            setStats({
                original: result.originalSize,
                compressed: result.compressedSize,
                ratio: result.compressionRatio,
            });
            setState('ready');
            onImageReady(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Compression failed';
            setError(message);
            setState('error');
            onError?.(message);
        }
    }, [maxWidth, maxHeight, onImageReady, onError]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleRemove = () => {
        setPreview(null);
        setStats(null);
        setState('idle');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className={`image-upload ${className}`}>
            <label className="image-upload__label">{label}</label>

            <div
                className={`image-upload__zone ${dragOver ? 'drag-over' : ''} ${state}`}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleClick())}
                aria-label={`${label}. Drop image here or press Enter to upload`}
                aria-describedby="upload-instructions"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="image-upload__input"
                />

                {state === 'compressing' && (
                    <div className="image-upload__loading">
                        <div className="spinner" />
                        <span>Optimizing image...</span>
                    </div>
                )}

                {preview && state === 'ready' && (
                    <div className="image-upload__preview">
                        <img src={preview} alt="Preview" />
                        <button
                            type="button"
                            className="image-upload__remove"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove();
                            }}
                            aria-label="Remove image"
                        >
                            &times;
                        </button>
                    </div>
                )}

                {!preview && state !== 'compressing' && (
                    <div className="image-upload__placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span id="upload-instructions">Drop image here or click to upload</span>
                        <small>JPEG, PNG, WebP (max 20MB)</small>
                    </div>
                )}
            </div>

            {error && (
                <div className="image-upload__error">
                    {error}
                </div>
            )}

            {stats && (
                <div className="image-upload__stats">
                    <span>
                        {formatBytes(stats.original)} → {formatBytes(stats.compressed)}
                    </span>
                    <span className="image-upload__savings">
                        {stats.ratio > 1 ? `${((1 - 1/stats.ratio) * 100).toFixed(0)}% smaller` : 'Optimized'}
                    </span>
                </div>
            )}

            <style>{`
                .image-upload {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .image-upload__label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary, #a0a0b0);
                }

                .image-upload__zone {
                    position: relative;
                    border: 2px dashed rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: rgba(255, 255, 255, 0.02);
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .image-upload__zone:hover,
                .image-upload__zone.drag-over {
                    border-color: var(--accent-purple, #8b5cf6);
                    background: rgba(139, 92, 246, 0.05);
                }

                .image-upload__zone.error {
                    border-color: #ef4444;
                }

                .image-upload__input {
                    display: none;
                }

                .image-upload__placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    color: var(--text-muted, #666);
                    text-align: center;
                }

                .image-upload__placeholder svg {
                    opacity: 0.5;
                }

                .image-upload__placeholder small {
                    opacity: 0.6;
                    font-size: 0.75rem;
                }

                .image-upload__loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    color: var(--accent-purple, #8b5cf6);
                }

                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(139, 92, 246, 0.2);
                    border-top-color: var(--accent-purple, #8b5cf6);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .image-upload__preview {
                    position: relative;
                    width: 100%;
                    max-width: 300px;
                }

                .image-upload__preview img {
                    width: 100%;
                    height: auto;
                    border-radius: 8px;
                    object-fit: cover;
                }

                .image-upload__remove {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #ef4444;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-size: 18px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                }

                .image-upload__remove:hover {
                    transform: scale(1.1);
                }

                .image-upload__error {
                    color: #ef4444;
                    font-size: 0.875rem;
                    padding: 8px 12px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 6px;
                }

                .image-upload__stats {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    color: var(--text-muted, #666);
                    padding: 8px 0;
                }

                .image-upload__savings {
                    color: var(--accent-emerald, #10b981);
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
