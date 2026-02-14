// ============================================================================
// MDRPedia — Search Engine Indexer
// Notifies Google, Bing, Yandex, and Seznam when pages are created/updated
// ============================================================================
//
// Usage:
//   import { notifySearchEngines, notifyBatch } from '../utils/indexer';
//   await notifySearchEngines('https://mdrpedia.com/doctors/jane-doe', 'URL_UPDATED');
//   await notifyBatch(['https://mdrpedia.com/doctors/jane-doe', ...]);
//
// ============================================================================

import { google } from 'googleapis';
import * as fs from 'fs';

// ─── Configuration ──────────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || 'https://mdrpedia.com';
const INDEXNOW_API_KEY = process.env.INDEXNOW_API_KEY || '';
const GOOGLE_SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';

// IndexNow endpoints (Bing, Yandex, Seznam all support IndexNow)
const INDEXNOW_ENDPOINTS = [
    'https://api.indexnow.org/indexnow',       // Bing / Microsoft
    'https://yandex.com/indexnow',             // Yandex
    'https://search.seznam.cz/indexnow',       // Seznam
];

// Google Indexing API free quota: 200 requests/day
const GOOGLE_DAILY_QUOTA = 200;

// ─── Quota Tracker ──────────────────────────────────────────────────────────

interface QuotaState {
    date: string;
    googleCalls: number;
    indexNowCalls: number;
}

let quotaState: QuotaState = {
    date: new Date().toISOString().split('T')[0],
    googleCalls: 0,
    indexNowCalls: 0,
};

function resetQuotaIfNewDay(): void {
    const today = new Date().toISOString().split('T')[0];
    if (quotaState.date !== today) {
        quotaState = { date: today, googleCalls: 0, indexNowCalls: 0 };
    }
}

function canCallGoogle(): boolean {
    resetQuotaIfNewDay();
    return quotaState.googleCalls < GOOGLE_DAILY_QUOTA;
}

// ─── Google Indexing API ────────────────────────────────────────────────────

type GoogleNotificationType = 'URL_UPDATED' | 'URL_DELETED';

