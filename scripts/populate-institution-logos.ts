/**
 * Populate institution logo_url in the database
 *
 * For each hospital where logo_url IS NULL:
 *   1. Try getInstitutionLogo(name) from institution-logos.ts
 *   2. If the hospital has a website field, try https://logo.clearbit.com/{domain}
 *   3. Update the logo_url field in the database
 *
 * Usage: npx tsx scripts/populate-institution-logos.ts
 */

import { PrismaClient } from '@prisma/client';

// Inline the logo lookup to avoid import issues with path aliases
const KNOWN_INSTITUTION_LOGOS: Record<string, string> = {
    'johns hopkins': 'https://logo.clearbit.com/jhu.edu',
    'johns hopkins university': 'https://logo.clearbit.com/jhu.edu',
    'johns hopkins hospital': 'https://logo.clearbit.com/hopkinsmedicine.org',
    'harvard': 'https://logo.clearbit.com/harvard.edu',
    'harvard medical school': 'https://logo.clearbit.com/hms.harvard.edu',
    'massachusetts general hospital': 'https://logo.clearbit.com/massgeneral.org',
    'stanford': 'https://logo.clearbit.com/stanford.edu',
    'stanford medical center': 'https://logo.clearbit.com/stanfordhealthcare.org',
    'mayo clinic': 'https://logo.clearbit.com/mayoclinic.org',
    'cleveland clinic': 'https://logo.clearbit.com/clevelandclinic.org',
    'ucla': 'https://logo.clearbit.com/ucla.edu',
    'ucla health': 'https://logo.clearbit.com/uclahealth.org',
    'mount sinai': 'https://logo.clearbit.com/mountsinai.org',
    'ucsf': 'https://logo.clearbit.com/ucsf.edu',
    'yale': 'https://logo.clearbit.com/yale.edu',
    'yale new haven hospital': 'https://logo.clearbit.com/ynhh.org',
    'nyu langone': 'https://logo.clearbit.com/nyulangone.org',
    'columbia': 'https://logo.clearbit.com/columbia.edu',
    'columbia university': 'https://logo.clearbit.com/columbia.edu',
    'memorial sloan kettering': 'https://logo.clearbit.com/mskcc.org',
    'msk': 'https://logo.clearbit.com/mskcc.org',
    'md anderson': 'https://logo.clearbit.com/mdanderson.org',
    'cedars-sinai': 'https://logo.clearbit.com/cedars-sinai.org',
    'northwestern': 'https://logo.clearbit.com/northwestern.edu',
    'duke': 'https://logo.clearbit.com/duke.edu',
    'duke university': 'https://logo.clearbit.com/duke.edu',
    'penn medicine': 'https://logo.clearbit.com/pennmedicine.org',
    'upenn': 'https://logo.clearbit.com/upenn.edu',
    'university of pennsylvania': 'https://logo.clearbit.com/upenn.edu',
    'michigan medicine': 'https://logo.clearbit.com/michiganmedicine.org',
    'university of michigan': 'https://logo.clearbit.com/umich.edu',
    'university of chicago': 'https://logo.clearbit.com/uchicago.edu',
    'uchicago medicine': 'https://logo.clearbit.com/uchicagomedicine.org',
    'emory': 'https://logo.clearbit.com/emory.edu',
    'vanderbilt': 'https://logo.clearbit.com/vanderbilt.edu',
    'washington university': 'https://logo.clearbit.com/wustl.edu',
    'barnes-jewish': 'https://logo.clearbit.com/barnesjewish.org',
    'brigham and women': 'https://logo.clearbit.com/brighamandwomens.org',
    'nih': 'https://logo.clearbit.com/nih.gov',
    'national institutes of health': 'https://logo.clearbit.com/nih.gov',
    'cdc': 'https://logo.clearbit.com/cdc.gov',
    'kaiser permanente': 'https://logo.clearbit.com/kaiserpermanente.org',
    'oxford': 'https://logo.clearbit.com/ox.ac.uk',
    'oxford university': 'https://logo.clearbit.com/ox.ac.uk',
    'cambridge': 'https://logo.clearbit.com/cam.ac.uk',
    'cambridge university': 'https://logo.clearbit.com/cam.ac.uk',
    'imperial college': 'https://logo.clearbit.com/imperial.ac.uk',
    'kings college': 'https://logo.clearbit.com/kcl.ac.uk',
    'ucl': 'https://logo.clearbit.com/ucl.ac.uk',
    'nhs': 'https://logo.clearbit.com/nhs.uk',
    'great ormond street': 'https://logo.clearbit.com/gosh.nhs.uk',
    'karolinska': 'https://logo.clearbit.com/ki.se',
    'karolinska institutet': 'https://logo.clearbit.com/ki.se',
    'charité': 'https://logo.clearbit.com/charite.de',
    'charite': 'https://logo.clearbit.com/charite.de',
    'sorbonne': 'https://logo.clearbit.com/sorbonne-universite.fr',
    'zurich': 'https://logo.clearbit.com/ethz.ch',
    'eth zurich': 'https://logo.clearbit.com/ethz.ch',
    'aiims': 'https://logo.clearbit.com/aiims.edu',
    'all india institute': 'https://logo.clearbit.com/aiims.edu',
    'apollo': 'https://logo.clearbit.com/apollohospitals.com',
    'apollo hospitals': 'https://logo.clearbit.com/apollohospitals.com',
    'fortis': 'https://logo.clearbit.com/fortishealthcare.com',
    'max healthcare': 'https://logo.clearbit.com/maxhealthcare.in',
    'medanta': 'https://logo.clearbit.com/medanta.org',
    'manipal': 'https://logo.clearbit.com/manipal.edu',
    'tata memorial': 'https://logo.clearbit.com/tmc.gov.in',
    'national university singapore': 'https://logo.clearbit.com/nus.edu.sg',
    'nus': 'https://logo.clearbit.com/nus.edu.sg',
    'tokyo university': 'https://logo.clearbit.com/u-tokyo.ac.jp',
    'seoul national university': 'https://logo.clearbit.com/snu.ac.kr',
    'peking university': 'https://logo.clearbit.com/pku.edu.cn',
    'university of melbourne': 'https://logo.clearbit.com/unimelb.edu.au',
    'university of sydney': 'https://logo.clearbit.com/sydney.edu.au',
    'royal melbourne': 'https://logo.clearbit.com/thermh.org.au',
    'toronto': 'https://logo.clearbit.com/utoronto.ca',
    'university of toronto': 'https://logo.clearbit.com/utoronto.ca',
    'mcgill': 'https://logo.clearbit.com/mcgill.ca',
    'ubc': 'https://logo.clearbit.com/ubc.ca',
    'who': 'https://logo.clearbit.com/who.int',
    'world health organization': 'https://logo.clearbit.com/who.int',
};

