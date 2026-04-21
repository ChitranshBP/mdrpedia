/**
 * MDRPedia — Bulk Import CSV Template Download
 * Returns a CSV template file for bulk importing doctor profiles
 */

export const prerender = false;

import { requireSuperAdmin } from '../../../lib/rbac';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    // CSV template with headers and example rows
    const csvContent = `fullName,specialty,subSpecialty,tier,status,hIndex,yearsActive,rankingScore,title,biography,country,region,city,npiNumber,orcidId,portraitUrl,medicalSpecialty,knowsAbout
"John Smith","Cardiology","Interventional Cardiology","ELITE","LIVING","45","25","85.5","MD, PhD, FACC","Dr. John Smith is a leading interventional cardiologist...","United States","California","Los Angeles","1234567890","0000-0002-1234-5678","https://example.com/portrait.jpg","Cardiology,Internal Medicine","Heart failure,Cardiac catheterization,Stent placement"
"Jane Doe","Neurology","Pediatric Neurology","MASTER","LIVING","32","15","72.3","MD, FAAN","Dr. Jane Doe specializes in pediatric neurological disorders...","United States","New York","New York City","0987654321","0000-0003-9876-5432","","Neurology,Pediatrics","Epilepsy,Developmental disorders,Neurogenetics"
"Historical Figure","Surgery","General Surgery","TITAN","HISTORICAL","0","50","95.0","MD","A pioneering surgeon who revolutionized...","United Kingdom","","London","","","","Surgery","Antiseptic surgery,Surgical techniques"
`;

    return new Response(csvContent, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="mdrpedia-bulk-import-template.csv"'
        }
    });
}
