const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.profile.findUnique({
        where: { slug: 'aaron-ciechanover' }
    });
    console.log(p ? 'FOUND: aaron-ciechanover' : 'NOT FOUND');
}

main()
    .finally(() => prisma.$disconnect());
