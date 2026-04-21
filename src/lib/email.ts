/**
 * MDRPedia — Email Service (Resend)
 * Sends transactional emails via Resend API.
 * Falls back to console logging in dev when RESEND_API_KEY is not set.
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || import.meta.env.FROM_EMAIL || 'MDRPedia <noreply@mdrpedia.com>';

let resend: Resend | null = null;
if (RESEND_API_KEY && RESEND_API_KEY !== 'placeholder') {
    resend = new Resend(RESEND_API_KEY);
}

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!resend) {
        // Dev fallback — log to console
        console.log(`[EMAIL-DEV] To: ${opts.to}`);
        console.log(`[EMAIL-DEV] Subject: ${opts.subject}`);
        console.log(`[EMAIL-DEV] Body preview: ${opts.text || opts.html.slice(0, 200)}`);
        return { success: true, id: 'dev-' + Date.now() };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            ...(opts.text && { text: opts.text }),
        });

        if (error) {
            console.error('[EMAIL] Resend error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (err: any) {
        console.error('[EMAIL] Send failed:', err?.message);
        return { success: false, error: err?.message || 'Unknown email error' };
    }
}

/**
 * Send magic link login email
 */
export async function sendMagicLinkEmail(params: {
    to: string;
    fullName: string;
    magicLink: string;
}): Promise<{ success: boolean }> {
    const { to, fullName, magicLink } = params;

    const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="font-size: 24px; font-weight: 400; margin: 0; color: #1a1a1a;">MDRPedia</h1>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0; letter-spacing: 0.1em; text-transform: uppercase;">The Medical Register</p>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear ${fullName},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">You requested access to your MDRPedia profile portal. Click the link below to sign in securely:</p>
        <div style="margin: 30px 0; text-align: center;">
            <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 14px; letter-spacing: 0.05em; border-radius: 4px;">Sign In to Portal</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.6;">This link expires in 15 minutes and can only be used once. If you did not request this, you can safely ignore this email.</p>
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px;">
            <p style="font-size: 12px; color: #999; margin: 0;">MDRPedia &mdash; The Verified Medical Encyclopedia</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Also known as MDpedia (West) and DRpedia (East)</p>
        </div>
    </div>`;

    const text = `Dear ${fullName},\n\nYou requested access to your MDRPedia profile portal. Click here to sign in: ${magicLink}\n\nThis link expires in 15 minutes.\n\nMDRPedia — The Verified Medical Encyclopedia`;

    return sendEmail({
        to,
        subject: 'Your MDRPedia Portal Login Link',
        html,
        text,
    });
}
