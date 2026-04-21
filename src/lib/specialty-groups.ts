/**
 * MDRPedia — Specialty Groupings
 * Maps granular specialties to broader categories for rankings display
 */

export interface SpecialtyGroup {
    name: string;
    svgPath: string;
    description: string;
    specialties: string[];
}

export const SPECIALTY_GROUPS: SpecialtyGroup[] = [
    {
        name: 'Surgery',
        svgPath: 'M20.38 3.46L16 2 7.56 10.44a2 2 0 0 0 0 2.83l3.17 3.17a2 2 0 0 0 2.83 0L22 8l-1.46-4.38z',
        description: 'All surgical specialties including cardiac, neuro, transplant, and general surgery',
        specialties: [
            'surgery', 'cardiac surgery', 'cardiothoracic surgery', 'neurosurgery',
            'orthopedic surgery', 'transplant surgery', 'vascular surgery',
            'plastic surgery', 'general surgery', 'pediatric surgery',
            'thoracic surgery', 'bariatric surgery', 'oncologic surgery',
            'trauma surgery', 'surgical oncology', 'hepatobiliary surgery',
            'colorectal surgery', 'hand surgery', 'breast surgery',
            'endocrine surgery', 'robotic surgery', 'minimally invasive surgery'
        ]
    },
    {
        name: 'Internal Medicine',
        svgPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
        description: 'Internal medicine and its subspecialties',
        specialties: [
            'internal medicine', 'medicine', 'general medicine',
            'gastroenterology', 'pulmonology', 'nephrology',
            'endocrinology', 'rheumatology', 'hepatology',
            'geriatrics', 'hospitalist', 'critical care medicine',
            'intensive care', 'icu', 'allergy and immunology'
        ]
    },
    {
        name: 'Cardiology',
        svgPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
        description: 'Heart and cardiovascular medicine',
        specialties: [
            'cardiology', 'cardiovascular medicine', 'interventional cardiology',
            'electrophysiology', 'cardiac electrophysiology', 'heart failure',
            'preventive cardiology', 'cardiac imaging', 'echocardiography'
        ]
    },
    {
        name: 'Oncology',
        svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 14c-2.5 0-4.71-1.28-6-3.22.03-2 4-3.08 6-3.08s5.97 1.08 6 3.08A7.96 7.96 0 0 1 12 20z',
        description: 'Cancer treatment and research',
        specialties: [
            'oncology', 'medical oncology', 'radiation oncology',
            'hematology-oncology', 'hematology', 'pediatric oncology',
            'neuro-oncology', 'gynecologic oncology', 'cancer research',
            'immunotherapy', 'cancer biology'
        ]
    },
    {
        name: 'Neuroscience',
        svgPath: 'M12 2C6.48 2 2 6.48 2 12c0 3.73 2.04 6.98 5.07 8.69L12 22l4.93-1.31C19.96 18.98 22 15.73 22 12c0-5.52-4.48-10-10-10z',
        description: 'Brain, spine, and nervous system specialists',
        specialties: [
            'neurology', 'neuroscience', 'neurosurgery', 'neuroradiology',
            'neuropsychiatry', 'movement disorders', 'epilepsy',
            'stroke', 'neuroimmunology', 'behavioral neurology',
            'pediatric neurology', 'sleep medicine', 'headache medicine'
        ]
    },
    {
        name: 'Pediatrics',
        svgPath: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
        description: 'Child and adolescent medicine',
        specialties: [
            'pediatrics', 'pediatric surgery', 'pediatric cardiology',
            'pediatric oncology', 'pediatric neurology', 'neonatology',
            'pediatric intensive care', 'adolescent medicine',
            'pediatric gastroenterology', 'pediatric pulmonology'
        ]
    },
    {
        name: 'Women\'s Health',
        svgPath: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z',
        description: 'Obstetrics, gynecology, and reproductive medicine',
        specialties: [
            'obstetrics', 'gynecology', 'obstetrics and gynecology', 'ob-gyn',
            'maternal-fetal medicine', 'reproductive endocrinology',
            'fertility', 'urogynecology', 'gynecologic oncology'
        ]
    },
    {
        name: 'Orthopedics & Sports',
        svgPath: 'M8 21l4-9 4 9M12 3v9M3 7l4 2M21 7l-4 2',
        description: 'Musculoskeletal and sports medicine',
        specialties: [
            'orthopedics', 'orthopedic surgery', 'sports medicine',
            'spine surgery', 'joint replacement', 'trauma orthopedics',
            'pediatric orthopedics', 'hand surgery', 'foot and ankle',
            'shoulder surgery', 'physical medicine', 'rehabilitation'
        ]
    },
    {
        name: 'Psychiatry & Mental Health',
        svgPath: 'M12 2C6.48 2 2 6.48 2 12c0 3.73 2.04 6.98 5.07 8.69L12 22l4.93-1.31C19.96 18.98 22 15.73 22 12c0-5.52-4.48-10-10-10z',
        description: 'Mental health and behavioral medicine',
        specialties: [
            'psychiatry', 'psychology', 'child psychiatry', 'addiction psychiatry',
            'forensic psychiatry', 'geriatric psychiatry', 'neuropsychiatry',
            'consultation-liaison psychiatry', 'psychosomatic medicine'
        ]
    },
    {
        name: 'Radiology & Imaging',
        svgPath: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
        description: 'Medical imaging and interventional radiology',
        specialties: [
            'radiology', 'interventional radiology', 'neuroradiology',
            'nuclear medicine', 'diagnostic radiology', 'pediatric radiology',
            'breast imaging', 'musculoskeletal radiology'
        ]
    },
    {
        name: 'Emergency & Critical Care',
        svgPath: 'M3 15h2v2H3v-2zm16 0h2v2h-2v-2zM4 11V8h3l2-3h6l2 3h3v3H4zm1-5h14M7 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
        description: 'Emergency medicine and intensive care',
        specialties: [
            'emergency medicine', 'critical care', 'intensive care',
            'trauma', 'disaster medicine', 'toxicology',
            'pediatric emergency medicine'
        ]
    },
    {
        name: 'Infectious Disease & Public Health',
        svgPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        description: 'Infectious diseases and global health',
        specialties: [
            'infectious disease', 'infectious diseases', 'epidemiology',
            'public health', 'global health', 'tropical medicine',
            'hiv medicine', 'virology', 'microbiology', 'immunology'
        ]
    },
    {
        name: 'Ophthalmology & Vision',
        svgPath: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
        description: 'Eye care and vision science',
        specialties: [
            'ophthalmology', 'retina', 'glaucoma', 'cornea',
            'oculoplastics', 'neuro-ophthalmology', 'pediatric ophthalmology',
            'refractive surgery', 'cataract surgery'
        ]
    },
    {
        name: 'ENT & Head/Neck',
        svgPath: 'M6 8.5a6.5 6.5 0 0 1 13 0c0 6-6 6.5-6 14M8 22h.01',
        description: 'Ear, nose, throat and head/neck surgery',
        specialties: [
            'otolaryngology', 'ent', 'ear nose throat', 'head and neck surgery',
            'otology', 'rhinology', 'laryngology', 'facial plastic surgery'
        ]
    },
    {
        name: 'Dermatology',
        svgPath: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9',
        description: 'Skin, hair, and nail disorders',
        specialties: [
            'dermatology', 'dermatologic surgery', 'mohs surgery',
            'cosmetic dermatology', 'pediatric dermatology'
        ]
    },
    {
        name: 'Urology',
        svgPath: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3',
        description: 'Urinary tract and male reproductive health',
        specialties: [
            'urology', 'urologic oncology', 'pediatric urology',
            'female urology', 'andrology', 'kidney transplant'
        ]
    },
    {
        name: 'Pathology & Laboratory',
        svgPath: 'M6 18h8M3 22h18M14 22v-4M14 2v6l3 6h-6l3-6V2zM8 14h8',
        description: 'Diagnostic pathology and laboratory medicine',
        specialties: [
            'pathology', 'anatomic pathology', 'clinical pathology',
            'surgical pathology', 'neuropathology', 'dermatopathology',
            'cytopathology', 'molecular pathology', 'hematopathology'
        ]
    },
    {
        name: 'Anesthesiology & Pain',
        svgPath: 'M18 2l4 4M7.5 8.5l8 8M4.93 4.93l4.24 4.24m.7.7l4.24 4.24m.7.7l4.24 4.24M2 22l4-4',
        description: 'Anesthesia and pain management',
        specialties: [
            'anesthesiology', 'pain medicine', 'pain management',
            'cardiac anesthesia', 'pediatric anesthesia', 'regional anesthesia'
        ]
    }
];

/**
 * Find the specialty group for a given specialty name
 */
export function getSpecialtyGroup(specialty: string): SpecialtyGroup | null {
    const normalizedSpecialty = specialty.toLowerCase().trim();

    for (const group of SPECIALTY_GROUPS) {
        if (group.specialties.some(s =>
            normalizedSpecialty.includes(s) || s.includes(normalizedSpecialty)
        )) {
            return group;
        }
    }

    return null;
}

/**
 * Get group name for a specialty, with fallback
 */
export function getGroupName(specialty: string): string {
    const group = getSpecialtyGroup(specialty);
    return group?.name || 'Other Specialties';
}

/**
 * Group doctors by specialty group
 */
export function groupBySpecialtyGroup<T extends { specialty: string }>(
    doctors: T[]
): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};

    for (const doctor of doctors) {
        const groupName = getGroupName(doctor.specialty);
        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }
        grouped[groupName].push(doctor);
    }

    return grouped;
}
