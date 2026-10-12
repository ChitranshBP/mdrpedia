import { sendEmail } from '../email';
import type { Channels, NmcFinding, NmcScreenResult } from './types';
import { CHANNEL_LABELS, GUIDELINES_DATE, GUIDELINES_NAME, verdictFor } from './types';

const SITE = process.env.SITE_URL && !/localhost/.test(process.env.SITE_URL) ? process.env.SITE_URL : 'https://mdrpedia.com';
const ALERT_TO = process.env.NMC_ALERT_EMAIL || process.env.ADMIN_EMAIL || '';

const SEV_COLOR: Record<string, string> = { High: '#8a2b1c', Medium: '#9a4f00', Low: '#4a4f52' };
const LEVEL_BG = { high: '#8a2b1c', med: '#9a4f00', ok: '#0c3a20' } as const;

export function esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function shell(body: string): string {
    return `<div style="background:#f4f0e6;padding:24px 0;font-family:Helvetica,Arial,sans-serif;color:#14171a">
<div style="max-width:640px;margin:0 auto;background:#fbf8f1;border:1px solid #d8d0be">
<div style="background:#0c3a20;color:#f4f0e6;padding:20px 28px;font-family:Georgia,serif;font-size:22px">MDRPedia</div>
<div style="height:4px;background:linear-gradient(90deg,#FF9933 0 33.34%,#FFFFFF 33.34% 66.67%,#138808 66.67%)"></div>
${body}
<div style="padding:20px 28px;border-top:1px solid #d8d0be;font-size:12px;color:#6a6f72;line-height:1.5">
This is an automated screen checked against our reading of the ${esc(GUIDELINES_NAME)} (${GUIDELINES_DATE}). It isn't legal advice, and it can miss issues or flag false positives.<br>
You received this because you requested a free check at ${esc(SITE.replace(/^https?:\/\//, ''))}. Reply "unsubscribe" to stop compliance updates.
</div></div></div>`;
}

function findingsHtml(findings: NmcFinding[]): string {
    return findings
        .map(
            (f) => `<div style="padding:16px 0;border-bottom:1px solid #d8d0be">
<span style="background:${SEV_COLOR[f.severity] ?? '#4a4f52'};color:#fff;font-size:12px;font-weight:700;padding:2px 8px">${esc(f.severity)}</span>
<span style="font-family:monospace;font-size:12px;color:#6a6f72;margin-left:8px">NMC ${esc(f.clause)}</span>
<div style="font-weight:700;font-size:17px;margin:8px 0">${esc(f.title)}</div>
<div style="padding:8px 12px;background:#f8eedf;border-left:3px solid ${SEV_COLOR[f.severity] ?? '#4a4f52'};font-style:italic">"${esc(f.excerpt)}"</div>
<div style="color:#4a4f52;margin:8px 0">${esc(f.why)}</div>
<div><strong style="color:#127a0a">Compliant alternative:</strong> ${esc(f.fix)}</div>
</div>`,
        )
        .join('');
}

function resultBlock(result: NmcScreenResult, label: string): string {
    const { verdict, level } = verdictFor(result.findings);
    const passed = result.passed.length
        ? `<div style="padding:16px 0"><div style="font-family:monospace;font-size:12px;color:#127a0a">LOOKS FINE</div>${result.passed
              .map((p) => `<div>✓ ${esc(p)}</div>`)
              .join('')}</div>`
        : '';
    return `<div style="background:${LEVEL_BG[level]};color:#f4f0e6;padding:22px 28px">
<div style="font-family:monospace;font-size:12px;color:#ffd7ad">${esc(label)}</div>
<div style="font-family:Georgia,serif;font-size:28px;line-height:1.1;margin:6px 0">${esc(verdict)}</div>
<div>${esc(result.summary)}</div></div>
<div style="padding:4px 28px 12px">${findingsHtml(result.findings)}${passed}</div>`;
}

