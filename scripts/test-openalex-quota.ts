
import { searchAuthors, usageStats } from '../src/lib/openalex';

async function checkQuota() {
    console.log("🔑 Testing OpenAlex API Key...");

    // Perform a dummy search to trigger the specific API key headers
    await searchAuthors({ specialty: 'Cardiology', country: 'US', perPage: 1 });

    console.log("\n📊 OpenAlex Quota Status:");
    console.log(`   Requests Made: ${usageStats.requests}`);
    console.log(`   Limit (Per Day): ${usageStats.limit}`);
    console.log(`   Remaining: ${usageStats.remaining}`);

    if (usageStats.limit > 100000) {
        console.log("   ✅ Premium/High-Limit API Key Verified!");
    } else if (usageStats.limit === 100000) {
        console.log("   ✅ Standard Polite Pool (Email Verified).");
    } else {
        console.log("   ⚠️ Low Limit (Unverified).");
    }
}

checkQuota();
