// ============================================================================
// MDRPedia — Citation Validator
// Verifies DOIs against PubMed E-utilities and CrossRef APIs
// ============================================================================

import type { CitationValidationResult, PubMedArticle, CrossRefWork } from './types';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const CROSSREF_BASE = 'https://api.crossref.org/works';

// ─── PubMed Lookup ──────────────────────────────────────────────────────────

async function searchPubMed(doi: string, apiKey?: string): Promise<PubMedArticle | null> {
    try {
        const params = new URLSearchParams({
            db: 'pubmed',
            term: `${doi}[doi]`,
            retmode: 'json',
            retmax: '1',
        });
        if (apiKey) params.set('api_key', apiKey);

        const searchRes = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
        const searchData = await searchRes.json();
        const ids: string[] = searchData?.esearchresult?.idlist ?? [];

        if (ids.length === 0) return null;

        const pmid = ids[0];
        const summaryParams = new URLSearchParams({
            db: 'pubmed',
            id: pmid,
            retmode: 'json',
        });
        if (apiKey) summaryParams.set('api_key', apiKey);

        const summaryRes = await fetch(`${PUBMED_BASE}/esummary.fcgi?${summaryParams}`);
        const summaryData = await summaryRes.json();
        const article = summaryData?.result?.[pmid];

        if (!article) return null;

        return {
            pmid,
            doi,
            title: article.title ?? '',
            authors: (article.authors ?? []).map((a: { name: string }) => a.name),
            journal: article.fulljournalname ?? article.source ?? '',
            publicationDate: article.pubdate ?? '',
        };
    } catch (error) {
        console.error('[CitationValidator] PubMed lookup failed:', error);
        return null;
    }
}

// ─── CrossRef Lookup ────────────────────────────────────────────────────────

async function searchCrossRef(doi: string, mailto?: string): Promise<CrossRefWork | null> {
    try {
        const url = `${CROSSREF_BASE}/${encodeURIComponent(doi)}`;
        const headers: Record<string, string> = {
            'User-Agent': 'MDRPedia/1.0 (https://mdrpedia.com)',
        };
        if (mailto) headers['mailto'] = mailto;

        const res = await fetch(url, { headers });
        if (!res.ok) return null;

        const data = await res.json();
        const work = data?.message;
        if (!work) return null;

        return {
            doi: work.DOI,
            title: Array.isArray(work.title) ? work.title[0] : work.title ?? '',
            authors: (work.author ?? []).map((a: { given?: string; family?: string }) => ({
                given: a.given ?? '',
                family: a.family ?? '',
            })),
            journal: work['container-title']?.[0] ?? '',
            published: work.created?.['date-time'] ?? '',
            citationCount: work['is-referenced-by-count'] ?? 0,
        };
    } catch (error) {
        console.error('[CitationValidator] CrossRef lookup failed:', error);
        return null;
    }
}

// ─── Author Matching ────────────────────────────────────────────────────────

function authorMatchesDOI(
    doctorName: string,
    article: PubMedArticle | CrossRefWork
): boolean {
    const nameParts = doctorName.toLowerCase().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];

    if ('pmid' in article) {
        // PubMed format: "Smith JA"
        return article.authors.some((author) => {
            const lower = author.toLowerCase();
            return lower.includes(lastName) && (lower.includes(firstName.charAt(0)) || lower.includes(firstName));
        });
    } else {
        // CrossRef format: { given: "John", family: "Smith" }
        return article.authors.some((author) => {
            return (
                author.family.toLowerCase().includes(lastName) &&
                (author.given.toLowerCase().includes(firstName) ||
                    author.given.toLowerCase().startsWith(firstName.charAt(0)))
            );
        });
    }
}

// ─── Main: Validate Citation ────────────────────────────────────────────────

export async function validateCitation(
    doi: string,
    doctorName: string,
    options?: { ncbiApiKey?: string; crossrefMailto?: string }
): Promise<CitationValidationResult> {
    // Try PubMed first
    const pubmedArticle = await searchPubMed(doi, options?.ncbiApiKey);
    if (pubmedArticle) {
        const belongsToDoctor = authorMatchesDOI(doctorName, pubmedArticle);
        return {
            isValid: true,
            belongsToDoctor,
            source: 'pubmed',
            article: pubmedArticle,
            error: belongsToDoctor ? undefined : `DOI exists but author "${doctorName}" not found in author list.`,
        };
    }

    // Fallback to CrossRef
    const crossrefWork = await searchCrossRef(doi, options?.crossrefMailto);
    if (crossrefWork) {
        const belongsToDoctor = authorMatchesDOI(doctorName, crossrefWork);
        return {
            isValid: true,
            belongsToDoctor,
            source: 'crossref',
            article: crossrefWork,
            error: belongsToDoctor ? undefined : `DOI exists but author "${doctorName}" not found in author list.`,
        };
    }

    // DOI not found in either source
    return {
        isValid: false,
        belongsToDoctor: false,
        source: 'none',
        error: `DOI "${doi}" could not be verified in PubMed or CrossRef.`,
    };
}

// ─── Batch Validation ───────────────────────────────────────────────────────

export async function validateCitations(
    dois: string[],
    doctorName: string,
    options?: { ncbiApiKey?: string; crossrefMailto?: string }
): Promise<Map<string, CitationValidationResult>> {
    const results = new Map<string, CitationValidationResult>();

    // Process sequentially to respect rate limits
    for (const doi of dois) {
        const result = await validateCitation(doi, doctorName, options);
        results.set(doi, result);

        // Rate limit: 3 requests per second for PubMed without API key
        if (!options?.ncbiApiKey) {
            await new Promise((resolve) => setTimeout(resolve, 350));
        }
    }

    return results;
}
