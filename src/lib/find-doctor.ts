/**
 * Patient-facing doctor finder: register countries, plain-language specialty
 * labels and "describe the problem" matching for /search and /doctors.
 */
import { normalizeSpecialty } from './specialty-groups';

export interface RegisterCountry {
    slug: string;
    name: string;
    regulator: string;
    verifyLabel: string;
    verifyUrl: string;
    emergency: string;
    /** NMC 2026 advertising guidelines: no rankings, tiers or "best" claims. */
    nmc: boolean;
}

export const REGISTER_COUNTRIES: RegisterCountry[] = [
    {
        slug: 'india',
        name: 'India',
        regulator: 'NMC · NMR',
        verifyLabel: 'Check registration on the Indian Medical Register',
        verifyUrl: 'https://www.nmc.org.in/information-desk/indian-medical-register/',
        emergency: '112',
        nmc: true,
    },
    {
        slug: 'united-states',
        name: 'United States',
        regulator: 'State boards · NPI',
        verifyLabel: 'Check the licence on DocInfo (state boards)',
        verifyUrl: 'https://www.docinfo.org/',
        emergency: '911',
        nmc: false,
    },
    {
        slug: 'united-kingdom',
        name: 'United Kingdom',
        regulator: 'GMC',
        verifyLabel: 'Check registration on the GMC medical register',
        verifyUrl: 'https://www.gmc-uk.org/registration-and-licensing/the-medical-register',
        emergency: '999',
        nmc: false,
    },
];

export const ALL_COUNTRIES = 'all';

/** Resolve a `country` query value or `mdr-country` cookie (slug or display name). */
export function resolveCountry(value: string | null | undefined): RegisterCountry | null {
    if (!value) return null;
    const v = decodeURIComponent(value).trim().toLowerCase();
    return REGISTER_COUNTRIES.find((c) => c.slug === v || c.name.toLowerCase() === v) ?? null;
}

export interface Condition {
    key: string;
    label: string;
    /** Everyday words a patient might type. */
    words: string[];
    /** Matched against specialty, sub-specialty and conditions treated. */
    pattern: RegExp;
}

export const CONDITIONS: Condition[] = [
    { key: 'heart', label: 'Heart & chest pain', words: ['heart', 'chest', 'pain', 'blood pressure', 'bp', 'angina', 'cardiac', 'bypass', 'valve', 'palpitations', 'cholesterol', 'cardiology', 'cardiologist'], pattern: /cardi|heart|atheroscl|hypertension|electrophysiol|bypass|angioplast/ },
    { key: 'diabetes', label: 'Diabetes & thyroid', words: ['diabetes', 'diabetic', 'sugar', 'thyroid', 'hormone', 'obesity', 'weight', 'endocrinology', 'endocrinologist', 'diabetology'], pattern: /diabet|endocrin|thyroid|metabolic|insulin|glp-1|obesity/ },
    { key: 'lungs', label: 'Breathing & lungs', words: ['breathing', 'breath', 'asthma', 'lung', 'lungs', 'cough', 'tb', 'tuberculosis', 'copd', 'pulmonology', 'pulmonologist'], pattern: /pulmon|lung|respirat|copd|asthma|tuberc|\btb\b/ },
    { key: 'joints', label: 'Joints & back', words: ['knee', 'hip', 'joint', 'joints', 'back', 'bone', 'bones', 'fracture', 'spine', 'arthritis', 'orthopedics', 'orthopaedics', 'orthopedic', 'rheumatology'], pattern: /ortho|joint|bone|spine|musculoskeletal|osteopor|rheumat|back pain|foot/ },
    { key: 'child', label: 'Child health', words: ['child', 'children', 'baby', 'kid', 'kids', 'fever', 'vaccination', 'infant', 'newborn', 'pediatrics', 'paediatrics', 'pediatrician'], pattern: /pediat|paediat|neonat|child/ },
    { key: 'pregnancy', label: 'Pregnancy', words: ['pregnancy', 'pregnant', 'women', 'period', 'periods', 'fertility', 'ivf', 'obstetrics', 'gynecology', 'gynaecology', 'gynaecologist'], pattern: /obstet|gyn|women|maternal|fertility/ },
    { key: 'cancer', label: 'Cancer', words: ['cancer', 'tumour', 'tumor', 'chemotherapy', 'chemo', 'lump', 'leukemia', 'lymphoma', 'oncology', 'oncologist'], pattern: /oncolog|cancer|tumou?r|leuk|lymphoma|myeloma|chemo|radiotherap|brca/ },
    { key: 'stomach', label: 'Stomach & liver', words: ['stomach', 'liver', 'acidity', 'digestion', 'gut', 'jaundice', 'hepatitis', 'gastroenterology', 'hepatology'], pattern: /gastro|hepat|liver|bowel|digest|colorectal/ },
    { key: 'kidney', label: 'Kidneys', words: ['kidney', 'kidneys', 'dialysis', 'urine', 'stone', 'stones', 'nephrology', 'urology'], pattern: /nephro|kidney|dialysis|ckd|urolog/ },
    { key: 'brain', label: 'Headache & stroke', words: ['headache', 'migraine', 'stroke', 'seizure', 'seizures', 'epilepsy', 'brain', 'nerve', 'nerves', 'memory', 'neurology', 'neurologist'], pattern: /neuro|stroke|epilep|alzheimer|movement disorder|dementia|parkinson|migraine|cranial/ },
    { key: 'skin', label: 'Skin', words: ['skin', 'acne', 'eczema', 'rash', 'hair', 'dermatology', 'dermatologist'], pattern: /dermat|skin/ },
];

