/**
 * MDRPedia — News Admin API
 * CRUD operations for news articles (file-based storage)
 */

export const prerender = false;

import fs from 'node:fs/promises';
import path from 'node:path';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';

const NEWS_DIR = path.join(process.cwd(), 'src/content/news');

interface NewsArticle {
    title: string;
    summary: string;
    date: string;
    category: string;
    source: string;
    url?: string;
    content?: string;
}

function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

// GET - List all news or get single article
export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    try {
        if (slug) {
            // Get single article
            const filePath = path.join(NEWS_DIR, `${slug}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const article = JSON.parse(content);
            return new Response(JSON.stringify({ slug, ...article }), {
                headers: { "Content-Type": "application/json" }
            });
        } else {
            // List all articles
            const files = await fs.readdir(NEWS_DIR);
            const articles = await Promise.all(
                files
                    .filter(f => f.endsWith('.json'))
                    .map(async (file) => {
                        const content = await fs.readFile(path.join(NEWS_DIR, file), 'utf-8');
                        const article = JSON.parse(content);
                        return {
                            slug: file.replace('.json', ''),
                            ...article
                        };
                    })
            );

            // Sort by date descending
            articles.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            return new Response(JSON.stringify(articles), {
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// POST - Create new article
export async function POST({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body: NewsArticle = await request.json();

        // Validate required fields
        if (!body.title || !body.summary || !body.date || !body.category || !body.source) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const slug = createSlug(body.title);
        const filePath = path.join(NEWS_DIR, `${slug}.json`);

        // Check if exists
        try {
            await fs.access(filePath);
            return new Response(JSON.stringify({ error: "Article with similar title already exists" }), {
                status: 409,
                headers: { "Content-Type": "application/json" }
            });
        } catch {
            // File doesn't exist, good to create
        }

        const article: NewsArticle = {
            title: body.title,
            summary: body.summary,
            date: body.date,
            category: body.category,
            source: body.source,
            url: body.url || '#',
            content: body.content || `Detailed information about "${body.title}" will be expanded soon.`
        };

        await fs.writeFile(filePath, JSON.stringify(article, null, 4));

        await logAdminAction('CREATE_NEWS', slug, { title: body.title }, request);

        return new Response(JSON.stringify({ success: true, slug }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// PUT - Update existing article
export async function PUT({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { slug, ...articleData } = body;

        if (!slug) {
            return new Response(JSON.stringify({ error: "Slug is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const filePath = path.join(NEWS_DIR, `${slug}.json`);

        // Check if exists
        try {
            await fs.access(filePath);
        } catch {
            return new Response(JSON.stringify({ error: "Article not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const article: NewsArticle = {
            title: articleData.title,
            summary: articleData.summary,
            date: articleData.date,
            category: articleData.category,
            source: articleData.source,
            url: articleData.url || '#',
            content: articleData.content
        };

        await fs.writeFile(filePath, JSON.stringify(article, null, 4));

        await logAdminAction('UPDATE_NEWS', slug, { title: articleData.title }, request);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// DELETE - Remove article
export async function DELETE({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { slug } = body;

        if (!slug) {
            return new Response(JSON.stringify({ error: "Slug is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const filePath = path.join(NEWS_DIR, `${slug}.json`);

        // Check if exists
        try {
            await fs.access(filePath);
        } catch {
            return new Response(JSON.stringify({ error: "Article not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        await fs.unlink(filePath);

        await logAdminAction('DELETE_NEWS', slug, {}, request);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
