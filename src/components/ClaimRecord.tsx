import { useEffect, useId, useRef, useState } from 'react';
import { renderRegisterSeal, tierSeal, SEAL_GOLD } from '../lib/register-seal';

interface RegisterRecord {
    slug: string;
    name: string;
    specialty: string;
    country: string | null;
    city: string | null;
    institution: string | null;
    tier: string;
    claimed: boolean;
    claimPending: boolean;
}

type Registry = 'NMC' | 'SMC' | 'NPI' | 'GMC' | 'OTHER';

const REGISTRIES: { value: Registry; label: string; hint: string; placeholder: string }[] = [
    { value: 'NMC', label: 'NMR ID (India)', hint: 'Your National Medical Register ID', placeholder: 'e.g. 1234567890' },
    { value: 'SMC', label: 'State Medical Council reg. no. (India)', hint: 'Include the council, e.g. DMC/R/12345', placeholder: 'e.g. DMC/R/12345' },
    { value: 'NPI', label: 'NPI (United States)', hint: '10 digits; checked automatically against NPPES', placeholder: 'e.g. 1234567893' },
    { value: 'GMC', label: 'GMC number (United Kingdom)', hint: '7 digits', placeholder: 'e.g. 1234567' },
    { value: 'OTHER', label: 'Other national register', hint: 'Name the register and your number', placeholder: 'e.g. AHPRA MED0001234567' },
];

const STEPS = ['Find', 'Verify', 'Review', 'Embed'] as const;

const PERKS = [
    'Keep your specialty, institution and publications current',
    'Correct facts with a source; editors review every change',
    'A seal for your website that links patients to your record',
    'Free, and claiming never changes your score',
];

const MAX_DOC = 10 * 1024 * 1024;
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function defaultRegistry(country: string | null): Registry {
    if (country === 'India') return 'NMC';
    if (country === 'United States') return 'NPI';
    if (country === 'United Kingdom') return 'GMC';
    return 'OTHER';
}

