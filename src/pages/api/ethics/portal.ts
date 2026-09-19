/**
 * POST /api/ethics/portal — Create Stripe customer portal session
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { stripe, isStripeConfigured } from '../../../lib/stripe';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { requireSession } from '../../../lib/api-auth';

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

    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const profile_id = auth.session.profileId;

    try {
        const sub = await prisma.ethicsSubscription.findUnique({
            where: { profile_id },
        });

        if (!sub?.stripe_customer_id) {
            return json({ error: 'No subscription found' }, 404);
        }

        const origin = new URL(request.url).origin;

        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id,
            return_url: `${origin}/doctor/ethics?profile_id=${profile_id}`,
        });

        return json({ url: session.url });
    } catch (e) {
        return apiError('ethics/portal', e);
    }
}
