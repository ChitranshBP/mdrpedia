import { useEffect, useRef, useState, type FormEvent } from "react";

type Severity = "High" | "Medium" | "Low";
interface Finding {
	severity: Severity;
	clause: string;
	title: string;
	excerpt: string;
	why: string;
	fix: string;
}
interface Result {
	verdict: string;
	summary: string;
	findings: Finding[];
	passed: string[];
	level: "ok" | "med" | "high" | "none";
	engine?: "ai" | "rules";
}

const CHANNELS = [
	["web", "Website", "https://drexample.in"],
	["ig", "Instagram", "@dr.example"],
	["fb", "Facebook page", "facebook.com/drexample"],
	["yt", "YouTube channel", "youtube.com/@drexample"],
	["gbp", "Google Business profile", "Clinic name, city"],
	["li", "LinkedIn", "linkedin.com/in/drexample"],
] as const;
type ChannelKey = (typeof CHANNELS)[number][0];

const MESSAGES = [
	"Reading your content…",
	"Checking testimonials and reviews…",
	"Checking claims and comparisons…",
	"Checking offers, endorsements and disclosures…",
	"Writing your report…",
];

const SAMPLE =
	'Dr. Rohit Rao, the BEST knee replacement surgeon in Pune! 100% success rate across 2,000+ surgeries. Flat 20% off all consultations this Diwali, limited period only. See what our happy patients say: "Dr. Rao gave me my life back" (Mrs. Sunita Sharma, 64). Swipe for before & after photos of her knee. We also recommend JointFlex supplements for faster recovery. Don\'t wait until it\'s too late: knee pain can leave you bedridden! DM to book now.';

const MAX_SCREEN = 8000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_CHANNELS: Record<ChannelKey, string> = { web: "", ig: "", fb: "", yt: "", gbp: "", li: "" };

