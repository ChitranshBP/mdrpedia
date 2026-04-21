import { useState, useEffect } from 'react';

interface RecentProfile {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    portraitUrl?: string;
    viewedAt: number;
}

const STORAGE_KEY = 'mdrpedia_recently_viewed';
const MAX_ITEMS = 8;

export function addRecentlyViewed(profile: Omit<RecentProfile, 'viewedAt'>) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const existing: RecentProfile[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter(p => p.slug !== profile.slug);
        filtered.unshift({ ...profile, viewedAt: Date.now() });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
    } catch {
        // localStorage unavailable
    }
}

export default function RecentlyViewed() {
    const [profiles, setProfiles] = useState<RecentProfile[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: RecentProfile[] = JSON.parse(raw);
                setProfiles(parsed.slice(0, MAX_ITEMS));
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    if (profiles.length === 0) return null;

    const tierColors: Record<string, string> = {
        TITAN: 'var(--aged-gold)',
        ELITE: 'var(--ink-blue)',
        MASTER: 'var(--slate)',
    };

    return (
        <section className="recently-viewed">
            <div className="rv-header">
                <span className="rv-label">Recently Viewed</span>
                <button
                    className="rv-clear"
                    onClick={() => {
                        localStorage.removeItem(STORAGE_KEY);
                        setProfiles([]);
                    }}
                >
                    Clear
                </button>
            </div>
            <div className="rv-strip">
                {profiles.map(p => (
                    <a key={p.slug} href={`/doctors/${p.slug}`} className="rv-card">
                        <div className="rv-avatar" style={{
                            borderColor: tierColors[p.tier] || 'var(--rule)',
                        }}>
                            {p.portraitUrl ? (
                                <img src={p.portraitUrl} alt={p.fullName} loading="lazy" />
                            ) : (
                                <span className="rv-initials">
                                    {p.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="rv-name">{p.fullName.split(' ').pop()}</div>
                        <div className="rv-spec">{p.specialty.split(/[\/,]/)[0].trim()}</div>
                    </a>
                ))}
            </div>
            <style>{`
                .recently-viewed {
                    margin-bottom: var(--s-6);
                }
                .rv-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--s-3);
                }
                .rv-label {
                    font-family: var(--font-mono);
                    font-size: 10px;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--ink-3);
                }
                .rv-clear {
                    font-family: var(--font-mono);
                    font-size: 10px;
                    color: var(--ink-3);
                    background: none;
                    border: none;
                    cursor: pointer;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }
                .rv-clear:hover { color: var(--ink); }
                .rv-strip {
                    display: flex;
                    gap: var(--s-4);
                    overflow-x: auto;
                    padding-bottom: var(--s-2);
                    scrollbar-width: none;
                }
                .rv-strip::-webkit-scrollbar { display: none; }
                .rv-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    min-width: 72px;
                    text-decoration: none;
                    color: var(--ink);
                    transition: transform var(--t-fast) var(--ease);
                }
                .rv-card:hover { transform: translateY(-2px); }
                .rv-avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    border: 2px solid var(--rule);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--paper-2);
                }
                .rv-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .rv-initials {
                    font-family: var(--font-serif);
                    font-size: 16px;
                    color: var(--ink-3);
                    font-weight: 500;
                }
                .rv-name {
                    font-family: var(--font-sans);
                    font-size: 11px;
                    font-weight: 600;
                    text-align: center;
                    white-space: nowrap;
                    max-width: 72px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .rv-spec {
                    font-family: var(--font-mono);
                    font-size: 9px;
                    color: var(--ink-3);
                    text-align: center;
                    white-space: nowrap;
                    max-width: 72px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: 0.04em;
                }
            `}</style>
        </section>
    );
}