const RESEARCH = /epidemiol|biostat|genomic|biology|biochem|molecular|\bphysiolog|neuroscience|metrics|crispr|mrna|alphafold|structural|engineering|methodology|modeling|signaling|sensing|pathway|policy|administration|leadership|education|bioethics|program|mission|advocacy|innovation|systems|science|research|trials|markers|discovery|drug development|pharma|statistic/;

const PLAIN: [RegExp, string][] = [
    [/cardiac surg|cardiothoracic|cardiovascular surg|heart transplant|bypass/, 'Heart surgeon'],
    [/neurosurg|cranial|brain surg|spine surg/, 'Brain & spine surgeon'],
    [/oncolog|cancer|tumou?r|leuk|lymphoma|myeloma|chemo|radiotherap/, 'Cancer specialist'],
    [/cardi|heart|atheroscl|hypertension|electrophysiol/, 'Heart specialist'],
    [/neuro|stroke|epilep|alzheimer|movement|dementia|parkinson/, 'Brain & nerve specialist'],
    [/pulmon|lung|respirat|copd|asthma|tuberc|\btb\b/, 'Lung & breathing specialist'],
    [/diabet|endocrin|thyroid|metabolic|obesity|insulin/, 'Diabetes & hormone specialist'],
    [/nephro|kidney|dialysis|ckd/, 'Kidney specialist'],
    [/urolog|prostat/, 'Urinary tract specialist'],
    [/gastro|hepat|liver|bowel|digest|colorectal/, 'Stomach & liver specialist'],
    [/neonat/, 'Newborn specialist'],
    [/pediat|paediat|child/, "Children's doctor"],
    [/obstet|gyn|women|maternal|fertility/, "Pregnancy & women's health"],
    [/ortho|joint|bone|spine|musculoskeletal|osteopor|back pain|foot/, 'Bone & joint specialist'],
    [/rheumat|autoimmune/, 'Joint & immune specialist'],
    [/dermat|skin/, 'Skin specialist'],
    [/ophthal|retina|cornea|eye/, 'Eye specialist'],
    [/otolaryng|\bent\b|head & neck/, 'Ear, nose & throat specialist'],
    [/psychiat|mental|depress|addiction|autism/, 'Mental health specialist'],
    [/infect|virolog|hiv|vaccin|tropical|hepatitis|immuniz|leprosy|parasit/, 'Infection specialist'],
    [/transplant/, 'Transplant surgeon'],
    [/surg/, 'Surgeon'],
    [/anesth|anaesth/, 'Anaesthetist'],
    [/radiol|imaging/, 'Imaging specialist'],
    [/hemat|haemat/, 'Blood specialist'],
    [/patholog/, 'Lab medicine specialist'],
    [/internal medicine|^medicine$|general|family|clinical|geriatric|aging/, 'General physician'],
];

