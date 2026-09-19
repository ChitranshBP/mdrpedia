const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Purge...');

    // 1. Delete profiles with suspiciously long names (> 60 chars)
    // Most real names are < 40 chars. 60 is a safe threshold for the concatenated garbage.
    const longNames = await prisma.profile.findMany({
        where: {
            full_name: {
                gt: '                                                            ' // Hacky length check via padding? ensure valid prisma filter.
                // Actually Prisma doesn't support length filtering directly in where easily for all DBs.
                // Better to fetch and filter in memory if not too large, or use raw query.
            }
        }
    });

    // Alternatively, just fetch all and filter JS side since we have ~600 profiles.
    const allProfiles = await prisma.profile.findMany();
    const badProfiles = allProfiles.filter(p => p.full_name.length > 50 || p.slug.length > 50);

    console.log(`Found ${badProfiles.length} bad profiles (Name > 50 chars). Deleting...`);

    for (const p of badProfiles) {
        console.log(`Deleting: ${p.full_name.substring(0, 30)}...`);
        await prisma.profile.delete({ where: { id: p.id } });
    }

    console.log('Purge Complete.');
}

main()
    .finally(() => prisma.$disconnect());