function channelList(channels: Channels): string {
    return Object.entries(channels)
        .map(([k, v]) => `<div style="padding:6px 0;border-bottom:1px solid #ebe5d6"><strong>${esc(CHANNEL_LABELS[k as keyof typeof CHANNEL_LABELS] ?? k)}</strong> ${esc(v ?? '')}</div>`)
        .join('');
}

export async function sendInstantReportEmail(opts: {
    to: string;
    name: string;
    result: NmcScreenResult | null;
    channels: Channels;
    contentChars: number;
    screenedChars: number;
}) {
    const hasChannels = Object.keys(opts.channels).length > 0;
    const parts: string[] = [`<div style="padding:24px 28px 8px;font-size:15px;line-height:1.55">Dear ${esc(opts.name)},<br><br>Thank you for running the free NMC compliance check.${
        opts.result ? ' Your instant result for the text you pasted is below.' : ''
    }${opts.contentChars > opts.screenedChars ? ` We screened the first ${opts.screenedChars.toLocaleString('en-IN')} characters.` : ''}</div>`];
    if (opts.result) parts.push(resultBlock(opts.result, 'INSTANT CHECK'));
    if (hasChannels) {
        parts.push(`<div style="padding:8px 28px 20px"><div style="font-family:monospace;font-size:12px;color:#9a4f00;padding-bottom:6px">FULL SCAN · QUEUED · REPORT WITHIN 24 HOURS</div>${channelList(opts.channels)}</div>`);
    }
    parts.push(`<div style="padding:8px 28px 24px"><a href="${SITE}/doctor/claim" style="display:inline-block;background:#127a0a;color:#fff;font-weight:700;text-decoration:none;padding:12px 18px">Claim a profile that's compliant by design</a></div>`);

    return sendEmail({
        to: opts.to,
        subject: opts.result ? `Your NMC compliance check: ${verdictFor(opts.result.findings).verdict}` : 'Your NMC compliance scan is queued',
        html: shell(parts.join('')),
    });
}

export async function sendFullReportEmail(opts: {
    to: string;
    name: string;
    sections: { label: string; value: string; result: NmcScreenResult | null; note?: string }[];
}) {
    const blocks = opts.sections
        .map((s) =>
            s.result
                ? resultBlock(s.result, `${s.label.toUpperCase()} · ${s.value}`)
                : `<div style="padding:16px 28px;border-bottom:1px solid #d8d0be"><strong>${esc(s.label)}</strong> ${esc(s.value)}<div style="color:#4a4f52;margin-top:4px">${esc(s.note ?? '')}</div></div>`,
        )
        .join('');
    return sendEmail({
        to: opts.to,
        subject: 'Your full NMC compliance report',
        html: shell(`<div style="padding:24px 28px 8px;font-size:15px;line-height:1.55">Dear ${esc(opts.name)},<br><br>Here is the channel-by-channel report you requested, clause by clause, with a compliant alternative for every issue.</div>${blocks}`),
    });
}

export async function sendAdminAlert(opts: {
    id: string;
    name: string;
    email: string;
    phone: string;
    registrationNo: string;
    channels: Channels;
    result: NmcScreenResult | null;
}) {
    if (!ALERT_TO) return { success: true };
    const verdict = opts.result ? verdictFor(opts.result.findings).verdict : 'No content pasted';
    return sendEmail({
        to: ALERT_TO,
        subject: `NMC check: ${opts.name} · ${verdict}`,
        html: shell(`<div style="padding:24px 28px;line-height:1.6">
<strong>${esc(opts.name)}</strong> &lt;${esc(opts.email)}&gt;<br>
Mobile: ${esc(opts.phone || '—')}<br>
Registration: ${esc(opts.registrationNo || '—')}<br>
Instant check: ${esc(verdict)}${opts.result ? ` (${opts.result.engine})` : ''}<br><br>
${channelList(opts.channels) || 'No channels listed.'}<br>
<a href="${SITE}/admin/nmc-checks">Open the queue</a> · id ${esc(opts.id)}</div>`),
    });
}
