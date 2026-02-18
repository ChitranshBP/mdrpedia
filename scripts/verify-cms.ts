
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying CMS Database Models...');

    const testSlug = 'test-cms-verify';

    // Clean up previous run
    try {
        // Need to delete revisions first due to foreign key constraint?
        // Revisions have relation to page on onDelete: Cascade usually but let's check schema.
        // Schema doesn't specify onDelete. So likely need to delete revisions manually or use cascade delete if configured.
        // Default prisma relation is restrict.
        await prisma.pageRevision.deleteMany({ where: { page_slug: testSlug } });
        await prisma.contentPage.delete({ where: { slug: testSlug } });
        console.log('Cleaned up previous test data.');
    } catch (e) {
        // Ignore if not found
    }

    // Create Page
    console.log('Creating Test Page...');
    const page = await prisma.contentPage.create({
        data: {
            slug: testSlug,
            title: 'Verification Page',
            content: '## Verified Content\n\nThis page exists.',
            published: true,
            seo_title: 'Verify SEO',
            seo_desc: 'Description'
        }
    });

    console.log('Created Page:', page.slug);

    // Verify Create
    const check = await prisma.contentPage.findUnique({ where: { slug: testSlug } });
    if (!check) throw new Error('Failed to find created page');
    if (check.title !== 'Verification Page') throw new Error('Title mismatch');

    console.log('Page Retrieval verified.');

    // Create Revision
    console.log('Creating Revision...');
    const rev = await prisma.pageRevision.create({
        data: {
            page_slug: page.slug,
            content_snapshot: page.content,
            title_snapshot: page.title,
            changed_by: 'Script',
            change_note: 'Initial script creation'
        }
    });
    console.log('Created Revision:', rev.id);

    // Verify Revision Link
    const revCheck = await prisma.pageRevision.findUnique({ where: { id: rev.id }, include: { page: true } });
    if (!revCheck || revCheck.page.slug !== testSlug) throw new Error('Revision relation broken');

    console.log('CMS Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
