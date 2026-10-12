/**
 * Deterministic screen against the NMC advertising guidelines.
 * Runs when the AI screen is unavailable, and backs the full channel scan.
 */
import type { NmcFinding, NmcScreenResult, Severity } from './types';
import { sortFindings } from './types';

interface Rule {
    clause: string;
    severity: Severity;
    title: string;
    why: string;
    pattern: RegExp;
    /** Sentence-level guard; the rule fires only if this also matches. */
    also?: RegExp;
    fix: (sentence: string) => string;
    passed: string;
}

const SUPERLATIVE =
    /\b(?:the\s+)?(?:best|no\.?\s?1|number\s+one|#\s?1|top[- ]rated|top(?=\s+(?:[\w-]+\s+){0,2}(?:doctors?|surgeons?|specialists?|physicians?|consultants?|hospitals?|clinics?|[a-z]+ologists?))|leading|finest|most\s+trusted|world[- ]class|unmatched|renowned|premier)\b/i;
const PRACTITIONER =
    /\b(?:doctor|dr\.?|surgeon|specialist|physician|consultant|hospital|clinic|centre|center|dentist|[a-z]+olog(?:ist|y)|[a-z]+iatrist|orthopaedic|orthopedic|gynaec\w*|paediatric\w*|pediatric\w*|in\s+[A-Z][a-z]+)\b/i;

function tidy(s: string): string {
    return s.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/!+/g, '.').trim();
}

