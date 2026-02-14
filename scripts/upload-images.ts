import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv7ltd99g',
    api_key: process.env.CLOUDINARY_API_KEY || '547642452993324',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'fszYrwa0lZfJYcocRsp69oqwWng',
    secure: true,
});

/**
 * Public domain / Creative Commons portrait URLs from Wikimedia Commons
 * These are freely licensed images suitable for educational/reference use.
 */
const doctorImages: Record<string, { portrait: string; gallery: string[] }> = {
    'denton-cooley': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Denton_Cooley.jpg/440px-Denton_Cooley.jpg',
        gallery: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Texas_Heart_Institute.jpg/500px-Texas_Heart_Institute.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/SynCardia_temporary_Total_Artificial_Heart.jpg/440px-SynCardia_temporary_Total_Artificial_Heart.jpg',
        ],
    },
    'christiaan-barnard': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Christiaan_Barnard_%281968%29.jpg/440px-Christiaan_Barnard_%281968%29.jpg',
        gallery: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Groote_Schuur_Hospital%2C_Cape_Town.jpg/640px-Groote_Schuur_Hospital%2C_Cape_Town.jpg',
        ],
    },
    'lars-leksell': {
        portrait: 'https://upload.wikimedia.org/wikipedia/en/7/78/Lars_Leksell.jpg',
        gallery: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Leksell_Gamma_Knife_4C.jpg/440px-Leksell_Gamma_Knife_4C.jpg',
        ],
    },
    'thomas-starzl': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Thomas_Starzl.jpg/440px-Thomas_Starzl.jpg',
        gallery: [],
    },
    'anthony-fauci': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Anthony_S._Fauci%2C_M.D.%2C_NIAID_Director_%2849673229763%29.jpg/440px-Anthony_S._Fauci%2C_M.D.%2C_NIAID_Director_%2849673229763%29.jpg',
        gallery: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/NIH_Clinical_Center_aerial.jpg/640px-NIH_Clinical_Center_aerial.jpg',
        ],
    },
    'robert-spetzler': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Robert_F._Spetzler.jpg/440px-Robert_F._Spetzler.jpg',
        gallery: [],
    },
    'siddhartha-mukherjee': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Siddhartha_Mukherjee_at_UCSF_2023.jpg/440px-Siddhartha_Mukherjee_at_UCSF_2023.jpg',
        gallery: [],
    },
    'ben-carson': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Ben_Carson_official_portrait.jpg/440px-Ben_Carson_official_portrait.jpg',
        gallery: [],
    },
    'elizabeth-blackburn': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Nobel_Prize_2009-Press_Conference_KVA-30.jpg/440px-Nobel_Prize_2009-Press_Conference_KVA-30.jpg',
        gallery: [],
    },
    'harvey-cushing': {
        portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Harvey_Cushing_1938b.jpg/440px-Harvey_Cushing_1938b.jpg',
        gallery: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Peter_Bent_Brigham_Hospital.jpg/640px-Peter_Bent_Brigham_Hospital.jpg',
        ],
    },
};

async function uploadAll() {
    console.log('🖼️  Starting Cloudinary upload for all 10 doctors...\n');

    const doctorsDir = path.join(__dirname, '../src/content/doctors');
    const results: Record<string, { portrait: string; gallery: string[] }> = {};

    for (const [slug, images] of Object.entries(doctorImages)) {
        console.log(`📤 Uploading images for ${slug}...`);

        try {
            // Upload portrait
            const portraitResult = await cloudinary.uploader.upload(images.portrait, {
                folder: `doctors/${slug}`,
                public_id: 'portrait',
                overwrite: true,
                resource_type: 'image',
                transformation: [
                    { width: 600, height: 600, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' },
                ],
            });
            console.log(`  ✅ Portrait: ${portraitResult.secure_url}`);

            // Upload gallery images
            const galleryUrls: string[] = [];
            for (let i = 0; i < images.gallery.length; i++) {
                try {
                    const galleryResult = await cloudinary.uploader.upload(images.gallery[i], {
                        folder: `doctors/${slug}`,
                        public_id: `gallery-${i + 1}`,
                        overwrite: true,
                        resource_type: 'image',
                        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                    });
                    galleryUrls.push(galleryResult.secure_url);
                    console.log(`  ✅ Gallery ${i + 1}: ${galleryResult.secure_url}`);
                } catch (err) {
                    console.log(`  ⚠️  Gallery ${i + 1} failed, skipping`);
                }
            }

            results[slug] = {
                portrait: portraitResult.secure_url,
                gallery: galleryUrls,
            };

            // Update JSON file with Cloudinary URL
            const jsonPath = path.join(doctorsDir, `${slug}.json`);
            if (fs.existsSync(jsonPath)) {
                const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                data.portraitUrl = portraitResult.secure_url;
                if (galleryUrls.length > 0) {
                    data.galleryUrls = galleryUrls;
                }
                fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
                console.log(`  📝 Updated ${slug}.json\n`);
            }
        } catch (err) {
            console.error(`  ❌ Failed for ${slug}:`, err);
        }
    }

    console.log('\n🎉 Upload complete! Results:');
    console.log(JSON.stringify(results, null, 2));
}

uploadAll().catch(console.error);
