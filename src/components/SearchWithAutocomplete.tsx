
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    portraitUrl?: string;
    city?: string;
    country?: string;
}

interface Props {
    onSelect?: (doctor: SearchResult) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export default function SearchWithAutocomplete({ onSelect, placeholder, autoFocus }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = 'search-results-list';

    // Close on click outside or Escape key
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setActiveIndex(-1);
                inputRef.current?.focus();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                setIsLoading(true);
                fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        const searchResults = Array.isArray(data) ? data : [];
                        setResults(searchResults);
                        setIsLoading(false);
                        setIsOpen(true);
                        setActiveIndex(-1);

                        // Log Zero Results (Unmet Demand) - fire and forget
                        if (searchResults.length === 0 && query.length > 3) {
                            fetch('/api/log-search-click', {
                                method: 'POST',
                                body: JSON.stringify({ query, clickedSlug: 'ZERO_RESULTS' })
                            }).catch(() => { /* Silent fail for analytics */ });
                        }
                    })
                    .catch(() => setIsLoading(false));
            } else {
                setResults([]);
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = useCallback((result: SearchResult) => {
        // Log the click - fire and forget
        fetch('/api/log-search-click', {
            method: 'POST',
            body: JSON.stringify({ query, clickedSlug: result.slug })
        }).catch(() => { /* Silent fail for analytics */ });

        if (onSelect) {
            onSelect(result);
            setQuery('');
            setIsOpen(false);
            setActiveIndex(-1);
        }
    }, [query, onSelect]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < results.length) {
                    handleSelect(results[activeIndex]);
                    if (!onSelect) {
                        window.location.href = `/doctors/${results[activeIndex].slug}`;
                    }
                }
                break;
            case 'Tab':
                setIsOpen(false);
                setActiveIndex(-1);
                break;
        }
    }, [isOpen, results, activeIndex, handleSelect, onSelect]);

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeElement = listRef.current.children[activeIndex] as HTMLElement;
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    return (
        <div className="relative w-full max-w-lg" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen && results.length > 0}
                    aria-haspopup="listbox"
                    aria-controls={listId}
                    aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
                    aria-autocomplete="list"
                    aria-label="Search for doctors by name, specialty, or hospital"
                    className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-md"
                    placeholder={placeholder || "Search by name, specialty, or hospital..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    autoFocus={autoFocus}
                    autoComplete="off"
                />
                <svg
                    className="absolute left-4 top-3.5 w-5 h-5 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isLoading && (
                    <div className="absolute right-4 top-3.5" aria-hidden="true">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Live region for screen reader announcements */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {isLoading ? 'Searching...' : results.length > 0 ? `${results.length} results found` : query.length > 2 && !isLoading ? 'No results found' : ''}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-[#0f0f13] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-96 overflow-y-auto">
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-label="Search results"
                    >
                        {results.map((result, index) => (
                            <li
                                key={result.slug}
                                id={`search-result-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                            >
                                {onSelect ? (
                                    <button
                                        onClick={() => handleSelect(result)}
                                        className={`w-full text-left flex items-center gap-4 px-4 py-3 transition-colors group ${
                                            index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
                                        tabIndex={-1}
                                    >
                                        <SearchResultContent result={result} />
                                    </button>
                                ) : (
                                    <a
                                        href={`/doctors/${result.slug}`}
                                        onClick={() => handleSelect(result)}
                                        className={`flex items-center gap-4 px-4 py-3 transition-colors group ${
                                            index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
                                        tabIndex={-1}
                                    >
                                        <SearchResultContent result={result} />
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isOpen && query.length > 2 && results.length === 0 && !isLoading && (
                <div
                    className="absolute z-50 w-full mt-2 bg-[#0f0f13] border border-white/10 rounded-xl shadow-xl p-4 text-center text-gray-400 text-sm"
                    role="status"
                >
                    No results found for "{query}"
                </div>
            )}
        </div>
    );
}

function SearchResultContent({ result }: { result: SearchResult }) {
    return (
        <>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${result.tier === 'TITAN' ? 'bg-gradient-to-br from-purple-600 to-indigo-900 border border-yellow-500/50 text-yellow-500' :
                result.tier === 'ELITE' ? 'bg-blue-900/50 border border-blue-500/30 text-blue-400' :
                    'bg-gray-800 text-gray-400'
                }`}>
                {result.portraitUrl ? (
                    <img src={result.portraitUrl} alt={`Portrait of ${result.fullName}`} className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span>{result.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${result.tier === 'TITAN' ? 'text-yellow-400' : 'text-white'
                        }`}>
                        {result.fullName}
                    </span>
                    {result.tier === 'TITAN' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 rounded border border-yellow-500/30">
                            <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
                            </svg>
                            <span className="text-[10px] font-bold text-yellow-300">TITAN</span>
                        </div>
                    )}
                </div>
                <div className="text-xs text-gray-400 truncate">
                    {result.specialty} • {result.city}, {result.country}
                </div>
            </div>
        </>
    );
}
