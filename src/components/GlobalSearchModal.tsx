/**
 * GlobalSearchModal - Premium Command Palette Style Search
 * Completely revamped with glassmorphism, animations, and rich result cards
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

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

const DEBOUNCE_MS = 150;

const tierConfig: Record<string, {
    gradient: string;
    border: string;
    text: string;
    glow: string;
    bg: string;
    label: string;
    icon: React.ReactNode;
}> = {
    TITAN: {
        gradient: 'var(--aged-gold)',
        border: 'var(--aged-gold)',
        text: 'var(--aged-gold)',
        glow: 'none',
        bg: 'var(--aged-gold-2)',
        label: 'Top 0.01%',
        icon: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    },
    ELITE: {
        gradient: 'var(--ink-blue)',
        border: 'var(--ink-blue)',
        text: 'var(--ink-blue)',
        glow: 'none',
        bg: 'var(--ink-blue-2)',
        label: 'Top 1%',
        icon: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
    },
    MASTER: {
        gradient: 'var(--slate)',
        border: 'var(--slate)',
        text: 'var(--slate)',
        glow: 'none',
        bg: 'var(--paper-3)',
        label: 'Top 3%',
        icon: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    },
    UNRANKED: {
        gradient: 'var(--slate)',
        border: 'var(--rule)',
        text: 'var(--slate)',
        glow: 'none',
        bg: 'var(--paper-2)',
        label: 'Verified',
        icon: <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6L12 2z"/></svg>
    },
};

const quickLinks = [
    { href: '/rankings', icon: '', label: 'Rankings', desc: 'Browse top-rated physicians worldwide', color: 'var(--aged-gold)' },
    { href: '/rare-diseases', icon: '', label: 'Rare Diseases', desc: 'Expert database for rare conditions', color: 'var(--ink-blue)' },
    { href: '/hospitals', icon: '', label: 'Institutions', desc: 'Leading medical centers globally', color: 'var(--ink-blue)' },
    { href: '/prizes', icon: '', label: 'Awards', desc: 'Nobel, Lasker & major honors', color: 'var(--verdant)' },
    { href: '/news', icon: '', label: 'Medical News', desc: 'Latest breakthroughs & research', color: 'var(--ink-blue)' },
    { href: '/doctor/claim', icon: '', label: 'Claim Profile', desc: 'Verify your physician identity', color: 'var(--ink-blue)' },
];

const categories = [
    { id: 'all', label: 'All', icon: '' },
    { id: 'titan', label: 'Titan', icon: '' },
    { id: 'cardiology', label: 'Cardiology', icon: '' },
    { id: 'neurology', label: 'Neurology', icon: '' },
    { id: 'oncology', label: 'Oncology', icon: '' },
];

export default function GlobalSearchModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('mdrpedia-recent-searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            } catch (e) {}
        }
    }, []);

    // Save search to recent
    const saveSearch = (searchTerm: string) => {
        const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('mdrpedia-recent-searches', JSON.stringify(updated));
    };

    // Open modal with Cmd/Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            document.body.style.overflow = 'hidden';
        } else {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Fetch results
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
                setResults(data.slice(0, 8));
                setSelectedIndex(0);
            }
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length >= 2) {
            debounceRef.current = setTimeout(() => fetchResults(query), DEBOUNCE_MS);
        } else {
            setResults([]);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, fetchResults]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selected = resultsRef.current.querySelector('.selected');
            if (selected) {
                selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const maxIndex = results.length > 0 ? results.length - 1 : quickLinks.length - 1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results.length > 0 && results[selectedIndex]) {
                    saveSearch(query);
                    window.location.href = `/doctors/${results[selectedIndex].slug}`;
                } else if (results.length === 0 && quickLinks[selectedIndex]) {
                    window.location.href = quickLinks[selectedIndex].href;
                } else if (query.length >= 2) {
                    saveSearch(query);
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
                break;
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).filter((_, i) => i < 2).join('').toUpperCase();
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('mdrpedia-recent-searches');
    };

    if (!isOpen) return null;

    const styles = `
        /* ═══════════════════════════════════════════════════════════════════════════
           GLOBAL SEARCH MODAL - PREMIUM COMMAND PALETTE
           ═══════════════════════════════════════════════════════════════════════════ */

        .gsm-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 8vh;
            animation: gsm-fade-in 0.2s ease-out;
        }

        @keyframes gsm-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .gsm-backdrop {
            position: absolute;
            inset: 0;
            background: color-mix(in oklch, var(--ink) 85%, transparent);
        }

        .gsm-container {
            position: relative;
            width: 100%;
            max-width: 680px;
            margin: 0 16px;
            background: var(--paper);
            border: 1px solid var(--rule);
            border-radius: var(--r-4);
            box-shadow: var(--shadow-2);
            overflow: hidden;
            animation: gsm-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes gsm-slide-up {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.96);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Top border accent */
        .gsm-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--rule);
        }

        /* ═══════════════ SEARCH INPUT ═══════════════ */
        .gsm-input-section {
            position: relative;
            padding: 24px 28px;
            background: var(--paper);
        }

        .gsm-input-wrapper {
            display: flex;
            align-items: center;
            gap: 16px;
            background: var(--paper-2);
            border: 1px solid var(--rule);
            border-radius: var(--r-3);
            padding: 16px 20px;
            transition: all 0.2s ease;
        }

        .gsm-input-wrapper:focus-within {
            background: var(--paper-3);
            border-color: var(--ink-blue);
            box-shadow: 0 0 0 4px var(--ink-blue-2);
        }

        .gsm-search-icon {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            color: var(--ink-blue);
            transition: transform 0.2s;
        }

        .gsm-input-wrapper:focus-within .gsm-search-icon {
            transform: scale(1.1);
        }

        .gsm-spinner {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            color: var(--ink-blue);
            animation: gsm-spin 0.7s linear infinite;
        }

        @keyframes gsm-spin {
            to { transform: rotate(360deg); }
        }

        .gsm-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            font-size: 1.15rem;
            font-weight: 400;
            color: var(--ink);
            font-family: inherit;
            letter-spacing: -0.01em;
        }

        .gsm-input::placeholder {
            color: var(--slate);
            font-weight: 400;
        }

        .gsm-kbd {
            display: flex;
            align-items: center;
            padding: 6px 12px;
            background: var(--paper-2);
            border: 1px solid var(--rule);
            border-radius: var(--r-3);
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--slate);
            font-family: inherit;
        }

        /* ═══════════════ CATEGORY FILTERS ═══════════════ */
        .gsm-categories {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 28px 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .gsm-categories::-webkit-scrollbar {
            display: none;
        }

        .gsm-category {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: var(--paper-2);
            border: 1px solid var(--rule);
            border-radius: var(--r-4);
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--slate);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .gsm-category:hover {
            background: var(--paper-3);
            border-color: var(--rule);
            color: var(--ink);
        }

        .gsm-category.active {
            background: var(--ink-blue-2);
            border-color: var(--ink-blue);
            color: var(--ink-blue);
        }

        .gsm-category-icon {
            font-size: 0.9rem;
        }

        /* ═══════════════ RESULTS ═══════════════ */
        .gsm-results {
            max-height: 55vh;
            overflow-y: auto;
            padding: 8px 12px;
            scroll-behavior: smooth;
        }

        .gsm-results::-webkit-scrollbar {
            width: 6px;
        }

        .gsm-results::-webkit-scrollbar-track {
            background: transparent;
        }

        .gsm-results::-webkit-scrollbar-thumb {
            background: var(--rule);
            border-radius: 3px;
        }

        .gsm-result {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 18px;
            margin-bottom: 4px;
            text-decoration: none;
            color: var(--ink);
            border-radius: var(--r-3);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .gsm-result::before {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .gsm-result:hover {
            background: var(--paper-2);
        }

        .gsm-result.selected {
            background: var(--paper-2);
            border: 1px solid var(--rule);
        }

        .gsm-result.selected::before {
            opacity: 0;
        }

        /* Avatar */
        .gsm-avatar {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: var(--r-3);
            overflow: hidden;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            font-size: 1rem;
            letter-spacing: 0.05em;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gsm-result.selected .gsm-avatar {
            transform: scale(1.05);
        }

        .gsm-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .gsm-avatar-ring {
            position: absolute;
            inset: -3px;
            border-radius: 18px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .gsm-result.selected .gsm-avatar-ring {
            opacity: 1;
        }

        /* Info */
        .gsm-info {
            flex: 1;
            min-width: 0;
        }

        .gsm-name-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
        }

        .gsm-name {
            font-weight: 500;
            font-size: 1.05rem;
            letter-spacing: -0.01em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .gsm-tier-badge {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 0.65rem;
            font-weight: 500;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            flex-shrink: 0;
        }

        .gsm-tier-icon {
            font-size: 0.75rem;
        }

        .gsm-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.875rem;
            color: var(--slate);
        }

        .gsm-specialty {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .gsm-specialty-icon {
            width: 14px;
            height: 14px;
            color: var(--slate);
        }

        .gsm-location {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--slate);
        }

        .gsm-location-icon {
            width: 12px;
            height: 12px;
        }

        .gsm-stats {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 8px;
        }

        .gsm-stat {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            background: var(--paper-2);
            border-radius: var(--r-3);
            font-size: 0.75rem;
            color: var(--slate);
        }

        .gsm-stat-value {
            font-weight: 500;
            color: var(--ink);
        }

        /* Enter hint */
        .gsm-enter-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: var(--ink-blue-2);
            border: 1px solid var(--ink-blue);
            border-radius: var(--r-3);
            color: var(--ink-blue);
            font-size: 1rem;
            flex-shrink: 0;
            transition: all 0.2s;
        }

        .gsm-result:hover .gsm-enter-hint {
            background: var(--ink-blue-2);
            transform: scale(1.1);
        }

        /* ═══════════════ NO RESULTS ═══════════════ */
        .gsm-no-results {
            padding: 48px 28px;
            text-align: center;
        }

        .gsm-no-results-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            color: var(--slate);
            opacity: 0.6;
        }

        .gsm-no-results-title {
            font-size: 1.1rem;
            font-weight: 500;
            color: var(--ink);
            margin-bottom: 8px;
        }

        .gsm-no-results-text {
            color: var(--slate);
            margin-bottom: 20px;
            font-size: 0.95rem;
        }

        .gsm-no-results-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: var(--ink-blue-2);
            border: 1px solid var(--ink-blue);
            border-radius: var(--r-4);
            color: var(--ink-blue);
            font-weight: 500;
            font-size: 0.9rem;
            text-decoration: none;
            transition: all 0.2s;
        }

        .gsm-no-results-link:hover {
            background: var(--ink-blue-2);
            transform: translateY(-2px);
        }

        /* ═══════════════ QUICK LINKS ═══════════════ */
        .gsm-quick-section {
            padding: 20px 20px 24px;
        }

        .gsm-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding: 0 8px;
        }

        .gsm-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--slate);
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .gsm-section-icon {
            width: 14px;
            height: 14px;
        }

        .gsm-clear-btn {
            background: none;
            border: none;
            color: var(--slate);
            font-size: 0.75rem;
            cursor: pointer;
            transition: color 0.2s;
        }

        .gsm-clear-btn:hover {
            color: var(--ink);
        }

        .gsm-quick-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        .gsm-quick-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 20px 12px;
            background: var(--paper-2);
            border: 1px solid var(--rule);
            border-radius: var(--r-3);
            text-decoration: none;
            color: var(--ink);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .gsm-quick-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--accent-color);
            opacity: 0;
            transition: opacity 0.2s;
        }

        .gsm-quick-item:hover {
            background: var(--paper-3);
            border-color: var(--rule);
            transform: translateY(-4px);
        }

        .gsm-quick-item:hover::before {
            opacity: 1;
        }

        .gsm-quick-item.selected {
            background: var(--paper-3);
            border-color: var(--ink-blue);
        }

        .gsm-quick-icon {
            font-size: 1.8rem;
            filter: none;
        }

        .gsm-quick-content {
            text-align: center;
        }

        .gsm-quick-label {
            font-weight: 500;
            font-size: 0.9rem;
            margin-bottom: 4px;
        }

        .gsm-quick-desc {
            font-size: 0.7rem;
            color: var(--slate);
            line-height: 1.4;
        }

        /* ═══════════════ RECENT SEARCHES ═══════════════ */
        .gsm-recent-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .gsm-recent-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: var(--paper-2);
            border: 1px solid transparent;
            border-radius: var(--r-4);
            text-decoration: none;
            color: var(--ink);
            font-size: 0.9rem;
            transition: all 0.2s;
            cursor: pointer;
        }

        .gsm-recent-item:hover {
            background: var(--paper-3);
            border-color: var(--rule);
        }

        .gsm-recent-icon {
            width: 16px;
            height: 16px;
            color: var(--slate);
        }

        .gsm-recent-text {
            flex: 1;
        }

        .gsm-recent-arrow {
            width: 16px;
            height: 16px;
            color: var(--slate);
            opacity: 0;
            transition: all 0.2s;
        }

        .gsm-recent-item:hover .gsm-recent-arrow {
            opacity: 1;
            transform: translateX(4px);
        }

        /* ═══════════════ FOOTER ═══════════════ */
        .gsm-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            border-top: 1px solid var(--rule);
            background: var(--paper-2);
        }

        .gsm-shortcuts {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .gsm-shortcut {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: var(--slate);
        }

        .gsm-shortcut kbd {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 22px;
            height: 22px;
            padding: 0 6px;
            background: var(--paper-3);
            border: 1px solid var(--rule);
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 500;
            font-family: inherit;
            color: var(--slate);
        }

        .gsm-footer-link {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--ink-blue);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s;
        }

        .gsm-footer-link:hover {
            color: var(--ink-blue);
        }

        .gsm-footer-link svg {
            width: 16px;
            height: 16px;
            transition: transform 0.2s;
        }

        .gsm-footer-link:hover svg {
            transform: translateX(3px);
        }

        /* ═══════════════ RESPONSIVE ═══════════════ */
        @media (max-width: 640px) {
            .gsm-overlay {
                padding-top: 4vh;
            }

            .gsm-container {
                max-height: 90vh;
            }

            .gsm-quick-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .gsm-shortcuts {
                display: none;
            }

            .gsm-kbd {
                display: none;
            }

            .gsm-categories {
                padding: 0 20px 12px;
            }

            .gsm-input-section {
                padding: 20px;
            }

            .gsm-input {
                font-size: 1rem;
            }

            .gsm-avatar {
                width: 48px;
                height: 48px;
            }

            .gsm-stats {
                display: none;
            }
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="gsm-overlay">
                <div className="gsm-backdrop" onClick={() => setIsOpen(false)} />

                <div className="gsm-container">
                    {/* Search Input */}
                    <div className="gsm-input-section">
                        <div className="gsm-input-wrapper">
                            {isLoading ? (
                                <svg className="gsm-spinner" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg className="gsm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                                </svg>
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search physicians, specialties, institutions..."
                                className="gsm-input"
                            />
                            <kbd className="gsm-kbd">ESC</kbd>
                        </div>
                    </div>

                    {/* Category Filters */}
                    {query.length < 2 && (
                        <div className="gsm-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`gsm-category ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    <span className="gsm-category-icon">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="gsm-results" ref={resultsRef}>
                            {results.map((result, index) => {
                                const config = tierConfig[result.tier] || tierConfig.UNRANKED;
                                const location = [result.city, result.country].filter(Boolean).join(', ');

                                return (
                                    <a
                                        key={result.slug}
                                        href={`/doctors/${result.slug}`}
                                        className={`gsm-result ${selectedIndex === index ? 'selected' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        onClick={() => saveSearch(query)}
                                    >
                                        <div
                                            className="gsm-avatar"
                                            style={{
                                                background: config.bg,
                                                border: `2px solid ${config.border}`,
                                                color: config.text,
                                            }}
                                        >
                                            <div
                                                className="gsm-avatar-ring"
                                                style={{ border: `2px solid ${config.border}`, boxShadow: config.glow }}
                                            />
                                            {result.portraitUrl && !result.portraitUrl.startsWith('data:') ? (
                                                <img src={result.portraitUrl} alt={result.fullName} />
                                            ) : (
                                                getInitials(result.fullName)
                                            )}
                                        </div>

                                        <div className="gsm-info">
                                            <div className="gsm-name-row">
                                                <span className="gsm-name" style={{ color: result.tier === 'TITAN' ? 'var(--titan-text)' : 'var(--ink)' }}>
                                                    {result.fullName}
                                                </span>
                                                <span
                                                    className="gsm-tier-badge"
                                                    style={{
                                                        background: config.bg,
                                                        color: config.text,
                                                        border: `1px solid ${config.border}`
                                                    }}
                                                >
                                                    <span className="gsm-tier-icon">{config.icon}</span>
                                                    {config.label}
                                                </span>
                                            </div>

                                            <div className="gsm-meta">
                                                <span className="gsm-specialty">
                                                    <svg className="gsm-specialty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                                    </svg>
                                                    {result.specialty}
                                                </span>
                                                {location && (
                                                    <span className="gsm-location">
                                                        <svg className="gsm-location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                            <circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                        {location}
                                                    </span>
                                                )}
                                            </div>

                                            {(result.hIndex || result.rankingScore) && (
                                                <div className="gsm-stats">
                                                    {result.hIndex && (
                                                        <span className="gsm-stat">
                                                            H-Index: <span className="gsm-stat-value">{result.hIndex}</span>
                                                        </span>
                                                    )}
                                                    {result.rankingScore && (
                                                        <span className="gsm-stat">
                                                            Score: <span className="gsm-stat-value">{result.rankingScore.toFixed(1)}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {selectedIndex === index && (
                                            <span className="gsm-enter-hint">↵</span>
                                        )}
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    {/* No Results */}
                    {query.length >= 2 && results.length === 0 && !isLoading && (
                        <div className="gsm-no-results">
                            <svg className="gsm-no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                                <path d="M11 8v6M8 11h6" strokeLinecap="round" />
                            </svg>
                            <p className="gsm-no-results-title">No physicians found</p>
                            <p className="gsm-no-results-text">
                                We couldn't find anyone matching "{query}"
                            </p>
                            <a href={`/search?q=${encodeURIComponent(query)}`} className="gsm-no-results-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                                Try Advanced Search
                            </a>
                        </div>
                    )}

                    {/* Quick Links (when no query) */}
                    {query.length < 2 && (
                        <>
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div className="gsm-quick-section" style={{ paddingBottom: '12px' }}>
                                    <div className="gsm-section-header">
                                        <span className="gsm-section-title">
                                            <svg className="gsm-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            Recent Searches
                                        </span>
                                        <button className="gsm-clear-btn" onClick={clearRecentSearches}>
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="gsm-recent-list">
                                        {recentSearches.map((search, idx) => (
                                            <div
                                                key={idx}
                                                className="gsm-recent-item"
                                                onClick={() => {
                                                    setQuery(search);
                                                    fetchResults(search);
                                                }}
                                            >
                                                <svg className="gsm-recent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.3-4.3" />
                                                </svg>
                                                <span className="gsm-recent-text">{search}</span>
                                                <svg className="gsm-recent-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="m9 18 6-6-6-6" />
                                                </svg>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Links Grid */}
                            <div className="gsm-quick-section">
                                <div className="gsm-section-header">
                                    <span className="gsm-section-title">
                                        <svg className="gsm-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        Quick Access
                                    </span>
                                </div>
                                <div className="gsm-quick-grid">
                                    {quickLinks.map((link, index) => (
                                        <a
                                            key={link.href}
                                            href={link.href}
                                            className={`gsm-quick-item ${selectedIndex === index ? 'selected' : ''}`}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            style={{ '--accent-color': link.color } as React.CSSProperties}
                                        >
                                            <span className="gsm-quick-icon">{link.icon}</span>
                                            <div className="gsm-quick-content">
                                                <div className="gsm-quick-label">{link.label}</div>
                                                <div className="gsm-quick-desc">{link.desc}</div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="gsm-footer">
                        <div className="gsm-shortcuts">
                            <span className="gsm-shortcut">
                                <kbd>↑</kbd>
                                <kbd>↓</kbd>
                                Navigate
                            </span>
                            <span className="gsm-shortcut">
                                <kbd>↵</kbd>
                                Select
                            </span>
                            <span className="gsm-shortcut">
                                <kbd>esc</kbd>
                                Close
                            </span>
                        </div>
                        <a href="/search" className="gsm-footer-link">
                            Advanced Search
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
