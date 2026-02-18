/**
 * MDRPedia — Admin Media Management API
 * CRUD operations for profile media (videos, images, documents)
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';

// Parse video URL to extract provider and ID
function parseVideoUrl(url: string): { source: string; video_id: string | null } {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
        return { source: 'youtube', video_id: youtubeMatch[1] };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
        return { source: 'vimeo', video_id: vimeoMatch[1] };
    }

    // Direct video
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return { source: 'direct', video_id: null };
    }

    return { source: 'unknown', video_id: null };
}

// Generate thumbnail URL for video
function getThumbnail(source: string, video_id: string | null): string | null {
    if (source === 'youtube' && video_id) {
        return `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`;
    }
    // Vimeo requires API call for thumbnail - skip for now
    return null;
}

/**
 * GET - List media for a profile
 */
export async function GET({ request }: { request: Request }) {
    try {
        const url = new URL(request.url);
        const profileId = url.searchParams.get('profileId');
        const profileSlug = url.searchParams.get('slug');
        const type = url.searchParams.get('type'); // IMAGE, VIDEO, DOCUMENT

        if (!profileId && !profileSlug) {
            return new Response(JSON.stringify({ error: 'Missing profileId or slug' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Find profile
        let resolvedProfileId = profileId;
        if (!resolvedProfileId && profileSlug) {
            const profile = await prisma.profile.findUnique({
                where: { slug: profileSlug },
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

        if (!resolvedProfileId) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const media = await prisma.profileMedia.findMany({
            where: {
                profile_id: resolvedProfileId,
                ...(type ? { type: type as "IMAGE" | "VIDEO" | "DOCUMENT" } : {})
            },
            orderBy: [
                { is_featured: 'desc' },
                { sort_order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return new Response(JSON.stringify({ media }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get media error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch media' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST - Add new media to a profile
 */
export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { profileId, profileSlug, type, url, title, description } = body;

        if (!url) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Find profile
        let resolvedProfileId = profileId;
        if (!resolvedProfileId && profileSlug) {
            const profile = await prisma.profile.findUnique({
                where: { slug: profileSlug },
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

        if (!resolvedProfileId) {
            return new Response(JSON.stringify({ error: 'Profile ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine media type if not provided
        let mediaType = type || 'IMAGE';
        let source: string | null = null;
        let video_id: string | null = null;
        let thumbnail: string | null = null;

        // Auto-detect video
        if (!type) {
            const videoMatch = url.match(/youtube|youtu\.be|vimeo|\.mp4|\.webm|\.ogg/i);
            if (videoMatch) {
                mediaType = 'VIDEO';
            } else if (url.match(/\.(pdf|doc|docx)$/i)) {
                mediaType = 'DOCUMENT';
            }
        }

        // Parse video URL for metadata
        if (mediaType === 'VIDEO') {
            const videoInfo = parseVideoUrl(url);
            source = videoInfo.source;
            video_id = videoInfo.video_id;
            thumbnail = getThumbnail(videoInfo.source, videoInfo.video_id);
        }

        // Get max sort order
        const maxOrder = await prisma.profileMedia.aggregate({
            where: { profile_id: resolvedProfileId },
            _max: { sort_order: true }
        });

        const media = await prisma.profileMedia.create({
            data: {
                profile_id: resolvedProfileId,
                type: mediaType,
                url,
                title: title || null,
                description: description || null,
                source,
                video_id,
                thumbnail,
                sort_order: (maxOrder._max.sort_order || 0) + 1,
            }
        });

        return new Response(JSON.stringify({ success: true, media }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Add media error:', error);
        return new Response(JSON.stringify({ error: 'Failed to add media' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * PATCH - Update media (title, description, featured, order)
 */
export async function PATCH({ request }: { request: Request }) {
    try {
        const body = await request.json();
        const { mediaId, title, description, is_featured, sort_order } = body;

        if (!mediaId) {
            return new Response(JSON.stringify({ error: 'Media ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const updateData: {
            title?: string | null;
            description?: string | null;
            is_featured?: boolean;
            sort_order?: number;
        } = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (is_featured !== undefined) updateData.is_featured = is_featured;
        if (sort_order !== undefined) updateData.sort_order = sort_order;

        const media = await prisma.profileMedia.update({
            where: { id: mediaId },
            data: updateData
        });

        return new Response(JSON.stringify({ success: true, media }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update media error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update media' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * DELETE - Remove media from profile
 */
export async function DELETE({ request }: { request: Request }) {
    try {
        const url = new URL(request.url);
        const mediaId = url.searchParams.get('mediaId');

        if (!mediaId) {
            return new Response(JSON.stringify({ error: 'Media ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await prisma.profileMedia.delete({
            where: { id: mediaId }
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete media error:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete media' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
