import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const npi = url.searchParams.get('npi');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!npi || npi.length !== 10) {
        return new Response(JSON.stringify({ valid: false, message: 'Invalid NPI format' }), { status: 400 });
    }

    // Checking "Mock Database" (or predefined valid NPIs)
    // For demo, we accept any 10-digit NPI, but specific ones return specific data
    const mockDb: Record<string, any> = {
        '1000000001': { fullName: 'Dr. Anthony Fauci', specialty: 'Immunology' },
        '1234567890': { fullName: 'Dr. Siddhartha Mukherjee', specialty: 'Oncology' }
    };

    if (mockDb[npi]) {
        return new Response(JSON.stringify({
            valid: true,
            doctor: mockDb[npi]
        }));
    }

    // Default valid response for random NPIs (Demo Mode)
    // In production, this would return 404
    return new Response(JSON.stringify({
        valid: true,
        doctor: {
            fullName: 'Dr. Verified Physician',
            specialty: 'General Practice'
        }
    }));
}
