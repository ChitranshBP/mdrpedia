#!/usr/bin/env python3
"""Bulk-create doctor profile JSON files for notable physicians worldwide."""
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

def make_profile(name, specialty, country, status, tier, hindex=0, born=None, died=None, bio="", awards=None, timeline=None, inventions=None, knows=None, city=None, affiliations=None, title="MD"):
    slug = slugify(name)
    path = os.path.join(CONTENT_DIR, f'{slug}.json')
    if os.path.exists(path):
        return None  # Skip existing

    summary = f"{name} is a {specialty.lower()} specialist"
    if affiliations:
        summary += f" at {affiliations[0]['hospitalName']}"
    summary += f". Based in {country}."

    profile = {
        "fullName": name,
        "slug": slug,
        "title": title,
        "specialty": specialty,
        "geography": {"country": country, "region": None, "city": city},
        "status": status,
        "tier": tier,
        "rankingScore": None,
        "hIndex": hindex,
        "yearsActive": 0,
        "verifiedSurgeries": 0,
        "livesSaved": 0,
        "biography": bio,
        "aiSummary": summary,
        "techniquesInvented": inventions or [],
        "hasInvention": bool(inventions),
        "education": [],
        "socialMedia": {},
        "affiliations": affiliations or [],
        "medicalSpecialty": [specialty],
        "knowsAbout": knows or [],
        "citations": [],
        "awards": awards or [],
        "timeline": timeline or [],
        "subSpecialty": None,
        "dateOfBirth": born,
        "dateOfDeath": died,
        "bioGenerated": True
    }

    with open(path, 'w') as f:
        json.dump(profile, f, indent=2)
    return slug

# Helper for affiliations
def aff(name, role="Professor"):
    return {"hospitalName": name, "role": role, "hospitalUrl": "#"}

def tl(year, title, desc=None):
    return {"year": year, "title": title, "description": desc}

created = []

# ============================================================
# NOBEL PRIZE IN PHYSIOLOGY OR MEDICINE - MISSING LAUREATES
# ============================================================