/** "Interventional Cardiology" → "Heart specialist". Research fields read as researchers. */
export function plainSpecialty(specialty: string, subSpecialty?: string | null): string {
    const s = normalizeSpecialty(specialty || '').toLowerCase();
    if (RESEARCH.test(s)) return 'Medical researcher';
    for (const [re, label] of PLAIN) if (re.test(s)) return label;
    const sub = (subSpecialty || '').toLowerCase();
    for (const [re, label] of PLAIN) if (sub && re.test(sub)) return label;
    return normalizeSpecialty(specialty);
}

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'have', 'has', 'had', 'my', 'from', 'when', 'what', 'who', 'doctor', 'doctors', 'dr', 'specialist', 'near', 'some', 'very', 'really', 'feel', 'feeling', 'since', 'days', 'weeks', 'problem', 'problems', 'issue', 'issues', 'about', 'need', 'want', 'get', 'got', 'been', 'that', 'this', 'are', 'was', 'not', 'any', 'all', 'can', 'which', 'mother', 'father', 'son', 'daughter']);

export function queryTokens(q: string): string[] {
    return [...new Set(q.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9-]+/))]
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Conditions an everyday word points at ("pregnant" → pregnancy, "knees" → joints). */
export function conditionsForToken(token: string): Condition[] {
    return CONDITIONS.filter((c) =>
        c.words.some((w) => w === token || (w.length >= 4 && token.startsWith(w)) || (token.length >= 4 && w.startsWith(token))),
    );
}

export interface FinderDoctor {
    slug: string;
    name: string;
    title: string;
    specialty: string;
    subSpecialty: string;
    hospital: string;
    city: string;
    region: string;
    /** specialty + sub-specialty + medical specialties + conditions treated, lowercased. */
    clinicalText: string;
    /** clinicalText + name + hospital + place, lowercased and accent-folded. */
    searchText: string;
}

export function fold(s: string): string {
    return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

export function matchesCondition(d: FinderDoctor, c: Condition): boolean {
    return c.pattern.test(d.clinicalText);
}

/**
 * Every recognised word must match, either directly (name, specialty, hospital,
 * city) or through the condition it describes. Words that match nothing at all
 * ("hurts", "walking") are ignored so plain-language descriptions still work.
 */
export function matchQuery<T extends FinderDoctor>(doctors: T[], q: string): { results: T[]; usedTokens: string[] } {
    const tokens = queryTokens(q);
    const checks = tokens
        .map((t) => {
            const conds = conditionsForToken(t);
            const test = (d: T) => d.searchText.includes(t) || conds.some((c) => matchesCondition(d, c));
            return { t, test };
        })
        .filter(({ test }) => doctors.some(test));
    if (!checks.length) return { results: [], usedTokens: [] };
    return { results: doctors.filter((d) => checks.every(({ test }) => test(d))), usedTokens: checks.map((c) => c.t) };
}

export function initials(name: string): string {
    return name
        .replace(/^(dr|prof|sir|dame)\.?\s+/i, '')
        .split(/\s+/)
        .filter((w) => /^[\p{L}]/u.test(w))
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/** "Dr. " prefix unless the stored name already carries a title. */
export function displayName(name: string): string {
    return /^(dr|prof|sir|dame)\.?\s/i.test(name) ? name : `Dr. ${name}`;
}
