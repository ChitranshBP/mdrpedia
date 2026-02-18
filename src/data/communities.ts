
export interface Community {
    name: string;
    abbr: string;
    icon: string;
    desc: string;
    url: string;
    region: 'Global' | 'North America' | 'Europe' | 'Asia' | 'UK' | 'Oceania' | 'Latin America';
    country?: string;
    relatedSpecialties: string[];
}

export const communities: Community[] = [
    // Global / International
    {
        name: "World Health Organization",
        abbr: "WHO",
        icon: "WHO",
        desc: "The United Nations agency directing and coordinating international health policy, disease response, and global public health standards.",
        url: "https://www.who.int",
        region: "Global",
        relatedSpecialties: ["Public Health", "Epidemiology", "Infectious Disease", "Global Health"]
    },
    {
        name: "Médecins Sans Frontières",
        abbr: "MSF",
        icon: "MSF",
        desc: "Nobel Prize-winning international humanitarian medical organization providing aid in armed conflicts, epidemics, and natural disasters.",
        url: "https://www.msf.org",
        region: "Global",
        relatedSpecialties: ["Emergency Medicine", "Infectious Disease", "Trauma Surgery", "Humanitarian Medicine"]
    },
    {
        name: "World Medical Association",
        abbr: "WMA",
        icon: "WMA",
        desc: "International confederation of free professional medical associations, representing physicians worldwide.",
        url: "https://www.wma.net",
        region: "Global",
        relatedSpecialties: ["Medical Ethics", "General Practice", "Public Health"]
    },

    // North America (USA/Canada)
    {
        name: "American Heart Association",
        abbr: "AHA",
        icon: "AHA",
        desc: "Leading nonprofit funding cardiovascular and cerebrovascular disease research. Publisher of Circulation and the ACLS/BLS guidelines.",
        url: "https://www.heart.org",
        region: "North America",
        country: "USA",
        relatedSpecialties: ["Cardiology", "Cardiovascular Surgery", "Vascular Medicine"]
    },
    {
        name: "American Medical Association",
        abbr: "AMA",
        icon: "AMA",
        desc: "The largest association of physicians and medical students in the United States, advocating for the medical profession.",
        url: "https://www.ama-assn.org",
        region: "North America",
        country: "USA",
        relatedSpecialties: ["Internal Medicine", "Family Medicine", "General Practice"]
    },
    {
        name: "American College of Surgeons",
        abbr: "ACS",
        icon: "ACS",
        desc: "Scientific and educational organization of surgeons dedicated to improving surgical care through standards and education.",
        url: "https://www.facs.org",
        region: "North America",
        country: "USA",
        relatedSpecialties: ["Surgery", "Neurosurgery", "Transplant Surgery", "Cardiac Surgery"]
    },
    {
        name: "Royal College of Physicians and Surgeons of Canada",
        abbr: "RCPSC",
        icon: "RCPSC",
        desc: "The national professional association that oversees the medical education of specialists in Canada.",
        url: "https://www.royalcollege.ca",
        region: "North America",
        country: "Canada",
        relatedSpecialties: ["Internal Medicine", "Surgery", "Pediatrics"]
    },

    // UK
    {
        name: "Royal College of Physicians",
        abbr: "RCP",
        icon: "RCP",
        desc: "The oldest medical college in England, setting standards in clinical practice, education, and quality improvement since 1518.",
        url: "https://www.rcplondon.ac.uk",
        region: "UK",
        country: "UK",
        relatedSpecialties: ["Internal Medicine", "Geriatrics", "Respiratory Medicine"]
    },
    {
        name: "Royal College of Surgeons of England",
        abbr: "RCS",
        icon: "RCS",
        desc: "Professional body committed to enabling surgeons to achieve and maintain the highest standards of surgical practice and patient care.",
        url: "https://www.rcseng.ac.uk",
        region: "UK",
        country: "UK",
        relatedSpecialties: ["Surgery", "Dental Surgery", "Trauma Surgery"]
    },
    {
        name: "British Medical Association",
        abbr: "BMA",
        icon: "BMA",
        desc: "The trade union and professional body for doctors and medical students in the United Kingdom.",
        url: "https://www.bma.org.uk",
        region: "UK",
        country: "UK",
        relatedSpecialties: ["General Practice", "Public Health", "Occupational Medicine"]
    },

    // Europe
    {
        name: "European Society of Cardiology",
        abbr: "ESC",
        icon: "ESC",
        desc: "A non-profit medical society led by volunteers providing the latest scientific information and guidelines on cardiovascular disease.",
        url: "https://www.escardio.org",
        region: "Europe",
        relatedSpecialties: ["Cardiology", "Cardiovascular Surgery", "Electrophysiology"]
    },
    {
        name: "European Association of Neurosurgical Societies",
        abbr: "EANS",
        icon: "EANS",
        desc: "Professional association of neurosurgeons from the European region and beyond.",
        url: "https://www.eans.org",
        region: "Europe",
        relatedSpecialties: ["Neurosurgery", "Neurology", "Spine Surgery"]
    },
    {
        name: "Karolinska Institute",
        abbr: "KI",
        icon: "KI",
        desc: "Sweden's single largest centre of medical academic research and offers the country's widest range of medical courses and programmes.",
        url: "https://ki.se",
        region: "Europe",
        country: "Sweden",
        relatedSpecialties: ["Medical Research", "Public Health", "Physiology"]
    },

    // Asia
    {
        name: "Association of Southeast Asian Nations (ASEAN) Medical Association",
        abbr: "MASEAN",
        icon: "MASEAN",
        desc: "Promotes closer ties among the national medical associations in Southeast Asia.",
        url: "#",
        region: "Asia",
        relatedSpecialties: ["Public Health", "General Practice", "Tropical Medicine"]
    },
    {
        name: "Indian Medical Association",
        abbr: "IMA",
        icon: "IMA",
        desc: "The largest representative voluntary organization of Doctors of Modern Scientific System of Medicine in India.",
        url: "https://www.ima-india.org",
        region: "Asia",
        country: "India",
        relatedSpecialties: ["Internal Medicine", "Surgery", "Pediatrics"]
    },
    {
        name: "Japan Medical Association",
        abbr: "JMA",
        icon: "JMA",
        desc: "The professional association for medical doctors in Japan.",
        url: "https://www.med.or.jp",
        region: "Asia",
        country: "Japan",
        relatedSpecialties: ["General Practice", "Internal Medicine"]
    },

    // Oceania
    {
        name: "Royal Australasian College of Surgeons",
        abbr: "RACS",
        icon: "RACS",
        desc: "The leading advocate for surgical standards, professionalism and surgical education in Australia and New Zealand.",
        url: "https://www.surgeons.org",
        region: "Oceania",
        relatedSpecialties: ["Surgery", "Trauma Surgery", "Plastic Surgery"]
    },

    // Latin America
    {
        name: "Pan American Health Organization",
        abbr: "PAHO",
        icon: "PAHO",
        desc: "The specialized international health agency for the Americas and Regional Office for the Americas of the World Health Organization.",
        url: "https://www.paho.org",
        region: "Latin America",
        relatedSpecialties: ["Public Health", "Epidemiology", "Family Medicine"]
    }
];
