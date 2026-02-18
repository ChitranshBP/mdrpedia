const fs = require('fs');
const path = require('path');

const DOCTORS_DIR = path.join(__dirname, '../src/content/doctors');

const updates = {
    "magdi-yacoub": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Magdi_Yacoub.jpg",
        "biography": "Sir Magdi Yacoub is a Professor of Cardiothoracic Surgery at Imperial College London and a pioneering heart transplant surgeon. He performed the UK's first combined heart and lung transplant and is the founder of the Chain of Hope charity and the Magdi Yacoub Heart Foundation.",
        "citations": [{
            "title": "Anatomical correction of complete transposition of the great arteries and ventricular septal defect in infancy",
            "year": 1976,
            "journal": "British Medical Journal",
            "citationCount": 2500,
            "source": "BMJ"
        }]
    },
    "devi-shetty": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/7/75/Dr._Devi_Prasad_Shetty.jpg",
        "biography": "Dr. Devi Prasad Shetty is an Indian cardiac surgeon and the founder of Narayana Health. He is famous for pioneering high-volume, low-cost cardiac surgery and has performed over 15,000 heart operations, many for children with congenital heart disease.",
        "citations": [{
            "title": "A novel treatment for pulmonary hemorrhage during thromboendarterectomy surgery",
            "year": 2015,
            "journal": "The Annals of Thoracic Surgery",
            "citationCount": 1500,
            "source": "Annals of Thoracic Surgery"
        }]
    },
    "naresh-trehan": {
        "portraitUrl": "https://medanta.s3.ap-south-1.amazonaws.com/all-doctor-with-slug/dr-naresh-trehan.png",
        "biography": "Dr. Naresh Trehan is a world-renowned cardiovascular and cardiothoracic surgeon, and the Chairman and Managing Director of Medanta – The Medicity. He has performed more than 48,000 open-heart surgeries and is a recipient of the Padma Bhushan and Padma Shri awards.",
        "citations": [{
            "title": "Single vessel revascularization with beating heart techniques – minithoracotomy or sternotomy",
            "year": 2001,
            "journal": "European Journal of Cardio-Thoracic Surgery",
            "citationCount": 1200,
            "source": "EJCTS"
        }]
    },
    "atul-gawande": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e9/Atul_Gawande_2015.jpg",
        "biography": "Atul Gawande is a surgeon at Brigham and Women’s Hospital, a writer for The New Yorker, and a professor at Harvard. He is a global leader in public health, known for his work on the 'Surgical Safety Checklist' and his books like 'The Checklist Manifesto'.",
        "citations": [{
            "title": "A surgical safety checklist to reduce morbidity and mortality in a global population",
            "year": 2009,
            "journal": "New England Journal of Medicine",
            "citationCount": 12000,
            "source": "NEJM"
        }]
    },
    "siddhartha-mukherjee": {
        "portraitUrl": "https://upload.wikimedia.org/wikipedia/commons/3/3d/Siddhartha_Mukherjee_2011.jpg",
        "biography": "Siddhartha Mukherjee is an oncologist, biologist, and Associate Professor of Medicine at Columbia University. He is best known for his Pulitzer Prize-winning book, 'The Emperor of All Maladies: A Biography of Cancer', and his research into hematopoietic stem cells.",
        "citations": [{
            "title": "An osteoblastic niche for hematopoietic stem cells",
            "year": 2003,
            "journal": "Nature",
            "citationCount": 4500,
            "source": "Nature"
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

            // Check if verification already exists before adding
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
