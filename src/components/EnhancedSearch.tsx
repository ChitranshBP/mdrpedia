/**
 * EnhancedSearch - Premium autocomplete search with rich results
 * Matches the GlobalSearchModal design language
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
    slug: string;
    fullName: string;
    specialty: string;
    tier: 'TITAN' | 'ELITE' | 'MASTER' | 'UNRANKED';
    portraitUrl?: string;
    city?: string;
    country?: string;
    hIndex?: number;
    rankingScore?: number;
}

interface EnhancedSearchProps {
    initialQuery?: string;
    placeholder?: string;
    autoFocus?: boolean;
    onResultClick?: (result: SearchResult) => void;
    maxResults?: number;
}

const RECENT_SEARCHES_KEY = 'mdrpedia_browse_recent';
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 200;

// Tier configurations
const tierConfig: Record<string, { color: string; bg: string; icon: string }> = {
    TITAN: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: '👑' },
    ELITE: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '⭐' },
    MASTER: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '✦' },
    UNRANKED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: '○' },
};

export default function EnhancedSearch({
    initialQuery = '',
    placeholder = 'Search by name, specialty, or location...',
    autoFocus = false,
    onResultClick,
    maxResults = 6,
}: EnhancedSearchProps) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Load recent searches
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch (e) { /* ignore */ }
    }, []);

    // Save recent search
    const saveRecentSearch = useCallback((term: string) => {
        if (term.length < 2) return;
        setRecentSearches(prev => {
            const updated = [term, ...prev.filter(s => s !== term)].slice(0, MAX_RECENT_SEARCHES);
            try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)); } catch (e) { /* ignore */ }
            return updated;
        });
    }, []);

    // Fetch results from API
    const fetchResults = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data.slice(0, maxResults));
            }
        } catch (e) {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [maxResults]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length >= 2) {
            debounceRef.current = setTimeout(() => fetchResults(query), DEBOUNCE_MS);
        } else {
            setResults([]);
        }

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, fetchResults]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setIsOpen(true);
            return;
        }

        const items = results.length > 0 ? results : recentSearches.map(s => ({ slug: s }));
        const itemCount = items.length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % itemCount);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
                break;
            case 'Enter':
                e.preventDefault();
                if (results.length > 0 && selectedIndex >= 0) {
                    handleResultClick(results[selectedIndex]);
                } else if (results.length === 0 && selectedIndex >= 0 && recentSearches[selectedIndex]) {
                    setQuery(recentSearches[selectedIndex]);
                    fetchResults(recentSearches[selectedIndex]);
                } else if (query.length >= 2) {
                    saveRecentSearch(query);
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    // Handle result click
    const handleResultClick = (result: SearchResult) => {
        saveRecentSearch(result.fullName || query);
        if (onResultClick) {
            onResultClick(result);
        } else {
            window.location.href = `/doctors/${result.slug}`;
        }
        setIsOpen(false);
    };

    // Get initials
    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter((_, i) => i < 2).join('').toUpperCase();

    // Highlight matching text
    const highlight = (text: string) => {
        if (!query || query.length < 2) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? <mark key={i} style={{ background: 'rgba(139, 92, 246, 0.3)', color: 'white', borderRadius: '2px', padding: '0 2px' }}>{part}</mark> : part
        );
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Search Input */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                background: isOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isOpen ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '14px',
                transition: 'all 0.2s ease',
                boxShadow: isOpen ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : 'none',
            }}>
                {/* Search Icon / Loading */}
                {isLoading ? (
                    <svg style={{ width: 20, height: 20, color: '#8b5cf6', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg style={{ width: 20, height: 20, color: '#94a3b8', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                )}

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                    }}
                />

                {/* Clear button */}
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                        style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                    >
                        <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}

                {/* Keyboard hint */}
                <kbd style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#64748b',
                }}>↵</kbd>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(17, 17, 27, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    zIndex: 100,
                    maxHeight: '400px',
                    overflowY: 'auto',
                }}>
                    {/* Results */}
                    {results.length > 0 && (
                        <div style={{ padding: '8px 0' }}>
                            <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Results
                            </div>
                            {results.map((result, index) => {
                                const tier = tierConfig[result.tier] || tierConfig.UNRANKED;
                                const location = [result.city, result.country].filter(Boolean).join(', ');
                                const isSelected = selectedIndex === index;

                                return (
                                    <button
                                        key={result.slug}
                                        onClick={() => handleResultClick(result)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; setSelectedIndex(index); }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            border: `2px solid ${tier.color}40`,
                                            background: tier.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}>
                                            {result.portraitUrl && !result.portraitUrl.startsWith('data:') ? (
                                                <img src={result.portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: tier.color }}>{getInitials(result.fullName)}</span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: 600, color: result.tier === 'TITAN' ? '#fbbf24' : 'white', fontSize: '0.95rem' }}>
                                                    {highlight(result.fullName)}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: tier.bg,
                                                    color: tier.color,
                                                }}>
                                                    {tier.icon} {result.tier}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                                                <span>{highlight(result.specialty)}</span>
                                                {location && (
                                                    <>
                                                        <span style={{ color: '#475569' }}>•</span>
                                                        <span style={{ color: '#64748b' }}>{location}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* H-Index */}
                                        {result.hIndex && result.hIndex > 0 && (
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>{result.hIndex}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>H-Index</div>
                                            </div>
                                        )}

                                        {/* Arrow */}
                                        <svg style={{ width: 16, height: 16, color: '#475569', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </button>
                                );
                            })}

                            {/* View all link */}
                            {results.length >= maxResults && (
                                <a
                                    href={`/search?q=${encodeURIComponent(query)}`}
                                    style={{
                                        display: 'block',
                                        padding: '12px 16px',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        color: '#8b5cf6',
                                        textDecoration: 'none',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    View all results →
                                </a>
                            )}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {query.length < 2 && recentSearches.length > 0 && (
                        <div style={{ padding: '8px 0' }}>
                            <div style={{
                                padding: '8px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Searches</span>
                                <button
                                    onClick={() => { setRecentSearches([]); localStorage.removeItem(RECENT_SEARCHES_KEY); }}
                                    style={{ fontSize: '0.7rem', color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Clear
                                </button>
                            </div>
                            {recentSearches.map((search, index) => (
                                <button
                                    key={search}
                                    onClick={() => { setQuery(search); fetchResults(search); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 16px',
                                        background: selectedIndex === index ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <svg style={{ width: 16, height: 16, color: '#64748b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span style={{ flex: 1, color: '#cbd5e1' }}>{search}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {query.length >= 2 && results.length === 0 && !isLoading && (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <svg style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#475569' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <p style={{ color: '#94a3b8', marginBottom: '4px' }}>No results for "{query}"</p>
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Try a different search term</p>
                        </div>
                    )}

                    {/* Keyboard hints */}
                    <div style={{
                        padding: '10px 16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: '16px',
                        fontSize: '0.7rem',
                        color: '#475569',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>↑↓</kbd>
                            Navigate
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>↵</kbd>
                            Select
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>Esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            )}

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
