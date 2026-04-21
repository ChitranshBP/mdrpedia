#!/usr/bin/env python3
"""Bulk-create doctor profile JSON files - Batch 2: More comprehensive coverage."""
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
        "medicalSpecialty": med_specs or [specialty],
        "knowsAbout": knows or [],
        "citations": [],
        "awards": awards or [],
        "timeline": timeline or [],
        "subSpecialty": sub_specialty or specialty,
        "dateOfBirth": born,
        "dateOfDeath": died,
        "bioGenerated": True
    }

    with open(path, 'w') as f:
        json.dump(profile, f, indent=2)
    return slug

def aff(name, role="Professor"):
    return {"hospitalName": name, "role": role, "hospitalUrl": "#"}

def tl(year, title, desc=None):
    return {"year": year, "title": title, "description": desc}

created = []

# ============================================================
# MORE NOBEL LAUREATES IN PHYSIOLOGY OR MEDICINE
# ============================================================

docs = [
    # 2023 Nobel - mRNA
    ("Drew Weissman", "Immunology", "United States", "LIVING", "TITAN", 110,
     "1959-09-07", None,
     "Drew Weissman is an American immunologist who co-developed the nucleoside-modified mRNA technology that enabled COVID-19 vaccines. Nobel Prize 2023.",
     ["Nobel Prize in Physiology or Medicine (2023)", "Lasker Award (2021)"],
     [tl(2005, "Modified mRNA discovery", "Demonstrated that nucleoside modifications prevent immune detection of synthetic mRNA"),
      tl(2020, "COVID-19 mRNA vaccines", "Technology enabled Pfizer-BioNTech and Moderna vaccines"),
      tl(2023, "Nobel Prize", "Awarded jointly with Katalin Kariko")],
     ["Nucleoside-modified mRNA technology"], ["mRNA vaccines", "Nucleoside modifications", "Innate immunity", "COVID-19"], "Philadelphia",
     [aff("University of Pennsylvania", "Roberts Family Professor of Vaccine Research")], "MD, PhD"),

    # 2022 Nobel
    ("Svante Paabo", "Genetics", "Sweden", "LIVING", "TITAN", 130,
     "1955-04-20", None,
     "Svante Paabo is a Swedish geneticist who pioneered the field of paleogenomics by sequencing the Neanderthal genome and discovering the Denisovans. Nobel Prize 2022.",
     ["Nobel Prize in Physiology or Medicine (2022)", "Breakthrough Prize in Life Sciences"],
     [tl(2010, "Sequenced Neanderthal genome", "Published first complete Neanderthal genome sequence"),
      tl(2010, "Discovered Denisovans", "Identified a previously unknown hominin species from DNA alone"),
      tl(2022, "Nobel Prize", "For discoveries concerning genomes of extinct hominins")],
     ["Paleogenomics", "Ancient DNA extraction techniques"], ["Ancient DNA", "Neanderthal genome", "Denisovans", "Human evolution", "Paleogenomics"], "Leipzig",
     [aff("Max Planck Institute for Evolutionary Anthropology", "Director")], "PhD"),

    # 2021 Nobel
    ("David Julius", "Neuroscience", "United States", "LIVING", "TITAN", 95,
     "1955-11-04", None,
     "David Julius is an American physiologist who discovered the receptor for capsaicin (TRPV1), revealing how the nervous system senses temperature and pain. Nobel Prize 2021.",
     ["Nobel Prize in Physiology or Medicine (2021)", "Kavli Prize"],
     [tl(1997, "Discovered TRPV1 receptor", "Identified the capsaicin receptor that senses heat and pain"),
      tl(2021, "Nobel Prize", "For discoveries of receptors for temperature and touch")],
     None, ["TRPV1", "Pain receptors", "Temperature sensing", "Ion channels", "Capsaicin"], "San Francisco",
     [aff("University of California, San Francisco", "Professor of Physiology")], "PhD"),

    ("Ardem Patapoutian", "Neuroscience", "United States", "LIVING", "TITAN", 75,
     "1967-10-02", None,
     "Ardem Patapoutian is a Lebanese-American molecular biologist who discovered Piezo1 and Piezo2, the mechanoreceptors responsible for sensing touch and pressure. Nobel Prize 2021.",
     ["Nobel Prize in Physiology or Medicine (2021)"],
     [tl(2010, "Discovered Piezo channels", "Identified the mechanosensitive ion channels responsible for touch sensation"),
      tl(2021, "Nobel Prize", "For discoveries of receptors for temperature and touch")],
     ["Piezo channel discovery"], ["Mechanoreceptors", "Piezo channels", "Touch sensation", "Proprioception"], "La Jolla",
     [aff("Scripps Research", "Professor of Neuroscience")], "PhD"),

    # 2020 Nobel
    ("Harvey Alter", "Hepatology", "United States", "LIVING", "TITAN", 115,
     "1935-09-12", None,
     "Harvey Alter is an American virologist who discovered the hepatitis C virus. His work led to blood screening tests that virtually eliminated transfusion-transmitted hepatitis. Nobel Prize 2020.",
     ["Nobel Prize in Physiology or Medicine (2020)", "Lasker Award (2000)"],
     [tl(1975, "Identified non-A non-B hepatitis", "Demonstrated a new form of transfusion hepatitis distinct from hepatitis A and B"),
      tl(2020, "Nobel Prize", "For the discovery of Hepatitis C virus")],
     None, ["Hepatitis C", "Transfusion medicine", "Blood safety", "Viral hepatitis"], "Bethesda",
     [aff("National Institutes of Health", "Distinguished NIH Investigator")]),

    ("Michael Houghton", "Virology", "United Kingdom", "LIVING", "ELITE", 80,
     None, None,
     "Michael Houghton is a British virologist who identified and cloned the hepatitis C virus in 1989. Nobel Prize 2020.",
     ["Nobel Prize in Physiology or Medicine (2020)", "Lasker Award (2000)"],
     [tl(1989, "Cloned hepatitis C virus", "Identified the virus responsible for most transfusion-transmitted hepatitis"),
      tl(2020, "Nobel Prize", "For the discovery of Hepatitis C virus")],
     None, ["Hepatitis C virus", "Viral discovery", "Blood-borne pathogens"], "Edmonton",
     [aff("University of Alberta", "Canada Excellence Research Chair in Virology")], "PhD"),

    ("Charles Rice", "Virology", "United States", "LIVING", "TITAN", 130,
     "1952-08-25", None,
     "Charles Rice is an American virologist who proved that hepatitis C virus alone could cause hepatitis. Nobel Prize 2020.",
     ["Nobel Prize in Physiology or Medicine (2020)", "Lasker Award (2016)"],
     [tl(1997, "Proved HCV causation", "Demonstrated that hepatitis C virus alone was sufficient to cause disease"),
      tl(2020, "Nobel Prize", "For the discovery of Hepatitis C virus")],
     None, ["Hepatitis C", "Flaviviruses", "Viral replication"], "New York",
     [aff("Rockefeller University", "Maurice R. and Corinne P. Greenberg Professor")], "PhD"),

    # 2019 Nobel
    ("William Kaelin", "Oncology", "United States", "LIVING", "TITAN", 120,
     "1957-11-23", None,
     "William Kaelin is an American physician-scientist who discovered how cells sense and adapt to oxygen availability, revealing the VHL-HIF pathway. Nobel Prize 2019.",
     ["Nobel Prize in Physiology or Medicine (2019)", "Lasker Award (2016)"],
     [tl(2001, "Discovered VHL-HIF oxygen-sensing pathway", "Showed how VHL protein targets HIF for destruction in the presence of oxygen"),
      tl(2019, "Nobel Prize", "For discoveries of how cells sense and adapt to oxygen availability")],
     None, ["Oxygen sensing", "VHL protein", "HIF pathway", "Tumor suppression"], "Boston",
     [aff("Dana-Farber Cancer Institute", "Professor of Medicine"),
      aff("Harvard Medical School", "Sidney Farber Professor of Medicine")]),

    ("Peter Ratcliffe", "Cell Biology", "United Kingdom", "LIVING", "TITAN", 100,
     "1954-05-14", None,
     "Peter Ratcliffe is a British physician-scientist who discovered the molecular mechanisms of cellular oxygen sensing. Nobel Prize 2019.",
     ["Nobel Prize in Physiology or Medicine (2019)", "Lasker Award (2016)"],
     [tl(1999, "Discovered oxygen-sensing mechanism", "Showed how HIF is regulated by oxygen levels"),
      tl(2019, "Nobel Prize", "For discoveries of how cells sense and adapt to oxygen availability")],
     None, ["Hypoxia", "HIF regulation", "Oxygen sensing", "Erythropoietin"], "Oxford",
     [aff("University of Oxford", "Nuffield Professor of Medicine"),
      aff("Francis Crick Institute", "Director of Clinical Research")]),

    ("Gregg Semenza", "Genetics", "United States", "LIVING", "TITAN", 140,
     "1956-07-01", None,
     "Gregg Semenza is an American geneticist who discovered HIF-1, the master regulator of cellular oxygen sensing. Nobel Prize 2019.",
     ["Nobel Prize in Physiology or Medicine (2019)", "Lasker Award (2016)"],
     [tl(1995, "Discovered HIF-1", "Identified hypoxia-inducible factor 1, the master regulator of oxygen homeostasis"),
      tl(2019, "Nobel Prize", "For discoveries of how cells sense and adapt to oxygen availability")],
     ["HIF-1 discovery"], ["HIF-1", "Oxygen homeostasis", "Hypoxia response", "Angiogenesis"], "Baltimore",
     [aff("Johns Hopkins University", "C. Michael Armstrong Professor of Medicine")], "MD, PhD"),

    # 2018 Nobel
    ("James Allison", "Immunology", "United States", "LIVING", "TITAN", 130,
     "1948-08-07", None,
     "James Allison is an American immunologist who pioneered immune checkpoint therapy for cancer by discovering that blocking CTLA-4 could unleash the immune system against tumors. Nobel Prize 2018.",
     ["Nobel Prize in Physiology or Medicine (2018)", "Lasker Award (2015)", "Breakthrough Prize in Life Sciences (2014)"],
     [tl(1996, "Demonstrated anti-CTLA-4 therapy", "Showed that blocking CTLA-4 could enable immune destruction of tumors"),
      tl(2011, "Ipilimumab approved", "FDA approved the first checkpoint inhibitor drug based on his work"),
      tl(2018, "Nobel Prize", "For discovery of cancer therapy by inhibition of negative immune regulation")],
     ["Immune checkpoint therapy (anti-CTLA-4)"], ["CTLA-4", "Immune checkpoints", "Cancer immunotherapy", "T-cell regulation"], "Houston",
     [aff("MD Anderson Cancer Center", "Chair of Immunology"),
      aff("Parker Institute for Cancer Immunotherapy", "Director")], "PhD"),

    ("Tasuku Honjo", "Immunology", "Japan", "LIVING", "TITAN", 100,
     "1942-01-27", None,
     "Tasuku Honjo is a Japanese immunologist who discovered PD-1 and its role as an immune checkpoint, leading to transformative cancer immunotherapies. Nobel Prize 2018.",
     ["Nobel Prize in Physiology or Medicine (2018)", "Order of Culture (Japan)"],
     [tl(1992, "Discovered PD-1", "Identified programmed death-1 receptor on T cells"),
      tl(2014, "Anti-PD-1 therapy approved", "Nivolumab became first approved anti-PD-1 drug"),
      tl(2018, "Nobel Prize", "For discovery of cancer therapy by inhibition of negative immune regulation")],
     ["PD-1 discovery"], ["PD-1", "PD-L1", "Cancer immunotherapy", "Immune checkpoints"], "Kyoto",
     [aff("Kyoto University", "Distinguished Professor of Immunology")]),

    # 2017 Nobel
    ("Jeffrey Hall", "Genetics", "United States", "LIVING", "ELITE", 60,
     "1945-05-03", None,
     "Jeffrey Hall is an American geneticist who discovered the molecular mechanisms controlling circadian rhythm. Nobel Prize 2017.",
     ["Nobel Prize in Physiology or Medicine (2017)"],
     [tl(1984, "Isolated period gene", "Cloned the period gene in Drosophila, revealing the molecular basis of circadian clocks"),
      tl(2017, "Nobel Prize", "For discoveries of molecular mechanisms controlling circadian rhythm")],
     None, ["Circadian rhythm", "Period gene", "Biological clocks", "Drosophila genetics"], "Orono",
     [aff("University of Maine", "Professor Emeritus")], "PhD"),

    ("Michael Rosbash", "Genetics", "United States", "LIVING", "ELITE", 80,
     "1944-03-07", None,
     "Michael Rosbash is an American geneticist who discovered the transcription-translation feedback loop underlying circadian rhythm. Nobel Prize 2017.",
     ["Nobel Prize in Physiology or Medicine (2017)", "Gruber Prize in Neuroscience"],
     [tl(1990, "Proposed feedback loop model", "Proposed the transcription-translation negative feedback loop for circadian clocks"),
      tl(2017, "Nobel Prize", "For discoveries of molecular mechanisms controlling circadian rhythm")],
     None, ["Circadian rhythm", "Transcription-translation feedback loop", "Biological clocks"], "Waltham",
     [aff("Brandeis University", "Peter Gruber Endowed Chair in Neuroscience")], "PhD"),

    ("Michael Young", "Genetics", "United States", "LIVING", "ELITE", 80,
     "1949-03-28", None,
     "Michael Young is an American geneticist who discovered the timeless gene and mechanisms of circadian rhythm regulation. Nobel Prize 2017.",
     ["Nobel Prize in Physiology or Medicine (2017)"],
     [tl(1994, "Discovered timeless gene", "Identified a second essential clock gene"),
      tl(2017, "Nobel Prize", "For discoveries of molecular mechanisms controlling circadian rhythm")],
     None, ["Circadian rhythm", "Timeless gene", "Sleep biology"], "New York",
     [aff("Rockefeller University", "Richard and Jeanne Fisher Professor")], "PhD"),

    # 2016 Nobel
    # Yoshinori Ohsumi already in batch 1

    # 2015 Nobel
    ("William Campbell", "Parasitology", "Ireland", "LIVING", "ELITE", 40,
     "1930-06-28", None,
     "William Campbell is an Irish-American parasitologist who discovered ivermectin, one of the most important antiparasitic drugs in history. Nobel Prize 2015.",
     ["Nobel Prize in Physiology or Medicine (2015)"],
     [tl(1978, "Developed ivermectin", "Discovered that avermectin derivatives could treat parasitic infections in humans"),
      tl(2015, "Nobel Prize", "For discoveries concerning a novel therapy against infections caused by roundworm parasites")],
     ["Ivermectin development"], ["Ivermectin", "Parasitic diseases", "River blindness", "Lymphatic filariasis"], "North Brunswick",
     [aff("Drew University", "Research Fellow Emeritus")], "PhD"),

    ("Satoshi Omura", "Microbiology", "Japan", "LIVING", "ELITE", 75,
     "1935-07-12", None,
     "Satoshi Omura is a Japanese microbiologist who isolated the Streptomyces bacteria that produce avermectin, the precursor to ivermectin. Nobel Prize 2015.",
     ["Nobel Prize in Physiology or Medicine (2015)", "Order of Culture (Japan)"],
     [tl(1974, "Isolated avermectin-producing bacteria", "Cultured novel Streptomyces strains with potent antiparasitic activity"),
      tl(2015, "Nobel Prize", "For discoveries concerning a novel therapy against roundworm parasites")],
     None, ["Streptomyces", "Avermectin", "Natural product chemistry", "Antiparasitics"], "Tokyo",
     [aff("Kitasato University", "Distinguished Emeritus Professor")], "PhD"),

    ("Youyou Tu", "Pharmacology", "China", "LIVING", "ELITE", 25,
     "1930-12-30", None,
     "Youyou Tu is a Chinese pharmaceutical chemist who discovered artemisinin, extracted from sweet wormwood, which revolutionized malaria treatment and saved millions of lives. Nobel Prize 2015.",
     ["Nobel Prize in Physiology or Medicine (2015)", "Lasker Award (2011)"],
     [tl(1972, "Discovered artemisinin", "Isolated artemisinin from Artemisia annua, the most effective antimalarial drug"),
      tl(2015, "Nobel Prize", "For discoveries concerning a novel therapy against malaria")],
     ["Artemisinin extraction"], ["Artemisinin", "Malaria treatment", "Traditional Chinese medicine", "Drug discovery"], "Beijing",
     [aff("China Academy of Chinese Medical Sciences", "Chief Scientist")], "PhD"),

    # 2014 Nobel
    # John O'Keefe already in batch 1
    ("May-Britt Moser", "Neuroscience", "Norway", "LIVING", "ELITE", 75,
     "1963-01-04", None,
     "May-Britt Moser is a Norwegian neuroscientist who discovered grid cells in the entorhinal cortex, a key component of the brain's positioning system. Nobel Prize 2014.",
     ["Nobel Prize in Physiology or Medicine (2014)", "Kavli Prize (2014)"],
     [tl(2005, "Discovered grid cells", "Found neurons that form a hexagonal coordinate system for spatial navigation"),
      tl(2014, "Nobel Prize", "For discoveries of cells that constitute a positioning system in the brain")],
     ["Grid cell discovery"], ["Grid cells", "Spatial navigation", "Entorhinal cortex", "Place cells"], "Trondheim",
     [aff("Norwegian University of Science and Technology", "Director, Kavli Institute for Systems Neuroscience")], "PhD"),

    ("Edvard Moser", "Neuroscience", "Norway", "LIVING", "ELITE", 90,
     "1962-04-27", None,
     "Edvard Moser is a Norwegian neuroscientist who co-discovered grid cells, fundamental to the brain's internal GPS. Nobel Prize 2014.",
     ["Nobel Prize in Physiology or Medicine (2014)", "Kavli Prize (2014)"],
     [tl(2005, "Co-discovered grid cells", "Mapped the hexagonal firing pattern of entorhinal cortex neurons"),
      tl(2014, "Nobel Prize", "For discoveries of cells that constitute a positioning system in the brain")],
     None, ["Grid cells", "Spatial memory", "Neural circuits", "Brain mapping"], "Trondheim",
     [aff("Norwegian University of Science and Technology", "Professor of Neuroscience")], "PhD"),

    # 2013 Nobel
    # James Rothman, Randy Schekman, Thomas Sudhof already in batch 1

    # 2012 Nobel
    # Shinya Yamanaka and John Gurdon - already exist

    # 2011 Nobel
    ("Jules Hoffmann", "Immunology", "France", "LIVING", "ELITE", 85,
     "1941-08-02", None,
     "Jules Hoffmann is a Luxembourgish-French immunologist who discovered the role of Toll receptors in innate immunity, founding the field of innate immune signaling. Nobel Prize 2011.",
     ["Nobel Prize in Physiology or Medicine (2011)"],
     [tl(1996, "Discovered Toll pathway in immunity", "Showed that Toll receptors activate innate immune responses in Drosophila"),
      tl(2011, "Nobel Prize", "For discoveries concerning the activation of innate immunity")],
     None, ["Toll receptors", "Innate immunity", "Drosophila immunity", "Pattern recognition receptors"], "Strasbourg",
     [aff("University of Strasbourg", "Professor Emeritus")], "PhD"),

    ("Ralph Steinman", "Immunology", "Canada", "HISTORICAL", "TITAN", 150,
     "1943-01-14", "2011-09-30",
     "Ralph Steinman was a Canadian immunologist who discovered dendritic cells and their central role in adaptive immunity. Nobel Prize 2011, awarded posthumously.",
     ["Nobel Prize in Physiology or Medicine (2011)", "Lasker Award (2007)"],
     [tl(1973, "Discovered dendritic cells", "Identified a new cell type crucial for initiating immune responses"),
      tl(2011, "Nobel Prize (posthumous)", "Awarded for discovery of the dendritic cell and its role in adaptive immunity")],
     ["Dendritic cell discovery"], ["Dendritic cells", "Adaptive immunity", "Antigen presentation", "Immune regulation"], "New York",
     [aff("Rockefeller University", "Former Professor")], "MD, PhD"),

    # 2010 Nobel
    ("Robert Edwards", "Reproductive Medicine", "United Kingdom", "HISTORICAL", "TITAN", 60,
     "1925-09-27", "2013-04-10",
     "Robert Edwards was a British physiologist who developed in vitro fertilization (IVF), enabling millions of infertile couples to have children. Nobel Prize 2010.",
     ["Nobel Prize in Physiology or Medicine (2010)", "Lasker Award (2001)"],
     [tl(1968, "First IVF embryo", "Successfully fertilized a human egg outside the body"),
      tl(1978, "First IVF baby born", "Louise Brown, the first test-tube baby, was born using IVF"),
      tl(2010, "Nobel Prize", "For the development of in vitro fertilization")],
     ["In vitro fertilization (IVF)"], ["IVF", "Assisted reproduction", "Embryology", "Fertility treatment"], "Cambridge",
     [aff("University of Cambridge", "Former Professor of Human Reproduction")], "PhD"),

    # 2009 Nobel
    ("Elizabeth Blackburn", "Molecular Biology", "Australia", "LIVING", "TITAN", 120,
     "1948-11-26", None,
     "Elizabeth Blackburn is an Australian-American molecular biologist who discovered telomerase, the enzyme that maintains chromosome ends. Nobel Prize 2009.",
     ["Nobel Prize in Physiology or Medicine (2009)", "Lasker Award (2006)"],
     [tl(1984, "Discovered telomerase", "Co-discovered the enzyme that adds DNA to chromosome ends"),
      tl(2009, "Nobel Prize", "For the discovery of how chromosomes are protected by telomeres and the enzyme telomerase")],
     ["Telomerase discovery"], ["Telomerase", "Telomeres", "Chromosome biology", "Aging"], "San Francisco",
     [aff("University of California, San Francisco", "Professor Emeritus of Biochemistry")], "PhD"),

    ("Carol Greider", "Molecular Biology", "United States", "LIVING", "TITAN", 85,
     "1961-04-15", None,
     "Carol Greider is an American molecular biologist who co-discovered telomerase as a graduate student. Nobel Prize 2009.",
     ["Nobel Prize in Physiology or Medicine (2009)", "Lasker Award (2006)"],
     [tl(1984, "Co-discovered telomerase", "Identified the telomerase enzyme while working with Elizabeth Blackburn"),
      tl(2009, "Nobel Prize", "For the discovery of how chromosomes are protected by telomeres and telomerase")],
     None, ["Telomerase", "Telomere biology", "DNA replication"], "Santa Cruz",
     [aff("University of California, Santa Cruz", "Distinguished Professor")], "PhD"),

    # 2008 Nobel
    ("Harald zur Hausen", "Virology", "Germany", "LIVING", "TITAN", 120,
     "1936-03-11", None,
     "Harald zur Hausen is a German virologist who discovered that human papillomavirus (HPV) causes cervical cancer, leading to the HPV vaccine. Nobel Prize 2008.",
     ["Nobel Prize in Physiology or Medicine (2008)"],
     [tl(1983, "Discovered HPV causes cervical cancer", "Isolated HPV types 16 and 18 from cervical cancer tissue"),
      tl(2006, "HPV vaccine approved", "Vaccines based on his discovery were approved for cancer prevention"),
      tl(2008, "Nobel Prize", "For discovery of human papilloma viruses causing cervical cancer")],
     None, ["HPV", "Cervical cancer", "Oncoviruses", "Cancer prevention"], "Heidelberg",
     [aff("German Cancer Research Center (DKFZ)", "Professor Emeritus")]),

    ("Luc Montagnier", "Virology", "France", "HISTORICAL", "TITAN", 100,
     "1932-08-18", "2022-02-08",
     "Luc Montagnier was a French virologist who co-discovered HIV as the cause of AIDS. Nobel Prize 2008.",
     ["Nobel Prize in Physiology or Medicine (2008)", "Lasker Award (1986)"],
     [tl(1983, "Discovered HIV", "Isolated the virus responsible for AIDS"),
      tl(2008, "Nobel Prize", "For discovery of human immunodeficiency virus")],
     None, ["HIV", "AIDS", "Retrovirology", "Viral discovery"], "Paris",
     [aff("Pasteur Institute", "Former Director of Viral Oncology Unit")]),

    ("Francoise Barre-Sinoussi", "Virology", "France", "LIVING", "ELITE", 85,
     "1947-07-30", None,
     "Francoise Barre-Sinoussi is a French virologist who co-discovered HIV, the virus that causes AIDS. Nobel Prize 2008.",
     ["Nobel Prize in Physiology or Medicine (2008)"],
     [tl(1983, "Co-discovered HIV", "First to isolate and culture the retrovirus from AIDS patients"),
      tl(2008, "Nobel Prize", "For discovery of human immunodeficiency virus")],
     None, ["HIV", "Retrovirology", "AIDS research", "Viral pathogenesis"], "Paris",
     [aff("Pasteur Institute", "Professor Emeritus")], "PhD"),

    # 2007 Nobel
    ("Mario Capecchi", "Genetics", "United States", "LIVING", "TITAN", 85,
     "1937-10-06", None,
     "Mario Capecchi is an Italian-American geneticist who developed gene targeting using homologous recombination in mice. Nobel Prize 2007.",
     ["Nobel Prize in Physiology or Medicine (2007)"],
     [tl(1989, "Developed gene targeting", "Created technique to knock out specific genes in mice using homologous recombination"),
      tl(2007, "Nobel Prize", "For discoveries of principles for introducing specific gene modifications in mice")],
     ["Gene targeting by homologous recombination"], ["Gene targeting", "Knockout mice", "Homologous recombination", "Mouse genetics"], "Salt Lake City",
     [aff("University of Utah", "Distinguished Professor of Human Genetics")], "PhD"),

    ("Oliver Smithies", "Genetics", "United Kingdom", "HISTORICAL", "TITAN", 75,
     "1925-06-23", "2017-01-10",
     "Oliver Smithies was a British-American geneticist who developed gene targeting to create knockout mice and invented gel electrophoresis. Nobel Prize 2007.",
     ["Nobel Prize in Physiology or Medicine (2007)"],
     [tl(1955, "Invented starch gel electrophoresis", "Created a technique that became fundamental to molecular biology"),
      tl(2007, "Nobel Prize", "For discoveries on gene targeting in mice")],
     ["Gel electrophoresis", "Gene targeting in embryonic stem cells"], ["Gene targeting", "Gel electrophoresis", "Knockout mice"], "Chapel Hill",
     [aff("University of North Carolina at Chapel Hill", "Former Excellence Professor")], "PhD"),

    # 2006 Nobel
    ("Andrew Fire", "Genetics", "United States", "LIVING", "TITAN", 65,
     "1959-04-27", None,
     "Andrew Fire is an American biologist who discovered RNA interference (RNAi), a fundamental mechanism of gene silencing. Nobel Prize 2006.",
     ["Nobel Prize in Physiology or Medicine (2006)"],
     [tl(1998, "Discovered RNA interference", "Demonstrated that double-stranded RNA can silence gene expression"),
      tl(2006, "Nobel Prize", "For discovery of RNA interference")],
     ["RNA interference discovery"], ["RNA interference", "Gene silencing", "Double-stranded RNA", "C. elegans"], "Stanford",
     [aff("Stanford University School of Medicine", "Professor of Pathology")], "PhD"),

    # 2005 Nobel
    ("Barry Marshall", "Gastroenterology", "Australia", "LIVING", "ELITE", 65,
     "1951-09-30", None,
     "Barry Marshall is an Australian physician who proved that Helicobacter pylori causes peptic ulcers by famously drinking a culture of the bacteria. Nobel Prize 2005.",
     ["Nobel Prize in Physiology or Medicine (2005)"],
     [tl(1984, "Self-experimented with H. pylori", "Drank a culture of H. pylori to prove it causes gastritis and ulcers"),
      tl(2005, "Nobel Prize", "For discovery of the bacterium Helicobacter pylori and its role in gastritis and peptic ulcer disease")],
     None, ["Helicobacter pylori", "Peptic ulcers", "Gastritis", "Infectious gastroenterology"], "Perth",
     [aff("University of Western Australia", "Professor of Clinical Microbiology")]),

    ("Robin Warren", "Pathology", "Australia", "LIVING", "ELITE", 35,
     "1937-06-11", None,
     "Robin Warren is an Australian pathologist who first observed Helicobacter pylori in gastric biopsies and proposed its link to ulcers. Nobel Prize 2005.",
     ["Nobel Prize in Physiology or Medicine (2005)"],
     [tl(1979, "Observed H. pylori", "First noticed the spiral bacteria in gastric biopsy specimens"),
      tl(2005, "Nobel Prize", "For discovery of H. pylori and its role in peptic ulcer disease")],
     None, ["Helicobacter pylori", "Gastric pathology", "Peptic ulcer disease"], "Perth",
     [aff("Royal Perth Hospital", "Former Pathologist")]),

    # 2004 Nobel - already have Richard Axel and Linda Buck

    # More important figures
    ("Tu Youyou", "Pharmacology", "China", "LIVING", "ELITE", 25,
     "1930-12-30", None, "", [], [], None, [], "Beijing", [], "PhD"),
     # Duplicate - will be caught by existence check

    # ============================================================
    # LEGENDARY SURGEONS AND CLINICAL PIONEERS
    # ============================================================

    ("Christiaan Barnard", "Cardiac Surgery", "South Africa", "HISTORICAL", "TITAN", 30,
     "1922-11-08", "2001-09-02",
     "Christiaan Barnard was a South African cardiac surgeon who performed the world's first human-to-human heart transplant in 1967, one of the most significant achievements in medical history.",
     ["Time Person of the Year finalist"],
     [tl(1967, "First human heart transplant", "Performed the world's first successful human heart transplant at Groote Schuur Hospital in Cape Town"),
      tl(1974, "First heterotopic heart transplant", "Developed the piggyback heart transplant technique")],
     ["Human heart transplantation"], ["Heart transplant", "Cardiac surgery", "Organ transplantation"], "Cape Town",
     [aff("Groote Schuur Hospital", "Head of Cardiothoracic Surgery"),
      aff("University of Cape Town", "Professor of Surgery")]),

    ("Michael DeBakey", "Cardiovascular Surgery", "United States", "HISTORICAL", "TITAN", 85,
     "1908-09-07", "2008-07-11",
     "Michael DeBakey was a Lebanese-American cardiovascular surgeon who pioneered numerous cardiac surgical procedures including coronary bypass surgery and artificial hearts. He performed over 60,000 operations.",
     ["Presidential Medal of Freedom", "Congressional Gold Medal", "Lasker Award"],
     [tl(1953, "Pioneered carotid endarterectomy", "Performed first successful removal of carotid artery blockage"),
      tl(1964, "First coronary bypass", "Performed one of the first coronary artery bypass grafting procedures"),
      tl(1966, "Developed artificial heart", "Implanted the first partial artificial heart")],
     ["Dacron arterial graft", "Coronary artery bypass techniques"], ["Cardiovascular surgery", "Artificial hearts", "Bypass surgery", "Vascular grafts"], "Houston",
     [aff("Baylor College of Medicine", "Chancellor Emeritus and Distinguished Service Professor")]),

    ("Atul Gawande", "Surgery", "United States", "LIVING", "ELITE", 50,
     "1965-11-05", None,
     "Atul Gawande is an American surgeon, writer, and public health leader. His surgical safety checklist has been adopted by the WHO and hospitals worldwide, preventing countless deaths.",
     ["MacArthur Fellowship"],
     [tl(2008, "WHO Surgical Safety Checklist", "Developed the checklist that reduced surgical complications and deaths by 30-40%"),
      tl(2022, "USAID Administrator nomination", "Nominated for senior US global health leadership role")],
     ["WHO Surgical Safety Checklist"], ["Surgical safety", "Checklists", "Public health", "Health systems"], "Boston",
     [aff("Brigham and Women's Hospital", "Surgeon"),
      aff("Harvard T.H. Chan School of Public Health", "Professor")]),

    ("Siddhartha Mukherjee", "Oncology", "United States", "LIVING", "ELITE", 55,
     "1970-07-21", None,
     "Siddhartha Mukherjee is an Indian-American oncologist and author who won the Pulitzer Prize for The Emperor of All Maladies, a biography of cancer. He is a leading cancer researcher and science communicator.",
     ["Pulitzer Prize for General Nonfiction (2011)"],
     [tl(2010, "Published The Emperor of All Maladies", "Wrote the definitive history of cancer, winning the Pulitzer Prize"),
      tl(2016, "Published The Gene", "Wrote a comprehensive history of genetics and its implications")],
     None, ["Cancer biology", "Stem cells", "Gene therapy", "Medical writing"], "New York",
     [aff("Columbia University", "Associate Professor of Medicine")]),

    ("Devi Shetty", "Cardiac Surgery", "India", "LIVING", "ELITE", 15,
     "1953-05-08", None,
     "Devi Shetty is an Indian cardiac surgeon who revolutionized affordable healthcare. He pioneered high-volume, low-cost cardiac surgery and built Narayana Health, making heart operations accessible to millions.",
     ["Padma Shri (2003)", "Padma Bhushan (2012)"],
     [tl(2001, "Founded Narayana Hrudayalaya", "Created a cardiac hospital performing open-heart surgery for $1,500 vs $100,000 in the US"),
      tl(2012, "Narayana Health Insurance", "Launched micro health insurance covering 3 million farmers")],
     ["High-volume low-cost cardiac surgery model"], ["Affordable healthcare", "Cardiac surgery", "Health economics", "Medical innovation"], "Bangalore",
     [aff("Narayana Health", "Chairman and Founder")]),

    ("Magdi Yacoub", "Cardiac Surgery", "Egypt", "LIVING", "TITAN", 100,
     "1935-11-16", None,
     "Magdi Yacoub is an Egyptian-British cardiac surgeon who performed more heart and lung transplants than any surgeon in history. He pioneered the Ross procedure and developed techniques for complex congenital heart repair.",
     ["Order of Merit", "Knight Bachelor"],
     [tl(1980, "Pioneer of heart-lung transplantation", "Became one of the world's leading transplant surgeons at Harefield Hospital"),
      tl(2007, "Grew heart valve from stem cells", "First to grow a human heart valve from stem cells"),
      tl(2009, "Founded Aswan Heart Centre", "Built a world-class cardiac center in rural Egypt providing free surgery")],
     ["Ross procedure refinement", "Heart valve tissue engineering"], ["Heart transplant", "Lung transplant", "Congenital heart disease", "Stem cells"], "London",
     [aff("Imperial College London", "Professor of Cardiothoracic Surgery"),
      aff("Harefield Hospital", "Consultant Cardiac Surgeon")]),

    ("Ben Carson", "Neurosurgery", "United States", "LIVING", "ELITE", 30,
     "1951-09-18", None,
     "Ben Carson is an American neurosurgeon who performed the first successful separation of conjoined twins joined at the back of the head in 1987. He was a pioneering pediatric neurosurgeon at Johns Hopkins.",
     ["Presidential Medal of Freedom (2008)"],
     [tl(1987, "Separated conjoined twins", "First successful separation of occipital craniopagus twins"),
      tl(1985, "Youngest chief of pediatric neurosurgery", "Became chief of pediatric neurosurgery at Johns Hopkins at age 33")],
     ["Occipital craniopagus twin separation technique"], ["Pediatric neurosurgery", "Craniopagus twins", "Brain surgery"], "Baltimore",
     [aff("Johns Hopkins Hospital", "Former Director of Pediatric Neurosurgery")]),

    ("Henry Marsh", "Neurosurgery", "United Kingdom", "LIVING", "ELITE", 25,
     "1950-03-05", None,
     "Henry Marsh is a British neurosurgeon and author known for pioneering awake craniotomy in Ukraine and for his bestselling memoir Do No Harm. He brought modern neurosurgical techniques to underserved regions.",
     ["CBE (Commander of the Order of the British Empire)"],
     [tl(1992, "Began pro bono work in Ukraine", "Pioneered modern neurosurgery in post-Soviet Ukraine"),
      tl(2014, "Published Do No Harm", "Bestselling memoir about the realities of brain surgery")],
     None, ["Neurosurgery", "Awake craniotomy", "Global surgery", "Medical ethics"], "London",
     [aff("St George's Hospital", "Former Senior Consultant Neurosurgeon")]),

    # ============================================================
    # INFECTIOUS DISEASE AND GLOBAL HEALTH PIONEERS
    # ============================================================

    ("Anthony Fauci", "Immunology", "United States", "LIVING", "TITAN", 200,
     "1940-12-24", None,
     "Anthony Fauci is an American immunologist who served as director of NIAID for 38 years. He led the US response to HIV/AIDS, Ebola, Zika, and COVID-19, becoming one of the most cited scientists in history.",
     ["Presidential Medal of Freedom (2008)", "Lasker Award for Public Service (2007)"],
     [tl(1984, "Became NIAID Director", "Began 38-year tenure leading US infectious disease research"),
      tl(2003, "PEPFAR architect", "Helped design the President's Emergency Plan for AIDS Relief"),
      tl(2020, "Led COVID-19 response", "Served as chief medical advisor during the pandemic")],
     None, ["HIV/AIDS", "Immunoregulation", "Pandemic preparedness", "Infectious diseases", "COVID-19"], "Washington",
     [aff("National Institute of Allergy and Infectious Diseases", "Former Director"),
      aff("National Institutes of Health", "Former Chief Medical Advisor to the President")]),

    ("Peter Piot", "Infectious Disease", "Belgium", "LIVING", "ELITE", 90,
     "1949-02-17", None,
     "Peter Piot is a Belgian microbiologist who co-discovered the Ebola virus in 1976 and served as founding executive director of UNAIDS.",
     ["Hideyo Noguchi Africa Prize", "Order of Leopold"],
     [tl(1976, "Co-discovered Ebola virus", "Was among the team that identified Ebola during the first known outbreak in Zaire"),
      tl(1995, "Founding Director of UNAIDS", "Led the UN's global AIDS response for 13 years")],
     None, ["Ebola", "HIV/AIDS", "Global health policy", "Tropical medicine"], "London",
     [aff("London School of Hygiene and Tropical Medicine", "Director")]),

    ("Tedros Adhanom Ghebreyesus", "Public Health", "Ethiopia", "LIVING", "ELITE", 20,
     "1965-03-03", None,
     "Tedros Adhanom Ghebreyesus is an Ethiopian public health expert serving as Director-General of WHO. He previously served as Ethiopia's Minister of Health, dramatically expanding healthcare access.",
     [],
     [tl(2005, "Ethiopia Minister of Health", "Expanded healthcare workforce from 16,000 to 38,000 and reduced child mortality by 40%"),
      tl(2017, "WHO Director-General", "First African to lead the World Health Organization"),
      tl(2020, "Led global COVID-19 response", "Coordinated international pandemic response through WHO")],
     None, ["Global health governance", "Pandemic response", "Health systems strengthening", "Universal health coverage"], "Geneva",
     [aff("World Health Organization", "Director-General")], "PhD"),

    ("Paul Farmer", "Infectious Disease", "United States", "HISTORICAL", "ELITE", 55,
     "1959-10-26", "2022-02-21",
     "Paul Farmer was an American physician-anthropologist who co-founded Partners in Health and proved that drug-resistant tuberculosis and HIV could be treated in resource-poor settings.",
     ["MacArthur Fellowship"],
     [tl(1987, "Co-founded Partners in Health", "Created a model for delivering high-quality healthcare in the world's poorest communities"),
      tl(2003, "WHO advisor on AIDS treatment", "Helped develop the WHO '3 by 5' initiative to treat 3 million with antiretrovirals by 2005")],
     None, ["Global health equity", "Tuberculosis", "HIV/AIDS", "Health systems"], "Boston",
     [aff("Harvard Medical School", "Former Kolokotrones University Professor"),
      aff("Partners in Health", "Co-Founder")]),

    # ============================================================
    # WOMEN IN MEDICINE PIONEERS
    # ============================================================

    ("Elizabeth Blackwell", "Medicine", "United States", "HISTORICAL", "ELITE", 0,
     "1821-02-03", "1910-05-31",
     "Elizabeth Blackwell was the first woman to receive a medical degree in the United States (1849). She founded the New York Infirmary for Women and Children and was a pioneer of women in medicine.",
     [],
     [tl(1849, "First US female MD", "Graduated from Geneva Medical College, becoming the first woman to earn an MD in America"),
      tl(1857, "Founded New York Infirmary", "Established a hospital staffed entirely by women physicians"),
      tl(1868, "Founded Women's Medical College", "Created a medical school for women in New York")],
     None, ["Women in medicine", "Medical education", "Public health"], "New York",
     [aff("New York Infirmary for Women and Children", "Founder")]),

    ("Rebecca Lee Crumpler", "Medicine", "United States", "HISTORICAL", "ELITE", 0,
     "1831-02-08", "1895-03-09",
     "Rebecca Lee Crumpler was the first African American woman to earn a medical degree in the United States (1864). She treated freed slaves after the Civil War and published a medical textbook.",
     [],
     [tl(1864, "First Black female MD in US", "Graduated from New England Female Medical College"),
      tl(1883, "Published medical textbook", "Published 'A Book of Medical Discourses,' one of the first by a Black physician")],
     None, ["Primary care", "Women's health", "Medical education"], "Boston",
     [aff("New England Female Medical College", "Graduate")]),

    ("Gerty Cori", "Biochemistry", "United States", "HISTORICAL", "TITAN", 30,
     "1896-08-15", "1957-10-26",
     "Gerty Cori was a Czech-American biochemist who was the first woman to win the Nobel Prize in Physiology or Medicine (1947) for discovering the Cori cycle of glycogen metabolism.",
     ["Nobel Prize in Physiology or Medicine (1947)"],
     [tl(1929, "Discovered Cori cycle", "Elucidated how glycogen is broken down and resynthesized in the body"),
      tl(1947, "Nobel Prize", "First woman to win Nobel Prize in Physiology or Medicine")],
     ["Cori cycle discovery"], ["Glycogen metabolism", "Cori cycle", "Enzyme catalysis", "Biochemistry"], "St. Louis",
     [aff("Washington University in St. Louis", "Professor of Biochemistry")], "PhD"),

    ("Rosalyn Yalow", "Medical Physics", "United States", "HISTORICAL", "TITAN", 40,
     "1921-07-19", "2011-05-30",
     "Rosalyn Yalow was an American medical physicist who developed radioimmunoassay (RIA), a revolutionary technique for measuring tiny quantities of biological substances. Nobel Prize 1977.",
     ["Nobel Prize in Physiology or Medicine (1977)", "Lasker Award (1976)"],
     [tl(1959, "Developed radioimmunoassay", "Created RIA technique to measure insulin and other hormones in blood"),
      tl(1977, "Nobel Prize", "For development of radioimmunoassays of peptide hormones")],
     ["Radioimmunoassay (RIA)"], ["Radioimmunoassay", "Hormone measurement", "Nuclear medicine", "Endocrinology"], "New York",
     [aff("Bronx VA Medical Center", "Senior Medical Investigator")], "PhD"),

    ("Barbara McClintock", "Genetics", "United States", "HISTORICAL", "TITAN", 40,
     "1902-06-16", "1992-09-02",
     "Barbara McClintock was an American geneticist who discovered genetic transposition (jumping genes), demonstrating that the genome is far more dynamic than previously believed. Nobel Prize 1983.",
     ["Nobel Prize in Physiology or Medicine (1983)", "National Medal of Science"],
     [tl(1948, "Discovered transposons", "Found that genetic elements can move between positions on chromosomes"),
      tl(1983, "Nobel Prize", "Sole recipient for discovery of mobile genetic elements")],
     ["Genetic transposition discovery"], ["Transposons", "Jumping genes", "Maize genetics", "Cytogenetics"], "Cold Spring Harbor",
     [aff("Cold Spring Harbor Laboratory", "Distinguished Scientist")], "PhD"),

    ("Rita Levi-Montalcini", "Neuroscience", "Italy", "HISTORICAL", "TITAN", 60,
     "1909-04-22", "2012-12-30",
     "Rita Levi-Montalcini was an Italian neurobiologist who discovered nerve growth factor (NGF), revealing how cells communicate and grow. Nobel Prize 1986.",
     ["Nobel Prize in Physiology or Medicine (1986)", "National Medal of Science"],
     [tl(1952, "Discovered nerve growth factor", "Identified NGF as a critical signal for nerve cell growth and differentiation"),
      tl(1986, "Nobel Prize", "For discovery of growth factors"),
      tl(2001, "Italian senator for life", "Appointed to the Italian Senate for her contributions to science")],
     ["Nerve growth factor discovery"], ["Nerve growth factor", "Neurotrophins", "Cell growth", "Developmental neurobiology"], "Rome",
     [aff("Washington University in St. Louis", "Former Professor"),
      aff("European Brain Research Institute", "Founder and President")]),

    # ============================================================
    # MODERN RESEARCH PIONEERS
    # ============================================================

    ("Jennifer Doudna", "Biochemistry", "United States", "LIVING", "TITAN", 130,
     "1964-02-19", None,
     "Jennifer Doudna is an American biochemist who co-developed CRISPR-Cas9 genome editing technology. Her work has revolutionized molecular biology and holds promise for curing genetic diseases. Nobel Prize 2020.",
     ["Nobel Prize in Chemistry (2020)", "Breakthrough Prize in Life Sciences (2015)", "Kavli Prize (2018)"],
     [tl(2012, "Developed CRISPR-Cas9", "Published landmark paper showing CRISPR-Cas9 could be programmed to edit DNA"),
      tl(2020, "Nobel Prize in Chemistry", "Awarded jointly with Emmanuelle Charpentier for CRISPR-Cas9")],
     ["CRISPR-Cas9 genome editing"], ["CRISPR", "Gene editing", "Cas9", "RNA biology", "Structural biology"], "Berkeley",
     [aff("University of California, Berkeley", "Li Ka Shing Chancellor's Chair Professor of Chemistry"),
      aff("Howard Hughes Medical Institute", "Investigator")], "PhD"),

    ("Emmanuelle Charpentier", "Microbiology", "France", "LIVING", "TITAN", 60,
     "1968-12-11", None,
     "Emmanuelle Charpentier is a French microbiologist who co-developed CRISPR-Cas9 gene editing by discovering tracrRNA, a critical component. Nobel Prize in Chemistry 2020.",
     ["Nobel Prize in Chemistry (2020)", "Breakthrough Prize in Life Sciences (2015)"],
     [tl(2011, "Discovered tracrRNA", "Found the trans-activating RNA essential for CRISPR function"),
      tl(2012, "Co-developed CRISPR-Cas9 editing", "Published joint paper with Doudna on programmable genome editing"),
      tl(2020, "Nobel Prize in Chemistry", "Awarded jointly with Jennifer Doudna")],
     ["CRISPR-Cas9 (co-developer)"], ["CRISPR", "tracrRNA", "Bacterial immunity", "Gene editing"], "Berlin",
     [aff("Max Planck Unit for the Science of Pathogens", "Founding Director")], "PhD"),

    ("Shinya Yamanaka", "Stem Cell Biology", "Japan", "LIVING", "TITAN", 130,
     "1962-09-04", None,
     "Shinya Yamanaka is a Japanese stem cell researcher who discovered how to reprogram mature cells into pluripotent stem cells (iPSCs). Nobel Prize 2012.",
     ["Nobel Prize in Physiology or Medicine (2012)", "Lasker Award (2009)", "Breakthrough Prize in Life Sciences (2013)"],
     [tl(2006, "Created iPSCs", "Showed that four transcription factors can reprogram adult cells to an embryonic-like state"),
      tl(2012, "Nobel Prize", "For the discovery that mature cells can be reprogrammed to become pluripotent")],
     ["Induced pluripotent stem cells (iPSCs)"], ["iPSCs", "Stem cell reprogramming", "Yamanaka factors", "Regenerative medicine"], "Kyoto",
     [aff("Kyoto University", "Director, Center for iPS Cell Research"),
      aff("Gladstone Institutes", "Senior Investigator")]),

    ("Eric Lander", "Genomics", "United States", "LIVING", "TITAN", 230,
     "1957-02-03", None,
     "Eric Lander is an American geneticist who was a principal leader of the Human Genome Project. He founded and directed the Broad Institute and has been one of the most cited scientists in biomedicine.",
     ["Breakthrough Prize in Life Sciences (2013)", "MacArthur Fellowship"],
     [tl(2001, "Led Human Genome Project", "Was principal author of the landmark Nature paper on the human genome sequence"),
      tl(2004, "Founded Broad Institute", "Established a major genomics research center at MIT and Harvard"),
      tl(2021, "Director of OSTP", "Served as White House Science Advisor")],
     None, ["Human genome", "GWAS", "Computational biology", "Genomic medicine"], "Cambridge",
     [aff("Broad Institute of MIT and Harvard", "Founding Director and President Emeritus"),
      aff("MIT", "Professor of Biology")], "PhD"),

    ("Francis Collins", "Genetics", "United States", "LIVING", "TITAN", 190,
     "1950-04-14", None,
     "Francis Collins is an American physician-geneticist who directed the Human Genome Project and led the National Institutes of Health for 12 years. He discovered genes for cystic fibrosis and other diseases.",
     ["Presidential Medal of Freedom (2023)", "National Medal of Science"],
     [tl(1989, "Discovered cystic fibrosis gene", "Co-discovered the CFTR gene mutation causing cystic fibrosis"),
      tl(1993, "Led Human Genome Project", "Directed the international effort to map the human genome"),
      tl(2009, "NIH Director", "Began 12-year tenure leading the world's largest biomedical research agency")],
     None, ["Human genome", "Cystic fibrosis", "Gene discovery", "Precision medicine"], "Bethesda",
     [aff("National Institutes of Health", "Former Director"),
      aff("National Human Genome Research Institute", "Former Director")]),

    ("George Church", "Genetics", "United States", "LIVING", "TITAN", 160,
     "1954-08-28", None,
     "George Church is an American geneticist who developed foundational methods in genomic sequencing and is a pioneer of synthetic biology, CRISPR applications, and personal genomics.",
     ["National Academy of Sciences", "National Academy of Engineering"],
     [tl(1984, "Developed direct genomic sequencing", "Created methods that contributed to the Human Genome Project"),
      tl(2005, "Launched Personal Genome Project", "Created the first open-access human genome database"),
      tl(2013, "Pioneer of CRISPR in human cells", "Among first to apply CRISPR genome editing in human cells")],
     ["Direct genomic sequencing methods", "Multiplex genome engineering"], ["Synthetic biology", "Genomic sequencing", "CRISPR", "Personal genomics", "Gene drives"], "Boston",
     [aff("Harvard Medical School", "Robert Winthrop Professor of Genetics"),
      aff("MIT", "Professor of Health Sciences and Technology")], "PhD"),

    # ============================================================
    # IMPORTANT HISTORICAL MEDICAL FIGURES
    # ============================================================

    ("Alexander Fleming", "Microbiology", "United Kingdom", "HISTORICAL", "TITAN", 25,
     "1881-08-06", "1955-03-11",
     "Alexander Fleming was a Scottish physician who discovered penicillin in 1928, the world's first antibiotic. His discovery launched the antibiotic era and has saved an estimated 200 million lives.",
     ["Nobel Prize in Physiology or Medicine (1945)", "Knight Bachelor"],
     [tl(1928, "Discovered penicillin", "Noticed that Penicillium mold killed bacteria on a culture plate, leading to the first antibiotic"),
      tl(1945, "Nobel Prize", "Shared with Howard Florey and Ernst Boris Chain for the development of penicillin")],
     ["Penicillin discovery"], ["Penicillin", "Antibiotics", "Bacteriology", "Antimicrobial therapy"], "London",
     [aff("St Mary's Hospital", "Professor of Bacteriology")]),

    ("Howard Florey", "Pathology", "Australia", "HISTORICAL", "TITAN", 30,
     "1898-09-24", "1968-02-21",
     "Howard Florey was an Australian pathologist who developed penicillin into a practical antibiotic drug, saving countless lives in World War II and beyond. Nobel Prize 1945.",
     ["Nobel Prize in Physiology or Medicine (1945)", "Order of Merit"],
     [tl(1940, "Developed penicillin for clinical use", "Purified and mass-produced penicillin, proving it could cure bacterial infections"),
      tl(1945, "Nobel Prize", "For the development of penicillin")],
     ["Penicillin mass production method"], ["Penicillin", "Antibiotic development", "Pathology", "Drug development"], "Oxford",
     [aff("University of Oxford", "Professor of Pathology")]),

    ("Frederick Banting", "Medicine", "Canada", "HISTORICAL", "TITAN", 15,
     "1891-11-14", "1941-02-21",
     "Frederick Banting was a Canadian physician who co-discovered insulin in 1921, transforming type 1 diabetes from a death sentence into a manageable condition. Nobel Prize 1923.",
     ["Nobel Prize in Physiology or Medicine (1923)", "Knight Commander of the Order of the British Empire"],
     [tl(1921, "Discovered insulin", "Extracted insulin from pancreatic tissue and demonstrated it could lower blood sugar"),
      tl(1922, "First treated diabetic patient", "Fourteen-year-old Leonard Thompson became the first diabetic treated with insulin"),
      tl(1923, "Nobel Prize", "Youngest Nobel laureate in medicine at the time")],
     ["Insulin discovery"], ["Insulin", "Diabetes", "Pancreatic hormones", "Endocrinology"], "Toronto",
     [aff("University of Toronto", "Professor of Medical Research")]),

    ("Werner Forssmann", "Cardiology", "Germany", "HISTORICAL", "TITAN", 15,
     "1904-08-29", "1979-06-01",
     "Werner Forssmann was a German physician who performed the first cardiac catheterization on himself in 1929, threading a catheter into his own heart. This act of self-experimentation founded interventional cardiology. Nobel Prize 1956.",
     ["Nobel Prize in Physiology or Medicine (1956)"],
     [tl(1929, "First cardiac catheterization", "Inserted a catheter through his own arm vein into his heart, then walked to radiology for an X-ray"),
      tl(1956, "Nobel Prize", "For discoveries concerning heart catheterization")],
     ["Cardiac catheterization"], ["Cardiac catheterization", "Interventional cardiology", "Self-experimentation"], "Bad Kreuznach",
     [aff("Auguste-Viktoria-Krankenhaus", "Physician")]),

    ("Charles Best", "Medicine", "Canada", "HISTORICAL", "TITAN", 15,
     "1899-02-27", "1978-03-31",
     "Charles Best was a Canadian medical scientist who co-discovered insulin with Frederick Banting. As a 22-year-old student, he performed the key experiments isolating the hormone.",
     ["Order of the Companions of Honour"],
     [tl(1921, "Co-discovered insulin", "Assisted Banting in the key experiments isolating insulin from pancreatic extracts"),
      tl(1941, "Succeeded Banting at University of Toronto", "Led the Banting and Best Department of Medical Research")],
     None, ["Insulin", "Diabetes", "Heparin", "Histaminase"], "Toronto",
     [aff("University of Toronto", "Professor and Head of Physiology")]),

    ("Ignaz Semmelweis", "Obstetrics", "Hungary", "HISTORICAL", "TITAN", 0,
     "1818-07-01", "1865-08-13",
     "Ignaz Semmelweis was a Hungarian physician known as the 'saviour of mothers' who discovered that handwashing with chlorinated lime solutions dramatically reduced maternal deaths from childbed fever. His findings predated germ theory.",
     [],
     [tl(1847, "Introduced handwashing", "Mandated handwashing between autopsy work and obstetric examinations, reducing maternal mortality from 18% to under 2%"),
      tl(1861, "Published 'The Etiology of Childbed Fever'", "Documented his evidence for antiseptic procedures")],
     ["Antiseptic handwashing protocol"], ["Hand hygiene", "Puerperal fever", "Infection control", "Antisepsis"], "Budapest",
     [aff("Vienna General Hospital", "Assistant in the First Obstetrical Clinic")]),

    ("Crawford Long", "Anesthesiology", "United States", "HISTORICAL", "ELITE", 0,
     "1815-11-01", "1878-06-16",
     "Crawford Long was an American surgeon who first used diethyl ether as a surgical anesthetic in 1842, predating the famous public demonstration by William Morton.",
     [],
     [tl(1842, "First use of ether anesthesia", "Administered ether to James Venable during tumor removal, the first known use of surgical anesthesia")],
     ["Ether anesthesia"], ["Anesthesia", "Ether", "Surgical anesthesia", "Pain management"], "Jefferson",
     [aff("Private Practice", "Surgeon")]),

    ("William Morton", "Anesthesiology", "United States", "HISTORICAL", "ELITE", 0,
     "1819-08-09", "1868-07-15",
     "William Morton was an American dentist who gave the first public demonstration of ether anesthesia at Massachusetts General Hospital in 1846, known as 'Ether Day,' one of the most important events in medical history.",
     [],
     [tl(1846, "Ether Day demonstration", "Publicly demonstrated surgical anesthesia at Massachusetts General Hospital, launching the era of painless surgery")],
     ["Public demonstration of ether anesthesia"], ["Anesthesia", "Ether", "Dental anesthesia"], "Boston",
     [aff("Massachusetts General Hospital", "Dentist")], "DDS"),

    ("Rudolf Virchow", "Pathology", "Germany", "HISTORICAL", "TITAN", 0,
     "1821-10-13", "1902-09-05",
     "Rudolf Virchow was a German physician known as the 'father of modern pathology.' He established that diseases arise from abnormalities in cells (cellular pathology) and made groundbreaking contributions to public health.",
     [],
     [tl(1858, "Published Cellular Pathology", "Established that all diseases involve changes in normal cells, founding modern pathology"),
      tl(1848, "Public health reforms", "Led investigations into typhus epidemics and advocated for social medicine")],
     ["Cellular pathology"], ["Cellular pathology", "Public health", "Social medicine", "Thrombosis"], "Berlin",
     [aff("Charite Hospital", "Professor of Pathological Anatomy")]),

    ("Andreas Vesalius", "Anatomy", "Belgium", "HISTORICAL", "TITAN", 0,
     "1514-12-31", "1564-10-15",
     "Andreas Vesalius was a Flemish anatomist and physician who is considered the founder of modern human anatomy. His masterwork De Humani Corporis Fabrica (1543) corrected errors from Galen and established anatomy as a science based on human dissection.",
     [],
     [tl(1543, "Published De Humani Corporis Fabrica", "Published the most influential anatomy textbook in history, correcting over 1,000 years of anatomical errors")],
     ["Modern anatomical dissection"], ["Human anatomy", "Anatomical illustration", "Medical education"], "Brussels",
     [aff("University of Padua", "Professor of Anatomy")]),

    ("William Halsted", "Surgery", "United States", "HISTORICAL", "TITAN", 0,
     "1852-09-23", "1922-09-07",
     "William Halsted was an American surgeon who established the first formal surgical residency program, pioneered radical mastectomy for breast cancer, and introduced the use of rubber surgical gloves.",
     [],
     [tl(1889, "Established surgical residency system", "Created the model for surgical training still used worldwide"),
      tl(1890, "Introduced rubber surgical gloves", "Asked Goodyear to produce rubber gloves for operating room use"),
      tl(1894, "Radical mastectomy", "Developed the Halsted radical mastectomy for breast cancer")],
     ["Surgical residency system", "Rubber surgical gloves"], ["Surgical education", "Breast cancer surgery", "Aseptic technique", "Local anesthesia"], "Baltimore",
     [aff("Johns Hopkins Hospital", "First Chief of Surgery")]),

    ("Harvey Cushing", "Neurosurgery", "United States", "HISTORICAL", "TITAN", 0,
     "1869-04-08", "1939-10-07",
     "Harvey Cushing was an American neurosurgeon regarded as the father of modern neurosurgery. He developed many techniques for operating on the brain and described Cushing's syndrome.",
     ["Pulitzer Prize for Biography (1926)"],
     [tl(1901, "Pioneered modern neurosurgery", "Developed new techniques for operating safely on the brain"),
      tl(1912, "Described Cushing's syndrome", "Identified the pituitary-adrenal disorder now named after him"),
      tl(1926, "Won Pulitzer Prize", "For his biography of Sir William Osler")],
     ["Modern neurosurgical techniques", "Blood pressure monitoring during surgery"], ["Neurosurgery", "Pituitary tumors", "Cushing's syndrome", "Surgical technique"], "Boston",
     [aff("Harvard Medical School", "Moseley Professor of Surgery"),
      aff("Peter Bent Brigham Hospital", "Surgeon-in-Chief")]),

    ("Joseph Lister", "Surgery", "United Kingdom", "HISTORICAL", "TITAN", 0,
     "1827-04-05", "1912-02-10",
     "Joseph Lister was a British surgeon who pioneered antiseptic surgery by applying Louis Pasteur's germ theory to surgical practice. His use of carbolic acid to sterilize instruments and wounds dramatically reduced post-surgical infections.",
     ["Order of Merit", "Baronet"],
     [tl(1865, "Introduced antiseptic surgery", "Applied carbolic acid to surgical instruments and wounds, reducing mortality from 45% to 15%"),
      tl(1877, "President of Royal College of Surgeons", "Led the transformation of surgical practice worldwide")],
     ["Antiseptic surgical technique"], ["Antisepsis", "Surgical infection control", "Carbolic acid", "Germ theory application"], "London",
     [aff("King's College Hospital", "Professor of Clinical Surgery"),
      aff("University of Glasgow", "Former Regius Professor of Surgery")]),

    ("Walter Reed", "Infectious Disease", "United States", "HISTORICAL", "ELITE", 0,
     "1851-09-13", "1902-11-22",
     "Walter Reed was an American Army physician who proved that yellow fever is transmitted by mosquitoes, not by direct contact or fomites. His work led to mosquito control measures that made construction of the Panama Canal possible.",
     [],
     [tl(1900, "Proved mosquito transmission of yellow fever", "Led the Yellow Fever Board in Cuba that demonstrated Aedes aegypti mosquitoes transmit the disease"),
      tl(1901, "Eradication of yellow fever in Havana", "Mosquito control based on his findings eliminated yellow fever in Cuba")],
     None, ["Yellow fever", "Mosquito-borne disease", "Tropical medicine", "Military medicine"], "Washington",
     [aff("US Army Medical Corps", "Major")]),

    # ============================================================
    # PHARMACOLOGY AND DRUG DISCOVERY
    # ============================================================

    ("James Black", "Pharmacology", "United Kingdom", "HISTORICAL", "TITAN", 55,
     "1924-06-14", "2010-03-22",
     "James Black was a Scottish pharmacologist who developed propranolol (the first beta-blocker) and cimetidine (the first H2 receptor antagonist for ulcers). His two drug discoveries each revolutionized medicine. Nobel Prize 1988.",
     ["Nobel Prize in Physiology or Medicine (1988)", "Order of Merit"],
     [tl(1964, "Developed propranolol", "Created the first clinically useful beta-blocker, revolutionizing treatment of heart disease"),
      tl(1972, "Developed cimetidine", "Created the first H2 receptor antagonist, transforming ulcer treatment"),
      tl(1988, "Nobel Prize", "For discoveries of important principles for drug treatment")],
     ["Beta-blocker (propranolol)", "H2 receptor antagonist (cimetidine)"], ["Beta-blockers", "H2 antagonists", "Receptor pharmacology", "Drug design"], "London",
     [aff("King's College London", "Professor of Analytical Pharmacology")]),

    ("Gertrude Elion", "Pharmacology", "United States", "HISTORICAL", "TITAN", 40,
     "1918-01-23", "1999-02-21",
     "Gertrude Elion was an American pharmacologist who developed drugs to treat leukemia, malaria, herpes, and organ transplant rejection. Her rational drug design approach transformed pharmaceutical research. Nobel Prize 1988.",
     ["Nobel Prize in Physiology or Medicine (1988)", "National Medal of Science"],
     [tl(1950, "Developed 6-mercaptopurine", "Created the first drug to treat childhood leukemia"),
      tl(1977, "Developed acyclovir", "Created the first effective antiviral drug for herpes"),
      tl(1988, "Nobel Prize", "For discoveries of important principles for drug treatment")],
     ["Rational drug design methodology"], ["Rational drug design", "Antimetabolites", "Leukemia treatment", "Antiviral drugs"], "Research Triangle Park",
     [aff("Burroughs Wellcome", "Head of Experimental Therapy")], "DSc"),

    # ============================================================
    # ADDITIONAL GLOBAL REPRESENTATION
    # ============================================================

    ("Christiaan Eijkman", "Medicine", "Netherlands", "HISTORICAL", "ELITE", 0,
     "1858-08-11", "1930-11-05",
     "Christiaan Eijkman was a Dutch physician who discovered that beriberi is caused by nutritional deficiency, not infection. His work on polished vs unpolished rice led to the discovery of vitamins. Nobel Prize 1929.",
     ["Nobel Prize in Physiology or Medicine (1929)"],
     [tl(1897, "Discovered nutritional cause of beriberi", "Showed that beriberi in chickens was caused by polished rice diet"),
      tl(1929, "Nobel Prize", "For discovery of the antineuritic vitamin")],
     None, ["Beriberi", "Vitamins", "Nutritional deficiency", "Tropical medicine"], "Utrecht",
     [aff("University of Utrecht", "Professor of Hygiene")]),

    ("Carlos Chagas", "Infectious Disease", "Brazil", "HISTORICAL", "TITAN", 0,
     "1879-07-09", "1934-11-08",
     "Carlos Chagas was a Brazilian physician who made one of the most complete discoveries in medicine: he identified the pathogen, the vector, and the clinical manifestations of American trypanosomiasis (Chagas disease) entirely on his own.",
     ["Nominated 7 times for Nobel Prize"],
     [tl(1909, "Discovered Chagas disease", "Identified Trypanosoma cruzi, its triatomine bug vector, and the full clinical spectrum of the disease"),
      tl(1920, "Director of Oswaldo Cruz Institute", "Led Brazil's premier biomedical research institution")],
     None, ["Chagas disease", "Trypanosoma cruzi", "Tropical medicine", "Parasitology"], "Rio de Janeiro",
     [aff("Oswaldo Cruz Institute", "Director")]),

    ("Hideyo Noguchi", "Bacteriology", "Japan", "HISTORICAL", "ELITE", 0,
     "1876-11-09", "1928-05-21",
     "Hideyo Noguchi was a Japanese bacteriologist who contributed to the understanding of syphilis, yellow fever, and other infectious diseases. He died of yellow fever while researching it in Ghana.",
     [],
     [tl(1911, "Cultured Treponema pallidum", "Demonstrated the syphilis spirochete in the brain of patients with general paresis"),
      tl(1928, "Died researching yellow fever", "Contracted and died of yellow fever while studying the disease in Accra, Ghana")],
     None, ["Syphilis", "Yellow fever", "Bacteriology", "Infectious diseases"], "New York",
     [aff("Rockefeller Institute for Medical Research", "Research Member")]),

    ("Salim Abdool Karim", "Infectious Disease", "South Africa", "LIVING", "TITAN", 115,
     "1960-04-09", None,
     "Salim Abdool Karim is a South African epidemiologist who made critical contributions to HIV prevention and treatment, including showing that tenofovir gel could prevent HIV infection in women.",
     ["Order of Mapungubwe"],
     [tl(2010, "CAPRISA 004 trial", "Showed that tenofovir gel reduced HIV infection in women by 39%"),
      tl(2020, "Led South Africa's COVID-19 response", "Chaired the Ministerial Advisory Committee on COVID-19")],
     None, ["HIV prevention", "Antiretroviral therapy", "Epidemiology", "COVID-19"], "Durban",
     [aff("CAPRISA", "Director"),
      aff("Columbia University", "Professor of Epidemiology")]),

    ("Mathuram Santosham", "Pediatrics", "India", "LIVING", "ELITE", 50,
     "1945-01-01", None,
     "Mathuram Santosham is an Indian-American pediatrician who developed and promoted the Haemophilus influenzae type b (Hib) vaccine, which has saved millions of children's lives worldwide.",
     ["Albert B. Sabin Gold Medal"],
     [tl(1991, "Led Hib vaccine development", "Conducted pivotal trials proving Hib conjugate vaccine efficacy in children"),
      tl(2006, "Hib Initiative", "Led global efforts to introduce Hib vaccine in developing countries")],
     None, ["Hib vaccine", "Pediatric infectious disease", "Vaccine delivery", "Global child health"], "Baltimore",
     [aff("Johns Hopkins Bloomberg School of Public Health", "Professor")]),
]

for args in docs:
    if isinstance(args, tuple) and len(args) >= 5:
        result = make_profile(*args)
        if result:
            created.append(result)

print(f"Created {len(created)} new profiles")
for c in sorted(created):
    print(f"  + {c}")
