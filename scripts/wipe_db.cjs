const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('⚠️ DELETING ALL PROFILES...');
    // Delete in correct order to avoid foreign key constraints if cascading isn't set
    // But usually deleteMany on Profile works if relations are set to Cascade.
    // Let's try deleting dependent tables first just in case.

    // await prisma.googleScholarStats.deleteMany({}); // Not in schema
    // await prisma.scopusStats.deleteMany({}); // Not in schema

    // Delete dependents first
    // Delete dependents first
    // Check schema again.
    // Schema models:
    // Citation, ImpactMetric, Award, Technique, BoardCertification, 
    // HistoricalArtifact, LegacyTimeline, TierVerification, DoctorHospitalAffiliation, DoctorPortal

    console.log('Deleting dependents...');
    await prisma.citation.deleteMany({});
    await prisma.award.deleteMany({});
    await prisma.legacyTimeline.deleteMany({});
    await prisma.impactMetric.deleteMany({});
    await prisma.doctorHospitalAffiliation.deleteMany({});
    await prisma.technique.deleteMany({});
    await prisma.boardCertification.deleteMany({});
    await prisma.historicalArtifact.deleteMany({});
    await prisma.tierVerification.deleteMany({});
    await prisma.doctorPortal.deleteMany({});

    const { count } = await prisma.profile.deleteMany({});
    console.log(`Deleted ${count} profiles.`);
}

main()
    .finally(() => prisma.$disconnect());
