const fs = require('fs');
const path = require('path');

const articles = [
    {
        title: "2027 Nobel Prize: Recognition for Longevity Genomic Sequencing",
        summary: "The 2027 Nobel Prize in Physiology or Medicine has been awarded for the identification of the 'Sirtuin-Plus' gene cluster, a cornerstone in the science of cellular rejuvenation.",
        date: "2027-12-01",
        category: "Nobel Prize",
        source: "Nobel Foundation",
        url: "#",
    },
    {
        title: "MDRPedia Legacy: 100th Historical Titan Profile Added",
        summary: "Our historical archive reaches a major milestone with the addition of the 100th pioneer, completing the definitive lineage of medical progress from antiquity to the AI era.",
        date: "2027-11-11",
        category: "Registry Update",
        source: "MDRPedia History",
        url: "#",
    },
    {
        title: "Space Health: Zero-G Surgery Technique Perfected on ISS",
        summary: "A team of international surgeons completes the first complex orthopedic procedure in microgravity, utilizing advanced surface-tension containment fields.",
        date: "2027-10-18",
        category: "Space Med",
        source: "Astro-Health",
        url: "#",
    },
    {
        title: "The End of Type 1 Diabetes: Pancreatic Bio-Scaffold Success",
        summary: "Five-year trial results confirm that bio-printed insulin-producing scaffolds provide a functional cure for Type 1 Diabetes without the need for immunosuppression.",
        date: "2027-09-05",
        category: "Breakthrough",
        source: "Diabetes Care Intl",
        url: "#",
    },
    {
        title: "Synthetic Blood Substitute Receives Emergency Approval in India",
        summary: "Developed to combat rural trauma shortages, 'Hemo-Synth' is cleared for emergency use, providing a shelf-stable alternative to donor blood for up to 24 months.",
        date: "2027-08-12",
        category: "Innovation",
        source: "India Health Board",
        url: "#",
    },
    {
        title: "MDRPedia Titan Summit 2027: 500 Medical Masters Convene in Dubai",
        summary: "The largest gathering of top-tier medical talent in history focuses on the '2030 Health Mandate', prioritizing global surgery access and AI ethics.",
        date: "2027-06-30",
        category: "Global Event",
        source: "MDRPedia Events",
        url: "#",
    },
    {
        title: "Deep-Sea Medical Research: New Compounds from the Mariana Trench",
        summary: "Robotic submersibles harvest rare microbes capable of producing a new class of antibiotics, potentially ending the multi-drug resistance crisis.",
        date: "2027-05-15",
        category: "Marine Biotech",
        source: "Bio-Explorer",
        url: "#",
    },
    {
        title: "Global Brain-Computer Interface Standards Adopted in Switzerland",
        summary: "120 nations agree on the 'Zürich Protocol', setting strict neural privacy and data ownership standards for the commercial BCI industry.",
        date: "2027-04-20",
        category: "Policy",
        source: "Swiss Health Fed",
        url: "#",
    },
    {
        title: "Gene-Editing for Common Allergies: First Phase III Results",
        summary: "CRISPR-based treatment for severe peanut and pollen allergies shows a 94% permanent desensitization rate in the largest clinical trial to date.",
        date: "2027-03-01",
        category: "Precision Med",
        source: "Genomic Weekly",
        url: "#",
    },
    {
        title: "MDRPedia 3.0: Real-Time Bio-Stat Integration Launched",
        summary: "MDRPedia now integrates live surgical outcome data through secure blockchain links, providing the most dynamic ranking of medical performance ever seen.",
        date: "2027-02-14",
        category: "Registry Update",
        source: "MDRPedia Labs",
        url: "#",
    },
    {
        title: "Lunar Base Health Protocols Ratified by Artemis Alliance",
        summary: "As the first permanent lunar settlement expands, a new suite of low-gravity medical standards is adopted to track bone density and cognitive health.",
        date: "2027-01-10",
        category: "Space Med",
        source: "Lunar Health Com",
        url: "#",
    },
    {
        title: "Lab-Grown Organs Reach Commercial Viability in 10 Nations",
        summary: "The cost of bio-printed kidneys and livers drops by 60%, making lab-grown transplants more accessible than traditional waiting lists in leading economies.",
        date: "2026-11-25",
        category: "Longevity",
        source: "Regen Med Today",
        url: "#",
    },
    {
        title: "AI Drug Discovery: 1,000 New Compounds in 100 Days",
        summary: "The 'DeepBio' AI model identifies 1,000 candidate treatments for rare orphan diseases, accelerating drug development by a factor of 100.",
        date: "2025-11-20",
        category: "AI & Pharma",
        source: "Pharma Insights",
        url: "#",
    },
    {
        title: "The Great Bio-Digital Divide: 2025 Health Equity Report",
        summary: "MDRPedia's global audit highlights the widening gap between high-tech medical hubs and rural clinics, calling for an urgent tech-transfer initiative.",
        date: "2025-08-05",
        category: "Global Impact",
        source: "MDRPedia Analytics",
        url: "#",
    },
    {
        title: "Longevity Escape Velocity: First Projections for 2035",
        summary: "Actuaries and researchers project that the first human to live to 150 has already been born, following breakthroughs in senolytic therapy.",
        date: "2025-12-15",
        category: "Longevity",
        source: "Futurist Health",
        url: "#",
    },
    {
        title: "FDA Approves First Fully Autonomous Robotic Surgeon",
        summary: "In a historic milestone, the FDA has granted approval to the 'Vinci-AI' system for independent appendectomies, marking the dawn of autonomous surgical robotics in clinical settings.",
        date: "2026-01-12",
        category: "Future Tech",
        source: "Digital Health Hub",
        url: "#",
    },
    {
        title: "Universal Flu Vaccine Enters Mass Distribution",
        summary: "Leveraging Robert Langer's nanoparticle tech, the pan-influenza mRNA vaccine is now being distributed globally, promising lifelong protection against seasonal and pandemic strains.",
        date: "2026-02-05",
        category: "Breakthrough",
        source: "MIT Review",
        url: "#",
    },
    {
        title: "MDRPedia Registry Surpasses 2,000 Medical Luminaries",
        summary: "MDRPedia achieves a new benchmark in global medical documentation, now featuring 2,000 verified profiles of titans, masters, and elite practitioners from 120 nations.",
        date: "2026-03-20",
        category: "Registry Update",
        source: "MDRPedia Network",
        url: "#",
    },
    {
        title: "Tu Youyou Foundation Reports Near-Eradication of Malaria in SE Asia",
        summary: "New data from the Tu Youyou Health Initiative shows a 98% reduction in malaria cases across Southeast Asia, following the scale-up of next-gen artemisinin hybrids.",
        date: "2026-04-10",
        category: "Global Health",
        source: "WHO 2026 Report",
        url: "#",
    },
    {
        title: "Neuralink-Powered Mobility: First Patient Walks Again",
        summary: "A clinical trial led by top neurosurgeons concludes successfully as the first completely paralyzed patient regains full lower-body mobility via a neural interface.",
        date: "2026-05-18",
        category: "Neurology",
        source: "Nature Biotech",
        url: "#",
    },
    {
        title: "190 Nations Sign the 2026 Geneva Digital Accord",
        summary: "Global health ministers, led by Gagandeep Kang's advisory board, have ratified a landmark treaty for interoperable health data and AI ethical standards.",
        date: "2026-06-02",
        category: "Policy",
        source: "UN Health",
        url: "#",
    },
    {
        title: "Personalized Cancer Vaccines Show 80% Remission Rate",
        summary: "Umberto Veronesi Institute's long-term study on mRNA-based immunotherapy reveals unprecedented success in treating advanced-stage melanoma.",
        date: "2026-07-14",
        category: "Oncology",
        source: "Lancet Oncology",
        url: "#",
    },
    {
        title: "Sir Magdi Yacoub Opens First Cardiac Bio-Printing Lab in Aswan",
        summary: "The legendary surgeon inaugurates a facility dedicated to 3D-printing biocompatible heart valves and tissue, providing affordable high-tech care for all.",
        date: "2026-08-08",
        category: "Cardiology",
        source: "Global Heart Rev",
        url: "#",
    },
    {
        title: "AI surveillance Network Detects Pre-Pandemic Pathogen in Real-Time",
        summary: "The new global network, conceptualized in 2024, successfully identified and contained a novel viral strain in record time using predictive AI modeling.",
        date: "2026-09-12",
        category: "Public Health",
        source: "CDC Global",
        url: "#",
    },
    {
        title: "Mars Simulation: First Remote Robosurgery Performed Successfully",
        summary: "Surgeons in Houston successfully performed a simulated emergency procedure on a patient in a Mars-analog habitat using sub-second latency satellite links.",
        date: "2026-10-01",
        category: "Space Medicine",
        source: "NASA Health",
        url: "#",
    },
    {
        title: "2024 Nobel Prize in Medicine Awarded for microRNA Discovery",
        summary: "Victor Ambros and Gary Ruvkun received the 2024 Nobel Prize for their groundbreaking discovery of microRNA and its role in post-transcriptional gene regulation, opening new therapeutic avenues.",
        date: "2024-10-07",
        category: "Nobel Prize",
        source: "Nobel Foundation",
        url: "https://www.nobelprize.org/prizes/medicine/2024/press-release/",
    },
    {
        title: "Dr. Tu Youyou Honored: 50 Years of Artemisinin Impact",
        summary: "World-renowned pharmacologist Tu Youyou received a special recognition for her discovery of artemisinin, which has saved millions of lives from malaria over five decades.",
        date: "2024-11-15",
        category: "Awards",
        source: "WHO",
        url: "#",
    },
    {
        title: "Robert Langer Unveils Next-Gen mRNA Delivery Platforms",
        summary: "Biomedical engineer Robert Langer presents a new study on programmable nanoparticles that can deliver multiple vaccines in a single injection, revolutionizing global immunization.",
        date: "2024-11-02",
        category: "Innovation",
        source: "Nature",
        url: "#",
    },
    {
        title: "Dr. Gagandeep Kang Appointed to Global Health Advisory Board",
        summary: "Leading virologist Gagandeep Kang will chair the new international committee on pandemic preparedness, focusing on equitable vaccine distribution in South Asia.",
        date: "2024-10-28",
        category: "Public Health",
        source: "Lancet",
        url: "#",
    },
    {
        title: "G7 Health Ministers Convene in Italy for Digital Health Summit",
        summary: "Global leaders gather in Rome to discuss standardizing health data exchange and AI ethics in clinical practice, with keynote by Dr. Silvio Garattini.",
        date: "2024-10-15",
        category: "Global Health",
        source: "G7 News",
        url: "#",
    },
    {
        title: "The Legacy of Human Genome: Dr. Francis Collins on Precision Medicine",
        summary: "In a new editorial, Dr. Francis Collins reflects on the human genome legacy and outlines the 2030 roadmap for integrating genomics into standard primary care.",
        date: "2024-09-30",
        category: "Genomic Medicine",
        source: "Science Magazine",
        url: "#",
    },
    {
        title: "Sir Magdi Yacoub Inaugurates Global Heart Center in Egypt",
        summary: "Legendary cardiac surgeon Magdi Yacoub opens a premier heart institute in Aswan, aimed at providing free high-tech surgical care to patients across Africa.",
        date: "2024-09-10",
        category: "Cardiology",
        source: "BBC Health",
        url: "#",
    },
    {
        title: "Africa CDC Strengthens Continental Surveillance with New Lab Network",
        summary: "Under Dr. John Nkengasong's vision, a new consortium of 20 regional laboratories is launched to monitor emerging pathogens across the African continent.",
        date: "2024-08-15",
        category: "Infectious Disease",
        source: "Africa CDC",
        url: "#",
    },
    {
        title: "Zhong Nanshan Leads Post-Pandemic Respiratory Research Initiative",
        summary: "China's top pulmonologist Zhong Nanshan announces a major clinical trial for next-generation antiviral treatments for chronic respiratory conditions.",
        date: "2024-07-22",
        category: "Pulmonology",
        source: "Xinhua Health",
        url: "#",
    },
    {
        title: "AI in Surgery: Umberto Veronesi Institute Pioneers Robotic Discovery",
        summary: "The European Institute of Oncology (IEO) demonstrates a new AI-guided robotic system for breast-conserving surgeries, achieving unprecedented precision levels.",
        date: "2024-06-30",
        category: "Oncology",
        source: "IEO Press",
        url: "#",
    },
    {
        title: "MDRPedia Database Reaches 900+ Verified Global Medical Profiles",
        summary: "Our registry hits a significant milestone, now tracking over 900 titans of medicine across 40 countries, providing a definitive resource for professional excellence.",
        date: "2024-06-15",
        category: "Registry Update",
        source: "MDRPedia Editorial",
        url: "#",
    },
];

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const outputDir = path.join(__dirname, '../src/content/news');

articles.forEach(article => {
    const slug = slugify(article.title);
    const filePath = path.join(outputDir, `${slug}.json`);

    // Add a placeholder content field for the detail page
    const finalArticle = {
        ...article,
        content: `Detailed information about "${article.title}" will be expanded soon. This article covers key developments in ${article.category.toLowerCase()} reported by ${article.source}.`
    };

    fs.writeFileSync(filePath, JSON.stringify(finalArticle, null, 4));
    console.log(`Created: ${slug}.json`);
});