function extractDomain(url: string): string | null {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function resolveLogoUrl(name: string, website: string | null): string | null {
    const normalized = name.toLowerCase().trim();

    // 1. Check known logos
    for (const [key, url] of Object.entries(KNOWN_INSTITUTION_LOGOS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return url;
        }
    }

    // 2. Try website domain
    if (website) {
        const domain = extractDomain(website);
        if (domain) {
            return `https://logo.clearbit.com/${domain}`;
        }
    }

    // 3. Best-guess from name
    const words = normalized.split(/\s+/);
    if (words.length >= 2) {
        return `https://logo.clearbit.com/${words[0]}.edu`;
    }

    return null;
}

async function main() {
    const prisma = new PrismaClient();

    try {
        const hospitals = await prisma.hospital.findMany({
            where: { logo_url: null },
            select: { id: true, name: true, website: true },
        });

        console.log(`Found ${hospitals.length} hospitals without logos`);

        let updated = 0;
        let skipped = 0;

        for (const h of hospitals) {
            const logoUrl = resolveLogoUrl(h.name, h.website);
            if (logoUrl) {
                await prisma.hospital.update({
                    where: { id: h.id },
                    data: { logo_url: logoUrl },
                });
                updated++;
                console.log(`  Updated: ${h.name} -> ${logoUrl}`);
            } else {
                skipped++;
                console.log(`  Skipped: ${h.name} (no logo resolved)`);
            }
        }

        console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
