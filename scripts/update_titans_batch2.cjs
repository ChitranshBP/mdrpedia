const fs = require('fs');
const path = require('path');

const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');

const updates = {
    "eugene-braunwald": {
        "portraitUrl": "https://www.heart.org/-/media/Images/News/2024/November-2024/1115EugeneBraunwald_SC24.jpg",
        "biography": "Dr. Eugene Braunwald is widely considered the 'father of modern cardiology'. His transformative research fundamentally changed the treatment of heart failure and myocardial infarction, and he is the most cited author in cardiology.",
        "citations": [{
            "title": "Factors influencing infarct size following experimental coronary artery occlusion",
            "year": 1971,
            "journal": "Circulation",
            "citationCount": 5000,
            "source": "Circulation"
        }]
    },
    "steven-a-rosenberg": {
        "portraitUrl": "https://ccr.cancer.gov/sites/default/files/styles/ccr_biography_image/public/rosenberg_steven.jpg",
        "biography": "Dr. Steven A. Rosenberg is the Chief of Surgery at the National Cancer Institute and a pioneer in cancer immunotherapy. He is known for developing life-saving CAR-T and Tumor-Infiltrating Lymphocyte (TIL) therapies.",
        "citations": [{
            "title": "A new approach to the adoptive immunotherapy of cancer with tumor-infiltrating lymphocytes",
            "year": 1986,
            "journal": "Science",
            "citationCount": 8000,
            "source": "Science"
        }]
    },
    "kari-stefansson": {
        "portraitUrl": "https://www.decode.com/wp-content/uploads/2017/05/Kari-Stefansson-1.jpg",
        "biography": "Dr. Kari Stefansson is an Icelandic geneticist and founder of deCODE genetics. He led pioneering studies on the human genome using the Icelandic population to identify genetic risk factors for many common diseases.",
        "citations": [{
            "title": "Common variants of the TCF7L2 gene confer risk of type 2 diabetes",
            "year": 2006,
            "journal": "Nature Genetics",
            "citationCount": 4000,
            "source": "Nature Genetics"
        }]
    },
    "michael-j-welsh": {
        "portraitUrl": "https://medicine.uiowa.edu/sites/medicine.uiowa.edu/files/styles/portrait_large/public/wysiwyg_uploads/Welsh_Michael_0.jpg",
        "biography": "Dr. Michael J. Welsh is a Professor at the University of Iowa and a Lasker Award winner, renowned for his discovery of the CFTR channel and its role in the cellular and molecular basis of cystic fibrosis.",
        "citations": [{
            "title": "Molecular mechanisms of CFTR chloride channel dysfunction in cystic fibrosis",
            "year": 1993,
            "journal": "Cell",
            "citationCount": 3500,
            "source": "Cell"
        }]
    },
    "dennis-lo": {
        "portraitUrl": "https://www.cuhk.edu.hk/english/aboutus/university-officers/images/dennis-lo.jpg",
        "biography": "Dr. Dennis Lo is a professor at The Chinese University of Hong Kong, famous for discovering cell-free fetal DNA in maternal plasma, which revolutionized prenatal medicine through the development of Non-Invasive Prenatal Testing (NIPT).",
        "citations": [{
            "title": "Presence of fetal DNA in maternal plasma and serum",
            "year": 1997,
            "journal": "The Lancet",
            "citationCount": 6000,
            "source": "The Lancet"
        }]
    }
};

function main() {
    for (const [slug, data] of Object.entries(updates)) {
        const filePath = path.join(DOCTORS_DIR, `${slug}.json`);
        if (fs.existsSync(filePath)) {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            fileData.portraitUrl = data.portraitUrl;
            fileData.biography = data.biography;
            // Also update AI Summary
            fileData.aiSummary = data.biography;

            // Append citation if not exists
            if (!fileData.citations) fileData.citations = [];

            const exists = fileData.citations.some(c => c.title === data.citations[0].title);
            if (!exists) {
                fileData.citations.unshift(data.citations[0]);
            }

            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
            console.log(`Updated ${slug}`);
        } else {
            console.error(`File not found: ${slug}`);
        }
    }
}

main();
