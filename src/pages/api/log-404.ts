/**
 * MDRPedia — 404 Error Logging API
 * Records broken link / not found errors for analysis
 */

export const prerender = false;

import { prisma } from '../../lib/prisma';
import { isBot, hashIP, getClientIP } from '../../lib/bot-detector';

export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { url, referrer } = body;

        if (!url) {
            return new Response(JSON.stringify({ error: 'Missing URL' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userAgent = request.headers.get('user-agent');
        const clientIP = getClientIP(request);
        const ipHash = await hashIP(clientIP);
        const isBotVisit = isBot(userAgent);

        // Log the 404 error
        await prisma.notFoundLog.create({
            data: {
                url: url.slice(0, 2000), // Truncate long URLs
                referrer: referrer?.slice(0, 2000) || null,
                ip_hash: ipHash,
                user_agent: userAgent?.slice(0, 500) || null,
                is_bot: isBotVisit,
                resolved: false
            }
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Log 404 error:', error);
        // Don't fail - silent fallback
        return new Response(JSON.stringify({ success: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