export default function NmcComplianceCheck() {
	const [ch, setCh] = useState(EMPTY_CHANNELS);
	const [content, setContent] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [reg, setReg] = useState("");
	const [consent, setConsent] = useState(false);
	const [honeypot, setHoneypot] = useState("");
	const [error, setError] = useState("");
	const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
	const [step, setStep] = useState(0);
	const [result, setResult] = useState<Result | null>(null);
	const [truncated, setTruncated] = useState(false);
	const verdictRef = useRef<HTMLHeadingElement>(null);
	const errorRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (phase !== "loading") return;
		const t = setInterval(() => setStep((s) => Math.min(s + 1, MESSAGES.length - 1)), 3500);
		return () => clearInterval(t);
	}, [phase]);

	useEffect(() => {
		if (phase === "result") verdictRef.current?.focus();
		if (phase !== "form") cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
	}, [phase]);

	useEffect(() => {
		if (error) errorRef.current?.focus();
	}, [error]);

	const queued = CHANNELS.filter(([k]) => ch[k].trim()).map(([k, l]) => ({ k, l, v: ch[k].trim() }));
	const emailOk = EMAIL_RE.test(email.trim());

	async function submit(e: FormEvent) {
		e.preventDefault();
		const err = !content.trim() && queued.length === 0
			? "Add at least one channel, or paste some content to check."
			: !name.trim()
				? "Please enter your name."
				: !emailOk
					? "Please enter a valid email so we can send your report."
					: !consent
						? "Please confirm the consent box."
						: "";
		if (err) {
			setError(err);
			return;
		}
		setError("");
		setStep(0);
		setPhase("loading");

		try {
			const res = await fetch("/api/nmc-check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ channels: ch, content, name, email, phone, reg, consent, website: honeypot }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) {
				setPhase("form");
				setError(data.error || (res.status === 429 ? "Too many checks from this connection. Please try again in an hour." : "We couldn't finish the check. Please try again."));
				return;
			}
			setTruncated(!!data.truncated);
			setResult(
				data.result ?? {
					verdict: "Channels queued for a full scan",
					summary: "You didn't paste any content, so there's no instant result. We'll scan every channel you listed and email the full report.",
					findings: [],
					passed: [],
					level: "none",
				},
			);
			setPhase("result");
		} catch {
			setPhase("form");
			setError("We couldn't reach the server. Check your connection and try again.");
		}
	}

	function reset() {
		setContent("");
		setResult(null);
		setPhase("form");
	}

	const r = result;
	const resultDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
	const progress = Math.round(((step + 1) / MESSAGES.length) * 92);
	const missing = (bad: boolean) => (error && bad ? "true" : undefined);

	return (
		<div className="nmc-card" ref={cardRef}>
			{phase === "form" && (
				<form onSubmit={submit} noValidate aria-describedby={error ? "nmc-error" : undefined}>
					<div className="nmc-step" role="group" aria-labelledby="nmc-s1">
						<div className="nmc-step__head">
							<h2 id="nmc-s1" className="nmc-step__title">1. Your channels</h2>
							<span className="nmc-step__hint">Add any you use. We'll scan them all for your full report.</span>
						</div>
						<div className="nmc-grid">
							{CHANNELS.map(([k, l, ph]) => (
								<label className="nmc-field" key={k}>
									<span>{l}</span>
									<input className="nmc-input" value={ch[k]} placeholder={ph} maxLength={300} autoComplete={k === "web" ? "url" : "off"}
										onChange={(e) => setCh((c) => ({ ...c, [k]: e.target.value }))} />
								</label>
							))}
						</div>
					</div>

					<div className="nmc-step" role="group" aria-labelledby="nmc-s2">
						<div className="nmc-step__head">
							<h2 id="nmc-s2" className="nmc-step__title">2. Paste content for an instant check</h2>
							<button type="button" className="nmc-link-btn" onClick={() => setContent(SAMPLE)}>Try a sample post</button>
						</div>
						<label htmlFor="nmc-content" className="nmc-step__help">
							Your bio, recent captions, a Google Business description or your website's "About" text. Paste as much as you like.
						</label>
						<textarea id="nmc-content" className="nmc-textarea" rows={7} value={content} maxLength={20000}
							placeholder="e.g. Dr. Rao, the best knee surgeon in Pune…" aria-describedby="nmc-count"
							onChange={(e) => setContent(e.target.value)} />
						<span id="nmc-count" className={`nmc-count${content.length > MAX_SCREEN ? " nmc-count--over" : ""}`}>
							{content.length.toLocaleString("en-IN")} characters
							{content.length > MAX_SCREEN && ` · the instant check reads the first ${MAX_SCREEN.toLocaleString("en-IN")}`}
						</span>
					</div>

					<div className="nmc-step" role="group" aria-labelledby="nmc-s3">
						<div className="nmc-step__head">
							<h2 id="nmc-s3" className="nmc-step__title">3. Where to send your full report</h2>
							<span className="nmc-step__hint">We check every channel you listed and email a clause-by-clause report.</span>
						</div>
						<div className="nmc-grid">
							<label className="nmc-field">
								<span>Your name *</span>
								<input className="nmc-input" value={name} placeholder="Dr. First Last" autoComplete="name" maxLength={120} required
									aria-invalid={missing(!name.trim())} onChange={(e) => setName(e.target.value)} />
							</label>
							<label className="nmc-field">
								<span>Email *</span>
								<input className="nmc-input" type="email" value={email} placeholder="you@clinic.in" autoComplete="email" maxLength={200} required
									aria-invalid={missing(!emailOk)} onChange={(e) => setEmail(e.target.value)} />
							</label>
							<label className="nmc-field">
								<span>Mobile</span>
								<input className="nmc-input" type="tel" value={phone} placeholder="+91" autoComplete="tel" maxLength={30}
									onChange={(e) => setPhone(e.target.value)} />
							</label>
							<label className="nmc-field">
								<span>NMR ID or State Council reg. no.</span>
								<input className="nmc-input" value={reg} placeholder="Optional · speeds up your profile claim" maxLength={60}
									onChange={(e) => setReg(e.target.value)} />
							</label>
						</div>
						<div className="nmc-honeypot" aria-hidden="true">
							<label>Company website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
						</div>
						<label className="nmc-consent">
							<input type="checkbox" checked={consent} aria-invalid={missing(!consent)} onChange={(e) => setConsent(e.target.checked)} />
							<span>I'm the registered practitioner, or authorised to act for them. MDRPedia may email this report and occasional updates on NMC compliance. Unsubscribe any time.</span>
						</label>
						{error && <div id="nmc-error" className="nmc-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
						<div className="nmc-submit-row">
							<button type="submit" className="nmc-btn">Run my free check →</button>
							<span className="nmc-step__hint">Free · results in about 20 seconds</span>
						</div>
					</div>
				</form>
			)}

			{phase === "loading" && (
				<div className="nmc-loading" role="status" aria-live="polite">
					<span className="nmc-loading__kicker">CHECKING</span>
					<span className="nmc-loading__msg">{MESSAGES[step]}</span>
					<div className="nmc-progress" role="progressbar" aria-label="Check progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
						<div style={{ width: `${progress}%` }} />
					</div>
				</div>
			)}

			{phase === "result" && r && (
				<div aria-live="polite">
					<div className={`nmc-verdict nmc-verdict--${r.level}`}>
						<span className="nmc-verdict__kicker">INSTANT CHECK · {resultDate}</span>
						<h2 tabIndex={-1} ref={verdictRef}>{r.verdict}</h2>
						<p>{r.summary}</p>
					</div>
					<div className="nmc-results">
						{r.findings.map((f, i) => (
							<article className={`nmc-finding nmc-finding--${f.severity}`} key={i}>
								<div className="nmc-finding__tags">
									<span className={`nmc-sev nmc-sev--${f.severity}`}>{f.severity}</span>
									<span className="nmc-count">NMC {f.clause}</span>
								</div>
								<h3>{f.title}</h3>
								<blockquote>"{f.excerpt}"</blockquote>
								<p className="nmc-why">{f.why}</p>
								<p><strong>Compliant alternative:</strong> {f.fix}</p>
							</article>
						))}
						{r.passed.length > 0 && (
							<div className="nmc-passed-block">
								<span className="nmc-kicker--green">LOOKS FINE</span>
								<ul className="nmc-passed">
									{r.passed.map((p, i) => <li key={i}>{p}</li>)}
								</ul>
							</div>
						)}
						{queued.length > 0 && (
							<div className="nmc-queue">
								<span className="nmc-kicker--amber">FULL SCAN · REPORT TO {email.trim().toUpperCase()} WITHIN 24 HOURS</span>
								<ul>
									{queued.map((q) => (
										<li key={q.k}><span><strong>{q.l}</strong> <span>{q.v}</span></span><span>QUEUED</span></li>
									))}
								</ul>
							</div>
						)}
						<div className="nmc-actions">
							<a href="/doctor/claim">Claim a profile that's compliant by design</a>
							<button type="button" onClick={reset}>Check other content</button>
						</div>
						<p className="nmc-disclaimer">
							This is an automated{r.engine === "ai" ? ", AI-assisted" : ""} screen of the text you pasted
							{truncated ? ` (the first ${MAX_SCREEN.toLocaleString("en-IN")} characters)` : ""}, checked against our reading of the NMC
							Guidelines on Ethical Advertising (6 Oct 2026). It isn't legal advice, and it can miss issues or flag false positives.
							Images and videos are reviewed in the full scan. A copy has been emailed to you.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
