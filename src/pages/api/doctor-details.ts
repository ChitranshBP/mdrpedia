import { getCollection } from "astro:content";

export const prerender = false;

export async function GET({ request }) {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
        return new Response(JSON.stringify({ error: "Missing slug parameter" }), { status: 400 });
    }

    try {
        const doctors = await getCollection("doctors");
        const doc = doctors.find(d => d.id === slug);

        if (!doc) {
            return new Response(JSON.stringify({ error: "Doctor not found" }), { status: 404 });
        }

        const details = {
            slug: doc.id,
            fullName: doc.data.fullName,
            specialty: doc.data.specialty,
            tier: doc.data.tier,
            portraitUrl: doc.data.portraitUrl,
            hIndex: doc.data.hIndex,
            verifiedSurgeries: doc.data.verifiedSurgeries,
            yearsActive: doc.data.yearsActive,
            livesSaved: doc.data.livesSaved,
            location: `${doc.data.geography.city || ''}, ${doc.data.geography.country}`,
            mentors: doc.data.mentors?.map(m => m.name) || [],
            students: doc.data.students?.map(s => s.name) || []
        };

        return new Response(JSON.stringify(details));
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Server Error" }), { status: 500 });
    }
}
