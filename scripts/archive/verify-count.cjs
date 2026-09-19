
const { createPrismaClient } = require('../lib/prisma.cjs');
const prisma = createPrismaClient();

async function main() {
    const count = await prisma.profile.count();
    console.log(`Total Profiles: ${count}`);

    // Check specific new doctor
    const doc = await prisma.profile.findFirst({
        where: { full_name: "Gagandeep Kang" }
    });
    if (doc) {
        console.log(`✅ Found Gagandeep Kang: ${doc.slug}`);
    } else {
        console.log(`❌ Gagandeep Kang not found.`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