docs = [
    # 2024 Nobel
    ("Victor Ambros", "Molecular Biology", "United States", "LIVING", "TITAN", 95,
     None, None,
     "Victor Ambros is an American molecular biologist who discovered microRNA, a fundamental mechanism of gene regulation. Nobel Prize 2024.",
     ["Nobel Prize in Physiology or Medicine (2024)"],
     [tl(1993, "Discovered microRNA (lin-4)", "Found the first microRNA in C. elegans, revealing a new layer of gene regulation")],
     None, ["microRNA", "Gene regulation", "C. elegans"], "Waltham",
     [aff("University of Massachusetts Chan Medical School")]),

    ("Gary Ruvkun", "Molecular Biology", "United States", "LIVING", "TITAN", 100,
     None, None,
     "Gary Ruvkun is an American molecular biologist who co-discovered microRNA gene regulation. Nobel Prize 2024.",
     ["Nobel Prize in Physiology or Medicine (2024)"],
     [tl(2000, "Showed microRNA conservation across species", "Demonstrated that microRNA regulation is conserved from worms to humans")],
     None, ["microRNA", "Gene regulation", "RNAi"], "Boston",
     [aff("Massachusetts General Hospital"), aff("Harvard Medical School")]),

    # 2023 Nobel
    ("Katalin Kariko", "Biochemistry", "Hungary", "LIVING", "TITAN", 75,
     "1955-01-17", None,
     "Katalin Kariko is a Hungarian-American biochemist whose work on modified mRNA enabled the development of COVID-19 vaccines. Nobel Prize 2023.",
     ["Nobel Prize in Physiology or Medicine (2023)", "Lasker Award (2021)", "Breakthrough Prize in Life Sciences"],
     [tl(2005, "Published key mRNA modification paper", "Showed that modified nucleosides suppress immune response to mRNA, enabling therapeutic use"),
      tl(2023, "Nobel Prize in Physiology or Medicine")],
     ["Modified mRNA technology for vaccines"], ["mRNA therapeutics", "Nucleoside modifications", "COVID-19 vaccines"], "Philadelphia",
     [aff("University of Szeged"), aff("BioNTech", "Senior Vice President")]),

    # Missing older Nobel laureates
    ("Robert Edwards", "Reproductive Medicine", "United Kingdom", "HISTORICAL", "TITAN", 75,
     "1925-09-27", "2013-04-10",
     "Robert Edwards was a British physiologist who developed in vitro fertilization (IVF), resulting in the first IVF baby Louise Brown in 1978. Nobel Prize 2010.",
     ["Nobel Prize in Physiology or Medicine (2010)"],
     [tl(1978, "First IVF baby born", "Louise Joy Brown, the first baby conceived through IVF, was born on July 25, 1978")],
     ["In vitro fertilization (IVF)"], ["IVF", "Reproductive biology", "Embryology"], "Cambridge",
     [aff("University of Cambridge")]),

    ("Yoshinori Ohsumi", "Cell Biology", "Japan", "LIVING", "TITAN", 80,
     "1945-02-09", None,
     "Yoshinori Ohsumi is a Japanese cell biologist who discovered the mechanisms of autophagy, the cell's recycling system. Nobel Prize 2016.",
     ["Nobel Prize in Physiology or Medicine (2016)"],
     [tl(1992, "Discovered autophagy genes in yeast", "Identified key genes controlling autophagy using baker's yeast"),
      tl(2016, "Nobel Prize in Physiology or Medicine")],
     None, ["Autophagy", "Cell biology", "Lysosomal degradation"], "Tokyo",
     [aff("Tokyo Institute of Technology")]),

    ("Tu Youyou", "Pharmacology", "China", "LIVING", "TITAN", 30,
     "1930-12-30", None,
     "Tu Youyou is a Chinese pharmaceutical chemist who discovered artemisinin, the most effective antimalarial drug. Nobel Prize 2015. First Chinese Nobel laureate in medicine.",
     ["Nobel Prize in Physiology or Medicine (2015)", "Lasker Award (2011)"],
     [tl(1972, "Isolated artemisinin from sweet wormwood", "Extracted the antimalarial compound from Artemisia annua using traditional Chinese medicine texts as guide")],
     ["Artemisinin extraction for malaria treatment"], ["Artemisinin", "Malaria", "Traditional Chinese medicine", "Antimalarial drugs"], "Beijing",
     [aff("China Academy of Chinese Medical Sciences")]),

    ("John O'Keefe", "Neuroscience", "United States", "LIVING", "TITAN", 100,
     "1939-11-18", None,
     "John O'Keefe is an American-British neuroscientist who discovered place cells in the hippocampus, revealing how the brain creates a map of space. Nobel Prize 2014.",
     ["Nobel Prize in Physiology or Medicine (2014)"],
     [tl(1971, "Discovered place cells", "Found neurons in hippocampus that fire when an animal is in a specific location, creating a cognitive map")],
     None, ["Place cells", "Hippocampus", "Spatial navigation", "Cognitive maps"], "London",
     [aff("University College London")]),

    ("James Rothman", "Cell Biology", "United States", "LIVING", "TITAN", 110,
     "1950-11-03", None,
     "James Rothman is an American cell biologist who discovered the molecular machinery for vesicle transport in cells. Nobel Prize 2013.",
     ["Nobel Prize in Physiology or Medicine (2013)", "Lasker Award (2002)"],
     [tl(1993, "Identified SNARE proteins", "Discovered the SNARE protein complex that mediates vesicle fusion with target membranes")],
     None, ["Vesicle transport", "SNARE proteins", "Membrane fusion", "Intracellular trafficking"], "New Haven",
     [aff("Yale University")]),

    ("Randy Schekman", "Cell Biology", "United States", "LIVING", "TITAN", 105,
     "1948-12-30", None,
     "Randy Schekman is an American cell biologist who discovered genes governing vesicle traffic in cells. Nobel Prize 2013.",
     ["Nobel Prize in Physiology or Medicine (2013)", "Lasker Award (2002)"],
     [tl(1979, "Identified secretory pathway genes in yeast", "Discovered genes essential for protein transport within and out of cells")],
     None, ["Vesicle trafficking", "Secretory pathway", "Yeast genetics"], "Berkeley",
     [aff("University of California, Berkeley"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Thomas Sudhof", "Neuroscience", "Germany", "LIVING", "TITAN", 160,
     "1955-12-22", None,
     "Thomas Sudhof is a German-American neuroscientist who discovered how nerve cells communicate via synaptic vesicle release. Nobel Prize 2013.",
     ["Nobel Prize in Physiology or Medicine (2013)", "Lasker Award (2013)"],
     [tl(1998, "Identified synaptic vesicle fusion machinery", "Discovered how calcium triggers neurotransmitter release at synapses")],
     None, ["Synaptic transmission", "Neurotransmitter release", "Synaptotagmin", "Calcium signaling"], "Stanford",
     [aff("Stanford University"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Shinya Yamanaka", "Stem Cell Biology", "Japan", "LIVING", "TITAN", 120,
     "1962-09-04", None,
     "Shinya Yamanaka is a Japanese stem cell researcher who discovered that mature cells can be reprogrammed into pluripotent stem cells (iPSCs). Nobel Prize 2012.",
     ["Nobel Prize in Physiology or Medicine (2012)", "Lasker Award (2009)", "Breakthrough Prize in Life Sciences"],
     [tl(2006, "Created induced pluripotent stem cells", "Showed four transcription factors can reprogram adult cells to embryonic-like state"),
      tl(2012, "Nobel Prize in Physiology or Medicine")],
     ["Induced pluripotent stem cells (iPSCs)"], ["iPSC", "Stem cells", "Cellular reprogramming", "Regenerative medicine"], "Kyoto",
     [aff("Kyoto University", "Director, Center for iPS Cell Research")]),

    ("Bruce Beutler", "Immunology", "United States", "LIVING", "TITAN", 110,
     "1957-12-29", None,
     "Bruce Beutler is an American immunologist who discovered the role of toll-like receptors in innate immunity. Nobel Prize 2011.",
     ["Nobel Prize in Physiology or Medicine (2011)"],
     [tl(1998, "Identified toll-like receptor 4", "Discovered TLR4 as the receptor for bacterial lipopolysaccharide, activating innate immunity")],
     None, ["Toll-like receptors", "Innate immunity", "Lipopolysaccharide", "Inflammation"], "Dallas",
     [aff("UT Southwestern Medical Center")]),

    ("Jack Szostak", "Genetics", "United States", "LIVING", "TITAN", 95,
     "1952-11-09", None,
     "Jack Szostak is a Canadian-American geneticist who discovered how telomeres and telomerase protect chromosomes. Nobel Prize 2009.",
     ["Nobel Prize in Physiology or Medicine (2009)"],
     [tl(1982, "Characterized telomere function", "Demonstrated that telomeres protect chromosome ends from degradation")],
     None, ["Telomeres", "Telomerase", "Origin of life", "Chromosome stability"], "Boston",
     [aff("Massachusetts General Hospital"), aff("Harvard Medical School"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Luc Montagnier", "Virology", "France", "HISTORICAL", "TITAN", 80,
     "1932-08-18", "2022-02-08",
     "Luc Montagnier was a French virologist who co-discovered HIV, the virus that causes AIDS. Nobel Prize 2008.",
     ["Nobel Prize in Physiology or Medicine (2008)"],
     [tl(1983, "Co-discovered HIV", "Isolated the virus later named HIV from a patient with lymphadenopathy")],
     None, ["HIV", "AIDS", "Retrovirology"], "Paris",
     [aff("Pasteur Institute", "Former Director")]),

    ("Mario Capecchi", "Genetics", "United States", "LIVING", "TITAN", 90,
     "1937-10-06", None,
     "Mario Capecchi is an Italian-American geneticist who developed gene targeting (knockout mice), enabling the study of gene function in living animals. Nobel Prize 2007.",
     ["Nobel Prize in Physiology or Medicine (2007)"],
     [tl(1989, "Created first knockout mouse", "Developed technique to disable specific genes in mice, revolutionizing biomedical research")],
     ["Gene targeting (knockout mice)"], ["Gene targeting", "Knockout mice", "Homologous recombination", "Mouse genetics"], "Salt Lake City",
     [aff("University of Utah"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Andrew Fire", "Molecular Biology", "United States", "LIVING", "TITAN", 75,
     "1959-04-27", None,
     "Andrew Fire is an American biologist who discovered RNA interference (RNAi), a mechanism by which cells silence genes. Nobel Prize 2006.",
     ["Nobel Prize in Physiology or Medicine (2006)"],
     [tl(1998, "Discovered RNA interference", "Showed that double-stranded RNA can silence specific genes in C. elegans")],
     None, ["RNA interference", "Gene silencing", "dsRNA", "C. elegans"], "Stanford",
     [aff("Stanford University School of Medicine")]),

    ("Barry Marshall", "Gastroenterology", "Australia", "LIVING", "TITAN", 75,
     "1951-09-30", None,
     "Barry Marshall is an Australian physician who proved that Helicobacter pylori bacteria cause stomach ulcers, overturning decades of dogma. He famously drank a petri dish of H. pylori to prove his theory. Nobel Prize 2005.",
     ["Nobel Prize in Physiology or Medicine (2005)"],
     [tl(1982, "Identified H. pylori in stomach biopsies", "Co-discovered the bacterium in stomach lining of ulcer patients"),
      tl(1984, "Self-experimented by drinking H. pylori", "Ingested H. pylori culture to prove it causes gastritis")],
     None, ["Helicobacter pylori", "Peptic ulcer disease", "Gastritis"], "Perth",
     [aff("University of Western Australia")]),

    ("Richard Axel", "Neuroscience", "United States", "LIVING", "TITAN", 110,
     "1946-07-02", None,
     "Richard Axel is an American neuroscientist who discovered the odorant receptor gene family and the organization of the olfactory system. Nobel Prize 2004.",
     ["Nobel Prize in Physiology or Medicine (2004)"],
     [tl(1991, "Discovered odorant receptor genes", "Identified the large gene family encoding olfactory receptors")],
     None, ["Olfactory receptors", "Smell", "Neuroscience of perception", "G-protein coupled receptors"], "New York",
     [aff("Columbia University"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Linda Buck", "Neuroscience", "United States", "LIVING", "TITAN", 75,
     "1947-01-29", None,
     "Linda Buck is an American neuroscientist who co-discovered odorant receptors and the organization of the olfactory system. Nobel Prize 2004.",
     ["Nobel Prize in Physiology or Medicine (2004)"],
     [tl(1991, "Co-discovered odorant receptor gene family", "Identified ~1,000 genes encoding olfactory receptors in mice")],
     None, ["Olfactory system", "Odorant receptors", "Sensory neuroscience"], "Seattle",
     [aff("Fred Hutchinson Cancer Center"), aff("Howard Hughes Medical Institute", "Investigator")]),

    ("Sydney Brenner", "Genetics", "South Africa", "HISTORICAL", "TITAN", 80,
     "1927-01-13", "2019-04-05",
     "Sydney Brenner was a South African biologist who established C. elegans as a model organism and discovered key mechanisms of genetic regulation. Nobel Prize 2002.",
     ["Nobel Prize in Physiology or Medicine (2002)"],
     [tl(1963, "Established C. elegans as a model organism", "Proposed using the nematode worm for studying development and neurobiology"),
      tl(1965, "Discovered messenger RNA", "Co-discovered mRNA with Francis Crick and François Jacob")],
     None, ["C. elegans", "Messenger RNA", "Genetic code", "Model organisms"], "Cambridge",
     [aff("MRC Laboratory of Molecular Biology", "Director")]),

    ("Paul Greengard", "Neuroscience", "United States", "HISTORICAL", "TITAN", 95,
     "1925-12-11", "2019-04-13",
     "Paul Greengard was an American neuroscientist who discovered how dopamine and other neurotransmitters exert their effects via signal transduction. Nobel Prize 2000.",
     ["Nobel Prize in Physiology or Medicine (2000)"],
     [tl(1983, "Discovered DARPP-32 signaling", "Identified key phosphoprotein in dopamine signaling pathway")],
     None, ["Signal transduction", "Dopamine signaling", "DARPP-32", "Neuropharmacology"], "New York",
     [aff("Rockefeller University")]),

    # More Nobel laureates
    ("Christiane Nusslein-Volhard", "Developmental Biology", "Germany", "LIVING", "TITAN", 85,
     "1942-10-20", None,
     "Christiane Nusslein-Volhard is a German developmental biologist who discovered the genetic mechanisms controlling embryonic development. Nobel Prize 1995.",
     ["Nobel Prize in Physiology or Medicine (1995)"],
     [tl(1980, "Identified embryonic patterning genes in Drosophila", "Systematic screen revealed genes controlling body plan development in fruit flies")],
     None, ["Embryonic development", "Drosophila genetics", "Morphogenesis", "Developmental genetics"], "Tubingen",
     [aff("Max Planck Institute for Biology")]),

    ("Alfred Gilman", "Pharmacology", "United States", "HISTORICAL", "TITAN", 85,
     "1941-07-01", "2015-12-23",
     "Alfred Gilman was an American pharmacologist who discovered G-proteins, the molecular switches that relay signals inside cells. Nobel Prize 1994.",
     ["Nobel Prize in Physiology or Medicine (1994)"],
     [tl(1980, "Identified G-proteins", "Discovered the family of GTP-binding proteins that transduce cellular signals")],
     None, ["G-proteins", "Signal transduction", "Cell signaling", "GTP-binding proteins"], "Dallas",
     [aff("UT Southwestern Medical Center")]),

    ("Bert Sakmann", "Neuroscience", "Germany", "LIVING", "TITAN", 85,
     "1942-06-12", None,
     "Bert Sakmann is a German neuroscientist who developed patch clamp technique for recording single ion channel currents. Nobel Prize 1991.",
     ["Nobel Prize in Physiology or Medicine (1991)"],
     [tl(1976, "Developed patch clamp technique", "Co-invented method to measure electrical currents through individual ion channels in cell membranes")],
     ["Patch clamp technique (co-developer)"], ["Ion channels", "Patch clamp", "Electrophysiology", "Synaptic transmission"], "Heidelberg",
     [aff("Max Planck Institute for Medical Research")]),

    ("Erwin Neher", "Biophysics", "Germany", "LIVING", "TITAN", 85,
     "1944-03-20", None,
     "Erwin Neher is a German biophysicist who co-developed the patch clamp technique for recording ion channel activity. Nobel Prize 1991.",
     ["Nobel Prize in Physiology or Medicine (1991)"],
     [tl(1976, "Co-developed patch clamp technique", "Created the method to measure picoampere currents through single ion channels")],
     ["Patch clamp technique (co-developer)"], ["Ion channels", "Patch clamp", "Biophysics", "Calcium signaling"], "Gottingen",
     [aff("Max Planck Institute for Biophysical Chemistry")]),

    ("J. Michael Bishop", "Oncology", "United States", "LIVING", "TITAN", 90,
     "1936-02-22", None,
     "J. Michael Bishop is an American virologist who discovered that normal cells contain genes (proto-oncogenes) that can cause cancer when mutated. Nobel Prize 1989.",
     ["Nobel Prize in Physiology or Medicine (1989)"],
     [tl(1976, "Discovered cellular origin of oncogenes", "Showed that cancer-causing viral oncogenes originate from normal cellular genes")],
     None, ["Oncogenes", "Proto-oncogenes", "Retrovirology", "Cancer genetics"], "San Francisco",
     [aff("University of California, San Francisco")]),

    ("Susumu Tonegawa", "Immunology", "Japan", "LIVING", "TITAN", 156, None, None, "", [], [], None, [], None, None),  # Skip - already exists

    # ============================================================
    # MAJOR CLINICAL LEADERS & SPECIALTY PIONEERS
    # ============================================================

    ("Atul Gawande", "Surgery", "United States", "LIVING", "ELITE", 60,
     "1965-11-05", None,
     "Atul Gawande is an American surgeon, writer, and public health researcher. His surgical safety checklist has been adopted by WHO and is estimated to save 500,000 lives annually.",
     ["MacArthur Fellowship"],
     [tl(2009, "Published WHO Surgical Safety Checklist", "Developed the checklist that reduced surgical deaths by 47% in pilot studies")],
     ["WHO Surgical Safety Checklist"], ["Surgical safety", "Public health", "Health systems", "End-of-life care"], "Boston",
     [aff("Brigham and Women's Hospital"), aff("Harvard T.H. Chan School of Public Health")]),

    ("Siddhartha Mukherjee", "Oncology", "United States", "LIVING", "ELITE", 55,
     "1970-07-21", None,
     "Siddhartha Mukherjee is an Indian-American oncologist and author. His book 'The Emperor of All Maladies' won the Pulitzer Prize and was called the 'biography of cancer.'",
     ["Pulitzer Prize for General Nonfiction (2011)"],
     [tl(2010, "Published 'The Emperor of All Maladies'", "Pulitzer Prize-winning biography of cancer that became a PBS documentary")],
     None, ["Cancer biology", "Stem cells", "Gene therapy", "Science writing"], "New York",
     [aff("Columbia University Medical Center")]),

    # More key clinical/research figures
    ("Devi Shetty", "Cardiac Surgery", "India", "LIVING", "ELITE", 25,
     "1953-05-08", None,
     "Devi Shetty is an Indian cardiac surgeon who pioneered affordable heart surgery in India. Founder of Narayana Health, he reduced the cost of heart surgery to under $2,000, making it accessible to millions.",
     ["Padma Shri", "Padma Bhushan", "Rajiv Gandhi Award"],
     [tl(2001, "Founded Narayana Health", "Established a chain of affordable hospitals performing high-volume cardiac surgery at a fraction of Western costs")],
     None, ["Affordable healthcare", "Cardiac surgery", "Health economics", "High-volume surgery"], "Bangalore",
     [aff("Narayana Health", "Founder and Chairman")]),

    ("Patrick Soon-Shiong", "Oncology", "South Africa", "LIVING", "ELITE", 55,
     "1952-07-29", None,
     "Patrick Soon-Shiong is a South African-American surgeon and biotech entrepreneur who developed Abraxane, a nanoparticle albumin-bound paclitaxel that improved cancer treatment. Also pioneered one of the first whole-organ pancreas transplants.",
     [],
     [tl(2005, "FDA approved Abraxane", "Nanoparticle albumin-bound paclitaxel approved for breast cancer treatment")],
     ["Abraxane (nab-paclitaxel)"], ["Nanomedicine", "Cancer therapeutics", "Pancreas transplantation"], "Los Angeles",
     [aff("NantHealth", "Founder and CEO")]),

    ("Harvey Fineberg", "Public Health", "United States", "LIVING", "ELITE", 50,
     "1945-06-15", None,
     "Harvey Fineberg is an American public health leader who served as president of the Institute of Medicine, provost of Harvard University, and president of the Gordon and Betty Moore Foundation.",
     [],
     [tl(1997, "Provost of Harvard University"), tl(2002, "President of Institute of Medicine")],
     None, ["Health policy", "Medical decision-making", "Pandemic preparedness"], "Washington",
     [aff("Gordon and Betty Moore Foundation", "President")]),

    # ============================================================
    # AFRICA - MORE REPRESENTATION
    # ============================================================

    ("Sheila Tlou", "Nursing", "Botswana", "LIVING", "ELITE", 15,
     None, None,
     "Sheila Tlou is a Motswana nurse and public health leader who served as Minister of Health of Botswana and co-chaired the Global HIV Prevention Coalition. Pioneer of HIV/AIDS nursing education in Africa.",
     [],
     [tl(2004, "Minister of Health of Botswana", "Led Botswana's nationally acclaimed HIV treatment program")],
     None, ["HIV/AIDS nursing", "Public health policy", "Nursing education"], "Gaborone",
     [aff("University of Botswana", "Professor of Nursing")]),

    ("Francis Omaswa", "Surgery", "Uganda", "LIVING", "ELITE", 20,
     None, None,
     "Francis Omaswa is a Ugandan surgeon and global health leader who founded the African Centre for Global Health and Social Accountability. Former Director-General of Health Services in Uganda.",
     [],
     [tl(2003, "Founded African Centre for Global Health")],
     None, ["Global health", "Health workforce", "Surgical training in Africa"], "Kampala",
     [aff("African Centre for Global Health and Social Accountability", "Founder")]),

    ("Babatunde Osotimehin", "Reproductive Health", "Nigeria", "HISTORICAL", "ELITE", 20,
     "1949-02-06", "2017-06-04",
     "Babatunde Osotimehin was a Nigerian physician who served as Executive Director of UNFPA (United Nations Population Fund). He championed family planning, maternal health, and youth empowerment globally.",
     [],
     [tl(2011, "Appointed Executive Director of UNFPA", "Led global efforts on reproductive health and family planning")],
     None, ["Reproductive health", "Family planning", "Population policy", "Maternal health"], "New York",
     [aff("UNFPA", "Executive Director")]),

    ("Quarraisha Abdool Karim", "Epidemiology", "South Africa", "LIVING", "TITAN", 75,
     None, None,
     "Quarraisha Abdool Karim is a South African epidemiologist who led groundbreaking HIV prevention research including the CAPRISA 004 tenofovir gel trial. Associate Scientific Director of CAPRISA.",
     ["L'Oreal-UNESCO Award for Women in Science"],
     [tl(2010, "Published CAPRISA 004 trial results", "Showed tenofovir gel could reduce HIV infection in women by 39%")],
     None, ["HIV prevention", "Microbicides", "Women's health", "AIDS epidemiology"], "Durban",
     [aff("CAPRISA", "Associate Scientific Director")]),

    # ============================================================
    # ASIA-PACIFIC - MORE REPRESENTATION
    # ============================================================

    ("Tadamitsu Kishimoto", "Immunology", "Japan", "LIVING", "TITAN", 130,
     "1939-05-07", None,
     "Tadamitsu Kishimoto is a Japanese immunologist who discovered interleukin-6 (IL-6) and developed tocilizumab, a blockbuster drug for rheumatoid arthritis and COVID-19.",
     ["Crafoord Prize", "Japan Prize", "Robert Koch Prize"],
     [tl(1986, "Discovered interleukin-6", "Identified IL-6, a key cytokine in inflammation and immune regulation"),
      tl(2010, "Tocilizumab approved globally", "IL-6 receptor antibody became standard treatment for rheumatoid arthritis")],
     ["Discovery of IL-6 and development of tocilizumab"], ["Interleukin-6", "Cytokines", "Rheumatoid arthritis", "Immunology"], "Osaka",
     [aff("Osaka University", "Professor Emeritus")]),

    ("Masato Tanaka", "Gastroenterology", "Japan", "LIVING", "ELITE", 60,
     None, None,
     "Masato Tanaka is a Japanese gastroenterologist who pioneered endoscopic submucosal dissection (ESD), a minimally invasive technique for removing early-stage gastrointestinal cancers.",
     [],
     [tl(1999, "Developed ESD technique", "Created endoscopic method to remove large areas of diseased tissue from the GI tract without surgery")],
     ["Endoscopic submucosal dissection (ESD)"], ["Endoscopy", "Gastrointestinal cancer", "Minimally invasive surgery"], "Tokyo",
     [aff("National Cancer Center Hospital", "Director of Endoscopy")]),

    ("Yik Ying Teo", "Genomics", "Singapore", "LIVING", "ELITE", 55,
     None, None,
     "Teo Yik Ying is a Singaporean geneticist and public health leader. Dean of the Saw Swee Hock School of Public Health at NUS. Pioneer of Asian population genomics.",
     [],
     [],
     None, ["Population genomics", "Asian genetics", "Public health", "Precision medicine"], "Singapore",
     [aff("National University of Singapore", "Dean, Saw Swee Hock School of Public Health")]),

    ("Myint Htwe", "Public Health", "Myanmar", "LIVING", "ELITE", 15,
     None, None,
     "Myint Htwe is a Myanmar public health physician who served as WHO Representative and Minister of Health. Led Myanmar's health system reforms and malaria control programs.",
     [],
     [],
     None, ["Health systems", "Malaria control", "Public health policy"], "Naypyidaw",
     [aff("Ministry of Health, Myanmar", "Former Minister of Health")]),

    # ============================================================
    # SOUTH AMERICA - MORE REPRESENTATION
    # ============================================================

    ("Paulo Chapchap", "Transplant Surgery", "Brazil", "LIVING", "ELITE", 35,
     None, None,
     "Paulo Chapchap is a Brazilian transplant surgeon who performed the first pediatric liver transplant in Latin America and built one of the largest pediatric transplant programs in the world at Hospital Sirio-Libanes.",
     [],
     [tl(1988, "First pediatric liver transplant in Latin America")],
     None, ["Pediatric liver transplantation", "Organ transplantation"], "Sao Paulo",
     [aff("Hospital Sirio-Libanes", "Director of Transplantation")]),

    ("Gonzalo Vecina Neto", "Public Health", "Brazil", "LIVING", "ELITE", 20,
     None, None,
     "Gonzalo Vecina Neto is a Brazilian public health physician who founded ANVISA (Brazilian Health Regulatory Agency) and transformed Brazil's pharmaceutical and health regulation system.",
     [],
     [tl(1999, "Founded ANVISA", "Created Brazil's national health regulatory agency, modeled on the FDA")],
     None, ["Health regulation", "Pharmaceutical policy", "Public health administration"], "Sao Paulo",
     [aff("ANVISA", "Founder and First Director")]),

    ("Julio Frenk", "Public Health", "Mexico", "LIVING", "ELITE", 70,
     "1953-12-20", None,
     "Julio Frenk is a Mexican physician who served as Mexico's Secretary of Health, introducing universal health coverage (Seguro Popular) covering 50 million Mexicans. Former Dean of Harvard School of Public Health.",
     [],
     [tl(2000, "Mexico Secretary of Health", "Introduced Seguro Popular, providing health insurance to 50 million uninsured Mexicans"),
      tl(2009, "Dean of Harvard School of Public Health")],
     None, ["Universal health coverage", "Health systems", "Health policy"], "Miami",
     [aff("University of Miami", "President")]),

    # ============================================================
    # MIDDLE EAST - MORE REPRESENTATION
    # ============================================================

    ("Hanan Al-Kuwari", "Public Health", "Qatar", "LIVING", "ELITE", 25,
     None, None,
     "Hanan Al-Kuwari is a Qatari physician who serves as Minister of Public Health of Qatar. She led Qatar's COVID-19 response and has driven healthcare modernization across the Gulf region.",
     [],
     [tl(2018, "Appointed Minister of Public Health of Qatar")],
     None, ["Public health policy", "Healthcare modernization", "COVID-19 response"], "Doha",
     [aff("Ministry of Public Health, Qatar", "Minister")]),

    ("Rafik Boujdaria", "Cardiology", "Tunisia", "LIVING", "ELITE", 20,
     None, None,
     "Rafik Boujdaria is a Tunisian cardiologist and pioneer of interventional cardiology in North Africa. He established cardiac catheterization and angioplasty services across Tunisia.",
     [],
     [],
     None, ["Interventional cardiology", "Cardiac catheterization", "Cardiovascular disease in North Africa"], "Tunis",
     [aff("Charles Nicolle Hospital", "Head of Cardiology")]),

    # ============================================================
    # EUROPE - MORE COUNTRIES
    # ============================================================

    ("Ugur Sahin", "Oncology", "Turkey", "LIVING", "TITAN", 100,
     "1965-09-19", None,
     "Ugur Sahin is a Turkish-German oncologist and immunologist who co-founded BioNTech and co-developed the Pfizer-BioNTech COVID-19 mRNA vaccine, the first mRNA vaccine authorized worldwide.",
     ["Bundesverdienstkreuz (Federal Cross of Merit)", "Mustafa Prize"],
     [tl(2008, "Co-founded BioNTech"),
      tl(2020, "Developed BNT162b2 COVID-19 vaccine", "Created the first authorized mRNA vaccine in partnership with Pfizer")],
     ["BNT162b2 mRNA COVID-19 vaccine"], ["mRNA vaccines", "Cancer immunotherapy", "Personalized medicine"], "Mainz",
     [aff("BioNTech", "CEO and Co-Founder"), aff("University Medical Center of the Johannes Gutenberg University Mainz")]),

    ("Ozlem Tureci", "Oncology", "Germany", "LIVING", "TITAN", 80,
     "1967-03-06", None,
     "Ozlem Tureci is a Turkish-German physician-scientist who co-founded BioNTech and served as Chief Medical Officer during development of the Pfizer-BioNTech COVID-19 vaccine.",
     ["Bundesverdienstkreuz (Federal Cross of Merit)"],
     [tl(2008, "Co-founded BioNTech"),
      tl(2020, "Co-developed BNT162b2 COVID-19 vaccine")],
     None, ["Cancer immunotherapy", "mRNA technology", "Personalized oncology"], "Mainz",
     [aff("BioNTech", "Chief Medical Officer and Co-Founder")]),

    ("Didier Raoult", "Microbiology", "France", "LIVING", "TITAN", 190,
     "1952-03-13", None,
     "Didier Raoult is a French microbiologist and infectious disease specialist. One of the world's most cited microbiologists, he discovered numerous giant viruses and new bacterial species.",
     ["Grand Prix INSERM", "Robert Koch Prize"],
     [],
     None, ["Giant viruses", "Rickettsiology", "Emerging infections", "Clinical microbiology"], "Marseille",
     [aff("IHU Mediterranee Infection", "Director")]),

    ("Peter Piot", "Infectious Disease", "Belgium", "LIVING", "TITAN", 95,
     "1949-02-17", None,
     "Peter Piot is a Belgian microbiologist who co-discovered the Ebola virus in 1976 and later served as founding Executive Director of UNAIDS. Director of the London School of Hygiene & Tropical Medicine.",
     ["Hideyo Noguchi Africa Prize", "Robert Koch Gold Medal"],
     [tl(1976, "Co-discovered Ebola virus", "Part of the team that identified the Ebola virus during the first known outbreak in Zaire"),
      tl(1995, "Founding Executive Director of UNAIDS")],
     None, ["Ebola virus", "HIV/AIDS", "Global health", "Tropical medicine"], "London",
     [aff("London School of Hygiene & Tropical Medicine", "Director")]),

    ("Lars Leksell", "Neurosurgery", "Sweden", "HISTORICAL", "TITAN", 40,
     "1907-01-15", "1986-01-03",
     "Lars Leksell was a Swedish neurosurgeon who invented the Gamma Knife and stereotactic radiosurgery, enabling non-invasive brain surgery using focused radiation beams.",
     [],
     [tl(1968, "Invented the Gamma Knife", "Created stereotactic radiosurgery device using focused gamma rays to treat brain tumors without open surgery")],
     ["Gamma Knife", "Stereotactic radiosurgery"], ["Stereotactic radiosurgery", "Gamma Knife", "Brain tumors", "Neurosurgery"], "Stockholm",
     [aff("Karolinska Institute")]),

    ("Alois Alzheimer", "Neurology", "Germany", "HISTORICAL", "TITAN", 0,
     "1864-06-14", "1915-12-19",
     "Alois Alzheimer was a German psychiatrist and neuropathologist who first described the disease that bears his name in 1906, identifying the characteristic plaques and tangles in the brain of a patient with progressive dementia.",
     [],
     [tl(1906, "Described Alzheimer's disease", "Presented the case of Auguste Deter, identifying amyloid plaques and neurofibrillary tangles as hallmarks of the disease")],
     None, ["Alzheimer's disease", "Dementia", "Neuropathology", "Amyloid plaques"], "Munich",
     [aff("Royal Psychiatric Clinic, Munich")]),

    ("Nikolai Pirogov", "Surgery", "Russia", "HISTORICAL", "TITAN", 0,
     "1810-11-25", "1881-12-05",
     "Nikolai Pirogov was a Russian surgeon who pioneered the use of ether anesthesia in field surgery and developed innovative surgical techniques during the Crimean War. He created the first anatomical atlas based on cross-sectional frozen body dissections.",
     [],
     [tl(1847, "First use of ether anesthesia in field surgery", "Applied ether anesthesia during military operations in the Caucasus"),
      tl(1854, "Organized triage and nursing in Crimean War")],
     ["Field anesthesia techniques", "Cross-sectional anatomical atlas"], ["Military surgery", "Anesthesia", "Surgical anatomy", "Triage"], "Moscow",
     [aff("Imperial Medico-Surgical Academy", "Professor of Surgery")]),

    # ============================================================
    # MORE MODERN LEADERS BY SPECIALTY
    # ============================================================

    ("Napoleone Ferrara", "Oncology", "Italy", "LIVING", "TITAN", 140,
     "1956-07-26", None,
     "Napoleone Ferrara is an Italian-American molecular biologist who discovered VEGF (vascular endothelial growth factor) and developed bevacizumab (Avastin), a major cancer drug that inhibits tumor blood vessel growth.",
     ["Lasker-DeBakey Clinical Medical Research Award (2010)", "Breakthrough Prize in Life Sciences"],
     [tl(1989, "Identified VEGF", "Discovered the key protein that stimulates blood vessel growth"),
      tl(2004, "FDA approved bevacizumab (Avastin)", "First anti-angiogenesis drug approved for cancer treatment")],
     ["Discovery of VEGF", "Development of bevacizumab (Avastin)"], ["VEGF", "Angiogenesis", "Anti-cancer therapy", "Bevacizumab"], "San Diego",
     [aff("University of California, San Diego")]),

    ("Robert Langer", "Biomedical Engineering", "United States", "LIVING", "TITAN", 280,
     "1948-08-29", None,
     "Robert Langer is an American chemical engineer and the most cited engineer in history. He pioneered controlled drug delivery and tissue engineering, holding over 1,400 patents. His drug delivery technology underpins the Moderna COVID-19 vaccine.",
     ["National Medal of Science", "National Medal of Technology and Innovation", "Charles Stark Draper Prize", "Queen Elizabeth Prize for Engineering"],
     [tl(1976, "Pioneered controlled drug release from polymers", "Demonstrated that macromolecules could be released from polymers in a controlled manner"),
      tl(1990, "Founded tissue engineering field")],
     ["Controlled drug delivery systems", "Polymer-based drug release"], ["Drug delivery", "Tissue engineering", "Biomaterials", "Nanotechnology"], "Cambridge",
     [aff("Massachusetts Institute of Technology", "David H. Koch Institute Professor")]),

    ("Carl June", "Immunotherapy", "United States", "LIVING", "TITAN", 130,
     "1953-04-22", None,
     "Carl June is an American immunologist who developed CAR-T cell therapy for cancer. His pioneering treatment of Emily Whitehead in 2012 demonstrated that genetically modified T cells could cure leukemia.",
     ["Breakthrough Prize in Life Sciences", "Paul Ehrlich and Ludwig Darmstaedter Prize"],
     [tl(2010, "First CAR-T cell therapy for cancer", "Treated first patients with chimeric antigen receptor T-cell therapy for chronic lymphocytic leukemia"),
      tl(2012, "Treated Emily Whitehead", "Six-year-old with ALL became first child cured by CAR-T therapy"),
      tl(2017, "FDA approved tisagenlecleucel (Kymriah)", "First CAR-T cell therapy approved by FDA")],
     ["CAR-T cell therapy for cancer"], ["CAR-T cells", "Cancer immunotherapy", "Adoptive cell therapy", "Gene therapy"], "Philadelphia",
     [aff("University of Pennsylvania", "Director, Center for Cellular Immunotherapies")]),

    ("Michel Sadelain", "Gene Therapy", "France", "LIVING", "TITAN", 85,
     None, None,
     "Michel Sadelain is a French-Canadian immunologist who engineered the CAR-T cell design used in commercial therapies. His work led to the first FDA-approved gene therapy for cancer.",
     ["Breakthrough Prize in Life Sciences"],
     [tl(2003, "Designed second-generation CAR construct", "Engineered the CAR T-cell receptor design that became the basis for approved therapies")],
     ["Second-generation CAR construct for T-cell therapy"], ["CAR-T cells", "Gene therapy", "Genetic engineering", "Cancer immunotherapy"], "New York",
     [aff("Memorial Sloan Kettering Cancer Center")]),

    ("Feng Zhang", "Genetics", "China", "LIVING", "TITAN", 120,
     "1981-10-22", None,
     "Feng Zhang is a Chinese-American biochemist who adapted CRISPR-Cas9 for genome editing in mammalian cells and discovered CRISPR-Cas13 for RNA editing. Core member of the Broad Institute.",
     ["Breakthrough Prize in Life Sciences (shared)", "Lemelson-MIT Prize"],
     [tl(2013, "Adapted CRISPR-Cas9 for human cells", "First to demonstrate CRISPR-Cas9 genome editing in mammalian cells"),
      tl(2017, "Discovered CRISPR-Cas13 for RNA editing")],
     ["CRISPR-Cas9 adaptation for mammalian genome editing", "CRISPR-Cas13 RNA editing"], ["CRISPR", "Genome editing", "Gene therapy", "RNA editing"], "Cambridge",
     [aff("Broad Institute of MIT and Harvard", "Core Member"), aff("MIT McGovern Institute for Brain Research")]),

    # ============================================================
    # HISTORICAL GREATS STILL MISSING
    # ============================================================

    ("Andreas Vesalius", "Anatomy", "Belgium", "HISTORICAL", "TITAN", 0,
     "1514-12-31", "1564-10-15",
     "Andreas Vesalius was a Flemish anatomist who wrote 'De Humani Corporis Fabrica' (1543), the first comprehensive and accurate textbook of human anatomy. He is considered the founder of modern anatomy.",
     [],
     [tl(1543, "Published De Humani Corporis Fabrica", "Revolutionary anatomical atlas that corrected centuries of errors and established anatomy as a scientific discipline")],
     None, ["Human anatomy", "Anatomical illustration", "Dissection"], "Padua",
     [aff("University of Padua", "Professor of Anatomy")]),

    ("William Harvey", "Physiology", "United Kingdom", "HISTORICAL", "TITAN", 0,
     "1578-04-01", "1657-06-03",
     "William Harvey was an English physician who first correctly described the circulatory system in 1628, demonstrating that the heart pumps blood through a closed circuit of arteries and veins.",
     [],
     [tl(1628, "Published De Motu Cordis", "Described the systemic circulation of blood pumped by the heart through arteries and returned via veins")],
     ["Discovery of blood circulation"], ["Blood circulation", "Cardiac physiology", "Embryology"], "London",
     [aff("St Bartholomew's Hospital", "Physician")]),

    ("Hippocrates", "Medicine", "Greece", "HISTORICAL", "TITAN", 0,
     None, None,
     "Hippocrates of Kos is regarded as the Father of Medicine. He established medicine as a rational discipline separate from religion, introduced the concept of clinical observation, and is credited with the Hippocratic Oath.",
     [],
     [tl(-400, "Established rational medicine", "Separated medicine from religion and superstition, advocating for systematic observation and ethical practice")],
     ["Clinical observation methodology", "Hippocratic Oath"], ["Clinical medicine", "Medical ethics", "Hippocratic Oath", "Rational medicine"], "Kos",
     [aff("School of Kos", "Founder")]),

    ("Avicenna", "Medicine", "Iran", "HISTORICAL", "TITAN", 0,
     "0980-08-22", "1037-06-21",
     "Avicenna (Ibn Sina) was a Persian polymath whose 'Canon of Medicine' served as the standard medical textbook in Europe and the Islamic world for over 500 years. He described contagion, introduced quarantine, and systematized clinical pharmacology.",
     [],
     [tl(1025, "Completed 'The Canon of Medicine'", "Compiled the most comprehensive medical encyclopedia of the medieval world, used as a textbook for 500+ years")],
     ["Systematic clinical pharmacology", "Quarantine concept"], ["Canon of Medicine", "Medical pharmacology", "Contagion theory", "Clinical diagnosis"], "Isfahan",
     [aff("Various courts of Persian rulers", "Court Physician")]),

    ("Galen", "Medicine", "Greece", "HISTORICAL", "TITAN", 0,
     "0129-09-01", "0216-01-01",
     "Galen was a Greek physician in the Roman Empire whose theories dominated Western medicine for over 1,300 years. He made groundbreaking discoveries in anatomy, physiology, and pharmacology through animal dissection.",
     [],
     [tl(162, "Established experimental physiology", "Demonstrated through animal dissection that arteries carry blood, not air, and mapped the nervous system")],
     None, ["Anatomy", "Physiology", "Pharmacology", "Experimental medicine"], "Rome",
     [aff("Roman Imperial Court", "Physician to Emperor Marcus Aurelius")]),

    ("Paracelsus", "Medicine", "Switzerland", "HISTORICAL", "TITAN", 0,
     "1493-11-11", "1541-09-24",
     "Paracelsus was a Swiss-German physician who founded toxicology and pioneered the use of chemicals and minerals in medicine. He established the principle that 'the dose makes the poison.'",
     [],
     [tl(1527, "Established toxicology principles", "Introduced the concept that any substance can be toxic depending on dose, founding the science of toxicology")],
     ["Toxicology as a scientific discipline"], ["Toxicology", "Chemical medicine", "Dose-response", "Iatrochemistry"], "Basel",
     [aff("University of Basel", "Professor of Medicine")]),

    ("John Snow", "Epidemiology", "United Kingdom", "HISTORICAL", "TITAN", 0,
     "1813-03-15", "1858-06-16",
     "John Snow was an English physician considered the father of modern epidemiology. He traced the 1854 Broad Street cholera outbreak to a contaminated water pump, establishing the basis for disease mapping and public health intervention.",
     [],
     [tl(1854, "Traced cholera to Broad Street pump", "Used epidemiological mapping to identify a contaminated water pump as the source of a cholera outbreak in Soho, London")],
     ["Epidemiological disease mapping"], ["Cholera epidemiology", "Disease mapping", "Waterborne disease", "Anesthesiology"], "London",
     [aff("London medical practice", "Physician")]),

    ("Joseph Lister", "Surgery", "United Kingdom", "HISTORICAL", "TITAN", 0, None, None, "", [], [], None, [], None, None),  # Skip - exists

    ("Crawford Long", "Anesthesiology", "United States", "HISTORICAL", "ELITE", 0,
     "1815-11-01", "1878-06-16",
     "Crawford Long was an American physician who first used diethyl ether as a surgical anesthetic in 1842, predating the famous public demonstration at Massachusetts General Hospital by four years.",
     [],
     [tl(1842, "First use of ether anesthesia in surgery", "Administered ether to James Venable before removing a neck tumor, the first use of anesthesia in surgery")],
     ["Ether anesthesia for surgery"], ["Ether anesthesia", "General anesthesia", "Surgical pain management"], "Jefferson",
     [aff("Private practice, Jefferson, Georgia", "Surgeon")]),

    ("Charles Huggins", "Oncology", "Canada", "HISTORICAL", "TITAN", 50,
     "1901-09-22", "1997-01-12",
     "Charles Huggins was a Canadian-American surgeon who discovered that prostate cancer could be treated by hormonal manipulation. Nobel Prize 1966 for demonstrating that cancer could be controlled by hormones.",
     ["Nobel Prize in Physiology or Medicine (1966)"],
     [tl(1941, "Discovered hormonal treatment of prostate cancer", "Showed that castration and estrogen treatment could cause regression of prostate cancer")],
     ["Hormonal therapy for cancer"], ["Prostate cancer", "Hormonal therapy", "Endocrine oncology"], "Chicago",
     [aff("University of Chicago", "Director of Ben May Laboratory")]),
]

# Process all doctors
for doc in docs:
    if len(doc) < 5:
        continue
    name, specialty, country, status, tier = doc[:5]
    hindex = doc[5] if len(doc) > 5 else 0
    born = doc[6] if len(doc) > 6 else None
    died = doc[7] if len(doc) > 7 else None
    bio = doc[8] if len(doc) > 8 else ""
    awards = doc[9] if len(doc) > 9 else []
    timeline = doc[10] if len(doc) > 10 else []
    inventions = doc[11] if len(doc) > 11 else None
    knows = doc[12] if len(doc) > 12 else []
    city = doc[13] if len(doc) > 13 else None
    affs = doc[14] if len(doc) > 14 else []

    if not name or not specialty:
        continue

    result = make_profile(name, specialty, country, status, tier, hindex, born, died, bio, awards, timeline, inventions, knows, city, affs)
    if result:
        created.append(result)

print(f"Created {len(created)} new profiles")
for s in sorted(created):
    print(f"  + {s}")
