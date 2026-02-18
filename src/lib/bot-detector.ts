/**
 * MDRPedia — Bot Detection Utility
 * Identifies bots/crawlers from User-Agent strings
 */

// Known bot patterns (search engines, social media, AI crawlers)
const BOT_PATTERNS = [
    // Search Engine Bots
    /googlebot/i,
    /bingbot/i,
    /yandexbot/i,
    /duckduckbot/i,
    /baiduspider/i,
    /slurp/i,  // Yahoo
    /sogou/i,
    /exabot/i,
    /facebot/i,
    /ia_archiver/i,  // Alexa

    // Social Media Crawlers
    /twitterbot/i,
    /linkedinbot/i,
    /pinterest/i,
    /whatsapp/i,
    /telegrambot/i,
    /discordbot/i,
    /slackbot/i,

    // AI Crawlers
    /gptbot/i,
    /chatgpt/i,
    /claude-web/i,
    /anthropic/i,
    /cohere-ai/i,
    /perplexitybot/i,
    /youbot/i,
    /ccbot/i,  // Common Crawl

    // SEO/Analytics Tools
    /ahrefs/i,
    /semrush/i,
    /moz/i,
    /screaming frog/i,
    /majestic/i,
    /dotbot/i,
    /rogerbot/i,

    // Monitoring/Uptime Bots
    /uptimerobot/i,
    /pingdom/i,
    /statuscake/i,
    /site24x7/i,
    /newrelic/i,
    /datadog/i,

    // Generic Bot Indicators
    /bot\b/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
    /phantomjs/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,

    // Feed Readers
    /feedly/i,
    /feedparser/i,
    /feedfetcher/i,

    // Other Known Crawlers
    /applebot/i,
    /mediapartners-google/i,
    /adsbot/i,
    /petalbot/i,
    /bytespider/i,
];

// Known legitimate browser patterns (for validation)
const BROWSER_PATTERNS = [
    /chrome\/[\d.]+/i,
    /firefox\/[\d.]+/i,
    /safari\/[\d.]+/i,
    /edge\/[\d.]+/i,
    /opera\/[\d.]+/i,
];

/**
 * Check if a User-Agent string belongs to a bot
 */
export function isBot(userAgent: string | null | undefined): boolean {
    if (!userAgent) return true; // No UA = suspicious

    const ua = userAgent.toLowerCase();

    // Check against known bot patterns
    for (const pattern of BOT_PATTERNS) {
        if (pattern.test(ua)) {
            return true;
        }
    }

    // Check for missing browser indicators (suspicious)
    const hasBrowserIndicator = BROWSER_PATTERNS.some(pattern => pattern.test(ua));
    if (!hasBrowserIndicator && !ua.includes('mobile')) {
        // No browser or mobile indicator - likely a bot
        return true;
    }

    return false;
}

/**
 * Get bot category if it's a known bot
 */
export function getBotCategory(userAgent: string | null | undefined): string | null {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();

    if (/googlebot|bingbot|yandexbot|duckduckbot|baiduspider/i.test(ua)) {
        return 'search_engine';
    }
    if (/twitterbot|linkedinbot|facebot|whatsapp|discord|slack/i.test(ua)) {
        return 'social_media';
    }
    if (/gptbot|chatgpt|claude|anthropic|perplexity|ccbot/i.test(ua)) {
        return 'ai_crawler';
    }
    if (/ahrefs|semrush|moz|screaming/i.test(ua)) {
        return 'seo_tool';
    }
    if (/uptimerobot|pingdom|newrelic|datadog/i.test(ua)) {
        return 'monitoring';
    }
    if (/bot|crawler|spider/i.test(ua)) {
        return 'generic_bot';
    }

    return null;
}

/**
 * Hash an IP address for privacy (SHA-256)
 */
/**
 * Hash an IP address for privacy (SHA-256)
 * Uses environment variable for salt to prevent exposure
 */
export async function hashIP(ip: string): Promise<string> {
    const salt = import.meta.env.IP_HASH_SALT || process.env.IP_HASH_SALT || 'mdrpedia-default-salt';
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || request.headers.get('cf-connecting-ip')
        || 'unknown';
}
