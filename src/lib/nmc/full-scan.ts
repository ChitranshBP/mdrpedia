/**
 * Full channel scan for a queued NMC check.
 * Websites and YouTube channels are fetched and screened automatically;
 * platforms that block automated reading are marked for manual review.
 */
import { prisma } from '../prisma';
import { createLogger } from '../logger';
import { screenContent } from './screen';
import { sendFullReportEmail } from './emails';
import { extractText, metaContent, safeFetchText } from './fetch';
import type { ChannelKey, Channels, NmcScreenResult } from './types';
import { CHANNEL_KEYS, CHANNEL_LABELS } from './types';

const log = createLogger('NMC-Scan');

const MAX_SUBPAGES = 3;

export interface ScanSection {
    key: ChannelKey;
    label: string;
    value: string;
    url: string | null;
    result: NmcScreenResult | null;
    pages?: string[];
    note?: string;
    manual: boolean;
}

export interface FullReport {
    scannedAt: string;
    sections: ScanSection[];
    needsManualReview: boolean;
}

const RELEVANT_LINK = /about|doctor|team|profile|testimonial|review|patient|treatment|service|procedure|gallery|result/i;

function relevantLinks(html: string, base: string): string[] {
    const origin = new URL(base).origin;
    const seen = new Set<string>([new URL(base).href]);
    const out: string[] = [];
    for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        if (out.length >= MAX_SUBPAGES) break;
        try {
            const u = new URL(m[1], base);
            u.hash = '';
            if (u.origin !== origin || seen.has(u.href)) continue;
            if (!RELEVANT_LINK.test(u.pathname + ' ' + m[2])) continue;
            if (/\.(pdf|jpe?g|png|gif|webp|mp4|zip)$/i.test(u.pathname)) continue;
            seen.add(u.href);
            out.push(u.href);
        } catch {
            /* malformed href */
        }
    }
    return out;
}

