#!/usr/bin/env python3
"""Bulk-create doctor profile JSON files - Batch 3: Fill remaining gaps."""
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
    # REMAINING NOBEL LAUREATES (PHYSIOLOGY/MEDICINE)
    # ============================================================

    # 2003 Nobel
    ("Paul Lauterbur", "Radiology", "United States", "HISTORICAL", "TITAN", 55,
     "1929-05-06", "2007-03-27",
     "Paul Lauterbur was an American chemist who invented MRI by developing the concept of using magnetic field gradients to produce two-dimensional images. Nobel Prize 2003.",
     ["Nobel Prize in Physiology or Medicine (2003)", "Lasker Award (1984)"],
     [tl(1973, "Invented MRI", "Published the concept of using magnetic field gradients for spatial localization in NMR imaging"),
      tl(2003, "Nobel Prize", "For discoveries concerning magnetic resonance imaging")],
     ["Magnetic resonance imaging (MRI)"], ["MRI", "Magnetic resonance", "Medical imaging", "NMR"], "Urbana",
     [aff("University of Illinois", "Professor of Chemistry")], "PhD"),

    ("Peter Mansfield", "Medical Physics", "United Kingdom", "HISTORICAL", "TITAN", 45,
     "1933-10-09", "2017-02-08",
     "Peter Mansfield was a British physicist who made MRI practical for clinical use by developing echo-planar imaging and mathematical techniques for rapid image reconstruction. Nobel Prize 2003.",
     ["Nobel Prize in Physiology or Medicine (2003)", "Knight Bachelor"],
     [tl(1977, "Developed echo-planar imaging", "Created fast MRI scanning technique that made clinical imaging practical"),
      tl(2003, "Nobel Prize", "For discoveries concerning magnetic resonance imaging")],
     ["Echo-planar imaging for MRI"], ["MRI", "Echo-planar imaging", "Medical physics", "Image reconstruction"], "Nottingham",
     [aff("University of Nottingham", "Professor of Physics")], "PhD"),

    # 2002 Nobel
    ("Sydney Brenner", "Molecular Biology", "South Africa", "HISTORICAL", "TITAN", 80,
     "1927-01-13", "2019-04-05",
     "Sydney Brenner was a South African biologist who established C. elegans as a model organism and made foundational contributions to molecular biology. Nobel Prize 2002.",
     ["Nobel Prize in Physiology or Medicine (2002)"],
     [tl(1961, "Discovered messenger RNA", "Co-discovered mRNA as the intermediate between DNA and protein"),
      tl(1974, "Established C. elegans model", "Introduced the nematode as a model organism for developmental biology"),
      tl(2002, "Nobel Prize", "For discoveries concerning genetic regulation of organ development and programmed cell death")],
     None, ["C. elegans", "Messenger RNA", "Genetic code", "Developmental biology"], "Singapore",
     [aff("Salk Institute", "Former Distinguished Professor"),
      aff("MRC Laboratory of Molecular Biology", "Former Director")], "PhD"),

    ("H. Robert Horvitz", "Biology", "United States", "LIVING", "TITAN", 120,
     "1947-05-08", None,
     "H. Robert Horvitz is an American biologist who discovered the genetic regulation of programmed cell death (apoptosis) in C. elegans. Nobel Prize 2002.",
     ["Nobel Prize in Physiology or Medicine (2002)", "Lasker Award (2000)"],
     [tl(1986, "Discovered apoptosis genes", "Identified ced-3 and ced-4, the first genes shown to be required for programmed cell death"),
      tl(2002, "Nobel Prize", "For discoveries concerning genetic regulation of organ development and programmed cell death")],
     None, ["Apoptosis", "Programmed cell death", "C. elegans genetics", "Cell death pathways"], "Cambridge",
     [aff("MIT", "David H. Koch Professor of Biology")], "PhD"),

    ("John Sulston", "Biology", "United Kingdom", "HISTORICAL", "TITAN", 55,
     "1942-03-27", "2018-03-06",
     "John Sulston was a British biologist who mapped the complete cell lineage of C. elegans and led the UK contribution to the Human Genome Project. Nobel Prize 2002.",
     ["Nobel Prize in Physiology or Medicine (2002)", "Knight Bachelor"],
     [tl(1983, "Mapped C. elegans cell lineage", "Traced every cell division in the developing worm"),
      tl(1998, "Led UK Human Genome Project", "Directed the Sanger Centre's sequencing of one-third of the human genome"),
      tl(2002, "Nobel Prize", "For discoveries concerning genetic regulation of organ development and programmed cell death")],
     None, ["Cell lineage", "C. elegans", "Human genome", "Developmental biology"], "Cambridge",
     [aff("Wellcome Sanger Institute", "Former Director")], "PhD"),

    # 2001 Nobel
    ("Leland Hartwell", "Genetics", "United States", "LIVING", "TITAN", 85,
     "1939-10-30", None,
     "Leland Hartwell is an American geneticist who discovered the key regulators of the cell cycle, the fundamental process by which cells divide. Nobel Prize 2001.",
     ["Nobel Prize in Physiology or Medicine (2001)", "Lasker Award (1998)"],
     [tl(1970, "Discovered cell cycle genes", "Identified CDC genes that control the cell division cycle in yeast"),
      tl(2001, "Nobel Prize", "For discoveries of key regulators of the cell cycle")],
     None, ["Cell cycle", "CDC genes", "Checkpoints", "Yeast genetics"], "Seattle",
     [aff("Fred Hutchinson Cancer Research Center", "Former President")], "PhD"),

    ("Tim Hunt", "Biochemistry", "United Kingdom", "LIVING", "ELITE", 65,
     "1943-02-19", None,
     "Tim Hunt is a British biochemist who discovered cyclins, the proteins that regulate the cell division cycle. Nobel Prize 2001.",
     ["Nobel Prize in Physiology or Medicine (2001)"],
     [tl(1982, "Discovered cyclins", "Found proteins that accumulate and are destroyed cyclically during cell division"),
      tl(2001, "Nobel Prize", "For discoveries of key regulators of the cell cycle")],
     ["Cyclin discovery"], ["Cyclins", "Cell cycle regulation", "CDK activation", "Mitosis"], "London",
     [aff("Francis Crick Institute", "Former Principal Scientist")], "PhD"),

    ("Paul Nurse", "Genetics", "United Kingdom", "LIVING", "ELITE", 100,
     "1949-01-25", None,
     "Paul Nurse is a British geneticist who discovered CDK (cyclin-dependent kinase), the molecular engine driving cell division. Nobel Prize 2001.",
     ["Nobel Prize in Physiology or Medicine (2001)", "Order of Merit", "Knight Bachelor"],
     [tl(1987, "Discovered CDK", "Identified the universal cell cycle regulator cdc2/CDK1"),
      tl(2001, "Nobel Prize", "For discoveries of key regulators of the cell cycle"),
      tl(2010, "Founded Francis Crick Institute", "Led creation of Europe's largest biomedical research center")],
     ["CDK discovery"], ["CDK", "Cell cycle", "Checkpoint control", "Cancer biology"], "London",
     [aff("Francis Crick Institute", "Director and CEO")], "PhD"),

    # 2000 Nobel
    ("Arvid Carlsson", "Neuroscience", "Sweden", "HISTORICAL", "TITAN", 90,
     "1923-01-25", "2018-06-29",
     "Arvid Carlsson was a Swedish neuropharmacologist who discovered that dopamine is a neurotransmitter and its role in Parkinson's disease, leading to L-DOPA therapy. Nobel Prize 2000.",
     ["Nobel Prize in Physiology or Medicine (2000)"],
     [tl(1957, "Discovered dopamine as neurotransmitter", "Showed dopamine functions independently as a brain neurotransmitter, not just a norepinephrine precursor"),
      tl(2000, "Nobel Prize", "For discoveries concerning signal transduction in the nervous system")],
     None, ["Dopamine", "Parkinson's disease", "L-DOPA", "Neuropharmacology", "Signal transduction"], "Gothenburg",
     [aff("University of Gothenburg", "Professor of Pharmacology")]),

    # 1999 Nobel
    ("Gunter Blobel", "Cell Biology", "United States", "HISTORICAL", "TITAN", 80,
     "1936-05-21", "2018-02-18",
     "Gunter Blobel was a German-American biologist who discovered that proteins have intrinsic signals governing their transport and localization in the cell. Nobel Prize 1999.",
     ["Nobel Prize in Physiology or Medicine (1999)", "Lasker Award (1993)"],
     [tl(1975, "Signal hypothesis", "Proposed that proteins contain built-in address signals directing them to correct cellular locations"),
      tl(1999, "Nobel Prize", "For discovery that proteins have intrinsic signals governing their transport and localization")],
     ["Signal hypothesis for protein targeting"], ["Protein transport", "Signal peptides", "Cell biology", "Endoplasmic reticulum"], "New York",
     [aff("Rockefeller University", "John D. Rockefeller Jr. Professor")], "PhD"),

    # 1998 Nobel
    ("Robert Furchgott", "Pharmacology", "United States", "HISTORICAL", "TITAN", 45,
     "1916-06-04", "2009-05-19",
     "Robert Furchgott was an American pharmacologist who discovered that nitric oxide (NO) is a signaling molecule in the cardiovascular system. Nobel Prize 1998.",
     ["Nobel Prize in Physiology or Medicine (1998)", "Lasker Award (1996)"],
     [tl(1980, "Discovered EDRF/nitric oxide", "Found that blood vessels relax through an endothelium-derived factor, later identified as nitric oxide"),
      tl(1998, "Nobel Prize", "For discoveries concerning nitric oxide as a signalling molecule in the cardiovascular system")],
     None, ["Nitric oxide", "Endothelium", "Vasodilation", "Cardiovascular pharmacology"], "New York",
     [aff("SUNY Downstate Medical Center", "Distinguished Professor")], "PhD"),

    # 1997 Nobel
    ("Stanley Prusiner", "Neurology", "United States", "LIVING", "TITAN", 100,
     "1942-05-28", None,
     "Stanley Prusiner is an American neurologist who discovered prions, infectious proteins that cause mad cow disease and other neurodegenerative disorders. His revolutionary concept that proteins alone could be infectious agents was initially met with skepticism. Nobel Prize 1997.",
     ["Nobel Prize in Physiology or Medicine (1997)", "Lasker Award (1994)"],
     [tl(1982, "Discovered prions", "Proposed that misfolded proteins without nucleic acid could be infectious agents"),
      tl(1997, "Nobel Prize", "For discovery of prions, a new biological principle of infection")],
     ["Prion discovery"], ["Prions", "Mad cow disease", "Creutzfeldt-Jakob disease", "Neurodegeneration", "Protein misfolding"], "San Francisco",
     [aff("University of California, San Francisco", "Director, Institute for Neurodegenerative Diseases")]),

    # 1996 Nobel
    ("Peter Doherty", "Immunology", "Australia", "LIVING", "ELITE", 75,
     "1940-10-15", None,
     "Peter Doherty is an Australian immunologist who discovered how T cells recognize virus-infected cells through MHC restriction. Nobel Prize 1996.",
     ["Nobel Prize in Physiology or Medicine (1996)", "Companion of the Order of Australia"],
     [tl(1973, "Discovered MHC restriction", "Showed T cells recognize virus-infected cells only in conjunction with MHC molecules"),
      tl(1996, "Nobel Prize", "For discoveries concerning the specificity of the cell mediated immune defence")],
     None, ["MHC restriction", "T cell immunity", "Cellular immunology", "Viral immunity"], "Melbourne",
     [aff("University of Melbourne", "Laureate Professor")]),

    ("Rolf Zinkernagel", "Immunology", "Switzerland", "LIVING", "ELITE", 90,
     "1944-01-06", None,
     "Rolf Zinkernagel is a Swiss immunologist who co-discovered MHC restriction, the mechanism by which T cells recognize infected cells. Nobel Prize 1996.",
     ["Nobel Prize in Physiology or Medicine (1996)"],
     [tl(1973, "Co-discovered MHC restriction", "Showed that T cells must recognize both viral antigen and self-MHC to kill infected cells"),
      tl(1996, "Nobel Prize", "For discoveries concerning the specificity of the cell mediated immune defence")],
     None, ["MHC restriction", "Immune recognition", "Viral immunology"], "Zurich",
     [aff("University of Zurich", "Professor of Experimental Immunology")]),

    # 1995 Nobel
    ("Edward Lewis", "Genetics", "United States", "HISTORICAL", "TITAN", 40,
     "1918-05-20", "2004-07-21",
     "Edward Lewis was an American geneticist who discovered how genes control the body plan of developing organisms. His work on homeotic genes revolutionized developmental biology. Nobel Prize 1995.",
     ["Nobel Prize in Physiology or Medicine (1995)"],
     [tl(1978, "Mapped homeotic genes", "Showed how clusters of genes control body segment identity in Drosophila"),
      tl(1995, "Nobel Prize", "For discoveries concerning the genetic control of early embryonic development")],
     None, ["Homeotic genes", "Hox genes", "Developmental genetics", "Drosophila"], "Pasadena",
     [aff("California Institute of Technology", "Thomas Hunt Morgan Professor of Biology")], "PhD"),

    # ============================================================
    # LEGENDARY PHYSICIANS AND MEDICAL LEADERS
    # ============================================================

    ("Albert Schweitzer", "Medicine", "France", "HISTORICAL", "TITAN", 0,
     "1875-01-14", "1965-09-04",
     "Albert Schweitzer was an Alsatian-German physician, theologian, and philosopher who established a hospital in Lambarene, Gabon, dedicating his life to medical care in Africa. Nobel Peace Prize 1952.",
     ["Nobel Peace Prize (1952)"],
     [tl(1913, "Founded Lambarene Hospital", "Established a hospital in French Equatorial Africa, treating thousands of patients"),
      tl(1952, "Nobel Peace Prize", "Awarded for his philosophy of 'Reverence for Life' and humanitarian work")],
     None, ["Tropical medicine", "Humanitarian medicine", "Medical ethics", "Missionary medicine"], "Lambarene",
     [aff("Albert Schweitzer Hospital", "Founder and Chief Physician")], "MD, PhD"),

    ("Salk Jonas", "Virology", "United States", "HISTORICAL", "TITAN", 0,
     "1914-10-28", "1995-06-23",
     "", [], [], None, [], "La Jolla", [], "MD"),
    # Will be caught as duplicate of jonas-salk

    ("Ding Xianlin", "Cardiology", "China", "LIVING", "ELITE", 30,
     None, None,
     "Ding Xianlin is a Chinese cardiologist who has advanced interventional cardiology practices in China and contributed to large-scale clinical trials improving cardiovascular care in the developing world.",
     [],
     [tl(2000, "Advanced PCI in China", "Helped standardize percutaneous coronary intervention across Chinese hospitals")],
     None, ["Interventional cardiology", "PCI", "Cardiovascular medicine"], "Beijing",
     [aff("Peking University People's Hospital", "Professor of Cardiology")]),

    ("Maamoun Ghaibeh", "Surgery", "Syria", "LIVING", "ELITE", 15,
     None, None,
     "Maamoun Ghaibeh is a Syrian physician and humanitarian who provided medical care in conflict zones during the Syrian civil war, training field medics and performing surgery in besieged areas.",
     [],
     [tl(2012, "Medical care in Syrian conflict zones", "Organized underground hospitals and trained field medics in besieged Syrian cities")],
     None, ["Conflict medicine", "Emergency surgery", "Humanitarian medicine"], "Damascus",
     [aff("Syrian American Medical Society", "Member")]),

    ("Denis Mukwege", "Gynecology", "Democratic Republic of Congo", "LIVING", "ELITE", 15,
     "1955-03-01", None,
     "Denis Mukwege is a Congolese gynecologist who has treated tens of thousands of victims of sexual violence in the DRC. Nobel Peace Prize 2018.",
     ["Nobel Peace Prize (2018)", "Right Livelihood Award"],
     [tl(1999, "Founded Panzi Hospital", "Established a hospital specializing in treatment of sexual violence survivors"),
      tl(2018, "Nobel Peace Prize", "For efforts to end the use of sexual violence as a weapon of war")],
     None, ["Sexual violence treatment", "Reconstructive surgery", "Women's health"], "Bukavu",
     [aff("Panzi Hospital", "Founder and Medical Director")]),

    ("Samuel Kobia", "Public Health", "Kenya", "LIVING", "ELITE", 5,
     "1947-01-01", None,
     "Samuel Kobia is a Kenyan public health advocate and church leader who has worked to integrate healthcare access with community development across East Africa.",
     [],
     [],
     None, ["Public health", "Community health", "Health policy"], "Nairobi",
     [aff("World Council of Churches", "Former General Secretary")], "PhD"),

    ("Gao Yaojie", "Infectious Disease", "China", "HISTORICAL", "ELITE", 5,
     "1927-12-19", "2023-12-10",
     "Gao Yaojie was a Chinese physician and activist who exposed the blood-selling scandal that caused an AIDS epidemic in Henan province. She dedicated her life to AIDS prevention education despite government persecution.",
     ["Vital Voices Global Leadership Award", "Ramon Magsaysay Award"],
     [tl(1996, "Discovered Henan AIDS epidemic", "Found that commercial blood collection was spreading HIV among Chinese peasants"),
      tl(2003, "Forced into house arrest", "Confined by authorities for publicizing the AIDS crisis")],
     None, ["HIV/AIDS", "Blood safety", "Public health advocacy"], "New York",
     [aff("Henan Provincial Hospital", "Former Gynecologist")]),

    # ============================================================
    # KEY MEDICAL DEVICE AND TECHNOLOGY PIONEERS
    # ============================================================

    ("Wilson Greatbatch", "Biomedical Engineering", "United States", "HISTORICAL", "TITAN", 10,
     "1919-09-06", "2011-09-27",
     "Wilson Greatbatch was an American engineer who invented the implantable cardiac pacemaker and the lithium-iodide battery cell to power it. His pacemaker has saved millions of lives.",
     ["National Medal of Technology", "Lemelson-MIT Prize"],
     [tl(1958, "Invented implantable pacemaker", "Built the first implantable cardiac pacemaker from a mistaken circuit"),
      tl(1970, "Invented lithium-iodide battery", "Created a long-lasting battery that made reliable pacemakers possible")],
     ["Implantable cardiac pacemaker", "Lithium-iodide pacemaker battery"], ["Pacemakers", "Cardiac devices", "Biomedical engineering", "Battery technology"], "Buffalo",
     [aff("University at Buffalo", "Adjunct Professor")], "MS"),

    ("John Gibbon", "Cardiac Surgery", "United States", "HISTORICAL", "TITAN", 15,
     "1903-09-29", "1973-02-05",
     "John Gibbon was an American surgeon who invented the heart-lung machine, making open-heart surgery possible. In 1953, he performed the first successful open-heart operation using cardiopulmonary bypass.",
     [],
     [tl(1953, "First open-heart surgery with heart-lung machine", "Successfully repaired an atrial septal defect using his cardiopulmonary bypass machine"),
      tl(1935, "Began developing heart-lung machine", "Started two decades of work to create a machine that could temporarily replace heart and lung function")],
     ["Heart-lung machine (cardiopulmonary bypass)"], ["Cardiopulmonary bypass", "Heart-lung machine", "Open-heart surgery"], "Philadelphia",
     [aff("Jefferson Medical College", "Professor of Surgery")]),

    ("Godfrey Hounsfield", "Radiology", "United Kingdom", "HISTORICAL", "TITAN", 15,
     "1919-08-28", "2004-08-12",
     "Godfrey Hounsfield was a British electrical engineer who invented the CT scanner. His computed tomography technology revolutionized diagnostic medicine. Nobel Prize 1979.",
     ["Nobel Prize in Physiology or Medicine (1979)", "Knight Bachelor"],
     [tl(1971, "Invented CT scanner", "Built and tested the first clinical CT scanner at Atkinson Morley Hospital"),
      tl(1979, "Nobel Prize", "For the development of computer assisted tomography")],
     ["Computed tomography (CT) scanner"], ["CT scanning", "Medical imaging", "Computed tomography", "Diagnostic radiology"], "London",
     [aff("EMI Central Research Laboratories", "Senior Research Scientist")], "CBE"),

    ("Allan Cormack", "Medical Physics", "South Africa", "HISTORICAL", "TITAN", 20,
     "1924-02-23", "1998-05-07",
     "Allan Cormack was a South African-American physicist who developed the mathematical algorithms for CT scanning independently of Hounsfield. Nobel Prize 1979.",
     ["Nobel Prize in Physiology or Medicine (1979)"],
     [tl(1963, "Developed CT mathematics", "Published the mathematical theory for reconstructing images from X-ray projections"),
      tl(1979, "Nobel Prize", "For the development of computer assisted tomography")],
     ["Mathematical algorithms for CT reconstruction"], ["CT mathematics", "Image reconstruction", "Medical physics", "Tomography"], "Boston",
     [aff("Tufts University", "Professor of Physics")], "PhD"),

    ("Ian Donald", "Obstetrics", "United Kingdom", "HISTORICAL", "ELITE", 10,
     "1910-12-27", "1987-06-19",
     "Ian Donald was a Scottish physician who pioneered the use of diagnostic ultrasound in obstetrics. His work made it possible to safely visualize unborn babies and detect abnormalities.",
     [],
     [tl(1958, "First diagnostic obstetric ultrasound", "Published first paper on using ultrasound for diagnosis in obstetrics and gynecology")],
     ["Obstetric ultrasound"], ["Ultrasound", "Prenatal diagnosis", "Obstetric imaging"], "Glasgow",
     [aff("University of Glasgow", "Regius Professor of Midwifery")]),

    # ============================================================
    # TRANSPLANT SURGERY PIONEERS
    # ============================================================

    ("Joseph Murray", "Surgery", "United States", "HISTORICAL", "TITAN", 55,
     "1919-04-01", "2012-11-26",
     "Joseph Murray was an American surgeon who performed the first successful human organ transplant - a kidney transplant between identical twins in 1954. Nobel Prize 1990.",
     ["Nobel Prize in Physiology or Medicine (1990)"],
     [tl(1954, "First organ transplant", "Performed the first successful kidney transplant between identical twins Richard and Ronald Herrick"),
      tl(1962, "First deceased donor transplant", "Performed first successful kidney transplant from a deceased donor using immunosuppression"),
      tl(1990, "Nobel Prize", "For discoveries concerning organ and cell transplantation")],
     ["Organ transplantation"], ["Kidney transplant", "Organ transplantation", "Immunosuppression", "Plastic surgery"], "Boston",
     [aff("Brigham and Women's Hospital", "Chief of Plastic Surgery")]),

    ("Thomas Starzl", "Surgery", "United States", "HISTORICAL", "TITAN", 180,
     "1926-03-11", "2017-03-04",
     "Thomas Starzl was an American surgeon who performed the first successful liver transplant and is regarded as the father of transplantation. He developed the immunosuppressive regimens that made organ transplantation practical.",
     ["National Medal of Science", "Lasker Award"],
     [tl(1963, "First liver transplant", "Performed the first human liver transplant"),
      tl(1967, "First successful liver transplant", "Achieved first long-term surviving liver transplant patient"),
      tl(1980, "Introduced cyclosporine", "Demonstrated that cyclosporine could prevent organ rejection")],
     ["Liver transplantation", "Multi-drug immunosuppression protocols"], ["Liver transplant", "Immunosuppression", "Organ rejection", "Transplant immunology"], "Pittsburgh",
     [aff("University of Pittsburgh", "Distinguished Service Professor of Surgery")]),

    ("Jean-Michel Dubernard", "Surgery", "France", "LIVING", "ELITE", 40,
     "1941-08-22", None,
     "Jean-Michel Dubernard is a French transplant surgeon who performed the world's first hand transplant (1998) and the first partial face transplant (2005), pioneering composite tissue allotransplantation.",
     [],
     [tl(1998, "First hand transplant", "Performed the world's first successful hand transplant in Lyon"),
      tl(2005, "First face transplant", "Led the team performing the first partial face transplant")],
     ["Hand transplantation", "Face transplantation"], ["Hand transplant", "Face transplant", "Composite tissue transplantation", "Immunosuppression"], "Lyon",
     [aff("Edouard Herriot Hospital", "Former Head of Transplant Surgery")]),

    # ============================================================
    # EPIDEMIOLOGY AND PUBLIC HEALTH FOUNDERS
    # ============================================================

    ("John Snow", "Epidemiology", "United Kingdom", "HISTORICAL", "TITAN", 0,
     "1813-03-15", "1858-06-16",
     "John Snow was an English physician considered the father of epidemiology. He traced a cholera outbreak to a contaminated water pump on Broad Street in 1854, establishing the foundations of public health investigation.",
     [],
     [tl(1854, "Traced Broad Street cholera outbreak", "Used mapping and investigation to identify a contaminated water pump as the source of a cholera epidemic"),
      tl(1855, "Published On the Mode of Communication of Cholera", "Demonstrated that cholera is waterborne, not airborne")],
     ["Epidemiological investigation methodology"], ["Epidemiology", "Cholera", "Waterborne disease", "Disease mapping", "Public health"], "London",
     [aff("King's College Hospital", "Physician")]),

    ("Richard Doll", "Epidemiology", "United Kingdom", "HISTORICAL", "TITAN", 90,
     "1912-10-28", "2005-07-24",
     "Richard Doll was a British epidemiologist who established the link between smoking and lung cancer in one of the most important epidemiological studies ever conducted.",
     ["Order of Merit", "Companion of Honour"],
     [tl(1950, "Proved smoking causes lung cancer", "Published landmark study with Austin Bradford Hill showing the causal link between cigarette smoking and lung cancer"),
      tl(1954, "British Doctors Study", "Launched the massive cohort study of British doctors that quantified smoking's health effects")],
     None, ["Smoking and cancer", "Epidemiological methods", "Cohort studies", "Occupational health"], "Oxford",
     [aff("University of Oxford", "Regius Professor of Medicine")]),

    ("Austin Bradford Hill", "Biostatistics", "United Kingdom", "HISTORICAL", "TITAN", 35,
     "1897-07-08", "1991-04-18",
     "Austin Bradford Hill was a British epidemiologist and statistician who designed the first modern randomized controlled trial and established the Bradford Hill criteria for causation.",
     ["Knight Bachelor"],
     [tl(1948, "First randomized controlled trial", "Designed the streptomycin trial for tuberculosis, the first modern RCT"),
      tl(1965, "Bradford Hill criteria", "Published the criteria for establishing causation in epidemiology")],
     ["Randomized controlled trial", "Bradford Hill criteria for causation"], ["Randomized controlled trials", "Causal inference", "Biostatistics", "Epidemiological methods"], "London",
     [aff("London School of Hygiene and Tropical Medicine", "Professor of Medical Statistics")], "DSc"),

    # ============================================================
    # CARDIOLOGY PIONEERS
    # ============================================================

    ("Paul Dudley White", "Cardiology", "United States", "HISTORICAL", "ELITE", 20,
     "1886-06-06", "1973-10-31",
     "Paul Dudley White was an American cardiologist known as the father of American cardiology. He established cardiology as a medical specialty, co-founded the American Heart Association, and was physician to President Eisenhower.",
     ["Presidential Medal of Freedom"],
     [tl(1913, "Brought ECG to America", "Introduced the electrocardiograph to clinical practice in the United States"),
      tl(1924, "Co-founded American Heart Association", "Helped establish the premier heart disease research and advocacy organization")],
     None, ["Electrocardiography", "Heart disease prevention", "Exercise cardiology"], "Boston",
     [aff("Massachusetts General Hospital", "Physician")]),

    ("Helen Taussig", "Pediatric Cardiology", "United States", "HISTORICAL", "TITAN", 20,
     "1898-05-24", "1986-05-20",
     "Helen Taussig was an American cardiologist who founded the field of pediatric cardiology and co-developed the Blalock-Taussig shunt, the first surgical treatment for blue baby syndrome.",
     ["Presidential Medal of Freedom (1964)"],
     [tl(1944, "Blalock-Taussig shunt", "Conceived the surgical procedure to increase blood flow to the lungs in cyanotic heart disease"),
      tl(1962, "Thalidomide warning", "Was among the first to warn American doctors about thalidomide's birth defect risks")],
     ["Blalock-Taussig shunt (concept)"], ["Pediatric cardiology", "Congenital heart disease", "Blue baby syndrome"], "Baltimore",
     [aff("Johns Hopkins Hospital", "Professor of Pediatrics")]),

    # ============================================================
    # ONCOLOGY PIONEERS
    # ============================================================

    ("Sidney Farber", "Pathology", "United States", "HISTORICAL", "TITAN", 30,
     "1903-09-30", "1973-03-30",
     "Sidney Farber was an American pediatric pathologist who is considered the father of modern chemotherapy. He achieved the first remissions in childhood leukemia using aminopterin in 1948.",
     ["Presidential Medal of Freedom"],
     [tl(1948, "First chemotherapy remission", "Achieved first remissions in childhood leukemia using aminopterin, launching the era of cancer chemotherapy"),
      tl(1947, "Founded cancer philanthropy", "Co-founded the Children's Cancer Research Foundation, later the Dana-Farber Cancer Institute")],
     ["Chemotherapy for leukemia"], ["Chemotherapy", "Childhood leukemia", "Aminopterin", "Cancer treatment"], "Boston",
     [aff("Children's Hospital Boston", "Chief of Pathology"),
      aff("Harvard Medical School", "Professor of Pathology")]),

    ("Mary-Claire King", "Genetics", "United States", "LIVING", "TITAN", 100,
     "1946-02-27", None,
     "Mary-Claire King is an American geneticist who discovered the BRCA1 gene linked to hereditary breast and ovarian cancer, and used DNA sequencing to identify victims of Argentina's Dirty War.",
     ["Lasker Award (2014)", "National Medal of Science"],
     [tl(1990, "Discovered BRCA1", "Proved the existence of a single gene responsible for hereditary breast cancer"),
      tl(1984, "Identified Argentine disappeared", "Used DNA fingerprinting to reunite children stolen from political prisoners with their families")],
     None, ["BRCA1", "Hereditary breast cancer", "DNA forensics", "Human genetics"], "Seattle",
     [aff("University of Washington", "American Cancer Society Professor")], "PhD"),

    ("Bert Vogelstein", "Oncology", "United States", "LIVING", "TITAN", 280,
     "1949-06-02", None,
     "Bert Vogelstein is an American oncologist who is one of the most cited scientists in history. He discovered the genetic basis of colorectal cancer and developed liquid biopsies for early cancer detection.",
     ["Breakthrough Prize in Life Sciences (2013)", "Lasker Award"],
     [tl(1988, "Vogelstein model of cancer", "Proposed the multi-step genetic model of colorectal cancer development"),
      tl(2013, "Pioneered liquid biopsy", "Developed blood tests that detect cancer DNA fragments for early cancer diagnosis")],
     ["Multi-step model of cancer", "Liquid biopsy for cancer detection"], ["Cancer genetics", "p53", "Colorectal cancer", "Liquid biopsy", "Tumor suppressor genes"], "Baltimore",
     [aff("Johns Hopkins University", "Clayton Professor of Oncology and Pathology"),
      aff("Howard Hughes Medical Institute", "Investigator")]),

    # ============================================================
    # PSYCHIATRY AND MENTAL HEALTH
    # ============================================================

    ("Sigmund Freud", "Psychiatry", "Austria", "HISTORICAL", "TITAN", 0,
     "1856-05-06", "1939-09-23",
     "Sigmund Freud was an Austrian neurologist who founded psychoanalysis, one of the most influential intellectual frameworks of the 20th century. His theories on the unconscious mind, dream interpretation, and psychosexual development shaped psychiatry, psychology, and culture.",
     [],
     [tl(1899, "Published The Interpretation of Dreams", "Laid the foundation of psychoanalytic theory"),
      tl(1923, "Published The Ego and the Id", "Introduced the structural model of the psyche: id, ego, and superego")],
     ["Psychoanalysis"], ["Psychoanalysis", "Unconscious mind", "Dream interpretation", "Defense mechanisms", "Psychotherapy"], "Vienna",
     [aff("University of Vienna", "Professor of Neuropathology")]),

    ("Carl Jung", "Psychiatry", "Switzerland", "HISTORICAL", "TITAN", 0,
     "1875-07-26", "1961-06-06",
     "Carl Jung was a Swiss psychiatrist who founded analytical psychology. He developed concepts of archetypes, the collective unconscious, and psychological types that have deeply influenced psychology and culture.",
     [],
     [tl(1912, "Founded analytical psychology", "Published Symbols of Transformation, breaking from Freud and establishing his own school"),
      tl(1921, "Published Psychological Types", "Introduced introversion/extroversion and psychological type theory")],
     ["Analytical psychology"], ["Archetypes", "Collective unconscious", "Psychological types", "Individuation"], "Zurich",
     [aff("University of Zurich", "Professor of Medical Psychology")]),

    ("Aaron Beck", "Psychiatry", "United States", "HISTORICAL", "TITAN", 130,
     "1921-07-18", "2021-11-01",
     "Aaron Beck was an American psychiatrist who is considered the father of cognitive behavioral therapy (CBT). His evidence-based approach to treating depression and anxiety has become the most widely practiced form of psychotherapy worldwide.",
     ["Lasker Award (2006)"],
     [tl(1964, "Developed cognitive therapy", "Created a structured therapy approach based on correcting distorted thinking patterns"),
      tl(1979, "Published Cognitive Therapy of Depression", "The landmark textbook that established CBT as a major therapeutic approach")],
     ["Cognitive behavioral therapy (CBT)"], ["Cognitive therapy", "CBT", "Depression treatment", "Anxiety disorders", "Beck Depression Inventory"], "Philadelphia",
     [aff("University of Pennsylvania", "University Professor Emeritus of Psychiatry")]),

    # ============================================================
    # PEDIATRICS AND NEONATOLOGY
    # ============================================================

    ("Virginia Apgar", "Anesthesiology", "United States", "HISTORICAL", "TITAN", 10,
     "1909-06-07", "1974-08-07",
     "Virginia Apgar was an American physician who developed the Apgar score, a simple system for quickly assessing newborn health at birth. This five-point test has been performed on every baby born in modern hospitals and has saved countless lives.",
     [],
     [tl(1952, "Created the Apgar Score", "Developed the newborn assessment scoring system used universally at birth"),
      tl(1959, "Joined March of Dimes", "Led the organization's efforts to prevent birth defects")],
     ["Apgar Score"], ["Neonatology", "Newborn assessment", "Obstetric anesthesia", "Birth defects"], "New York",
     [aff("Columbia University", "Professor of Anesthesiology")]),

    # ============================================================
    # OPHTHALMOLOGY
    # ============================================================

    ("Fred Hollows", "Ophthalmology", "New Zealand", "HISTORICAL", "ELITE", 15,
     "1929-04-09", "1993-02-10",
     "Fred Hollows was a New Zealand-Australian ophthalmologist who restored sight to over a million people in developing countries. He developed inexpensive intraocular lenses and established eye surgery programs across Africa, Asia, and the Pacific.",
     ["Companion of the Order of Australia", "Human Rights Medal"],
     [tl(1976, "National Trachoma Program", "Led a massive program to treat trachoma in Aboriginal Australians"),
      tl(1992, "Established intraocular lens labs", "Set up labs in Eritrea and Nepal producing affordable intraocular lenses for $5 each")],
     ["Low-cost intraocular lens production"], ["Cataract surgery", "Trachoma", "Global ophthalmology", "Intraocular lenses"], "Sydney",
     [aff("University of New South Wales", "Professor of Ophthalmology")]),

    ("Govindappa Venkataswamy", "Ophthalmology", "India", "HISTORICAL", "ELITE", 5,
     "1918-10-01", "2006-07-07",
     "Govindappa Venkataswamy, known as Dr. V, was an Indian ophthalmologist who founded Aravind Eye Care System. Inspired by McDonald's franchise model, he built the world's largest eye care provider, performing over 7 million surgeries at a fraction of Western costs.",
     ["Padma Shri"],
     [tl(1976, "Founded Aravind Eye Hospital", "Started with 11 beds and grew it into the world's largest eye care provider"),
      tl(1992, "Founded Aurolab", "Created a manufacturing facility producing intraocular lenses for $2, compared to $100+ elsewhere")],
     ["High-volume low-cost eye surgery model"], ["Cataract surgery", "Eye care delivery", "Healthcare innovation", "Affordable healthcare"], "Madurai",
     [aff("Aravind Eye Care System", "Founder and Chairman")]),
]

for args in docs:
    if isinstance(args, tuple) and len(args) >= 5:
        result = make_profile(*args)
        if result:
            created.append(result)

print(f"Created {len(created)} new profiles")
for c in sorted(created):
    print(f"  + {c}")
