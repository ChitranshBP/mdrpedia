/**
 * MDRPedia — News collection helpers
 *
 * The news collection doubles as an editorial queue. An entry is live only
 * when its `date` has arrived and its `status` is not `draft`. Public
 * surfaces must go through getPublishedNews() so the feed never leads with
 * an article dated after today, and so speculative pieces held back as
 * drafts cannot publish themselves when the calendar catches up.
 * Admin surfaces use getCollection("news") directly and label the queue.
 */

import { getCollection, type CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;

/** End of the current day, so an article dated today is live all day. */
function endOfToday(): number {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

export function isDraft(entry: NewsEntry): boolean {
    return entry.data.status === 'draft';
}

export function isPublished(entry: NewsEntry, now = endOfToday()): boolean {
    if (isDraft(entry)) return false;
    const t = new Date(entry.data.date).getTime();
    return Number.isNaN(t) ? true : t <= now;
}

/** Dated ahead of today and waiting to go live on its own. */
export function isScheduled(entry: NewsEntry, now = endOfToday()): boolean {
    return !isDraft(entry) && !isPublished(entry, now);
}

export function byDateDesc(a: NewsEntry, b: NewsEntry): number {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
}

/** Published articles only, newest first. */
export async function getPublishedNews(): Promise<NewsEntry[]> {
    const now = endOfToday();
    const all = await getCollection('news');
    return all.filter((e) => isPublished(e, now)).sort(byDateDesc);
}

// ─── Category presentation ──────────────────────────────────────────────────

export interface CategoryInfo {
    icon: string;
    color: string;
    label: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
    breakthrough: { icon: 'flask', color: '#ffd700', label: 'Research Breakthrough' },
    'clinical-trial': { icon: 'pill', color: '#00aaff', label: 'Clinical Trial' },
    award: { icon: 'trophy', color: '#a78bfa', label: 'Award & Recognition' },
    achievement: { icon: 'trophy', color: '#a78bfa', label: 'Achievement' },
    impact: { icon: 'lightbulb', color: '#10b981', label: 'Impact Story' },
    registry: { icon: 'clipboard', color: '#f59e0b', label: 'Registry Update' },
    technique: { icon: 'tool', color: '#ec4899', label: 'New Technique' },
    'global-health': { icon: 'globe', color: '#06b6d4', label: 'Global Health' },
    research: { icon: 'dna', color: '#8b5cf6', label: 'Research' },
    innovation: { icon: 'zap', color: '#22d3ee', label: 'Innovation' },
    default: { icon: 'file', color: '#888', label: 'News' },
};

export function getCategoryInfo(category: string): CategoryInfo {
    const normalized = (category || '').toLowerCase().replace(/\s+/g, '-');
    return CATEGORIES[normalized] || CATEGORIES.default;
}

export const ICON_PATHS: Record<string, string> = {
    flask: 'M9 3h6v2H9V3zm0 4v6l-3 6h12l-3-6V7H9z',
    pill: 'M10.5 1.5a4.5 4.5 0 0 0-4.5 4.5v12a4.5 4.5 0 0 0 9 0V6a4.5 4.5 0 0 0-4.5-4.5zM8 12h5',
    trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M6 9a6 6 0 0 0 12 0V4H6v5zm3 12h6m-3-3v3',
    lightbulb: 'M9 21h6m-3-3v3M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3z',
    clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6',
    tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    globe: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    dna: 'M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6M9 3v18m6-18v18',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
};