export function channelUrl(key: ChannelKey, value: string): string | null {
    const v = value.trim();
    if (/^https?:\/\//i.test(v)) return v;
    const handle = v.replace(/^@/, '').replace(/^(?:www\.)?[a-z]+\.com\//i, '').replace(/\/+$/, '');
    if (/^(?:www\.)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(v) && key === 'web') return `https://${v}`;
    if (/^(?:www\.)?(?:instagram|facebook|youtube|linkedin)\.com\//i.test(v)) return `https://${v.replace(/^www\./i, 'www.')}`;
    switch (key) {
        case 'ig': return `https://www.instagram.com/${handle}`;
        case 'fb': return `https://www.facebook.com/${handle}`;
        case 'yt': return `https://www.youtube.com/@${handle.replace(/^@/, '')}`;
        case 'li': return handle.startsWith('in/') ? `https://www.linkedin.com/${handle}` : `https://www.linkedin.com/in/${handle}`;
        default: return null;
    }
}

const MANUAL_NOTE: Partial<Record<ChannelKey, string>> = {
    ig: 'Instagram does not allow automated reading. Our team reviews your recent posts, highlights and bio by hand.',
    fb: 'Facebook does not allow automated reading. Our team reviews your page and recent posts by hand.',
    li: 'LinkedIn does not allow automated reading. Our team reviews your profile and recent posts by hand.',
    gbp: 'Google Business profiles are reviewed by hand, including the description, posts, Q&A and how you respond to reviews.',
};

async function scanWebsite(url: string): Promise<{ result: NmcScreenResult; pages: string[] }> {
    const home = await safeFetchText(url);
    const pages = [home.url];
    const texts = [extractText(home.html)];
    for (const link of relevantLinks(home.html, home.url)) {
        try {
            const page = await safeFetchText(link);
            pages.push(page.url);
            texts.push(extractText(page.html));
        } catch (error) {
            log.warn(`Subpage skipped: ${link}`, { error: String(error) });
        }
    }
    return { result: await screenContent(texts.join('\n\n')), pages };
}

async function scanYouTube(url: string): Promise<NmcScreenResult> {
    const about = url.replace(/\/+$/, '').replace(/\/(?:about|featured|videos)$/, '') + '/about';
    const { html } = await safeFetchText(about);
    const text = [metaContent(html, 'og:title'), metaContent(html, 'description') || metaContent(html, 'og:description')].filter(Boolean).join('\n');
    if (text.length < 20) throw new Error('No readable channel description');
    return screenContent(text);
}

export async function buildFullReport(channels: Channels): Promise<FullReport> {
    const sections: ScanSection[] = [];
    for (const key of CHANNEL_KEYS) {
        const value = channels[key];
        if (!value) continue;
        const url = channelUrl(key, value);
        const base = { key, label: CHANNEL_LABELS[key], value, url };
        try {
            if (key === 'web' && url) {
                const { result, pages } = await scanWebsite(url);
                sections.push({ ...base, result, pages, manual: false, note: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} checked. Images and videos are reviewed by hand.` });
            } else if (key === 'yt' && url) {
                const result = await scanYouTube(url);
                sections.push({ ...base, result, manual: true, note: 'Channel description checked automatically. Video titles and thumbnails are reviewed by hand.' });
            } else {
                sections.push({ ...base, result: null, manual: true, note: MANUAL_NOTE[key] ?? 'Reviewed by hand.' });
            }
        } catch (error) {
            log.warn(`Channel scan failed: ${key} ${value}`, { error: String(error) });
            sections.push({ ...base, result: null, manual: true, note: `We couldn't read this automatically (${error instanceof Error ? error.message : 'unknown error'}). Our team reviews it by hand.` });
        }
    }
    return { scannedAt: new Date().toISOString(), sections, needsManualReview: sections.some((s) => s.manual) };
}

/**
 * Scan a queued check. Reports that need no manual review are emailed at once;
 * the rest wait in `review` for an editor to add notes and send.
 */
export async function runFullScan(id: string, opts: { send?: boolean } = {}): Promise<{ status: string }> {
    const check = await prisma.nmcCheck.findUnique({ where: { id } });
    if (!check) throw new Error('Check not found');
    await prisma.nmcCheck.update({ where: { id }, data: { status: 'scanning' } });
    try {
        const report = await buildFullReport((check.channels ?? {}) as Channels);
        const autoSend = opts.send ?? !report.needsManualReview;
        await prisma.nmcCheck.update({
            where: { id },
            data: { fullReport: JSON.parse(JSON.stringify(report)), status: 'review' },
        });
        if (autoSend) await sendFullReport(id);
        return { status: autoSend ? 'reported' : 'review' };
    } catch (error) {
        await prisma.nmcCheck.update({ where: { id }, data: { status: 'failed', adminNote: `Scan failed: ${String(error)}` } });
        throw error;
    }
}

export async function sendFullReport(id: string): Promise<void> {
    const check = await prisma.nmcCheck.findUnique({ where: { id } });
    if (!check?.fullReport) throw new Error('No report to send');
    const report = check.fullReport as unknown as FullReport;
    const sections = report.sections.map((s) => ({
        label: s.label,
        value: s.value,
        result: s.result,
        note: s.note,
    }));
    if (check.adminNote?.trim() && !check.adminNote.startsWith('Scan failed')) {
        sections.push({ label: 'Reviewer notes', value: '', result: null, note: check.adminNote.trim() });
    }
    const sent = await sendFullReportEmail({ to: check.email, name: check.name, sections });
    if (!sent.success) throw new Error(sent.error || 'Email failed');
    await prisma.nmcCheck.update({ where: { id }, data: { status: 'reported', reportSentAt: new Date() } });
}

/** Scan every queued check; used by the scheduled worker. */
export async function processQueue(limit = 10): Promise<{ id: string; status: string }[]> {
    const queued = await prisma.nmcCheck.findMany({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: { id: true },
    });
    const out: { id: string; status: string }[] = [];
    for (const { id } of queued) {
        try {
            out.push({ id, ...(await runFullScan(id)) });
        } catch (error) {
            out.push({ id, status: `failed: ${String(error)}` });
        }
    }
    return out;
}
