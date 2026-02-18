/**
 * MDRPedia — Page View Tracking API
 * Records profile page views with bot filtering
 */

export const prerender = false;

import { prisma } from '../../lib/prisma';
import { isBot, hashIP, getClientIP } from '../../lib/bot-detector';

export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { profileId, slug } = body;

        if (!profileId && !slug) {
            return new Response(JSON.stringify({ error: 'Missing profileId or slug' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userAgent = request.headers.get('user-agent');
        const referrer = request.headers.get('referer');
        const clientIP = getClientIP(request);
        const ipHash = await hashIP(clientIP);
        const isBotVisit = isBot(userAgent);

        // Find profile by slug if needed
        let resolvedProfileId = profileId;
        if (!resolvedProfileId && slug) {
            const profile = await prisma.profile.findUnique({
                where: { slug },
                select: { id: true }
            });
            if (!profile) {
                return new Response(JSON.stringify({ error: 'Profile not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            resolvedProfileId = profile.id;
        }

        // Record the view (async, fire-and-forget pattern in production)
        await prisma.profileView.create({
            data: {
                profile_id: resolvedProfileId,
                ip_hash: ipHash,
                user_agent: userAgent?.slice(0, 500), // Truncate long UAs
                referrer: referrer?.slice(0, 500),
                is_bot: isBotVisit,
                country: null, // Could add GeoIP lookup later
            }
        });

        return new Response(JSON.stringify({
            success: true,
            isBot: isBotVisit
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Track view error:', error);
        // Don't fail the page load for analytics errors
        return new Response(JSON.stringify({ success: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * GET endpoint to retrieve view count for a profile
 */
export async function GET({ request }: { request: Request }) {
    try {
        const url = new URL(request.url);
        const slug = url.searchParams.get('slug');
        const profileId = url.searchParams.get('profileId');
        const includeBots = url.searchParams.get('includeBots') === 'true';

        if (!slug && !profileId) {
            return new Response(JSON.stringify({ error: 'Missing slug or profileId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Build where clause
        const whereClause: any = {};
        if (profileId) {
            whereClause.profile_id = profileId;
        } else if (slug) {
            const profile = await prisma.profile.findUnique({
                where: { slug },
                select: { id: true }
            });
            if (!profile) {
                return new Response(JSON.stringify({ count: 0 }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            whereClause.profile_id = profile.id;
        }

        // Exclude bots by default
        if (!includeBots) {
            whereClause.is_bot = false;
        }

        const count = await prisma.profileView.count({
            where: whereClause
        });

        return new Response(JSON.stringify({ count }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache for 1 minute
            }
        });

    } catch (error) {
        console.error('Get view count error:', error);
        return new Response(JSON.stringify({ count: 0 }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
