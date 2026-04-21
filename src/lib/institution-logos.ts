/**
 * MDRPedia — Institution Logo Utilities
 * Maps hospital/university names to their logo URLs
 */

// Known institutional logos (hardcoded for reliability)
const KNOWN_INSTITUTION_LOGOS: Record<string, string> = {
    // US Major Hospitals & Universities
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

    // UK
    'oxford': 'https://logo.clearbit.com/ox.ac.uk',
    'oxford university': 'https://logo.clearbit.com/ox.ac.uk',
    'cambridge': 'https://logo.clearbit.com/cam.ac.uk',
    'cambridge university': 'https://logo.clearbit.com/cam.ac.uk',
    'imperial college': 'https://logo.clearbit.com/imperial.ac.uk',
    'kings college': 'https://logo.clearbit.com/kcl.ac.uk',
    'ucl': 'https://logo.clearbit.com/ucl.ac.uk',
    'nhs': 'https://logo.clearbit.com/nhs.uk',
    'great ormond street': 'https://logo.clearbit.com/gosh.nhs.uk',

    // Europe
    'karolinska': 'https://logo.clearbit.com/ki.se',
    'karolinska institutet': 'https://logo.clearbit.com/ki.se',
    'charité': 'https://logo.clearbit.com/charite.de',
    'charite': 'https://logo.clearbit.com/charite.de',
    'sorbonne': 'https://logo.clearbit.com/sorbonne-universite.fr',
    'zurich': 'https://logo.clearbit.com/ethz.ch',
    'eth zurich': 'https://logo.clearbit.com/ethz.ch',

    // India
    'aiims': 'https://logo.clearbit.com/aiims.edu',
    'all india institute': 'https://logo.clearbit.com/aiims.edu',
    'apollo': 'https://logo.clearbit.com/apollohospitals.com',
    'apollo hospitals': 'https://logo.clearbit.com/apollohospitals.com',
    'fortis': 'https://logo.clearbit.com/fortishealthcare.com',
    'max healthcare': 'https://logo.clearbit.com/maxhealthcare.in',
    'medanta': 'https://logo.clearbit.com/medanta.org',
    'manipal': 'https://logo.clearbit.com/manipal.edu',
    'tata memorial': 'https://logo.clearbit.com/tmc.gov.in',

    // Asia
    'national university singapore': 'https://logo.clearbit.com/nus.edu.sg',
    'nus': 'https://logo.clearbit.com/nus.edu.sg',
    'tokyo university': 'https://logo.clearbit.com/u-tokyo.ac.jp',
    'seoul national university': 'https://logo.clearbit.com/snu.ac.kr',
    'peking university': 'https://logo.clearbit.com/pku.edu.cn',

    // Australia
    'university of melbourne': 'https://logo.clearbit.com/unimelb.edu.au',
    'university of sydney': 'https://logo.clearbit.com/sydney.edu.au',
    'royal melbourne': 'https://logo.clearbit.com/thermh.org.au',

    // Canada
    'toronto': 'https://logo.clearbit.com/utoronto.ca',
    'university of toronto': 'https://logo.clearbit.com/utoronto.ca',
    'mcgill': 'https://logo.clearbit.com/mcgill.ca',
    'ubc': 'https://logo.clearbit.com/ubc.ca',

    // Other notable
    'who': 'https://logo.clearbit.com/who.int',
    'world health organization': 'https://logo.clearbit.com/who.int',
};

/**
 * Extract domain from a URL string
 */
function extractDomain(url: string): string | null {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

/**
 * Get institution logo URL from name
 * Uses known logos database, website domain, or tries Clearbit as fallback
 */
export function getInstitutionLogo(name: string, website?: string | null): string | null {
    const normalizedName = name.toLowerCase().trim();

    // Check for exact or partial match in known logos
    for (const [key, url] of Object.entries(KNOWN_INSTITUTION_LOGOS)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
            return url;
        }
    }

    // If a website URL is provided, use its domain for Clearbit
    if (website) {
        const domain = extractDomain(website);
        if (domain) {
            return `https://logo.clearbit.com/${domain}`;
        }
    }

    // Try to extract domain from name for Clearbit
    // Common patterns: "Name Hospital", "Name University", "Name Medical Center"
    const words = normalizedName.split(/\s+/);
    if (words.length >= 2) {
        const firstWord = words[0];
        const possibleDomains = [
            `${firstWord}.edu`,
            `${firstWord}.org`,
            `${firstWord}hospital.org`,
            `${firstWord}healthcare.org`,
        ];
        return `https://logo.clearbit.com/${possibleDomains[0]}`;
    }

    return null;
}

/**
 * Generate institution initials for fallback display
 */
export function getInstitutionInitials(name: string): string {
    const words = name.split(/\s+/).filter(w =>
        !['of', 'the', 'and', 'for', 'in', 'at', 'hospital', 'university', 'medical', 'center'].includes(w.toLowerCase())
    );

    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Get institution color based on name (for fallback avatars)
 */
export function getInstitutionColor(name: string): string {
    // Hash the name to get a consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate hue from hash (avoid too dark or too light)
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}
