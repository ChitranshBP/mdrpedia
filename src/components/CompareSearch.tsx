/**
 * MDRPedia -- Compare Search Component
 * Interactive doctor picker for the /compare page.
 * Calls /api/search?q=... and lets users select up to 3 doctors.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SearchResult {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    portraitUrl?: string;
    country?: string;
    hIndex?: number;
}

interface Props {
    selectedSlugs: string[];
    maxDoctors?: number;
}

const DEBOUNCE_MS = 200;

export default function CompareSearch({ selectedSlugs, maxDoctors = 3 }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data: SearchResult[] = await res.json();
                setResults(data.filter(d => !selectedSlugs.includes(d.slug)).slice(0, 8));
            }
        } catch {
            // silent fail
        } finally {
            setIsLoading(false);
        }
    }, [selectedSlugs]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => search(val), DEBOUNCE_MS);
    };

    const selectDoctor = (slug: string) => {
        const newSlugs = [...selectedSlugs, slug].slice(0, maxDoctors);
        const params = new URLSearchParams();
        params.set('doctors', newSlugs.join(','));
        window.location.href = `/compare?${params.toString()}`;
    };

    const removeDoctor = (slug: string) => {
        const newSlugs = selectedSlugs.filter(s => s !== slug);
        if (newSlugs.length === 0) {
            window.location.href = '/compare';
        } else {
            const params = new URLSearchParams();
            params.set('doctors', newSlugs.join(','));
            window.location.href = `/compare?${params.toString()}`;
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const canAdd = selectedSlugs.length < maxDoctors;

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            {/* Selected doctors as removable pills */}
            {selectedSlugs.length > 0 && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px',
                }}>
                    {selectedSlugs.map(slug => (
                        <button
                            key={slug}
                            onClick={() => removeDoctor(slug)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', background: 'var(--paper-2)',
                                border: '1px solid var(--rule)', borderRadius: '999px',
                                fontFamily: 'var(--font-sans)', fontSize: '13px',
                                color: 'var(--ink)', cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                                (e.target as HTMLElement).style.borderColor = 'var(--sanguine, #c53030)';
                                (e.target as HTMLElement).style.color = 'var(--sanguine, #c53030)';
                            }}
                            onMouseLeave={e => {
                                (e.target as HTMLElement).style.borderColor = 'var(--rule)';
                                (e.target as HTMLElement).style.color = 'var(--ink)';
                            }}
                        >
                            {slug.replace(/-/g, ' ')}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    ))}
                </div>
            )}

            {/* Search input */}
            {canAdd && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', background: 'var(--paper)',
                    border: '1px solid var(--rule)', borderRadius: '8px',
                    transition: 'border-color 0.15s ease',
                    borderColor: isFocused ? 'var(--ink)' : 'var(--rule)',
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="var(--ink-3)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => setIsFocused(true)}
                        placeholder={selectedSlugs.length === 0
                            ? 'Search for a physician to compare...'
                            : `Add another physician (${maxDoctors - selectedSlugs.length} remaining)...`
                        }
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            fontFamily: 'var(--font-serif)', fontSize: '16px',
                            color: 'var(--ink)', outline: 'none',
                        }}
                        autoComplete="off"
                    />
                    {isLoading && (
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{
                            animation: 'spin 1s linear infinite',
                        }}>
                            <circle cx="12" cy="12" r="10" stroke="var(--ink-3)" strokeWidth="2"
                                fill="none" strokeDasharray="30 70" />
                        </svg>
                    )}
                </div>
            )}

            {/* Results dropdown */}
            {isFocused && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    marginTop: '4px', background: 'var(--paper)',
                    border: '1px solid var(--rule)', borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    maxHeight: '360px', overflowY: 'auto',
                }}>
                    {results.map(doc => (
                        <button
                            key={doc.slug}
                            onClick={() => selectDoctor(doc.slug)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                width: '100%', padding: '12px 16px',
                                background: 'transparent', border: 'none',
                                borderBottom: '1px solid var(--rule)',
                                cursor: 'pointer', textAlign: 'left',
                                fontFamily: 'var(--font-sans)',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                overflow: 'hidden', flexShrink: 0,
                                background: 'var(--paper-2)',
                                border: '1px solid var(--rule)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {doc.portraitUrl ? (
                                    <img src={doc.portraitUrl} alt="" width={40} height={40}
                                        style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                ) : (
                                    <span style={{
                                        fontFamily: 'var(--font-serif)', fontSize: '16px',
                                        color: 'var(--ink-3)',
                                    }}>
                                        {doc.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px', fontWeight: 500, color: 'var(--ink)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    {doc.fullName}
                                    {doc.tier && doc.tier !== 'UNRANKED' && (
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700,
                                            padding: '1px 6px', borderRadius: '4px',
                                            letterSpacing: '0.05em',
                                            background: doc.tier === 'TITAN' ? 'var(--titan-bg, #fdf8e8)' : doc.tier === 'ELITE' ? 'var(--elite-bg, #eef3ff)' : 'var(--paper-3)',
                                            color: doc.tier === 'TITAN' ? 'var(--titan-text, #8b6914)' : doc.tier === 'ELITE' ? 'var(--elite-text, #2563eb)' : 'var(--ink-3)',
                                            border: `1px solid ${doc.tier === 'TITAN' ? 'var(--titan-border, #e8d48b)' : doc.tier === 'ELITE' ? 'var(--elite-border, #93b4ff)' : 'var(--rule)'}`,
                                        }}>
                                            {doc.tier}
                                        </span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '12px', color: 'var(--ink-3)',
                                    display: 'flex', gap: '8px', marginTop: '2px',
                                }}>
                                    <span>{doc.specialty}</span>
                                    {doc.country && <span>{doc.country}</span>}
                                </div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="var(--ink-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
