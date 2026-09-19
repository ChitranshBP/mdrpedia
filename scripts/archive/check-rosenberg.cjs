const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const doctor = await prisma.profile.findUnique({
        where: { slug: 'steven-a-rosenberg' }
    });
    console.log('Found:', doctor);

    const allRosenbergs = await prisma.profile.findMany({
        where: {
            full_name: { contains: 'Rosenberg' } // schema says full_name
        }
    });
    console.log('All Rosenbergs:', allRosenbergs.map(d => ({ slug: d.slug, name: d.full_name })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
