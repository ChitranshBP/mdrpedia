/**
 * GET /seal.js — embeddable "Listed on the MDRPedia Register" seal.
 * <script src="https://mdrpedia.com/seal.js" data-mdr="<profile-slug>" async></script>
 * The seal checks the record live, so it disappears if the record is removed.
 */
export const prerender = false;

const SCRIPT = `(function(){
  var s = document.currentScript;
  if (!s || !s.dataset || !s.dataset.mdr) return;
  var slug = s.dataset.mdr;
  var origin = new URL(s.src).origin;
  var host = document.createElement("span");
  host.style.display = "inline-block";
  s.parentNode.insertBefore(host, s.nextSibling);
  var root = host.attachShadow ? host.attachShadow({ mode: "closed" }) : host;
  fetch(origin + "/api/register/lookup?slug=" + encodeURIComponent(slug))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.listed) { host.remove(); return; }
      var css = document.createElement("style");
      css.textContent = "a{display:inline-flex;align-items:center;gap:14px;padding:12px 18px 12px 12px;border:1px solid #0e3b2e;background:#f4f0e6;color:#14171a;text-decoration:none;font-family:'Hanken Grotesk',system-ui,sans-serif;line-height:1.3}a:hover{background:#ebe5d6}.t{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#7a5c16}.n{font-family:'Bodoni Moda',Georgia,serif;font-size:18px}.v{font-family:'Spline Sans Mono',ui-monospace,monospace;font-size:11px;color:#6a6f72}";
      var a = document.createElement("a");
      a.href = origin + "/doctors/" + encodeURIComponent(d.record.slug);
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", d.record.name + " — listed on the MDRPedia Register. Verify on mdrpedia.com");
      var seal = document.createElement("span");
      seal.innerHTML = d.seal.svg;
      var text = document.createElement("span");
      [["t", d.seal.label === "Listed" ? "MDRPedia Register" : d.seal.label], ["n", "Listed on the MDRPedia Register"], ["v", d.record.name + " · verify ↗"]].forEach(function (p) {
        var el = document.createElement("span");
        el.className = p[0];
        el.style.display = "block";
        el.textContent = p[1];
        text.appendChild(el);
      });
      a.appendChild(seal);
      a.appendChild(text);
      root.appendChild(css);
      root.appendChild(a);
    })
    .catch(function () { host.remove(); });
})();
`;

export function GET() {
    return new Response(SCRIPT, {
        headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
