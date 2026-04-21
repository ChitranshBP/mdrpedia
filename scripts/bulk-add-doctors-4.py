#!/usr/bin/env python3
"""Bulk-create doctor profile JSON files - Batch 4: More gaps to fill."""
import json, os, re

CONTENT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'doctors')

def slugify(name):
    s = name.lower().strip()
    s = re.sub(r'[àáâãäå]', 'a', s)
    s = re.sub(r'[èéêë]', 'e', s)
    s = re.sub(r'[ìíîï]', 'i', s)
    s = re.sub(r'[òóôõö]', 'o', s)
    s = re.sub(r'[ùúûü]', 'u', s)
    s = re.sub(r'[ñ]', 'n', s)
    s = re.sub(r'[ç]', 'c', s)
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'[\s]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')

def make_profile(name, specialty, country, status, tier, hindex=0, born=None, died=None, bio="", awards=None, timeline=None, inventions=None, knows=None, city=None, affiliations=None, title="MD", sub_specialty=None, med_specs=None):
    slug = slugify(name)
    path = os.path.join(CONTENT_DIR, f'{slug}.json')
    if os.path.exists(path):
        return None
    summary = f"{name} is a {specialty.lower()} specialist"
    if affiliations:
        summary += f" at {affiliations[0]['hospitalName']}"
    summary += f". Based in {city or country}."
    profile = {
        "fullName": name, "slug": slug, "title": title, "specialty": specialty,
        "geography": {"country": country, "region": None, "city": city},
        "status": status, "tier": tier, "rankingScore": None, "hIndex": hindex,
        "yearsActive": 0, "verifiedSurgeries": 0, "livesSaved": 0,
        "biography": bio, "aiSummary": summary,
        "techniquesInvented": inventions or [], "hasInvention": bool(inventions),
        "education": [], "socialMedia": {},
        "affiliations": affiliations or [],
        "medicalSpecialty": med_specs or [specialty],
        "knowsAbout": knows or [], "citations": [],
        "awards": awards or [], "timeline": timeline or [],
        "subSpecialty": sub_specialty or specialty,
        "dateOfBirth": born, "dateOfDeath": died, "bioGenerated": True
    }
    with open(path, 'w') as f:
        json.dump(profile, f, indent=2)
    return slug

def aff(name, role="Professor"):
    return {"hospitalName": name, "role": role, "hospitalUrl": "#"}

def tl(year, title, desc=None):
    return {"year": year, "title": title, "description": desc}

created = []

