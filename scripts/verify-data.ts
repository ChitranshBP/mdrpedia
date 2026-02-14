
import 'dotenv/config'; // Load env vars if needed
import { getCollection } from 'astro:content';

async function verify() {
    try {
        const doctors = await getCollection('doctors');
        const fauci = doctors.find(d => d.slug === 'anthony-fauci');

        if (!fauci) {
            console.error('Fauci not found');
            return;
        }

        console.log('--- Verification Report ---');
        console.log('Mentors:', fauci.data.mentors);
        console.log('Students:', fauci.data.students);
        console.log('Awards Source URLs:', fauci.data.awards?.map(a => a.sourceUrl));
        console.log('---------------------------');

    } catch (e) {
        console.error('Verification failed:', e);
    }
}

verify();
