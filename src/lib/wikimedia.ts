
import fetch from 'node-fetch';

const USER_AGENT = 'MDRPEDIA/1.0 (https://mdrpedia.com; taps@mdrpedia.com) Client-ID/079d8944b8ec42ca02215bf80c09cf4f';
const SEARCH_API = 'https://en.wikipedia.org/w/api.php';
const REST_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

export interface WikipediaData {
    title: string;
    extract: string; // The summary
    thumbnail?: {
        source: string;
        width: number;
        height: number;
    };
    content_urls?: {
        desktop: {
            page: string;
        };
    };
}

interface WikipediaSearchResponse {
    query?: {
        search?: Array<{ title: string }>;
    };
}

/**
 * Search Wikipedia for a doctor's name and return the best matching page summary.
 */
export async function fetchWikipediaData(doctorName: string): Promise<WikipediaData | null> {
    try {
        // 1. Search for the page
        const searchParams = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: doctorName,
            format: 'json',
            srlimit: '1'
        });

        const searchRes = await fetch(`${SEARCH_API}?${searchParams.toString()}`, {
            headers: { 'User-Agent': USER_AGENT }
        });

        const searchData: WikipediaSearchResponse = await searchRes.json() as WikipediaSearchResponse;

        if (!searchData.query?.search?.length) {
            return null;
        }

        const bestMatch = searchData.query.search[0];
        const title = bestMatch.title;

        // 2. Fetch the summary using the REST API (better formatted)
        const summaryRes = await fetch(`${REST_API}/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
            headers: { 'User-Agent': USER_AGENT }
        });

        if (!summaryRes.ok) {
            return null;
        }

        const summaryData = await summaryRes.json() as WikipediaData;

        // Filter out generic results or disambiguation pages if possible
        if (summaryData.extract.includes('may refer to:')) {
            return null;
        }

        return summaryData;

    } catch (error) {
        console.error(`Error fetching Wikipedia data for ${doctorName}:`, error);
        return null;
    }
}
