
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Hybrid Profile CMS...');

    const slug = 'anthony-fauci-test';

    // 1. Clean up
    try {
        await prisma.profile.delete({ where: { slug } });
        console.log('Cleaned up previous profile.');
    } catch (e) { }

    // 2. Simulate "Import" (Create DB record)
    console.log(`Importing ${slug}...`);

    const mockImport = {
        slug,
        full_name: 'Anthony Fauci (DB Test)',
        title: 'MD',
        specialty: 'Immunology',
        status: 'LIVING',
        tier: 'TITAN',
        biography: 'Original static bio...',
        // Geo
        geography: {
            create: { country: 'USA', city: 'Washington' }
        }
    };

    const p = await prisma.profile.create({
        data: {
            slug: mockImport.slug,
            full_name: mockImport.full_name,
            title: mockImport.title,
            specialty: mockImport.specialty,
            status: mockImport.status as any,
            tier: mockImport.tier as any,
            biography: mockImport.biography,
            geography: mockImport.geography
        }
    });
    console.log('Imported Profile:', p.slug);

    // 3. Verify DB creation
    const check1 = await prisma.profile.findUnique({ where: { slug } });
    if (!check1) throw new Error('Profile not found in DB');
    if (check1.full_name !== 'Anthony Fauci (DB Test)') throw new Error('Name mismatch');

    // 4. Simulate "Edit"
    console.log('Updating Bio...');
    const newBio = 'Updated Content from CMS Verification Script.';
    await prisma.profile.update({
        where: { slug },
        data: { biography: newBio }
    });

    // 5. Verify Update
    const check2 = await prisma.profile.findUnique({ where: { slug } });
    if (check2?.biography !== newBio) throw new Error('Bio update failed');

    console.log('Profile CMS Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
