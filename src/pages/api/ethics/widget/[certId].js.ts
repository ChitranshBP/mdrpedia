/**
 * GET /api/ethics/widget/[certId].js — Dynamic JS widget for embedding
 */

export const prerender = false;

import { isValidCertId } from '../../../../lib/ethics-cert-id';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

export async function GET({ params, request }: { params: { certId: string }; request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsPublic);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const { certId } = params;

    if (!certId || !isValidCertId(certId)) {
        return new Response('// Invalid certification ID', {
            status: 400,
            headers: { 'Content-Type': 'application/javascript' },
        });
    }

    // Self-contained IIFE that fetches live data and renders the widget
    const js = `(function(){
  var CERT_ID = ${JSON.stringify(certId)};
  var API_URL = "https://mdrpedia.com/api/ethics/verify/" + CERT_ID;
  var VERIFY_URL = "https://mdrpedia.com/ethical-doctors/verify/" + CERT_ID;

  var container = document.currentScript && document.currentScript.parentElement;
  if (!container) return;

  var el = document.createElement("div");
  el.id = "mdr-ethics-" + CERT_ID;
  el.style.cssText = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;border:1px solid #d1d5db;border-radius:12px;padding:16px;max-width:320px;background:#fff;display:flex;gap:14px;align-items:center;";
  el.innerHTML = '<div style="width:64px;height:64px;border-radius:50%;border:2px solid #d1d5db;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#9ca3af;font-size:24px;font-family:serif">...</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Loading...</div><div style="font-size:11px;color:#6b7280;margin-top:2px">Verifying certification</div></div>';
  container.appendChild(el);

  fetch(API_URL).then(function(r){return r.json()}).then(function(d){
    if(!d.valid && !d.cert_id){
      el.innerHTML='<div style="color:#ef4444;font-size:13px">Certification not found</div>';
      return;
    }
    var tier = d.certification.tier || "UNKNOWN";
    var tierColors = {LEGEND:"#2d6a4f",GUARDIAN:"#1b4332",ADVOCATE:"#40916c"};
    var color = tierColors[tier] || "#6b7280";
    var letter = tier.charAt(0);
    var statusDot = d.valid ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:4px;vertical-align:middle"></span>' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:4px;vertical-align:middle"></span>';
    var statusText = d.valid ? "Active" : (d.certification.status || "Inactive");
    var auditDate = d.certification.last_audit_date ? new Date(d.certification.last_audit_date).toLocaleDateString("en-US",{month:"short",year:"numeric"}) : "N/A";
    var band = d.certification.score_band || "";

    el.innerHTML = '<a href="' + VERIFY_URL + '" target="_blank" rel="noopener" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;width:100%">' +
      '<div style="width:64px;height:64px;border-radius:50%;border:2px solid ' + color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + color + ';font-size:28px;font-family:serif;font-weight:400">' + letter + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (d.doctor.name||"") + '</div>' +
        '<div style="font-size:10px;font-weight:600;letter-spacing:0.08em;color:' + color + ';text-transform:uppercase;margin-top:2px">' + tier + ' Certified</div>' +
        '<div style="font-size:11px;color:#6b7280;margin-top:4px">' + statusDot + statusText + (band ? " \\u00B7 " + band : "") + '</div>' +
        '<div style="font-size:10px;color:#9ca3af;margin-top:2px">Last audit: ' + auditDate + '</div>' +
      '</div>' +
    '</a>';
  }).catch(function(){
    el.innerHTML='<div style="color:#ef4444;font-size:13px">Failed to verify</div>';
  });
})();`;

    return new Response(js, {
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
