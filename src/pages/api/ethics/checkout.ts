/**
 * POST /api/ethics/checkout — Create Stripe checkout session for ethics subscription
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { stripe, PRICE_IDS, isStripeConfigured } from '../../../lib/stripe';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsApply);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    if (!isStripeConfigured() || !stripe) {
        return json({ error: 'Payment system not configured' }, 503);
    }

    try {
        const body = await request.json();
        const { profile_id, tier } = body;

        if (!profile_id || !tier) {
            return json({ error: 'profile_id and tier are required' }, 400);
        }

        if (!['GUARDIAN_TIER', 'LEGEND_TIER'].includes(tier)) {
            return json({ error: 'tier must be GUARDIAN_TIER or LEGEND_TIER' }, 400);
        }

        const profile = await prisma.profile.findUnique({
            where: { id: profile_id },
            select: { id: true, full_name: true, slug: true },
        });

        if (!profile) return json({ error: 'Profile not found' }, 404);

        // Check for existing subscription
        const existingSub = await prisma.ethicsSubscription.findUnique({
            where: { profile_id },
        });

        let customerId = existingSub?.stripe_customer_id;

        // Create Stripe customer if needed
        if (!customerId) {
            const customer = await stripe.customers.create({
                name: profile.full_name,
                metadata: {
                    mdrpedia_profile_id: profile_id,
                    mdrpedia_slug: profile.slug,
                },
            });
            customerId = customer.id;
        }

        const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];
        if (!priceId) return json({ error: 'Price not configured for this tier' }, 500);

        const origin = new URL(request.url).origin;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/doctor/ethics?profile_id=${profile_id}&payment=success`,
            cancel_url: `${origin}/doctor/ethics?profile_id=${profile_id}&payment=cancelled`,
            metadata: {
                mdrpedia_profile_id: profile_id,
                mdrpedia_tier: tier,
            },
        });

        // Create or update subscription record
        await prisma.ethicsSubscription.upsert({
            where: { profile_id },
            update: {
                tier: tier as any,
                stripe_customer_id: customerId,
                status: 'TRIALING',
            },
            create: {
                profile_id,
                tier: tier as any,
                stripe_customer_id: customerId,
                status: 'TRIALING',
            },
        });

        return json({ url: session.url });
    } catch (e) {
        return apiError('ethics/checkout', e);
    }
}