docs = [
    # ============================================================
    # EMERGENCY MEDICINE AND TRAUMA
    # ============================================================

    ("R Adams Cowley", "Trauma Surgery", "United States", "HISTORICAL", "ELITE", 10,
     "1917-07-17", "1991-10-27",
     "R Adams Cowley was an American surgeon who pioneered the concept of the 'Golden Hour' in trauma care and founded the first dedicated shock trauma center in the world.",
     [],
     [tl(1960, "Established Shock Trauma Center", "Founded the world's first center dedicated to treating shock and trauma at the University of Maryland"),
      tl(1970, "Defined the Golden Hour", "Established that trauma patients have the best outcomes if definitive care begins within one hour")],
     ["Golden Hour concept", "Shock Trauma Center model"], ["Trauma surgery", "Golden Hour", "Shock treatment", "Emergency medicine"], "Baltimore",
     [aff("University of Maryland", "Founder of Shock Trauma Center")]),

    # ============================================================
    # ORTHOPEDICS AND REHABILITATION
    # ============================================================

    ("Gavriil Ilizarov", "Orthopedic Surgery", "Russia", "HISTORICAL", "TITAN", 15,
     "1921-06-15", "1992-07-24",
     "Gavriil Ilizarov was a Soviet physician who invented the Ilizarov apparatus for limb lengthening and bone reconstruction. His external fixator device and distraction osteogenesis technique revolutionized orthopedic surgery worldwide.",
     ["Hero of Socialist Labour"],
     [tl(1951, "Invented Ilizarov apparatus", "Developed the circular external fixator for bone lengthening and reconstruction"),
      tl(1969, "Discovered distraction osteogenesis", "Showed that gradual pulling apart of bone segments stimulates new bone growth")],
     ["Ilizarov apparatus", "Distraction osteogenesis"], ["Limb lengthening", "Bone reconstruction", "External fixation", "Distraction osteogenesis"], "Kurgan",
     [aff("Russian Ilizarov Scientific Center", "Founder and Director")]),

    ("John Charnley", "Orthopedic Surgery", "United Kingdom", "HISTORICAL", "TITAN", 30,
     "1911-08-29", "1982-08-05",
     "John Charnley was a British orthopedic surgeon who invented the modern hip replacement. His low-friction arthroplasty using UHMWPE and bone cement transformed the lives of millions of arthritis patients.",
     ["Knight Bachelor"],
     [tl(1962, "Invented modern hip replacement", "Developed the low-friction arthroplasty using high-density polyethylene and acrylic bone cement"),
      tl(1972, "Established hip replacement as standard", "By this time, the Charnley hip had been proven in thousands of patients with excellent long-term results")],
     ["Low-friction arthroplasty (modern hip replacement)"], ["Hip replacement", "Arthroplasty", "Bone cement", "Joint surgery"], "Wrightington",
     [aff("Wrightington Hospital", "Director of Hip Surgery Centre")]),

    # ============================================================
    # DERMATOLOGY AND ALLERGY
    # ============================================================

    ("Clemens von Pirquet", "Pediatrics", "Austria", "HISTORICAL", "ELITE", 0,
     "1874-05-12", "1929-02-28",
     "Clemens von Pirquet was an Austrian physician who coined the term 'allergy' and developed the tuberculin skin test. He made fundamental contributions to understanding immune responses.",
     [],
     [tl(1906, "Coined the term 'allergy'", "Introduced the concept and term 'allergy' for altered immune reactivity"),
      tl(1907, "Developed tuberculin skin test", "Created the diagnostic test for tuberculosis exposure still used today")],
     ["Allergy concept", "Tuberculin skin test"], ["Allergy", "Tuberculosis diagnosis", "Immunology", "Pediatrics"], "Vienna",
     [aff("University of Vienna", "Professor of Pediatrics")]),

    # ============================================================
    # ENDOCRINOLOGY
    # ============================================================

    ("Charles Brenton Huggins", "Urology", "Canada", "HISTORICAL", "TITAN", 30,
     "1901-09-22", "1997-01-12",
     "Charles Huggins was a Canadian-American urologist who discovered that hormone therapy could treat prostate and breast cancer. His work on hormonal manipulation of cancer opened an entirely new approach to cancer treatment. Nobel Prize 1966.",
     ["Nobel Prize in Physiology or Medicine (1966)", "Lasker Award"],
     [tl(1941, "Discovered hormonal cancer therapy", "Showed that removing testosterone through castration or estrogen therapy could shrink prostate cancer"),
      tl(1966, "Nobel Prize", "For discoveries concerning hormonal treatment of prostatic cancer")],
     ["Hormonal therapy for cancer"], ["Hormone therapy", "Prostate cancer", "Endocrine oncology", "Androgen deprivation"], "Chicago",
     [aff("University of Chicago", "William B. Ogden Distinguished Service Professor")]),

    # ============================================================
    # GENETICS AND GENOMICS
    # ============================================================

    ("Lap-Chee Tsui", "Genetics", "Hong Kong", "LIVING", "TITAN", 75,
     "1950-12-21", None,
     "Lap-Chee Tsui is a Hong Kong-Canadian geneticist who identified the cystic fibrosis gene (CFTR) in 1989, one of the most important gene discoveries in history.",
     ["Order of Canada", "Gairdner Foundation International Award"],
     [tl(1989, "Discovered cystic fibrosis gene", "Identified the CFTR gene mutation responsible for cystic fibrosis"),
      tl(2002, "President of University of Hong Kong", "Led one of Asia's top universities")],
     None, ["Cystic fibrosis", "CFTR gene", "Gene mapping", "Human genetics"], "Hong Kong",
     [aff("University of Hong Kong", "Former Vice-Chancellor"),
      aff("Hospital for Sick Children", "Former Senior Scientist")], "PhD"),

    ("Victor McKusick", "Genetics", "United States", "HISTORICAL", "TITAN", 70,
     "1921-10-21", "2008-07-22",
     "Victor McKusick was an American geneticist known as the 'father of medical genetics.' He created the OMIM database cataloguing all known genetic disorders and established medical genetics as a clinical discipline.",
     ["Japan Prize", "Lasker Award"],
     [tl(1966, "Published Mendelian Inheritance in Man", "Created the comprehensive catalog of human genes and genetic disorders, later becoming OMIM"),
      tl(1957, "Founded medical genetics at Hopkins", "Established the first medical genetics division at Johns Hopkins")],
     ["OMIM database", "Medical genetics as clinical discipline"], ["Medical genetics", "OMIM", "Genetic disorders", "Mendelian inheritance", "Connective tissue disorders"], "Baltimore",
     [aff("Johns Hopkins University", "University Professor of Medical Genetics")]),

    # ============================================================
    # MORE GLOBAL REPRESENTATION
    # ============================================================

    ("Magdi Habib Yacoub", "Cardiac Surgery", "Egypt", "LIVING", "TITAN", 100,
     "1935-11-16", None, "", [], [], None, [], "London", []),
    # Duplicate - will be caught

    ("Mahmoud Ghannoum", "Microbiology", "Egypt", "LIVING", "ELITE", 75,
     "1952-01-01", None,
     "Mahmoud Ghannoum is an Egyptian-American microbiologist who coined the term 'mycobiome' and is a leading researcher on fungal infections and biofilms.",
     [],
     [tl(2010, "Coined the term 'mycobiome'", "Named and pioneered the study of the fungal component of the human microbiome")],
     ["Mycobiome concept"], ["Mycobiome", "Fungal infections", "Biofilms", "Candida"], "Cleveland",
     [aff("Case Western Reserve University", "Professor and Director of the Center for Medical Mycology")], "PhD"),

    ("Julio Frenk", "Public Health", "Mexico", "LIVING", "ELITE", 55,
     "1953-12-20", None,
     "Julio Frenk is a Mexican physician and public health leader who served as Mexico's Minister of Health and later became president of the University of Miami. He pioneered universal health coverage in Mexico.",
     [],
     [tl(2000, "Mexico's Minister of Health", "Led the creation of Seguro Popular, achieving universal health coverage for 50 million uninsured Mexicans"),
      tl(2015, "President of University of Miami", "Led the university's academic health center")],
     None, ["Universal health coverage", "Health systems", "Health policy", "Global health"], "Miami",
     [aff("University of Miami", "President"),
      aff("Harvard T.H. Chan School of Public Health", "Former Dean")]),

    ("Agnes Binagwaho", "Pediatrics", "Rwanda", "LIVING", "ELITE", 30,
     "1956-01-01", None,
     "", [], [], None, [], "Kigali", []),
    # Duplicate - will be caught

    ("Adel El Tagir", "Surgery", "Sudan", "LIVING", "ELITE", 10,
     None, None,
     "Adel El Tagir is a Sudanese-British breast surgeon who has championed surgical training and capacity building in sub-Saharan Africa, founding programs to train surgeons in low-resource settings.",
     [],
     [tl(2010, "Founded surgical training programs", "Established sustainable surgical training initiatives across East Africa")],
     None, ["Breast surgery", "Surgical training", "Global surgery", "Surgical capacity building"], "London",
     [aff("Brighton and Sussex University Hospitals", "Consultant Breast Surgeon")]),

    ("Adetokunbo Lucas", "Tropical Medicine", "Nigeria", "HISTORICAL", "ELITE", 30,
     "1931-09-26", "2020-10-25",
     "Adetokunbo Lucas was a Nigerian physician who directed the WHO Tropical Diseases Research Programme and was one of Africa's most influential public health leaders.",
     ["Leon Bernard Foundation Prize"],
     [tl(1976, "Led WHO TDR Programme", "Directed the Special Programme for Research and Training in Tropical Diseases"),
      tl(1990, "Advised multiple African governments", "Served as health advisor to governments across West Africa")],
     None, ["Tropical diseases", "Malaria", "Public health policy", "Health systems"], "Ibadan",
     [aff("World Health Organization", "Former Director of TDR"),
      aff("Harvard School of Public Health", "Adjunct Professor")]),

    ("Ambroise Pare", "Surgery", "France", "HISTORICAL", "TITAN", 0,
     "1510-01-01", "1590-12-20",
     "Ambroise Pare was a French surgeon considered the father of modern surgery. He replaced cauterization with ligatures for amputations and developed numerous surgical instruments and prosthetic devices.",
     [],
     [tl(1545, "Replaced cauterization with ligatures", "Demonstrated that tying blood vessels was superior to cauterizing with boiling oil"),
      tl(1575, "Published collected surgical works", "Published his comprehensive surgical treatises, transforming surgical practice")],
     ["Arterial ligature in surgery", "Modern wound treatment"], ["Surgery", "Wound care", "Amputation techniques", "Prosthetics"], "Paris",
     [aff("Hotel-Dieu Hospital", "Chief Surgeon"),
      aff("French Royal Court", "Surgeon to four Kings of France")]),

    ("Abu al-Qasim al-Zahrawi", "Surgery", "Spain", "HISTORICAL", "TITAN", 0,
     "936-01-01", "1013-01-01",
     "Abu al-Qasim al-Zahrawi (Abulcasis) was an Arab physician in Islamic Spain who is considered the father of surgery. His 30-volume medical encyclopedia Kitab al-Tasrif described over 200 surgical instruments and techniques that influenced surgery for centuries.",
     [],
     [tl(1000, "Published Kitab al-Tasrif", "Completed his 30-volume medical encyclopedia containing the first illustrated surgical manual with over 200 instruments")],
     ["Over 200 surgical instruments", "Catgut sutures"], ["Surgery", "Surgical instruments", "Cauterization", "Obstetric surgery"], "Cordoba",
     [aff("Caliphate of Cordoba", "Court Physician")]),

    ("Ibn al-Nafis", "Medicine", "Syria", "HISTORICAL", "TITAN", 0,
     "1213-01-01", "1288-12-17",
     "Ibn al-Nafis was an Arab physician who was the first to accurately describe pulmonary circulation - the passage of blood through the lungs - three centuries before William Harvey.",
     [],
     [tl(1242, "Described pulmonary circulation", "First accurate description of blood flow from the right ventricle through the lungs to the left ventricle")],
     ["Discovery of pulmonary circulation"], ["Pulmonary circulation", "Anatomy", "Cardiology", "Islamic medicine"], "Cairo",
     [aff("Al-Mansuri Hospital", "Chief of Medicine")]),

    ("Rhazes", "Medicine", "Iran", "HISTORICAL", "TITAN", 0,
     "854-01-01", "925-01-01",
     "Rhazes (Muhammad ibn Zakariya al-Razi) was a Persian physician who was the first to distinguish smallpox from measles, and his medical encyclopedia Al-Hawi was used as a standard text in European medical schools for centuries.",
     [],
     [tl(910, "Distinguished smallpox from measles", "Published the first clinical differentiation between these two diseases"),
      tl(925, "Al-Hawi encyclopedia", "Compiled the comprehensive medical encyclopedia that became a standard reference in Europe")],
     ["Clinical differentiation of smallpox and measles"], ["Smallpox", "Measles", "Clinical medicine", "Medical encyclopedia"], "Rey",
     [aff("Muqtadari Hospital", "Chief Physician")]),

    ("Maimonides", "Medicine", "Spain", "HISTORICAL", "ELITE", 0,
     "1138-03-30", "1204-12-13",
     "Moses Maimonides was a Sephardic Jewish philosopher-physician who served as court physician to Saladin and wrote influential medical texts on asthma, poisons, and diet. His medical works combined Greek medicine with his own clinical observations.",
     [],
     [tl(1190, "Treatise on Asthma", "Wrote one of the earliest comprehensive works on asthma treatment and prevention"),
      tl(1199, "Court Physician to Saladin", "Served as personal physician to the Sultan of Egypt")],
     None, ["Asthma", "Toxicology", "Diet and nutrition", "Medical ethics"], "Cairo",
     [aff("Fatimid Court", "Court Physician")]),

    # ============================================================
    # MODERN MEDICAL INNOVATORS
    # ============================================================

    ("Patrick Soon-Shiong", "Oncology", "South Africa", "LIVING", "ELITE", 35,
     "1952-07-29", None,
     "Patrick Soon-Shiong is a South African-American surgeon who developed Abraxane, a nanoparticle albumin-bound paclitaxel for cancer treatment. He is one of the wealthiest physicians in history.",
     [],
     [tl(1997, "Developed Abraxane", "Created nanoparticle-based chemotherapy drug that improves cancer drug delivery"),
      tl(2010, "Pioneered GPS Cancer technology", "Developed comprehensive cancer genomic profiling")],
     ["Abraxane (nab-paclitaxel)"], ["Nanotechnology", "Cancer drug delivery", "Pancreatic cancer", "Oncology"], "Los Angeles",
     [aff("NantHealth", "Founder and CEO"),
      aff("Chan Soon-Shiong Institute", "Founder")]),

    ("Feng Zhang", "Biomedical Engineering", "United States", "LIVING", "TITAN", 120,
     "1981-10-22", None,
     "Feng Zhang is a Chinese-American biomedical engineer who was the first to apply CRISPR-Cas9 genome editing to mammalian cells. He also developed the SHERLOCK diagnostic system.",
     ["Lemelson-MIT Prize", "Tang Prize in Biopharmaceutical Science"],
     [tl(2013, "Applied CRISPR to mammalian cells", "First to demonstrate CRISPR-Cas9 genome editing in mouse and human cells"),
      tl(2017, "Developed SHERLOCK diagnostic", "Created CRISPR-based diagnostic platform for detecting nucleic acids")],
     ["CRISPR in mammalian cells", "SHERLOCK diagnostic system"], ["CRISPR", "Gene editing", "SHERLOCK", "Optogenetics", "Diagnostic tools"], "Cambridge",
     [aff("Broad Institute of MIT and Harvard", "Core Institute Member"),
      aff("MIT", "James and Patricia Poitras Professor of Neuroscience")], "PhD"),

    ("Robert Weinberg", "Oncology", "United States", "LIVING", "TITAN", 230,
     "1942-11-11", None,
     "Robert Weinberg is an American biologist who discovered the first human oncogene (RAS) and the first tumor suppressor gene (RB). His work laid the foundation for understanding the genetic basis of cancer.",
     ["Breakthrough Prize in Life Sciences (2013)", "National Medal of Science"],
     [tl(1979, "Discovered first human oncogene", "Identified the RAS oncogene, showing that mutations in normal genes can cause cancer"),
      tl(1986, "Discovered first tumor suppressor", "Cloned the retinoblastoma (RB) gene, the first tumor suppressor gene")],
     ["RAS oncogene discovery", "RB tumor suppressor discovery"], ["Oncogenes", "Tumor suppressor genes", "Cancer biology", "Metastasis"], "Cambridge",
     [aff("MIT", "Daniel K. Ludwig Professor for Cancer Research"),
      aff("Whitehead Institute", "Founding Member")], "PhD"),

    ("Napoleone Ferrara", "Oncology", "Italy", "LIVING", "TITAN", 150,
     "1956-07-26", None,
     "Napoleone Ferrara is an Italian-American molecular biologist who discovered VEGF and developed bevacizumab (Avastin), the first anti-angiogenesis drug for cancer.",
     ["Lasker Award (2010)", "Breakthrough Prize in Life Sciences (2014)"],
     [tl(1989, "Discovered VEGF", "Identified vascular endothelial growth factor, the key molecule driving blood vessel growth"),
      tl(2004, "Avastin approved", "FDA approved bevacizumab, the first drug to block tumor blood vessel growth")],
     ["VEGF discovery", "Anti-VEGF therapy (Avastin)"], ["VEGF", "Angiogenesis", "Bevacizumab", "Cancer therapy", "Age-related macular degeneration"], "San Diego",
     [aff("University of California, San Diego", "Distinguished Professor of Pathology")], "MD"),

    # ============================================================
    # INFECTIOUS DISEASE HISTORY
    # ============================================================

    ("Alexander Yersin", "Bacteriology", "Switzerland", "HISTORICAL", "ELITE", 0,
     "1863-09-22", "1943-03-01",
     "Alexandre Yersin was a Swiss-French physician who co-discovered the plague bacillus Yersinia pestis in 1894 during a Hong Kong plague epidemic. He was also instrumental in establishing the Pasteur Institute in Vietnam.",
     [],
     [tl(1894, "Discovered plague bacillus", "Isolated the bacterium causing bubonic plague during the Hong Kong epidemic, later named Yersinia pestis in his honor")],
     None, ["Plague", "Yersinia pestis", "Bacteriology", "Tropical medicine"], "Nha Trang",
     [aff("Pasteur Institute", "Researcher"),
      aff("Pasteur Institute of Nha Trang", "Founder")]),

    ("Ronald Ross", "Tropical Medicine", "India", "HISTORICAL", "TITAN", 0,
     "1857-05-13", "1932-09-16",
     "Ronald Ross was a British physician born in India who proved that malaria is transmitted by mosquitoes, one of the most important discoveries in medical history. Nobel Prize 1902.",
     ["Nobel Prize in Physiology or Medicine (1902)"],
     [tl(1897, "Proved mosquito transmission of malaria", "Demonstrated the complete life cycle of the malaria parasite in Anopheles mosquitoes"),
      tl(1902, "Nobel Prize", "For his work on malaria transmission")],
     None, ["Malaria", "Mosquito-borne disease", "Parasitology", "Tropical medicine"], "London",
     [aff("Liverpool School of Tropical Medicine", "Professor")]),

    ("Robert Koch", "Microbiology", "Germany", "HISTORICAL", "TITAN", 0,
     "1843-12-11", "1910-05-27",
     "Robert Koch was a German physician who identified the specific causative agents of tuberculosis, cholera, and anthrax. He developed Koch's postulates, the criteria for proving a microorganism causes a disease. Nobel Prize 1905.",
     ["Nobel Prize in Physiology or Medicine (1905)"],
     [tl(1876, "Identified anthrax bacillus", "First to prove that a specific bacterium causes a specific disease"),
      tl(1882, "Discovered tuberculosis bacillus", "Identified Mycobacterium tuberculosis as the cause of TB"),
      tl(1884, "Discovered cholera bacillus", "Identified Vibrio cholerae as the cause of cholera"),
      tl(1890, "Koch's postulates", "Established the criteria for linking a specific microbe to a specific disease")],
     ["Koch's postulates"], ["Tuberculosis", "Cholera", "Anthrax", "Bacteriology", "Koch's postulates"], "Berlin",
     [aff("University of Berlin", "Professor of Hygiene")]),

    # ============================================================
    # VACCINE PIONEERS
    # ============================================================

    ("Maurice Hilleman", "Virology", "United States", "HISTORICAL", "TITAN", 45,
     "1919-08-30", "2005-04-11",
     "Maurice Hilleman was an American microbiologist who developed more than 40 vaccines, more than any other scientist. His vaccines include those for measles, mumps, hepatitis A, hepatitis B, chickenpox, meningitis, and pneumonia, saving an estimated 8 million lives per year.",
     ["Lasker Award (1983)", "National Medal of Science"],
     [tl(1963, "Developed measles vaccine", "Created the vaccine that has prevented millions of deaths from measles"),
      tl(1967, "Developed mumps vaccine", "Isolated the mumps virus from his daughter Jeryl Lynn and developed the vaccine"),
      tl(1981, "Developed hepatitis B vaccine", "Created the first vaccine produced by genetic engineering")],
     ["Over 40 vaccines including measles, mumps, rubella, hepatitis A, hepatitis B, chickenpox"], ["Vaccines", "Measles", "Mumps", "Hepatitis B", "Vaccine development"], "Philadelphia",
     [aff("Merck Research Laboratories", "Director of Virus and Cell Biology Research")], "PhD"),

    ("Albert Sabin", "Virology", "United States", "HISTORICAL", "TITAN", 40,
     "1906-08-26", "1993-03-03",
     "Albert Sabin was a Polish-American physician who developed the oral polio vaccine (OPV), which became the primary tool for global polio eradication. Unlike the Salk vaccine, his live-attenuated vaccine could be given orally and was cheaper to produce.",
     ["Presidential Medal of Freedom", "National Medal of Science"],
     [tl(1957, "Developed oral polio vaccine", "Created the live-attenuated oral vaccine that became the standard for polio prevention worldwide"),
      tl(1960, "OPV adopted globally", "The WHO adopted the Sabin oral vaccine for global polio eradication campaigns")],
     ["Oral polio vaccine (OPV)"], ["Polio", "Oral polio vaccine", "Live-attenuated vaccines", "Vaccine development"], "Cincinnati",
     [aff("Cincinnati Children's Hospital", "Director of Research")]),

    # ============================================================
    # NURSING AND ALLIED HEALTH
    # ============================================================

    ("Mary Seacole", "Nursing", "Jamaica", "HISTORICAL", "ELITE", 0,
     "1805-11-23", "1881-05-14",
     "Mary Seacole was a Jamaican-British nurse who traveled to the Crimean War at her own expense to care for wounded soldiers. She established the 'British Hotel' near the front lines, providing nursing care and comfort to soldiers.",
     [],
     [tl(1855, "British Hotel in Crimea", "Established a care facility near the Crimean War front lines"),
      tl(1857, "Published autobiography", "Published 'Wonderful Adventures of Mrs Seacole in Many Lands'")],
     None, ["Nursing", "Tropical medicine", "Military medicine", "Herbal remedies"], "London",
     [aff("British Hotel, Crimea", "Founder and Nurse")], "Nurse"),

    ("Clara Barton", "Nursing", "United States", "HISTORICAL", "ELITE", 0,
     "1821-12-25", "1912-04-12",
     "Clara Barton was an American nurse who founded the American Red Cross in 1881. During the Civil War, she organized nursing care and supplies for wounded soldiers, earning the nickname 'Angel of the Battlefield.'",
     [],
     [tl(1862, "Angel of the Battlefield", "Organized nursing care and supplies for Union soldiers during the Civil War"),
      tl(1881, "Founded the American Red Cross", "Established the American branch of the International Red Cross")],
     None, ["Nursing", "Disaster relief", "Humanitarian aid", "Military medicine"], "Washington",
     [aff("American Red Cross", "Founder and First President")], "Nurse"),

    ("Dorothea Dix", "Psychiatry", "United States", "HISTORICAL", "ELITE", 0,
     "1802-04-04", "1887-07-17",
     "Dorothea Dix was an American reformer who led a crusade to create state psychiatric hospitals and humane treatment of the mentally ill. Her advocacy led to the creation of dozens of mental health facilities across the United States and Europe.",
     [],
     [tl(1843, "Published Memorial to the Legislature of Massachusetts", "Exposed the horrific conditions of mentally ill patients in jails and poorhouses"),
      tl(1848, "Federal mental health legislation", "Persuaded Congress to consider federal land grants for mental health facilities")],
     None, ["Mental health reform", "Psychiatric hospitals", "Patient advocacy", "Social reform"], "Trenton",
     [aff("New Jersey State Lunatic Asylum", "Superintendent")], "Reformer"),

    # ============================================================
    # PATHOLOGY AND LABORATORY MEDICINE
    # ============================================================

    ("George Papanicolaou", "Pathology", "Greece", "HISTORICAL", "TITAN", 15,
     "1883-05-13", "1962-02-19",
     "George Papanicolaou was a Greek-American physician who developed the Pap smear test for detecting cervical cancer. This simple screening test has prevented millions of deaths from cervical cancer worldwide.",
     [],
     [tl(1928, "Developed the Pap smear", "Published first paper on using vaginal smears to detect cancer cells"),
      tl(1943, "Published definitive monograph", "Published 'Diagnosis of Uterine Cancer by the Vaginal Smear,' establishing the Pap test as a screening standard")],
     ["Pap smear (Papanicolaou test)"], ["Cervical cancer screening", "Cytology", "Pap smear", "Cancer prevention"], "New York",
     [aff("Cornell Medical College", "Professor of Clinical Anatomy")]),

    ("Karl Landsteiner", "Immunology", "Austria", "HISTORICAL", "TITAN", 15,
     "1868-06-14", "1943-06-26",
     "Karl Landsteiner was an Austrian-American immunologist who discovered the ABO blood group system, making safe blood transfusions possible. Nobel Prize 1930.",
     ["Nobel Prize in Physiology or Medicine (1930)"],
     [tl(1901, "Discovered ABO blood groups", "Identified the three blood groups A, B, and O, explaining why some blood transfusions caused fatal reactions"),
      tl(1930, "Nobel Prize", "For discovery of human blood groups"),
      tl(1940, "Discovered Rhesus factor", "Co-discovered the Rh blood group system")],
     ["ABO blood group discovery", "Rh factor co-discovery"], ["Blood groups", "Transfusion medicine", "Immunology", "Blood banking"], "New York",
     [aff("Rockefeller Institute for Medical Research", "Member")]),

    # ============================================================
    # PHYSIOLOGY PIONEERS
    # ============================================================

    ("Ivan Pavlov", "Physiology", "Russia", "HISTORICAL", "TITAN", 0,
     "1849-09-26", "1936-02-27",
     "Ivan Pavlov was a Russian physiologist who discovered classical conditioning through his famous experiments with dogs. His work on conditioned reflexes profoundly influenced psychology, neuroscience, and behavioral medicine. Nobel Prize 1904.",
     ["Nobel Prize in Physiology or Medicine (1904)"],
     [tl(1897, "Discovered conditioned reflexes", "Demonstrated that dogs could be conditioned to salivate at the sound of a bell"),
      tl(1904, "Nobel Prize", "For work on the physiology of digestion")],
     ["Classical conditioning"], ["Conditioned reflexes", "Digestive physiology", "Behavioral psychology", "Neurophysiology"], "St. Petersburg",
     [aff("Imperial Military Medical Academy", "Professor of Physiology")], "PhD"),

    ("Walter Cannon", "Physiology", "United States", "HISTORICAL", "TITAN", 20,
     "1871-10-19", "1945-10-01",
     "Walter Cannon was an American physiologist who coined the term 'fight or flight response' and the concept of 'homeostasis.' He also pioneered the use of X-rays for studying the gastrointestinal tract.",
     [],
     [tl(1915, "Described fight-or-flight response", "Published Bodily Changes in Pain, Hunger, Fear and Rage, describing the sympathetic stress response"),
      tl(1932, "Coined 'homeostasis'", "Published The Wisdom of the Body, introducing the concept of physiological homeostasis")],
     ["Fight-or-flight response concept", "Homeostasis concept"], ["Homeostasis", "Fight-or-flight response", "Autonomic nervous system", "Stress physiology"], "Boston",
     [aff("Harvard Medical School", "George Higginson Professor of Physiology")]),
]

for args in docs:
    if isinstance(args, tuple) and len(args) >= 5:
        result = make_profile(*args)
        if result:
            created.append(result)

print(f"Created {len(created)} new profiles")
for c in sorted(created):
    print(f"  + {c}")