function dropSuperlative(sentence: string): string {
    const rewritten = sentence
        .replace(/\bthe\s+(?:best|no\.?\s?1|number\s+one|#\s?1|top[- ]rated|top|leading|finest|most\s+trusted|world[- ]class|renowned|premier)\s+/gi, 'a ')
        .replace(/\b(?:best|no\.?\s?1|number\s+one|#\s?1|top[- ]rated|leading|finest|most\s+trusted|world[- ]class|unmatched|renowned|premier)\s+/gi, '');
    return tidy(rewritten);
}

const RULES: Rule[] = [
    {
        clause: 'Expl. V',
        severity: 'High',
        title: 'Patient testimonial or review used for promotion',
        why: 'Doctors must not request, share or publish patient testimonials, reviews or ratings for promotion.',
        pattern:
            /\b(?:testimonials?|happy\s+patients?|patients?\s+(?:say|said|speak|share)|what\s+(?:our\s+)?patients\s+say|reviews?\s+from|google\s+reviews?|5[- ]star|five[- ]star|\d(?:\.\d)?\s*(?:\/\s*5\s*)?stars?|rated\s+\d|leave\s+(?:us\s+)?a\s+review)\b|[★⭐]/i,
        fix: () => 'Remove the testimonial and any request for reviews. Share educational content instead, or simply list your qualifications and clinic details.',
        passed: 'No patient testimonials or review requests',
    },
    {
        clause: '8.1(ix)',
        severity: 'High',
        title: '"Best" or comparative claim',
        why: 'Comparative or unverifiable claims such as "best", "No. 1" or "top" are prohibited.',
        pattern: SUPERLATIVE,
        also: PRACTITIONER,
        fix: (s) => `Drop the comparison and state facts: "${dropSuperlative(s)}"`,
        passed: 'No "best", "No. 1" or "top" claims',
    },
    {
        clause: '8.1(iii)',
        severity: 'High',
        title: 'Success rate, patient count or guarantee',
        why: 'Publishing personal success rates or patient numbers, or promising a guaranteed cure, is prohibited.',
        pattern:
            /\b\d{1,3}(?:\.\d+)?\s*%\s*(?:success|cure|recovery|results?|satisf\w*)|\bsuccess\s+rates?\b|\bguarantee[sd]?\b|\bassured\s+results?\b|\b(?:permanent|complete|sure[- ]shot|100%)\s+(?:cure|relief|results?|success|safe)\b|\b\d[\d,]*\+?\s*(?:successful\s+)?(?:surgeries|operations|procedures|patients|deliveries|transplants|cases|implants)\b/i,
        fix: () => 'Remove the figures and any guarantee. Describe what the procedure involves, who it may suit and its risks, without promising outcomes.',
        passed: 'No success rates, patient counts or guarantees',
    },
    {
        clause: '8.1(v)',
        severity: 'High',
        title: 'Before-and-after or case-story content',
        why: 'Before-and-after photos, surgical results, celebrity patients and success stories are prohibited outside strictly scientific use.',
        pattern: /\bbefore\s*(?:&|and|\/|-)?\s*after\b|\bsuccess\s+stor(?:y|ies)\b|\btransformation\b|\bcelebrit(?:y|ies)\b|\bcase\s+stor(?:y|ies)\b/i,
        fix: () => 'Remove before-and-after images and case stories from promotional channels. For teaching, anonymise them, obtain written consent and present them in a scientific context.',
        passed: 'No before-and-after photos or case stories mentioned',
    },
    {
        clause: '8.1(x)',
        severity: 'High',
        title: 'Discount, offer or free procedure',
        why: 'Discounts, offers, coupons, cashbacks and free procedures that encourage unnecessary care are prohibited.',
        pattern:
            /\b\d{1,2}\s*%\s*off\b|\bflat\s+\d+|\bdiscounts?\b|\b(?:special|festive|festival|diwali|limited|launch|introductory|exclusive|combo)\s+offers?\b|\boffers?\s+(?:valid|ends|till|until|on\s+all)\b|\bcoupons?\b|\bcash\s?backs?\b|\bfree\s+(?:consultation|check[- ]?ups?|surgery|procedure|screening|camp|treatment|scan|test)s?\b|\blimited[- ](?:period|time)\b|\bspecial\s+(?:price|package)\b|\bpackage\s+price\b|\bno[- ]cost\s+emi\b/i,
        fix: () => 'Remove the discount or offer. If you publish fees at all, state the standard consultation fee plainly.',
        passed: 'No discounts, offers or free procedures',
    },
    {
        clause: '8.1(iv)',
        severity: 'Medium',
        title: 'Drug, device or product endorsement',
        why: 'Doctors must not endorse drugs, devices, supplements or other health products.',
        pattern: /\b(?:recommend|recommended|try|buy|endorse|order|available\s+at|get\s+your|we\s+suggest)\b/i,
        also: /\b(?:supplements?|capsules?|tablets?|syrups?|products?|brand|devices?|kits?|creams?|oils?|powders?|gummies)\b/i,
        fix: () => 'Remove the brand or product. Give general advice instead (for example, "ask your doctor whether a supplement suits you") without naming a product.',
        passed: 'No drug, device or supplement endorsements',
    },
    {
        clause: '8.1(i)',
        severity: 'Medium',
        title: 'Fear-based or demand-creating message',
        why: 'Fear-based or demand-creating marketing for procedures or diagnostics is prohibited.',
        pattern:
            /\bdon'?t\s+(?:wait|delay|ignore)\b|\b(?:before\s+)?it'?s\s+too\s+late\b|\bsilent\s+killer\b|\bcould\s+(?:leave|make|cost)\s+you\b|\b(?:bedridden|crippled|paralysed|paralyzed)\b|\bact\s+now\b|\brisk\s+(?:of\s+)?(?:death|dying)\b/i,
        fix: () => 'Replace the alarm with neutral education: describe which symptoms are worth getting checked, without urgency or fear.',
        passed: 'No fear-based or urgency messaging',
    },
    {
        clause: '8.1(ii)',
        severity: 'Low',
        title: 'Direct solicitation of patients',
        why: 'Direct or indirect solicitation and self-promotion are prohibited; factual contact details are allowed.',
        pattern: /\bdm\s+(?:to|for|now|us)\b|\bbook\s+(?:now|today|your\s+(?:slot|appointment))\b|\bcall\s+now\b|\bwhatsapp\s+(?:now|us\s+now)\b|\bhurry\b|\blimited\s+slots\b|\bslots\s+filling\b/i,
        fix: () => 'Replace the call to action with factual details: clinic address, timings and the appointment phone number.',
        passed: 'No direct calls to book or DM',
    },
    {
        clause: '8.1(vii)',
        severity: 'High',
        title: 'Referral fee or commission',
        why: 'Commissions, referral fees and lead-generation fees are prohibited.',
        pattern: /\breferral\s+(?:fee|bonus|reward|incentive)s?\b|\bcommissions?\b|\brefer\s+(?:a\s+friend|and\s+earn)\b/i,
        fix: () => 'Remove the referral or commission offer entirely.',
        passed: 'No referral fees or commissions',
    },
    {
        clause: '8.1(xii)',
        severity: 'Medium',
        title: 'Purchased or manipulated engagement',
        why: 'Fake followers, likes, views or manipulated engagement are prohibited.',
        pattern: /\b(?:buy|bought|get|purchase)\s+(?:\d+[kK]?\s+)?(?:followers|likes|views|subscribers)\b|\bengagement\s+pods?\b/i,
        fix: () => 'Stop any paid or exchanged engagement and let numbers reflect genuine interest.',
        passed: 'No signs of purchased engagement',
    },
    {
        clause: '7.4',
        severity: 'High',
        title: 'Patient could be identified',
        why: 'Patients must never be identified in public communication.',
        pattern: /\b(?:Mrs|Mr|Ms|Miss|Smt|Shri|Master|Baby)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*(?:,\s*(?:aged\s+)?\d{1,3}\b|\(\s*\d{1,3})|\((?:Mrs|Mr|Ms|Miss|Smt|Shri)\.?\s+[A-Z][a-z]+/,
        fix: () => 'Remove the patient\'s name, age, photo and any detail that could identify them.',
        passed: 'No identifiable patient details',
    },
];

const REGISTRATION =
    /\b(?:reg(?:istration)?\.?\s*(?:no\.?|number|#)?|nmr(?:\s*id)?|smr|mci|nmc|[a-z]{1,3}mc)\s*[:#.\-]?\s*[a-z]{0,6}\s*[\/\-]?\s*\d{3,}/i;
const QUALIFICATION = /\b(?:MBBS|M\.B\.B\.S|MD|M\.D|MS|M\.S|DNB|MCh|M\.Ch|DM|BDS|MDS|BAMS|BHMS|FRCS|MRCP|MRCS|FRCP|DGO|DCH|DA|DNB)\b/;
const DR_NAME = /\bDr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/;

const ABBREVIATION = /\b(Dr|Mrs|Mr|Ms|Smt|Shri|Prof|No|Reg|St|Sr|Jr|Hon|Lt|Col|Capt|vs|approx|etc|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\.(?=\s)/g;
const DOT = '․';

function sentences(text: string): string[] {
    return text
        .replace(/\r/g, '')
        .replace(ABBREVIATION, `$1${DOT}`)
        .split(/(?<=[.!?])\s+(?=["'“‘(]?[A-Z0-9])|\n+/)
        .map((s) => s.replaceAll(DOT, '.').trim())
        .filter(Boolean);
}

function excerptOf(sentence: string): string {
    return sentence.length > 220 ? `${sentence.slice(0, 217).trimEnd()}…` : sentence;
}

export function screenWithRules(text: string): NmcScreenResult {
    const findings: NmcFinding[] = [];
    const hitClauses = new Set<string>();
    const parts = sentences(text);

    for (const rule of RULES) {
        let hits = 0;
        for (const sentence of parts) {
            if (hits >= 2) break;
            if (!rule.pattern.test(sentence)) continue;
            if (rule.also && !rule.also.test(sentence)) continue;
            hits++;
            hitClauses.add(rule.clause);
            findings.push({
                severity: rule.severity,
                clause: rule.clause,
                title: rule.title,
                excerpt: excerptOf(sentence),
                why: rule.why,
                fix: rule.fix(sentence),
            });
        }
    }

    const substantial = text.trim().length >= 40;
    const hasReg = REGISTRATION.test(text);
    const hasQual = QUALIFICATION.test(text);
    if (substantial && !hasReg) {
        const name = text.match(DR_NAME)?.[0] ?? 'Dr. First Last';
        findings.push({
            severity: 'Medium',
            clause: 'Disclosure',
            title: 'Registration number not shown',
            excerpt: '(no registration number found)',
            why: 'Public posts must show your name, qualifications, registration status and NMR or State Medical Council registration number.',
            fix: `Add a line such as "${name}, MBBS, MS · Reg. No. <council> <number>" to your bio and posts.`,
        });
    }
    if (substantial && !hasQual) {
        findings.push({
            severity: 'Low',
            clause: 'Disclosure',
            title: 'Qualifications not stated',
            excerpt: '(no qualifications found)',
            why: 'Disclosure includes your recognised qualifications alongside your name.',
            fix: 'List your recognised degrees after your name, for example "MBBS, MD (Medicine)".',
        });
    }

    const passed: string[] = [];
    if (substantial && hasReg) passed.push('Registration number is shown');
    for (const rule of RULES) {
        if (passed.length >= 3) break;
        if (!hitClauses.has(rule.clause) && rule.severity !== 'Low') passed.push(rule.passed);
    }

    const sorted = sortFindings(findings);
    const high = sorted.filter((f) => f.severity === 'High').length;
    const summary =
        sorted.length === 0
            ? 'Nothing in this text conflicts with the clauses we screen for. Images, videos and your other channels are covered in the full scan.'
            : `We found ${sorted.length} ${sorted.length === 1 ? 'issue' : 'issues'}${high ? `, ${high} of them high-risk` : ''}. The most serious: ${sorted[0].title.toLowerCase()} (NMC ${sorted[0].clause}).`;

    return { summary, findings: sorted, passed, engine: 'rules' };
}