function Seal({ record, size }: { record: RegisterRecord | null; size: number }) {
    const s = tierSeal(record?.tier);
    const svg = renderRegisterSeal({ size, color: SEAL_GOLD, ring: s.ring, letter: s.letter, uid: `claim-prev-${size}` });
    return <span className="cl-seal" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function ClaimRecord() {
    const uid = useId();
    const [step, setStep] = useState(1);
    const [unlocked, setUnlocked] = useState(1);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RegisterRecord[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [record, setRecord] = useState<RegisterRecord | null>(null);

    const [registry, setRegistry] = useState<Registry>('NMC');
    const [regNo, setRegNo] = useState('');
    const [email, setEmail] = useState('');
    const [doc, setDoc] = useState<File | null>(null);
    const [honeypot, setHoneypot] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [copied, setCopied] = useState(false);

    const headingRef = useRef<HTMLHeadingElement>(null);
    const firstRender = useRef(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug') || params.get('profile');
        if (!slug) return;
        fetch(`/api/register/lookup?slug=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.listed) choose(d.record);
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2 || (record && q === record.name)) {
            setResults([]);
            setSearchError('');
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/register/lookup?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                if (!res.ok) throw new Error(res.status === 429 ? 'Too many searches. Wait a minute and try again.' : 'Search is unavailable right now.');
                const d = await res.json();
                setResults(d.results ?? []);
                setSearchError('');
            } catch (e) {
                if ((e as Error).name !== 'AbortError') setSearchError((e as Error).message);
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [query, record]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        headingRef.current?.focus();
    }, [step]);

    function choose(r: RegisterRecord) {
        setRecord(r);
        setQuery(r.name);
        setResults([]);
        setRegistry(defaultRegistry(r.country));
        setUnlocked((u) => Math.max(u, 2));
    }

    function validate(): string {
        if (!record) return 'Choose your record first.';
        const n = regNo.trim();
        if (!n) return 'Enter your registration number.';
        if (registry === 'NPI' && !/^\d{10}$/.test(n)) return 'An NPI is 10 digits.';
        if (registry === 'GMC' && !/^\d{7}$/.test(n)) return 'A GMC number is 7 digits.';
        if (n.length > 64) return 'That registration number is too long.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
        if (doc && !DOC_TYPES.includes(doc.type)) return 'The document must be a PDF, JPG or PNG.';
        if (doc && doc.size > MAX_DOC) return 'The document is larger than 10 MB.';
        return '';
    }

    async function submit() {
        const problem = validate();
        if (problem) {
            setFormError(problem);
            return;
        }
        setFormError('');
        setSubmitting(true);
        try {
            const body = new FormData();
            body.set('profile_slug', record!.slug);
            body.set('registry', registry);
            body.set('registration_number', regNo.trim());
            body.set('email', email.trim());
            body.set('honeypot_filled', honeypot ? 'true' : 'false');
            if (doc) body.set('document', doc);
            const res = await fetch('/api/claim-profile', { method: 'POST', body });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) {
                setFormError(d.error || d.message || 'Something went wrong. Please try again.');
                return;
            }
            setConfirmation(d.message || "Verification request received. We'll email you once it's reviewed.");
            setUnlocked(4);
            setStep(3);
        } catch {
            setFormError('Network error. Check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    }

    const reg = REGISTRIES.find((r) => r.value === registry)!;
    const code = record ? `<script src="https://mdrpedia.com/seal.js" data-mdr="${record.slug}" async></script>` : '';
    const seal = tierSeal(record?.tier);
    const year = new Date().getFullYear();

    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    }

    const fields = record
        ? [
              { k: 'Name', v: record.name, type: 'general' },
              { k: 'Specialty', v: record.specialty || 'Not recorded', type: 'general' },
              { k: 'Institution', v: record.institution || 'Not recorded', type: 'affiliation' },
              { k: 'City', v: record.city || 'Not recorded', type: 'general' },
              { k: 'Country', v: record.country || 'Not recorded', type: 'general' },
          ]
        : [];

    return (
        <section className="cl-body" aria-label="Claim your record">
            <div className="cl-flow">
                <ol className="cl-steps">
                    {STEPS.map((l, i) => {
                        const n = i + 1;
                        const locked = n > unlocked;
                        return (
                            <li key={l}>
                                <button
                                    type="button"
                                    className="cl-step"
                                    data-active={n === step || undefined}
                                    data-done={n <= unlocked || undefined}
                                    aria-current={n === step ? 'step' : undefined}
                                    disabled={locked || (n === 2 && unlocked > 2)}
                                    onClick={() => setStep(n)}
                                >
                                    <span className="cl-step__n">0{n}</span> {l}
                                </button>
                            </li>
                        );
                    })}
                </ol>

                <div className="cl-panel">
                    {step === 1 && (
                        <>
                            <h2 ref={headingRef} tabIndex={-1}>Find your record</h2>
                            <label className="cl-field">
                                <span>Full name</span>
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        if (record && e.target.value !== record.name) setRecord(null);
                                    }}
                                    placeholder="e.g. Devi Shetty"
                                    autoComplete="name"
                                    aria-describedby={`${uid}-find`}
                                />
                            </label>
                            <p id={`${uid}-find`} className="cl-hint" aria-live="polite">
                                {searching ? 'Searching the register…' : searchError || (query.trim().length >= 2 && !record && !results.length ? 'No matching record.' : '')}
                            </p>
                            {results.length > 0 && (
                                <ul className="cl-results" aria-label="Matching records">
                                    {results.map((r) => (
                                        <li key={r.slug}>
                                            <button type="button" className="cl-record" onClick={() => choose(r)}>
                                                <span>
                                                    <span className="cl-record__name">{r.name}</span>
                                                    <span className="cl-record__meta"> · {[r.specialty, r.country].filter(Boolean).join(' · ')}</span>
                                                </span>
                                                <span className="cl-record__id">{r.claimed ? 'CLAIMED' : 'SELECT'}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {record && (
                                <div className="cl-record cl-record--chosen">
                                    <span>
                                        <span className="cl-record__name">{record.name}</span>
                                        <span className="cl-record__meta"> · {[record.specialty, record.country].filter(Boolean).join(' · ')}</span>
                                    </span>
                                    <a className="cl-record__id" href={`/doctors/${record.slug}`} target="_blank" rel="noopener">View record ↗</a>
                                </div>
                            )}
                            {record?.claimed && (
                                <p className="cl-note" role="status">This record has already been claimed. If that wasn't you, continue and our editors will contact both parties.</p>
                            )}
                            {record?.claimPending && !record.claimed && (
                                <p className="cl-note" role="status">A claim on this record is already under review. You can still submit yours.</p>
                            )}
                            <p className="cl-hint">
                                Not on the Register? <a href="/doctor/add-profile">Submit your profile for review</a>.
                            </p>
                        </>
                    )}

                    {step === 2 && record && (
                        <form
                            className="cl-form"
                            noValidate
                            onSubmit={(e) => {
                                e.preventDefault();
                                submit();
                            }}
                        >
                            <h2 ref={headingRef} tabIndex={-1}>Verify it's you</h2>
                            <p className="cl-lede">
                                Editors check your licence against the national register before your claim is approved
                                {registry === 'NPI' ? '; an NPI is checked against NPPES automatically' : ''}. We never publish your licence number.
                            </p>
                            <label className="cl-field">
                                <span>Register</span>
                                <select value={registry} onChange={(e) => setRegistry(e.target.value as Registry)}>
                                    {REGISTRIES.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="cl-field">
                                <span>{reg.label}</span>
                                <input
                                    value={regNo}
                                    onChange={(e) => setRegNo(e.target.value)}
                                    placeholder={reg.placeholder}
                                    inputMode={registry === 'NPI' || registry === 'GMC' ? 'numeric' : 'text'}
                                    maxLength={64}
                                    required
                                    aria-describedby={`${uid}-reg`}
                                />
                                <small id={`${uid}-reg`}>{reg.hint}</small>
                            </label>
                            <label className="cl-field">
                                <span>Institutional email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@hospital.org"
                                    autoComplete="email"
                                    maxLength={254}
                                    required
                                />
                                <small>An email at your hospital or practice domain is approved fastest.</small>
                            </label>
                            <label className="cl-field">
                                <span>Registration certificate (optional)</span>
                                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
                                <small>PDF, JPG or PNG, up to 10 MB. Stored privately; only editors can open it.</small>
                            </label>
                            <div className="cl-hp" aria-hidden="true">
                                <label>
                                    Website
                                    <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                                </label>
                            </div>
                            {formError && <p className="cl-error" role="alert">{formError}</p>}
                            <div className="cl-actions">
                                <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setStep(1)}>Back</button>
                                <button type="submit" className="cl-btn" disabled={submitting}>
                                    {submitting ? 'Submitting…' : 'Submit for verification →'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && record && (
                        <>
                            <h2 ref={headingRef} tabIndex={-1}>Review and correct</h2>
                            {confirmation && <p className="cl-success" role="status">{confirmation}</p>}
                            <p className="cl-lede">Suggest corrections with a source. Editors review every suggestion before it changes your record.</p>
                            <dl className="cl-fields">
                                {fields.map((f) => (
                                    <div key={f.k}>
                                        <dt>{f.k}</dt>
                                        <dd>{f.v}</dd>
                                        <dd>
                                            <a href={`/suggest-edit?profile=${encodeURIComponent(record.slug)}&type=${f.type}`} aria-label={`Suggest a correction to ${f.k.toLowerCase()}`}>Edit</a>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </>
                    )}

                    {step === 4 && record && (
                        <>
                            <h2 ref={headingRef} tabIndex={-1}>Embed your seal</h2>
                            <p className="cl-lede">Paste this on your clinic website. The seal checks itself against the Register, so it disappears automatically if your record is removed.</p>
                            <pre className="cl-code"><code>{code}</code></pre>
                            <button type="button" className="cl-btn cl-btn--start" onClick={copy}>{copied ? 'Copied ✓' : 'Copy embed code'}</button>
                            <span className="cl-sr" aria-live="polite">{copied ? 'Embed code copied' : ''}</span>
                        </>
                    )}

                    {step !== 2 && (
                        <div className="cl-actions">
                            {step > 1 && step !== 3 && (
                                <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setStep(step - 1)}>Back</button>
                            )}
                            {step === 1 && (
                                <button type="button" className="cl-btn" disabled={!record} onClick={() => setStep(2)}>Continue →</button>
                            )}
                            {step === 3 && (
                                <button type="button" className="cl-btn" onClick={() => setStep(4)}>Continue →</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <aside className="cl-aside" aria-label="Seal preview">
                <span className="cl-aside__label">Preview: how it appears on your website</span>
                <div className="cl-preview">
                    <div className="cl-badge">
                        <Seal record={record} size={64} />
                        <div>
                            <div className="cl-badge__tier">{seal.label === 'Listed' ? 'MDRPedia Register' : `${seal.label} · ${year}`}</div>
                            <div className="cl-badge__title">Listed on the MDRPedia Register</div>
                            <div className="cl-badge__verify">{record ? record.name : 'Your name'} · verify ↗</div>
                        </div>
                    </div>
                </div>
                <ul className="cl-perks">
                    {PERKS.map((p) => (
                        <li key={p}><span aria-hidden="true">—</span><span>{p}</span></li>
                    ))}
                </ul>
            </aside>
        </section>
    );
}
