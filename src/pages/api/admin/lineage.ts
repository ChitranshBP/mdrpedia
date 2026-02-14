import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';

export const prerender = false;



export const POST: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) return new Response("Unauthorized", { status: 401 });

    const { mentorSlug, studentSlug, relationship } = await request.json();

    if (!mentorSlug || !studentSlug) {
        return new Response(JSON.stringify({ success: false, message: "Missing mentor or student slug" }), { status: 400 });
    }

    try {
        // Find both profiles IDs
        const mentor = await prisma.profile.findUnique({ where: { slug: mentorSlug }, select: { id: true } });
        const student = await prisma.profile.findUnique({ where: { slug: studentSlug }, select: { id: true } });

        if (!mentor || !student) {
            return new Response(JSON.stringify({ success: false, message: "One or both doctors not found" }), { status: 404 });
        }

        // Create the connection
        // Assuming implicit many-to-many via explicit relation table or implicit
        // Since schema has `mentors` and `students` as Profile[]:

        // Connect Student to Mentor (Student 'mentored_by' Mentor)
        await prisma.profile.update({
            where: { id: student.id },
            data: {
                mentored_by: {
                    connect: { id: mentor.id }
                }
            }
        });

        return new Response(JSON.stringify({
            success: true,
            message: `Linked Mentor (${mentorSlug}) to Student (${studentSlug}) successfully.`
        }));

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ success: false, message: "Database connection failed" }), { status: 500 });
    }
}
