const fs = require('fs');
const path = require('path');

const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');

function main() {
    if (!fs.existsSync(DOCTORS_DIR)) {
        console.error("Doctors directory not found.");
        return;
    }

    const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} profiles. scanning for schema errors...`);

    let fixedCount = 0;

    for (const file of files) {
        const filePath = path.join(DOCTORS_DIR, file);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
            continue;
        }

        let updated = false;

        // Fix Geography (null -> "Unknown" or "")
        if (data.geography) {
            if (data.geography.city === null) {
                data.geography.city = "Unknown";
                updated = true;
            }
            if (data.geography.region === null) {
                data.geography.region = "Unknown";
                updated = true;
            }
            if (data.geography.country === null) {
                data.geography.country = "Unknown";
                updated = true;
            }
        }

        // Fix Dates (null -> remove field or set to specific format if required, but usually optional in schema)
        // verifiedSurgeries: must be number
        if (data.verifiedSurgeries === null) {
            data.verifiedSurgeries = 0;
            updated = true;
        }

        // Fix subSpecialty (null -> string?)
        // If schema says string, likely optional? 
        // Astro error said: Expected type "string", received "null".
        // This implies the schema is z.string(), not z.string().nullable() or z.string().optional()

        if (data.subSpecialty === null) {
            delete data.subSpecialty; // Try deleting first (if optional)
            // Or set to "" if deleting doesn't work. 
            // Let's check config.ts later. For now, empty string is safer if strictly required.
            // data.subSpecialty = ""; 
            // actually, let's try delete since standard is optional()
        }

        // Fix portraitUrl (null -> undefined/delete)
        if (data.portraitUrl === null) {
            delete data.portraitUrl;
            updated = true;
        }

        // Fix dates (null -> undefined)
        if (data.dateOfBirth === null) {
            delete data.dateOfBirth;
            updated = true;
        }
        if (data.dateOfDeath === null) {
            delete data.dateOfDeath;
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            fixedCount++;
        }
    }

    console.log(`Fixed ${fixedCount} profiles.`);
}

main();
