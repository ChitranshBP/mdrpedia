/**
 * Stripe Integration for Ethics Certification Subscriptions
 * Guardian and Legend tiers require paid subscriptions.
 */

import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' as any })
    : null;

export const STRIPE_WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET || '';

/** Price IDs for ethics subscription tiers (set in environment) */
export const PRICE_IDS = {
    GUARDIAN_TIER: import.meta.env.STRIPE_PRICE_GUARDIAN || '',
    LEGEND_TIER: import.meta.env.STRIPE_PRICE_LEGEND || '',
};

/** Check if Stripe is configured */
export function isStripeConfigured(): boolean {
    return !!stripe && !!PRICE_IDS.GUARDIAN_TIER && !!PRICE_IDS.LEGEND_TIER;
}