async function notifyGoogle(url: string, type: GoogleNotificationType = 'URL_UPDATED'): Promise<boolean> {
    if (!GOOGLE_SA_JSON) {
        console.log('[Indexer] ⚠️  Google SA JSON not configured, skipping Google notification');
        return false;
    }

    if (!canCallGoogle()) {
        console.log(`[Indexer] ⛔ Google daily quota reached (${GOOGLE_DAILY_QUOTA}/day), skipping`);
        return false;
    }

    try {
        // Parse service account credentials
        let credentials: Record<string, string>;
        if (GOOGLE_SA_JSON.startsWith('{')) {
            credentials = JSON.parse(GOOGLE_SA_JSON);
        } else if (fs.existsSync(GOOGLE_SA_JSON)) {
            credentials = JSON.parse(fs.readFileSync(GOOGLE_SA_JSON, 'utf-8'));
        } else {
            console.log('[Indexer] ⚠️  Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
            return false;
        }

        const auth = new google.auth.JWT(
            credentials.client_email,
            undefined,
            credentials.private_key,
            ['https://www.googleapis.com/auth/indexing'],
        );

        const indexing = google.indexing({ version: 'v3', auth });

        const response = await indexing.urlNotifications.publish({
            requestBody: {
                url,
                type,
            },
        });

        quotaState.googleCalls++;
        console.log(`[Indexer] ✅ Google ${type}: ${url} (${quotaState.googleCalls}/${GOOGLE_DAILY_QUOTA} today)`);
        return response.status === 200;
    } catch (error: any) {
        console.error(`[Indexer] ❌ Google API error for ${url}:`, error?.message || error);
        return false;
    }
}

// ─── IndexNow (Bing, Yandex, Seznam) ────────────────────────────────────────

async function notifyIndexNow(urls: string[]): Promise<boolean> {
    if (!INDEXNOW_API_KEY) {
        console.log('[Indexer] ⚠️  INDEXNOW_API_KEY not configured, skipping IndexNow');
        return false;
    }

    if (urls.length === 0) return true;

    const host = new URL(SITE_URL).host;
    const payload = {
        host,
        key: INDEXNOW_API_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_API_KEY}.txt`,
        urlList: urls,
    };

    let success = true;

    for (const endpoint of INDEXNOW_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify(payload),
            });

            const engineName = new URL(endpoint).hostname;

            if (response.ok || response.status === 202) {
                quotaState.indexNowCalls++;
                console.log(`[Indexer] ✅ IndexNow → ${engineName}: ${urls.length} URLs submitted`);
            } else {
                console.warn(`[Indexer] ⚠️  IndexNow → ${engineName}: ${response.status} ${response.statusText}`);
                success = false;
            }
        } catch (error: any) {
            const engineName = new URL(endpoint).hostname;
            console.error(`[Indexer] ❌ IndexNow → ${engineName}: ${error?.message || error}`);
            success = false;
        }
    }

    return success;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Notify all search engines about a single URL.
 * Only pings Google for new pages or prestige tier updates (to stay within quota).
 *
 * @param url      Full URL of the page
 * @param type     'URL_UPDATED' or 'URL_DELETED'
 * @param isHighPriority  Set true for TITAN/ELITE tier pages to ensure Google gets pinged
 */
export async function notifySearchEngines(
    url: string,
    type: GoogleNotificationType = 'URL_UPDATED',
    isHighPriority: boolean = false,
): Promise<{ google: boolean; indexNow: boolean }> {
    console.log(`\n[Indexer] 📢 Notifying search engines: ${url} (${type})`);

    // Google: only ping for new pages or high-priority (TITAN/ELITE) updates
    let googleResult = false;
    if (isHighPriority || type === 'URL_UPDATED') {
        googleResult = await notifyGoogle(url, type);
    }

    // IndexNow: always notify (no strict quota)
    const indexNowResult = await notifyIndexNow([url]);

    return { google: googleResult, indexNow: indexNowResult };
}

/**
 * Batch notify all search engines about multiple URLs.
 * Google is called per-URL (API requirement), IndexNow supports batch.
 *
 * @param urls             Array of full URLs
 * @param highPriorityUrls Optional set of URLs that are TITAN/ELITE (get Google priority)
 */
export async function notifyBatch(
    urls: string[],
    highPriorityUrls: Set<string> = new Set(),
): Promise<{ googleCount: number; indexNowSuccess: boolean; total: number }> {
    if (urls.length === 0) {
        console.log('[Indexer] No URLs to notify.');
        return { googleCount: 0, indexNowSuccess: true, total: 0 };
    }

    console.log(`\n[Indexer] 🚀 Batch notification: ${urls.length} URLs`);

    // 1. IndexNow batch (single request per engine, max 10k URLs)
    const indexNowChunks: string[][] = [];
    for (let i = 0; i < urls.length; i += 10_000) {
        indexNowChunks.push(urls.slice(i, i + 10_000));
    }

    let indexNowSuccess = true;
    for (const chunk of indexNowChunks) {
        const result = await notifyIndexNow(chunk);
        if (!result) indexNowSuccess = false;
    }

    // 2. Google Indexing API (per-URL, rate-limited)
    let googleCount = 0;
    for (const url of urls) {
        if (!canCallGoogle()) {
            console.log(`[Indexer] ⛔ Google quota reached, ${urls.length - googleCount} URLs skipped`);
            break;
        }

        // Prioritize TITAN/ELITE pages for the limited quota
        const isHighPriority = highPriorityUrls.has(url);
        if (!isHighPriority && googleCount > 50) {
            // Reserve remaining quota for high-priority pages
            continue;
        }

        const success = await notifyGoogle(url, 'URL_UPDATED');
        if (success) googleCount++;

        // Rate limit: 1 request per 150ms to avoid throttling
        await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\n[Indexer] 📊 Batch complete:`);
    console.log(`   Google: ${googleCount}/${urls.length} notified`);
    console.log(`   IndexNow: ${indexNowSuccess ? '✅' : '⚠️'} (${urls.length} URLs)`);
    console.log(`   Quota remaining: ${GOOGLE_DAILY_QUOTA - quotaState.googleCalls} Google calls today`);

    return { googleCount, indexNowSuccess, total: urls.length };
}

/**
 * Get current quota status.
 */
export function getQuotaStatus(): QuotaState & { googleRemaining: number } {
    resetQuotaIfNewDay();
    return {
        ...quotaState,
        googleRemaining: GOOGLE_DAILY_QUOTA - quotaState.googleCalls,
    };
}

/**
 * Ping sitemap to traditional search engines (for crawl triggering).
 */
export async function pingSitemap(): Promise<void> {
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;

    const pingUrls = [
        `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];

    for (const ping of pingUrls) {
        try {
            const res = await fetch(ping);
            const engine = new URL(ping).hostname;
            console.log(`[Indexer] 📡 Sitemap ping → ${engine}: ${res.status}`);
        } catch (error: any) {
            console.error(`[Indexer] ❌ Sitemap ping failed:`, error?.message);
        }
    }
}
