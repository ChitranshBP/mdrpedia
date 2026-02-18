import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';

interface Props {
    slug: string;
    fullName: string;
    title?: string;
}

export default function ShareProfileModal({ slug, fullName, title = "MDRPedia Analysis" }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Try to use toast, fallback gracefully
    let toast: ReturnType<typeof useToast> | null = null;
    try {
        toast = useToast();
    } catch {
        // Not wrapped in ToastProvider
    }

    const url = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${slug}` : '';

    useEffect(() => {
        if (showQR && url) {
            // Generate QR code using QR Server API
            setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=1a1b26&color=ffffff`);
        }
    }, [showQR, url]);

    // Handle escape key and focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        // Trap focus inside modal
        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !modalRef.current) return;

            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstEl = focusableElements[0] as HTMLElement;
            const lastEl = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleTab);

        // Focus first focusable element
        const firstFocusable = modalRef.current?.querySelector('button') as HTMLElement;
        firstFocusable?.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleTab);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus();
    }, []);

    const shareLinks = [
        {
            name: 'LinkedIn',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            ),
            color: 'bg-[#0077b5]'
        },
        {
            name: 'X',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out the MDRPedia profile for Dr. ${fullName}`)}&url=${encodeURIComponent(url)}`,
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            color: 'bg-black'
        },
        {
            name: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            color: 'bg-[#1877f2]'
        },
        {
            name: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(`Check out Dr. ${fullName} on MDRPedia: ${url}`)}`,
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            color: 'bg-[#25d366]'
        },
        {
            name: 'Email',
            url: `mailto:?subject=${encodeURIComponent(`Doctor Profile: ${fullName}`)}&body=${encodeURIComponent(`I found this detailed profile on MDRPedia:\n\n${url}`)}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            color: 'bg-gray-600'
        },
        {
            name: 'Print',
            url: '#print',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
            ),
            color: 'bg-gray-500',
            onClick: () => window.print()
        }
    ];

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast?.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            toast?.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = (link: typeof shareLinks[0]) => {
        if (link.onClick) {
            link.onClick();
            return;
        }
        if (link.url !== '#print') {
            window.open(link.url, '_blank', 'width=600,height=400');
        }
    };

    // Native share API support
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Dr. ${fullName} - MDRPedia`,
                    text: `Check out the MDRPedia profile for Dr. ${fullName}`,
                    url: url
                });
            } catch (err) {
                // User cancelled or error
            }
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={handleClose}
                    role="presentation"
                >
                    <div
                        ref={modalRef}
                        className="bg-[#1a1b26] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="share-modal-title"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="share-modal-title" className="text-xl font-bold text-white">Share Profile</h3>
                            <button
                                onClick={handleClose}
                                className="text-white/50 hover:text-white text-2xl leading-none p-1"
                                aria-label="Close share dialog"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Profile Preview Card */}
                        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 font-bold">
                                    {fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Dr. {fullName}</p>
                                    <p className="text-sm text-gray-400">MDRPedia Verified Profile</p>
                                </div>
                            </div>
                        </div>

                        {/* Share Links Grid - Responsive: 2 cols on mobile, 3 on larger */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6" role="group" aria-label="Share options">
                            {shareLinks.map(link => (
                                <button
                                    key={link.name}
                                    onClick={() => handleShare(link)}
                                    className={`flex flex-col items-center gap-2 p-3 ${link.color} hover:opacity-90 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-white/50`}
                                    aria-label={`Share on ${link.name}`}
                                >
                                    <span className="text-white group-hover:scale-110 transition-transform" aria-hidden="true">{link.icon}</span>
                                    <span className="text-xs text-white/80">{link.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Copy Link */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 overflow-hidden">
                                <span className="text-sm text-gray-400 truncate">{url}</span>
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30'
                                    }`}
                            >
                                {copied ? (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Copied!
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        Copy
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* QR Code Toggle */}
                        <div className="border-t border-white/10 pt-4">
                            <button
                                onClick={() => setShowQR(!showQR)}
                                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                {showQR ? 'Hide QR Code' : 'Show QR Code'}
                                <svg className={`w-4 h-4 transition-transform ${showQR ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showQR && (
                                <div className="mt-4 flex flex-col items-center">
                                    <div className="bg-white p-3 rounded-xl">
                                        <img
                                            src={qrUrl}
                                            alt="QR Code"
                                            className="w-40 h-40"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Scan to open profile</p>
                                </div>
                            )}
                        </div>

                        {/* Native Share (mobile) */}
                        {'share' in navigator && (
                            <button
                                onClick={handleNativeShare}
                                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                More Sharing Options
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
