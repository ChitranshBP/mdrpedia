
const API_KEY = 'm9nQtQN8vafy0pJVwJP1WA';

async function testSimple() {
    const url = `https://api.openalex.org/works?per_page=1&api_key=${API_KEY}&mailto=admin@mdrpedia.com`;
    console.log(`Testing: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);

        console.log("Headers:");
        console.log(`  x-rate-limit-limit: ${res.headers.get('x-rate-limit-limit')}`);
        console.log(`  x-rate-limit-remaining: ${res.headers.get('x-rate-limit-remaining')}`);

        if (!res.ok) {
            console.log("Body:", await res.text());
        }
    } catch (e) {
        console.error(e);
    }
}

testSimple();
