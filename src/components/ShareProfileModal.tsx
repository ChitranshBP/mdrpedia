/**
 * MDRPedia — Share Profile
 * Clean, minimal share interface
 */

import React, { useState, useEffect } from 'react';

interface Props {
    slug: string;
    fullName: string;
    title?: string;
}

export default function ShareProfileModal({ slug, fullName }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const url = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${slug}` : '';

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const share = (platform: string) => {
        const text = `Check out Dr. ${fullName}'s profile on MDRPedia`;
        const urls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ': ' + url)}`,
            email: `mailto:?subject=${encodeURIComponent(`Dr. ${fullName} - MDRPedia`)}&body=${encodeURIComponent(text + '\n\n' + url)}`
        };
        window.open(urls[platform], '_blank', 'width=600,height=500');
    };

    return (
        <div className="share-wrap">
            <button onClick={() => setIsOpen(true)} className="share-trigger">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 10L10 6M10 6H6M10 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="1" y="1" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                Share
            </button>

            {isOpen && (
                <div className="share-modal">
                    <div className="share-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="share-dialog">
                        <div className="share-header">
                            <span className="share-title">Share Profile</span>
                            <button onClick={() => setIsOpen(false)} className="share-close">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>

                        <div className="share-content">
                            <div className="share-platforms">
                                <button onClick={() => share('twitter')} className="share-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </button>
                                <button onClick={() => share('linkedin')} className="share-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                </button>
                                <button onClick={() => share('whatsapp')} className="share-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                </button>
                                <button onClick={() => share('email')} className="share-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="M22 6L12 13L2 6"/>
                                    </svg>
                                </button>
                            </div>

                            <div className="share-divider">
                                <span>or copy link</span>
                            </div>

                            <div className="share-copy">
                                <input type="text" value={url} readOnly className="share-input" />
                                <button onClick={copy} className={`share-copy-btn ${copied ? 'copied' : ''}`}>
                                    {copied ? (
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                            <path d="M11 5V3.5C11 2.67 10.33 2 9.5 2H3.5C2.67 2 2 2.67 2 3.5V9.5C2 10.33 2.67 11 3.5 11H5" stroke="currentColor" strokeWidth="1.5"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .share-wrap {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .share-trigger {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    height: 44px;
                    padding: 0 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    color: #a1a1aa;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .share-trigger:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.12);
                    color: #fafafa;
                }

                .share-modal {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    padding: 16px;
                }

                .share-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.15s;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                }

                .share-dialog {
                    position: relative;
                    width: 100%;
                    max-width: 360px;
                    background: #18181b;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
                    animation: dialogIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes dialogIn {
                    from {
                        opacity: 0;
                        transform: scale(0.96) translateY(8px);
                    }
                }

                .share-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .share-title {
                    color: #fafafa;
                    font-size: 15px;
                    font-weight: 600;
                }

                .share-close {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: #71717a;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .share-close:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: #fafafa;
                }

                .share-content {
                    padding: 20px;
                }

                .share-platforms {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }

                .share-btn {
                    width: 52px;
                    height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    color: #a1a1aa;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .share-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.15);
                    color: #fafafa;
                    transform: translateY(-2px);
                }

                .share-divider {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin: 20px 0;
                    color: #52525b;
                    font-size: 12px;
                }

                .share-divider::before,
                .share-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.06);
                }

                .share-copy {
                    display: flex;
                    gap: 8px;
                }

                .share-input {
                    flex: 1;
                    height: 44px;
                    padding: 0 14px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    color: #71717a;
                    font-size: 13px;
                    outline: none;
                }

                .share-copy-btn {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #8b5cf6;
                    border: none;
                    border-radius: 10px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .share-copy-btn:hover {
                    background: #7c3aed;
                }

                .share-copy-btn.copied {
                    background: #10b981;
                }
            `}</style>
        </div>
    );
}
