/** Client behaviour for the doctor record page (src/layouts/DoctorRecord.astro). */

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

function portraits() {
	document.querySelectorAll<HTMLImageElement>("img.js-portrait").forEach((img) => {
		const fallback = () => {
			const initials = img.nextElementSibling as HTMLElement | null;
			img.parentElement?.classList.add("p-portrait--initials");
			img.remove();
			if (initials) initials.hidden = false;
		};
		if (img.complete && img.naturalWidth === 0) fallback();
		else img.addEventListener("error", fallback, { once: true });
	});
}

function cite() {
	const btn = document.querySelector<HTMLButtonElement>("[data-cite]");
	const label = btn?.querySelector("[data-cite-label]");
	const status = document.querySelector("[data-cite-status]");
	btn?.addEventListener("click", async () => {
		const ok = await copyText(btn.dataset.cite ?? "");
		if (label) label.textContent = ok ? "Citation copied ✓" : "Copy failed — select the URL instead";
		if (status) status.textContent = ok ? "Citation copied to the clipboard." : "Couldn't copy the citation.";
		window.setTimeout(() => {
			if (label) label.textContent = "Cite this record";
		}, 4000);
	});
}

function share() {
	const dialog = document.getElementById("shareDialog") as HTMLDialogElement | null;
	const opener = document.querySelector<HTMLButtonElement>("[data-share-open]");
	if (!dialog || !opener) return;
	const status = dialog.querySelector("[data-share-status]");
	opener.addEventListener("click", () => {
		if (typeof dialog.showModal === "function") dialog.showModal();
		else window.open(dialog.querySelector<HTMLAnchorElement>("a[href^='https://twitter']")?.href, "_blank", "noopener");
	});
	dialog.addEventListener("close", () => opener.focus());
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) dialog.close();
	});
	dialog.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) => {
		const original = b.textContent;
		b.addEventListener("click", async () => {
			const ok = await copyText(b.dataset.copy ?? "");
			b.textContent = ok ? b.dataset.copyDone ?? "Copied ✓" : "Copy failed";
			if (status) status.textContent = ok ? b.dataset.copyDone ?? "Copied" : "Copy failed";
			window.setTimeout(() => (b.textContent = original), 3000);
		});
	});
	const native = dialog.querySelector<HTMLButtonElement>("[data-native-share]");
	if (native && typeof navigator.share === "function") {
		native.hidden = false;
		native.addEventListener("click", () => {
			navigator.share({ title: document.title, url: location.href.split("#")[0] }).catch(() => {});
		});
	}
}

function tabs() {
	const list = document.querySelector<HTMLElement>(".p-tabs[role='tablist']");
	if (!list) return;
	const buttons = [...list.querySelectorAll<HTMLButtonElement>("[role='tab']")];
	const panels = buttons.map((b) => document.getElementById(b.getAttribute("aria-controls") ?? "")).filter((p): p is HTMLElement => !!p);
	if (buttons.length < 2) return;
	list.hidden = false;

	const select = (index: number, opts: { focus?: boolean; push?: boolean } = {}) => {
		buttons.forEach((b, i) => {
			const on = i === index;
			b.setAttribute("aria-selected", String(on));
			b.tabIndex = on ? 0 : -1;
			if (panels[i]) panels[i].hidden = !on;
		});
		if (opts.focus) buttons[index].focus();
		if (opts.push) history.replaceState(null, "", index === 0 ? location.pathname + location.search : `#${panels[index].id}`);
	};

	const fromHash = () => {
		const id = decodeURIComponent(location.hash.slice(1));
		if (!id) return -1;
		const target = document.getElementById(id);
		return target ? panels.findIndex((p) => p === target || p.contains(target)) : -1;
	};

	const initial = fromHash();
	select(initial >= 0 ? initial : 0);
	if (initial > 0) list.scrollIntoView({ block: "start" });

	buttons.forEach((b, i) => b.addEventListener("click", () => select(i, { push: true })));
	list.addEventListener("keydown", (e) => {
		const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
		if (i < 0) return;
		const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		select((next + buttons.length) % buttons.length, { focus: true, push: true });
	});
	window.addEventListener("hashchange", () => {
		const i = fromHash();
		if (i >= 0) select(i);
	});
}

function media() {
	const box = document.getElementById("lightbox") as HTMLDialogElement | null;
	const boxImg = box?.querySelector("img");
	document.querySelectorAll<HTMLAnchorElement>("[data-lightbox]").forEach((a) => {
		a.addEventListener("click", (e) => {
			if (!box || !boxImg || typeof box.showModal !== "function") return;
			e.preventDefault();
			boxImg.src = a.href;
			boxImg.alt = a.querySelector("img")?.alt ?? "";
			box.showModal();
		});
	});
	box?.addEventListener("click", (e) => {
		if (e.target === box) box.close();
	});
	document.querySelectorAll<HTMLButtonElement>(".p-video[data-embed]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const frame = document.createElement("iframe");
			frame.src = btn.dataset.embed ?? "";
			frame.title = btn.getAttribute("aria-label")?.replace(/^Play video: /, "") ?? "Video";
			frame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
			frame.allowFullscreen = true;
			frame.className = "p-video__frame";
			btn.replaceWith(frame);
		});
	});
}

function claimForm() {
	const form = document.getElementById("claimForm") as HTMLFormElement | null;
	if (!form) return;
	const status = document.getElementById("claimStatus");
	const btn = document.getElementById("claimSubmit") as HTMLButtonElement | null;
	const setStatus = (msg: string, state: "error" | "success" | "") => {
		if (!status) return;
		status.textContent = msg;
		status.dataset.state = state;
	};
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
		const licence = (form.elements.namedItem("registration_number") as HTMLInputElement).value.trim();
		const file = (form.elements.namedItem("document") as HTMLInputElement).files?.[0];
		const hp = (form.elements.namedItem("website_url_hp") as HTMLInputElement).value;
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus("Enter a valid work email address.", "error");
		if (!licence) return setStatus("Enter your registration number.", "error");
		if (file && file.size > 10 * 1024 * 1024) return setStatus("That file is over 10 MB. Choose a smaller one.", "error");

		const body = new FormData();
		body.append("profile_slug", form.dataset.slug ?? "");
		body.append("email", email);
		body.append("registration_number", licence);
		body.append("honeypot_filled", String(Boolean(hp)));
		if (file) body.append("document", file, file.name);

		if (btn) {
			btn.disabled = true;
			btn.textContent = "Sending…";
		}
		setStatus("", "");
		try {
			const res = await fetch("/api/claim-profile", { method: "POST", body });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload.error || "We couldn't send that request.");
			setStatus(payload.message || "Claim received. We'll email you once it has been reviewed.", "success");
			form.querySelectorAll("input").forEach((i) => (i.disabled = true));
			if (btn) btn.textContent = "Request sent ✓";
		} catch (err) {
			if (btn) {
				btn.disabled = false;
				btn.textContent = "Send claim request";
			}
			setStatus(err instanceof Error ? err.message : "We couldn't send that request. Please try again.", "error");
		}
	});
}

export function initRecordPage() {
	portraits();
	cite();
	share();
	tabs();
	media();
	claimForm();
}
