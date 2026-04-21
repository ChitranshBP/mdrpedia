/**
 * POST /api/ethics/webhook — Stripe webhook handler for subscription events
 * Includes idempotency tracking to prevent duplicate event processing.
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../../../lib/stripe';

// In-memory idempotency cache (survives within a single process lifetime)
// For production at scale, use Redis or a database table
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old entries periodically
const idempotencyCleanup = setInterval(() => {
    const now = Date.now();
    for (const [id, ts] of processedEvents.entries()) {
        if (now - ts > IDEMPOTENCY_TTL_MS) processedEvents.delete(id);
    }
}, 60_000);
if (idempotencyCleanup && typeof idempotencyCleanup === 'object' && 'unref' in idempotencyCleanup) {
    idempotencyCleanup.unref();
}

export async function POST({ request }: { request: Request }) {
    if (!stripe) {
        return new Response('Stripe not configured', { status: 503 });
    }

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
        return new Response('Missing signature', { status: 400 });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }

    // Idempotency check: skip already-processed events
    if (processedEvents.has(event.id)) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const profileId = session.metadata?.mdrpedia_profile_id;
                const tier = session.metadata?.mdrpedia_tier;

                if (profileId) {
                    await prisma.ethicsSubscription.upsert({
                        where: { profile_id: profileId },
                        update: {
                            status: 'ACTIVE',
                            tier: tier || 'GUARDIAN_TIER',
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: session.subscription,
                        },
                        create: {
                            profile_id: profileId,
                            status: 'ACTIVE',
                            tier: tier || 'GUARDIAN_TIER',
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: session.subscription,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const sub = await prisma.ethicsSubscription.findFirst({
                    where: { stripe_subscription_id: subscription.id },
                });

                if (sub) {
                    const statusMap: Record<string, string> = {
                        active: 'ACTIVE',
                        past_due: 'PAST_DUE',
                        canceled: 'CANCELLED',
                        trialing: 'TRIALING',
                    };

                    await prisma.ethicsSubscription.update({
                        where: { id: sub.id },
                        data: {
                            status: (statusMap[subscription.status] || 'ACTIVE') as any,
                            current_period_start: subscription.current_period_start
                                ? new Date(subscription.current_period_start * 1000)
                                : null,
                            current_period_end: subscription.current_period_end
                                ? new Date(subscription.current_period_end * 1000)
                                : null,
                            cancel_at: subscription.cancel_at
                                ? new Date(subscription.cancel_at * 1000)
                                : null,
                        },
                    });

                    // If subscription cancelled or past_due, check tier gating
                    if (['canceled', 'past_due'].includes(subscription.status)) {
                        const profile = await prisma.profile.findUnique({
                            where: { id: sub.profile_id },
                            select: { ethics_tier: true },
                        });

                        // Guardian and Legend require active subscription
                        if (profile?.ethics_tier && ['GUARDIAN', 'LEGEND'].includes(profile.ethics_tier)) {
                            await prisma.profile.update({
                                where: { id: sub.profile_id },
                                data: { ethics_status: 'SUSPENDED' },
                            });
                        }
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const sub = await prisma.ethicsSubscription.findFirst({
                    where: { stripe_subscription_id: subscription.id },
                });

                if (sub) {
                    await prisma.ethicsSubscription.update({
                        where: { id: sub.id },
                        data: { status: 'CANCELLED' },
                    });

                    // Downgrade to ADVOCATE if they had a paid tier
                    const profile = await prisma.profile.findUnique({
                        where: { id: sub.profile_id },
                        select: { ethics_tier: true, ethics_score: true },
                    });

                    if (profile?.ethics_tier && ['GUARDIAN', 'LEGEND'].includes(profile.ethics_tier)) {
                        // If score >= 60, downgrade to ADVOCATE; otherwise suspend
                        if ((profile.ethics_score || 0) >= 60) {
                            await prisma.profile.update({
                                where: { id: sub.profile_id },
                                data: { ethics_tier: 'ADVOCATE' },
                            });
                        } else {
                            await prisma.profile.update({
                                where: { id: sub.profile_id },
                                data: { ethics_status: 'SUSPENDED' },
                            });
                        }
                    }
                }
                break;
            }
        }
    } catch (e) {
        console.error('Webhook processing error:', e);
        return new Response('Webhook processing error', { status: 500 });
    }

    // Mark event as processed
    processedEvents.set(event.id, Date.now());

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
