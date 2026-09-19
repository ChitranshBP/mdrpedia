const fs = require('fs');
const path = require('path');

const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');

const updates = {
    "anthony-fauci": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/9/99/Anthony_Fauci_in_2023_02_(cropped).jpg",
        "biography": "Anthony Fauci is a renowned immunologist who served as the Director of the NIAID from 1984 to 2022, advising seven U.S. presidents on health crises including HIV/AIDS and COVID-19.",
        "citations": [{
            "title": "Covid-19 — Navigating the Uncharted",
            "year": 2020,
            "journal": "New England Journal of Medicine",
            "citationCount": 10000,
            "source": "NEJM"
        }]
    },
    "jennifer-doudna": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Jennifer_Doudna_ForMemRS_2016.jpg",
        "biography": "Jennifer Doudna is a Nobel Prize-winning biochemist at UC Berkeley, best known for her pioneering work in CRISPR-Cas9 gene editing, which has revolutionized the field of genetics.",
        "citations": [{
            "title": "A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity",
            "year": 2012,
            "journal": "Science",
            "citationCount": 15000,
            "source": "Science"
        }]
    },
    "robert-langer": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Robert_Langer_MTMLecture_2008_09_25_portrait.JPG",
        "biography": "Robert S. Langer is an Institute Professor at MIT and a co-founder of Moderna, widely regarded as the 'father of modern drug delivery' for his development of controlled-release systems.",
        "citations": [{
            "title": "Tissue engineering",
            "year": 1993,
            "journal": "Science",
            "citationCount": 20000,
            "source": "Science"
        }]
    },
    "eric-topol": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Eric_Topol_photo.jpg",
        "biography": "Eric J. Topol is a world-renowned cardiologist, scientist, and author who serves as the Director of the Scripps Research Translational Institute, focusing on the use of AI and digital technology in medicine.",
        "citations": [{
            "title": "High-performance medicine: the convergence of human and artificial intelligence",
            "year": 2019,
            "journal": "Nature Medicine",
            "citationCount": 5000,
            "source": "Nature Medicine"
        }]
    },
    "bert-vogelstein": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Bert_Vogelstein_2014.jpg",
        "biography": "Bert Vogelstein is a pioneer in cancer genetics at Johns Hopkins University, known for his work on the sequential genetic mutations that lead to colorectal cancer and the discovery of the p53 tumor suppressor gene.",
        "citations": [{
            "title": "A genetic model for colorectal tumorigenesis",
            "year": 1990,
            "journal": "Cell",
            "citationCount": 30000,
            "source": "Cell"
        }]
    }
};

const duplicatesToDelete = [
    "anthony-s-fauci.json",
    "jennifer-a-doudna.json",
    "robert-s-langer.json",
    "eric-j-topol.json"
];

function main() {
    // 1. Delete Duplicates
    for (const file of duplicatesToDelete) {
        const filePath = path.join(DOCTORS_DIR, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted duplicate: ${file}`);
        }
    }

    // 2. Update/Create Canonical
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

            // Check if verification already exists before adding
            // Simple check: title similarity
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
