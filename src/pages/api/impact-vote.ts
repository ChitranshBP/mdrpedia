/**
 * MDRPedia — Impact Vote API
 * Allows users to indicate they've been positively impacted by a professional
 *
 * POST: Submit a vote
 * GET: Get vote count for a profile
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { getClientIP } from '../../lib/utils';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';
import crypto from 'crypto';

export const prerender = false;

const log = createLogger('ImpactVote');

const MAX_BODY_SIZE = 4096; // 4KB max for vote payloads

// Rate limit config for votes: 10 per hour
const VOTE_RATE_LIMIT = { windowMs: 3600000, maxRequests: 10 };

// Hash IP for privacy
function hashIP(ip: string): string {
    const salt = import.meta.env.IP_HASH_SALT || process.env.IP_HASH_SALT || 'mdrpedia-impact-vote-salt';
    return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

// Valid vote types
const VALID_VOTE_TYPES = [
    'LIFE_CHANGED',
    'SAVED_LIFE',
    'EXCELLENT_CARE',
    'HIGHLY_SKILLED',
    'MENTOR',
    'RESEARCHER',
] as const;

// GET: Get vote count for a profile
export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    const slug = url.searchParams.get('slug');

    if (!profileId && !slug) {
        return new Response(JSON.stringify({ error: 'profileId or slug required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get profile ID from slug if needed
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

        // Get vote counts by type
        const votes = await prisma.impactVote.groupBy({
            by: ['vote_type'],
            where: { profile_id: resolvedProfileId! },
            _count: true
        });

        // Get total count
        const totalCount = await prisma.impactVote.count({
            where: { profile_id: resolvedProfileId! }
        });

        // Get recent testimonials (non-anonymous with messages)
        const testimonials = await prisma.impactVote.findMany({
            where: {
                profile_id: resolvedProfileId!,
                is_anonymous: false,
                message: { not: null },
                is_verified: true
            },
            select: {
                vote_type: true,
                message: true,
                voter_name: true,
                voter_role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // Check if current user has voted
        const ip = getClientIP(request);
        const ipHash = hashIP(ip);
        const userVote = await prisma.impactVote.findUnique({
            where: {
                profile_id_ip_hash: {
                    profile_id: resolvedProfileId!,
                    ip_hash: ipHash
                }
            },
            select: { vote_type: true }
        });

        const voteCounts: Record<string, number> = {};
        for (const v of votes) {
            voteCounts[v.vote_type] = v._count;
        }

        return new Response(JSON.stringify({
            totalCount,
            voteCounts,
            testimonials,
            userHasVoted: !!userVote,
            userVoteType: userVote?.vote_type || null
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60',
            }
        });

    } catch (error) {
        log.error('Failed to get impact votes', error as Error);
        return new Response(JSON.stringify({ error: 'Failed to get votes' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// POST: Submit a vote
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { profileId, slug, voteType, message, voterName, voterRole, isAnonymous = true } = body;

        // Validate input
        if (!profileId && !slug) {
            return new Response(JSON.stringify({ error: 'profileId or slug required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!voteType || !VALID_VOTE_TYPES.includes(voteType)) {
            return new Response(JSON.stringify({
                error: 'Invalid vote type',
                validTypes: VALID_VOTE_TYPES
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Body size check
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
            return new Response(JSON.stringify({ error: 'Payload too large' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Rate limiting using shared rate limiter
        const ip = getClientIP(request);
        const ipHash = hashIP(ip);
        const rateCheck = checkRateLimit(`vote:${ipHash}`, VOTE_RATE_LIMIT);

        if (!rateCheck.allowed) {
            return rateLimitResponse(rateCheck.resetTime);
        }

        // Get profile ID from slug if needed
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

        // Atomic upsert to prevent race conditions on concurrent votes
        const voteData = {
            vote_type: voteType,
            message: message?.slice(0, 500) || null,
            voter_name: isAnonymous ? null : voterName?.slice(0, 100),
            voter_role: voterRole?.slice(0, 50),
            is_anonymous: isAnonymous,
        };

        const vote = await prisma.impactVote.upsert({
            where: {
                profile_id_ip_hash: {
                    profile_id: resolvedProfileId,
                    ip_hash: ipHash,
                },
            },
            update: voteData,
            create: {
                profile_id: resolvedProfileId,
                ip_hash: ipHash,
                ...voteData,
                is_verified: false,
            },
        });

        // Determine if this was an update or create based on createdAt
        const isNew = (Date.now() - vote.createdAt.getTime()) < 1000;
        const action = isNew ? 'created' : 'updated';

        if (isNew) {
            log.info('Impact vote submitted', { profileId: resolvedProfileId, voteType });
        }

        // Get updated count
        const totalCount = await prisma.impactVote.count({
            where: { profile_id: resolvedProfileId }
        });

        return new Response(JSON.stringify({
            success: true,
            action,
            vote: {
                id: vote.id,
                voteType: vote.vote_type
            },
            totalCount
        }), {
            status: isNew ? 201 : 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        log.error('Failed to submit impact vote', error as Error);
        return new Response(JSON.stringify({ error: 'Failed to submit vote' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// DELETE: Remove a vote
export const DELETE: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    const slug = url.searchParams.get('slug');

    if (!profileId && !slug) {
        return new Response(JSON.stringify({ error: 'profileId or slug required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const ip = getClientIP(request);
        const ipHash = hashIP(ip);

        // Get profile ID from slug if needed
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

        // Delete vote
        await prisma.impactVote.deleteMany({
            where: {
                profile_id: resolvedProfileId!,
                ip_hash: ipHash
            }
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        log.error('Failed to delete impact vote', error as Error);
        return new Response(JSON.stringify({ error: 'Failed to delete vote' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
