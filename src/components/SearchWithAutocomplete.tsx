
import React, { useState, useEffect, useRef } from 'react';

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
}

export default function SearchWithAutocomplete({ onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                setIsLoading(true);
                fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        const results = Array.isArray(data) ? data : [];
                        setResults(results);
                        setIsLoading(false);
                        setIsOpen(true);

                        // Log Zero Results (Unmet Demand)
                        if (results.length === 0 && query.length > 3) {
                            fetch('/api/log-search-click', {
                                method: 'POST',
                                body: JSON.stringify({ query, clickedSlug: 'ZERO_RESULTS' })
                            }).catch(err => console.error(err));
                        }
                    })
                    .catch(() => setIsLoading(false));
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        // Log the click
        fetch('/api/log-search-click', {
            method: 'POST',
            body: JSON.stringify({ query, clickedSlug: result.slug })
        }).catch(err => console.error(err));

        if (onSelect) {
            onSelect(result);
            setQuery('');
            setIsOpen(false);
        } else {
            // Navigate explicitly if no callback (though <a> tag usually handles it, logging is good side effect)
            // But we keep the <a> tag structure for SEO/Standard usage if onSelect is missing
        }
    };

    return (
        <div className="relative w-full max-w-lg" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-md"
                    placeholder="Search by name, specialty, or hospital..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                <svg
                    className="absolute left-4 top-3.5 w-5 h-5 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isLoading && (
                    <div className="absolute right-4 top-3.5">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-[#0f0f13] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    <ul>
                        {results.map((result) => (
                            <li key={result.slug}>
                                {onSelect ? (
                                    <button
                                        onClick={() => handleSelect(result)}
                                        className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group"
                                    >
                                        <SearchResultContent result={result} />
                                    </button>
                                ) : (
                                    <a
                                        href={`/doctors/${result.slug}`}
                                        onClick={() => handleSelect(result)}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group"
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
                <div className="absolute z-50 w-full mt-2 bg-[#0f0f13] border border-white/10 rounded-xl shadow-xl p-4 text-center text-gray-400 text-sm">
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
                    <img src={result.portraitUrl} alt="" className="w-full h-full object-cover rounded-full" />
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
