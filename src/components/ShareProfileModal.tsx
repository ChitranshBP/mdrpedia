import React, { useState } from 'react';

interface Props {
    slug: string;
    fullName: string;
    title?: string;
}

export default function ShareProfileModal({ slug, fullName, title = "MDRPedia Analysis" }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${slug}` : '';

    const shareLinks = [
        {
            name: 'LinkedIn',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            icon: '👔'
        },
        {
            name: 'X (Twitter)',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out the MDRPedia analysis for Dr. ${fullName}. The single source of truth for medical authority.`)}&url=${encodeURIComponent(url)}`,
            icon: '🐦'
        },
        {
            name: 'Email',
            url: `mailto:?subject=${encodeURIComponent(`Doctor Profile: ${fullName}`)}&body=${encodeURIComponent(`I found this detailed profile on MDRPedia:\n\n${url}`)}`,
            icon: '📧'
        }
    ];

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Profile
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}>
                    <div className="bg-[#1a1b26] border border-white/10 rounded-xl max-w-sm w-full p-6 shadow-2xl transform scale-100 transition-all"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Share Profile</h3>
                            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {shareLinks.map(link => (
                                <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon}</span>
                                    <span className="text-xs text-gray-400">{link.name}</span>
                                </a>
                            ))}
                        </div>

                        <button
                            onClick={copyToClipboard}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Link
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
