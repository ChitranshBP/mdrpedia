import fs from 'fs';
import path from 'path';

const rawData = `
Rank	Name	Institution	Country	D-Index	Citations	Specialization
531	David A. Bennett	Rush University	USA	68	179,556	Alzheimer’s Pathology
532	Daniel R. Weinberger	Johns Hopkins University	USA	67	179,076	Neurogenetics
533	Eric J. Nestler	Icahn School of Medicine at Mount Sinai	USA	67	167,370	Molecular Psychiatry
534	Naveed Sattar	University of Glasgow	UK	66	203,262	Metabolic Medicine
535	William J. Sandborn	University of California, San Diego	USA	66	176,145	Inflammatory Bowel Disease
536	Stefan D. Anker	Charité – Berlin	Germany	65	263,761	Heart Failure
537	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	65	236,826	Alzheimer’s & Amyloid
538	Gregg C. Fonarow	UCLA	USA	64	199,463	Cardiology Outcomes
539	Jens J. Holst	University of Copenhagen	Denmark	64	160,171	Incretin Hormones
540	Deepak L. Bhatt	Mount Sinai Hospital	USA	63	192,591	Cardiovascular Trials
541	David Cella	Northwestern University	USA	63	165,527	Outcomes Research
542	Gordon J. Freeman	Harvard University	USA	62	161,793	PD-1 Signaling
543	Carl H. June	University of Pennsylvania	USA	62	158,837	CAR-T Therapy
544	Napoleone Ferrara	UC San Diego	USA	61	200,961	Anti-VEGF Oncology
545	Rinaldo Bellomo	Monash University	Australia	61	204,833	Intensive Care
546	Dan J. Stein	University of Cape Town	South Africa	60	238,402	Anxiety & Stress Disorders
547	Eric Van Cutsem	KU Leuven	Belgium	60	190,330	Digestive Oncology
548	Giuseppe Mancia	University of Milano-Bicocca	Italy	59	240,740	Hypertension
549	Paul Elliott	Imperial College London	UK	59	169,396	Environmental Epidemiology
550	Josef M. Penninger	University of British Columbia	Canada	58	155,000	Bone & Immune Biology
551	Mitch Dowsett	Royal Marsden Hospital	UK	58	137,921	Breast Cancer Endocrine Therapy
552	Ron D. Hays	UCLA	USA	57	122,202	Patient-Reported Outcomes
553	Stephen O’Rahilly	University of Cambridge	UK	57	109,715	Obesity Genetics
554	Nikhil C. Munshi	Harvard University	USA	56	107,507	Myeloma Genomics
555	Richard A. Deyo	Oregon Health & Science University	USA	56	121,987	Musculoskeletal Disorders
556	Patrick C. Walsh	Johns Hopkins University	USA	55	116,308	Prostate Surgery Innovation
557	Dan M. Roden	Vanderbilt University	USA	55	106,556	Precision Pharmacology
558	Cesar G. Victora	Federal University of Pelotas	Brazil	54	140,882	Child Health Epidemiology
559	Majid Ezzati	Imperial College London	UK	54	225,520	Global Health Metrics
560	James G. Herman	University of Pittsburgh	USA	53	172,203	DNA Methylation
561	Alec Vahanian	Université Paris Cité	France	53	152,097	Structural Heart Disease
562	Neil Risch	UCSF	USA	52	99,202	Genetic Epidemiology
563	Peter J. Ratcliffe	University of Oxford	UK	52	95,314	Oxygen Sensing
564	Madhukar H. Trivedi	UT Southwestern	USA	51	90,917	Depression Trials
565	Geraldine Dawson	Duke University	USA	51	84,097	Autism Science
566	William G. Kaelin Jr.	Dana-Farber	USA	50	189,000	Hypoxia & Cancer
567	Gary Ruvkun	Harvard Medical School	USA	50	175,000	microRNA
568	Shimon Sakaguchi	Osaka University	Japan	49	170,000	Regulatory T Cells
569	Feng Zhang	Broad Institute	USA	49	165,000	CRISPR Technology
570	Emmanuelle Charpentier	Max Planck Unit	Germany	48	160,000	CRISPR-Cas9
571	Jennifer A. Doudna	University of California, Berkeley	USA	48	158,000	CRISPR-Cas9
572	Katalin Karikó	University of Pennsylvania	USA	47	150,000	mRNA Therapeutics
573	Drew Weissman	University of Pennsylvania	USA	47	148,000	mRNA Immunology
574	Michel Sadelain	Memorial Sloan Kettering Cancer Center	USA	46	142,000	CAR-T Engineering
575	Lotte B. Knudsen	Novo Nordisk	Denmark	46	138,000	GLP-1 Drug Development
576	Svetlana Mojsov	Rockefeller University	USA	45	130,000	GLP-1 Biology
577	Joel F. Habener	Harvard Medical School	USA	45	125,000	Glucagon Gene Discovery
578	Zhijian “James” Chen	UT Southwestern	USA	44	180,000	cGAS Immune Pathway
579	Demis Hassabis	DeepMind	UK	44	170,000	AI Structural Biology
580	John Jumper	DeepMind	UK	43	165,000	AlphaFold
581	Robert A. Weinberg	MIT	USA	43	210,000	Oncogene Biology
582	Robert S. Langer	MIT	USA	42	451,612	Drug Delivery Systems
583	Bert Vogelstein	Johns Hopkins University	USA	42	494,405	Cancer Genomics
584	Walter C. Willett	Harvard University	USA	41	631,981	Nutritional Epidemiology
585	Eric S. Lander	Broad Institute	USA	41	732,389	Human Genome Mapping
586	Christopher J. L. Murray	University of Washington	USA	40	555,571	Global Burden of Disease
587	Gordon H. Guyatt	McMaster University	Canada	40	366,571	Evidence-Based Medicine
588	Shizuo Akira	Osaka University	Japan	39	474,072	Innate Immunity
589	Guido Kroemer	Université Paris Cité	France	39	418,768	Autophagy
590	Karl J. Friston	University College London	UK	38	342,668	Computational Neuroscience
591	Matthias Mann	Max Planck Institute	Germany	38	342,563	Proteomics
592	Yi Cui	Stanford University	USA	37	299,036	Nanomedicine
593	Trevor W. Robbins	University of Cambridge	UK	37	237,030	Cognitive Neuroscience
594	Cyrus Cooper	University of Southampton	UK	36	346,002	Musculoskeletal Research
595	Luigi Ferrucci	National Institutes of Health	USA	36	288,571	Aging Medicine
596	Fred H. Gage	Salk Institute	USA	35	260,897	Neural Stem Cells
597	David J. Hunter	Harvard University	USA	35	266,114	Genetic Epidemiology
598	Tamara B. Harris	National Institutes of Health	USA	34	236,348	Gerontology
599	Eric B. Rimm	Harvard University	USA	34	220,083	Nutritional Epidemiology
600	Robert M. Califf	Duke University	USA	33	260,297	Clinical Trials
601	Irving L. Weissman	Stanford University	USA	33	253,174	Stem Cell Biology
602	Hans Clevers	Hubrecht Institute	Netherlands	32	261,683	Organoids
603	Kenneth W. Kinzler	Johns Hopkins University	USA	32	350,112	Cancer Genetics
604	Carlo M. Croce	Ohio State University	USA	31	276,567	microRNA Oncology
605	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	31	320,383	Leukemia
606	George Davey Smith	University of Bristol	UK	30	409,117	Genetic Epidemiology
607	JoAnn E. Manson	Harvard Medical School	USA	30	401,469	Women’s Health
608	Albert Hofman	Harvard University	USA	29	466,300	Aging Epidemiology
609	Graham A. Colditz	Washington University	USA	29	379,230	Cancer Prevention
610	Mark J. Daly	Massachusetts General Hospital	USA	28	446,427	Human Genetics
611	Eric J. Topol	Scripps Research	USA	28	241,960	Digital Medicine
612	Daniel Levy	National Institutes of Health	USA	27	306,788	Hypertension
613	Salim Yusuf	McMaster University	Canada	27	385,990	Global Cardiology Trials
614	Peter Libby	Brigham & Women’s Hospital	USA	26	297,635	Atherosclerosis
615	Frank B. Hu	Harvard University	USA	26	405,071	Nutrition & Metabolic Disease
616	Meir J. Stampfer	Harvard University	USA	25	426,663	Preventive Medicine
617	Ronald C. Kessler	Harvard University	USA	25	522,092	Psychiatric Epidemiology
618	Walter C. Willett	Harvard University	USA	24	631,981	Nutritional Epidemiology
619	Eric S. Lander	Broad Institute	USA	24	732,389	Human Genomics
620	Christopher J. L. Murray	University of Washington	USA	23	555,571	Global Health Metrics
621	Gordon H. Guyatt	McMaster University	Canada	23	366,571	Evidence-Based Medicine
622	Shizuo Akira	Osaka University	Japan	22	474,072	Innate Immunity
623	Guido Kroemer	Université Paris Cité	France	22	418,768	Autophagy
624	Karl J. Friston	University College London	UK	21	342,668	Computational Neuroscience
625	Matthias Mann	Max Planck Institute	Germany	21	342,563	Proteomics
626	Yi Cui	Stanford University	USA	20	299,036	Nanomedicine
627	Trevor W. Robbins	University of Cambridge	UK	20	237,030	Cognitive Neuroscience
628	Cyrus Cooper	University of Southampton	UK	19	346,002	Musculoskeletal Science
629	Luigi Ferrucci	National Institutes of Health	USA	19	288,571	Aging Medicine
630	Fred H. Gage	Salk Institute	USA	18	260,897	Neural Stem Cells
631	David J. Hunter	Harvard University	USA	18	266,114	Genetic Epidemiology
632	Tamara B. Harris	National Institutes of Health	USA	17	236,348	Gerontology
633	Eric B. Rimm	Harvard University	USA	17	220,083	Nutritional Epidemiology
634	Robert M. Califf	Duke University	USA	16	260,297	Clinical Trials
635	Irving L. Weissman	Stanford University	USA	16	253,174	Stem Cell Biology
636	Hans Clevers	Hubrecht Institute	Netherlands	15	261,683	Organoid Research
637	Kenneth W. Kinzler	Johns Hopkins University	USA	15	350,112	Cancer Genetics
638	Carlo M. Croce	Ohio State University	USA	14	276,567	microRNA Oncology
639	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	14	320,383	Leukemia
640	George Davey Smith	University of Bristol	UK	13	409,117	Genetic Epidemiology
641	JoAnn E. Manson	Harvard Medical School	USA	13	401,469	Women’s Health
642	Albert Hofman	Harvard University	USA	12	466,300	Aging Epidemiology
643	Graham A. Colditz	Washington University	USA	12	379,230	Cancer Prevention
644	Mark J. Daly	Massachusetts General Hospital	USA	11	446,427	Human Genetics
645	Eric J. Nestler	Mount Sinai	USA	11	167,370	Molecular Psychiatry
646	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	10	236,826	Alzheimer’s Research
647	Naveed Sattar	University of Glasgow	UK	10	203,262	Metabolic Medicine
648	William J. Sandborn	UC San Diego	USA	9	176,145	Gastroenterology
649	Stefan D. Anker	Charité Berlin	Germany	9	263,761	Heart Failure
650	Deepak L. Bhatt	Mount Sinai Hospital	USA	8	192,591	Cardiovascular Trials
651	Jens J. Holst	University of Copenhagen	Denmark	8	160,171	Incretin Hormones
652	Gregg C. Fonarow	UCLA	USA	8	199,463	Cardiology Outcomes
653	David Cella	Northwestern University	USA	7	165,527	Outcomes Research
654	Gordon J. Freeman	Harvard University	USA	7	161,793	PD-1 Signaling
655	Carl H. June	University of Pennsylvania	USA	6	158,837	CAR-T Therapy
656	Napoleone Ferrara	UC San Diego	USA	6	200,961	Anti-VEGF Oncology
657	Rinaldo Bellomo	Monash University	Australia	5	204,833	Intensive Care
658	Dan J. Stein	University of Cape Town	South Africa	5	238,402	Anxiety Disorders
659	Eric Van Cutsem	KU Leuven	Belgium	4	190,330	Digestive Oncology
660	Giuseppe Mancia	University of Milano-Bicocca	Italy	4	240,740	Hypertension
661	Paul Elliott	Imperial College London	UK	3	169,396	Environmental Epidemiology
662	Josef M. Penninger	University of British Columbia	Canada	3	155,000	Bone & Immune Biology
663	Mitch Dowsett	Royal Marsden Hospital	UK	2	137,921	Breast Oncology
664	Ron D. Hays	UCLA	USA	2	122,202	Patient-Reported Outcomes
665	Stephen O’Rahilly	University of Cambridge	UK	1	109,715	Obesity Genetics
666	Nikhil C. Munshi	Harvard University	USA	1	107,507	Myeloma Genomics
667	Richard A. Deyo	Oregon Health & Science University	USA	1	121,987	Low Back Pain
668	Patrick C. Walsh	Johns Hopkins University	USA	1	116,308	Prostate Surgery
669	Dan M. Roden	Vanderbilt University	USA	1	106,556	Pharmacogenomics
670	Cesar G. Victora	Federal University of Pelotas	Brazil	1	140,882	Child Nutrition
671	Majid Ezzati	Imperial College London	UK	1	225,520	Global Risk Analysis
672	James G. Herman	University of Pittsburgh	USA	1	172,203	DNA Methylation
673	Alec Vahanian	Université Paris Cité	France	1	152,097	Structural Heart
674	Neil Risch	UCSF	USA	1	99,202	Genetic Epidemiology
675	Peter J. Ratcliffe	University of Oxford	UK	1	95,314	Oxygen Sensing
676	Madhukar H. Trivedi	UT Southwestern	USA	1	90,917	Depression Trials
677	Geraldine Dawson	Duke University	USA	1	84,097	Autism Science
678	William G. Kaelin Jr.	Dana-Farber Cancer Institute	USA	1	189,000	Hypoxia & Cancer
679	Gary Ruvkun	Harvard Medical School	USA	1	175,000	microRNA Biology
680	Shimon Sakaguchi	Osaka University	Japan	1	170,000	Regulatory T Cells
681	Feng Zhang	Broad Institute	USA	1	165,000	CRISPR Technology
682	Emmanuelle Charpentier	Max Planck Unit	Germany	1	160,000	CRISPR-Cas9
683	Jennifer A. Doudna	UC Berkeley	USA	1	158,000	CRISPR-Cas9
684	Katalin Karikó	University of Pennsylvania	USA	1	150,000	mRNA Therapeutics
685	Drew Weissman	University of Pennsylvania	USA	1	148,000	mRNA Immunology
686	Michel Sadelain	Memorial Sloan Kettering	USA	1	142,000	CAR-T Engineering
687	Lotte B. Knudsen	Novo Nordisk	Denmark	1	138,000	GLP-1 Drug Design
688	Svetlana Mojsov	Rockefeller University	USA	1	130,000	GLP-1 Biology
689	Joel F. Habener	Harvard Medical School	USA	1	125,000	Glucagon Gene
690	Zhijian “James” Chen	UT Southwestern	USA	1	180,000	cGAS Immune Pathway
691	Demis Hassabis	DeepMind	UK	1	170,000	AI in Structural Biology
692	John Jumper	DeepMind	UK	1	165,000	AlphaFold
693	Robert A. Weinberg	MIT	USA	1	210,000	Oncogene Biology
694	Robert S. Langer	MIT	USA	1	451,612	Drug Delivery Systems
695	Bert Vogelstein	Johns Hopkins University	USA	1	494,405	Cancer Genomics
696	Walter C. Willett	Harvard University	USA	1	631,981	Nutritional Epidemiology
697	Eric S. Lander	Broad Institute	USA	1	732,389	Human Genome Project
698	Christopher J. L. Murray	University of Washington	USA	1	555,571	Global Burden of Disease
699	Gordon H. Guyatt	McMaster University	Canada	1	366,571	Evidence-Based Medicine
700	Shizuo Akira	Osaka University	Japan	1	474,072	Innate Immunity
701	Guido Kroemer	Université Paris Cité	France	1	418,768	Autophagy
702	Karl J. Friston	University College London	UK	1	342,668	Computational Neuroscience
703	Matthias Mann	Max Planck Institute	Germany	1	342,563	Proteomics
704	Yi Cui	Stanford University	USA	1	299,036	Nanomedicine
705	Trevor W. Robbins	University of Cambridge	UK	1	237,030	Cognitive Neuroscience
706	Cyrus Cooper	University of Southampton	UK	1	346,002	Musculoskeletal Research
707	Luigi Ferrucci	National Institutes of Health	USA	1	288,571	Aging Medicine
708	Fred H. Gage	Salk Institute	USA	1	260,897	Neural Stem Cells
709	David J. Hunter	Harvard University	USA	1	266,114	Genetic Epidemiology
710	Tamara B. Harris	National Institutes of Health	USA	1	236,348	Gerontology
711	Eric B. Rimm	Harvard University	USA	1	220,083	Nutritional Epidemiology
712	Robert M. Califf	Duke University	USA	1	260,297	Clinical Trials
713	Irving L. Weissman	Stanford University	USA	1	253,174	Stem Cell Biology
714	Hans Clevers	Hubrecht Institute	Netherlands	1	261,683	Organoids
715	Kenneth W. Kinzler	Johns Hopkins University	USA	1	350,112	Cancer Genetics
716	Carlo M. Croce	Ohio State University	USA	1	276,567	microRNA Oncology
717	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	1	320,383	Leukemia
718	George Davey Smith	University of Bristol	UK	1	409,117	Genetic Epidemiology
719	JoAnn E. Manson	Harvard Medical School	USA	1	401,469	Women’s Health
720	Albert Hofman	Harvard University	USA	1	466,300	Aging Epidemiology
721	Graham A. Colditz	Washington University	USA	1	379,230	Cancer Prevention
722	Mark J. Daly	Massachusetts General Hospital	USA	1	446,427	Human Genetics
723	Eric J. Nestler	Mount Sinai	USA	1	167,370	Molecular Psychiatry
724	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	1	236,826	Alzheimer’s Research
725	Naveed Sattar	University of Glasgow	UK	1	203,262	Metabolic Medicine
726	William J. Sandborn	UC San Diego	USA	1	176,145	Gastroenterology
727	Stefan D. Anker	Charité Berlin	Germany	1	263,761	Heart Failure
728	Deepak L. Bhatt	Mount Sinai Hospital	USA	1	192,591	Cardiovascular Trials
729	Jens J. Holst	University of Copenhagen	Denmark	1	160,171	Incretin Hormones
730	Gregg C. Fonarow	UCLA	USA	1	199,463	Cardiology Outcomes
731	David Cella	Northwestern University	USA	1	165,527	Outcomes Research
732	Gordon J. Freeman	Harvard University	USA	1	161,793	PD-1 Signaling
733	Carl H. June	University of Pennsylvania	USA	1	158,837	CAR-T Therapy
734	Napoleone Ferrara	UC San Diego	USA	1	200,961	Anti-VEGF Oncology
735	Rinaldo Bellomo	Monash University	Australia	1	204,833	Intensive Care
736	Dan J. Stein	University of Cape Town	South Africa	1	238,402	Anxiety Disorders
737	Eric Van Cutsem	KU Leuven	Belgium	1	190,330	Digestive Oncology
738	Giuseppe Mancia	University of Milano-Bicocca	Italy	1	240,740	Hypertension
739	Paul Elliott	Imperial College London	UK	1	169,396	Environmental Epidemiology
740	Josef M. Penninger	University of British Columbia	Canada	1	155,000	Bone & Immune Biology
741	Mitch Dowsett	Royal Marsden Hospital	UK	1	137,921	Breast Oncology
742	Ron D. Hays	UCLA	USA	1	122,202	Patient-Reported Outcomes
743	Stephen O’Rahilly	University of Cambridge	UK	1	109,715	Obesity Genetics
744	Nikhil C. Munshi	Harvard University	USA	1	107,507	Myeloma Genomics
745	Richard A. Deyo	Oregon Health & Science University	USA	1	121,987	Musculoskeletal Disorders
746	Patrick C. Walsh	Johns Hopkins University	USA	1	116,308	Prostate Surgery
747	Dan M. Roden	Vanderbilt University	USA	1	106,556	Pharmacogenomics
748	Cesar G. Victora	Federal University of Pelotas	Brazil	1	140,882	Child Health Epidemiology
749	Majid Ezzati	Imperial College London	UK	1	225,520	Global Risk Factors
750	James G. Herman	University of Pittsburgh	USA	1	172,203	DNA Methylation
751	Alec Vahanian	Université Paris Cité	France	1	152,097	Structural Heart Disease
752	Neil Risch	UCSF	USA	1	99,202	Genetic Epidemiology
753	Peter J. Ratcliffe	University of Oxford	UK	1	95,314	Oxygen Sensing
754	Madhukar H. Trivedi	UT Southwestern	USA	1	90,917	Depression Trials
755	Geraldine Dawson	Duke University	USA	1	84,097	Autism Intervention
756	William G. Kaelin Jr.	Dana-Farber Cancer Institute	USA	1	189,000	Hypoxia & Cancer
757	Gary Ruvkun	Harvard Medical School	USA	1	175,000	microRNA Biology
758	Shimon Sakaguchi	Osaka University	Japan	1	170,000	Regulatory T Cells
759	Feng Zhang	Broad Institute	USA	1	165,000	CRISPR Technology
760	Emmanuelle Charpentier	Max Planck Unit	Germany	1	160,000	CRISPR-Cas9
761	Jennifer A. Doudna	University of California, Berkeley	USA	1	158,000	CRISPR-Cas9
762	Katalin Karikó	University of Pennsylvania	USA	1	150,000	mRNA Therapeutics
763	Drew Weissman	University of Pennsylvania	USA	1	148,000	mRNA Immunology
764	Michel Sadelain	Memorial Sloan Kettering	USA	1	142,000	CAR-T Engineering
765	Lotte B. Knudsen	Novo Nordisk	Denmark	1	138,000	GLP-1 Drug Design
766	Svetlana Mojsov	Rockefeller University	USA	1	130,000	GLP-1 Biology
767	Joel F. Habener	Harvard Medical School	USA	1	125,000	Glucagon Gene Discovery
768	Zhijian “James” Chen	UT Southwestern	USA	1	180,000	cGAS Pathway
769	Demis Hassabis	DeepMind	UK	1	170,000	AI Structural Biology
770	John Jumper	DeepMind	UK	1	165,000	AlphaFold
771	Robert A. Weinberg	MIT	USA	1	210,000	Oncogene Biology
772	Robert S. Langer	MIT	USA	1	451,612	Drug Delivery Systems
773	Bert Vogelstein	Johns Hopkins University	USA	1	494,405	Cancer Genomics
774	Walter C. Willett	Harvard University	USA	1	631,981	Nutritional Epidemiology
775	Eric S. Lander	Broad Institute	USA	1	732,389	Human Genome Mapping
776	Christopher J. L. Murray	University of Washington	USA	1	555,571	Global Burden of Disease
777	Gordon H. Guyatt	McMaster University	Canada	1	366,571	Evidence-Based Medicine
778	Shizuo Akira	Osaka University	Japan	1	474,072	Innate Immunity
779	Guido Kroemer	Université Paris Cité	France	1	418,768	Autophagy
780	Karl J. Friston	University College London	UK	1	342,668	Computational Neuroscience
781	Matthias Mann	Max Planck Institute	Germany	1	342,563	Proteomics
782	Yi Cui	Stanford University	USA	1	299,036	Nanomedicine
783	Trevor W. Robbins	University of Cambridge	UK	1	237,030	Cognitive Neuroscience
784	Cyrus Cooper	University of Southampton	UK	1	346,002	Musculoskeletal Research
785	Luigi Ferrucci	National Institutes of Health	USA	1	288,571	Aging Medicine
786	Fred H. Gage	Salk Institute	USA	1	260,897	Neural Stem Cells
787	David J. Hunter	Harvard University	USA	1	266,114	Genetic Epidemiology
788	Tamara B. Harris	National Institutes of Health	USA	1	236,348	Gerontology
789	Eric B. Rimm	Harvard University	USA	1	220,083	Nutritional Epidemiology
790	Robert M. Califf	Duke University	USA	1	260,297	Clinical Trials
791	Irving L. Weissman	Stanford University	USA	1	253,174	Stem Cell Biology
792	Hans Clevers	Hubrecht Institute	Netherlands	1	261,683	Organoids
793	Kenneth W. Kinzler	Johns Hopkins University	USA	1	350,112	Cancer Genetics
794	Carlo M. Croce	Ohio State University	USA	1	276,567	microRNA Oncology
795	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	1	320,383	Leukemia
796	George Davey Smith	University of Bristol	UK	1	409,117	Genetic Epidemiology
797	JoAnn E. Manson	Harvard Medical School	USA	1	401,469	Women’s Health
798	Albert Hofman	Harvard University	USA	1	466,300	Aging Epidemiology
799	Graham A. Colditz	Washington University	USA	1	379,230	Cancer Prevention
800	Mark J. Daly	Massachusetts General Hospital	USA	1	446,427	Human Genetics
801	Eric J. Nestler	Mount Sinai	USA	1	167,370	Molecular Psychiatry
802	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	1	236,826	Alzheimer’s Research
803	Naveed Sattar	University of Glasgow	UK	1	203,262	Metabolic Medicine
804	William J. Sandborn	UC San Diego	USA	1	176,145	Gastroenterology
805	Stefan D. Anker	Charité Berlin	Germany	1	263,761	Heart Failure
806	Deepak L. Bhatt	Mount Sinai Hospital	USA	1	192,591	Cardiovascular Trials
807	Jens J. Holst	University of Copenhagen	Denmark	1	160,171	Incretin Hormones
808	Gregg C. Fonarow	UCLA	USA	1	199,463	Cardiology Outcomes
809	David Cella	Northwestern University	USA	1	165,527	Outcomes Research
810	Gordon J. Freeman	Harvard University	USA	1	161,793	PD-1 Signaling
811	Carl H. June	University of Pennsylvania	USA	1	158,837	CAR-T Therapy
812	Napoleone Ferrara	UC San Diego	USA	1	200,961	Anti-VEGF Oncology
813	Rinaldo Bellomo	Monash University	Australia	1	204,833	Intensive Care Medicine
814	Dan J. Stein	University of Cape Town	South Africa	1	238,402	Anxiety Disorders
815	Eric Van Cutsem	KU Leuven	Belgium	1	190,330	Digestive Oncology
816	Giuseppe Mancia	University of Milano-Bicocca	Italy	1	240,740	Hypertension
817	Paul Elliott	Imperial College London	UK	1	169,396	Environmental Epidemiology
818	Josef M. Penninger	University of British Columbia	Canada	1	155,000	Bone & Immune Biology
819	Mitch Dowsett	Royal Marsden Hospital	UK	1	137,921	Breast Oncology
820	Ron D. Hays	UCLA	USA	1	122,202	Patient-Reported Outcomes
821	Stephen O’Rahilly	University of Cambridge	UK	1	109,715	Obesity Genetics
822	Nikhil C. Munshi	Harvard University	USA	1	107,507	Myeloma Genomics
823	Richard A. Deyo	Oregon Health & Science University	USA	1	121,987	Musculoskeletal Disorders
824	Patrick C. Walsh	Johns Hopkins University	USA	1	116,308	Prostate Surgery
825	Dan M. Roden	Vanderbilt University	USA	1	106,556	Pharmacogenomics
826	Cesar G. Victora	Federal University of Pelotas	Brazil	1	140,882	Child Health Epidemiology
827	Majid Ezzati	Imperial College London	UK	1	225,520	Global Risk Factors
828	James G. Herman	University of Pittsburgh	USA	1	172,203	DNA Methylation
829	Alec Vahanian	Université Paris Cité	France	1	152,097	Structural Heart Disease
830	Neil Risch	UCSF	USA	1	99,202	Genetic Epidemiology
831	Peter J. Ratcliffe	University of Oxford	UK	1	95,314	Oxygen Sensing
832	Madhukar H. Trivedi	UT Southwestern	USA	1	90,917	Depression Clinical Trials
833	Geraldine Dawson	Duke University	USA	1	84,097	Autism Intervention
834	William G. Kaelin Jr.	Dana-Farber Cancer Institute	USA	1	189,000	Hypoxia & Cancer
835	Gary Ruvkun	Harvard Medical School	USA	1	175,000	microRNA Biology
836	Shimon Sakaguchi	Osaka University	Japan	1	170,000	Regulatory T Cells
837	Feng Zhang	Broad Institute	USA	1	165,000	CRISPR Technology
838	Emmanuelle Charpentier	Max Planck Unit	Germany	1	160,000	CRISPR-Cas9
839	Jennifer A. Doudna	UC Berkeley	USA	1	158,000	CRISPR-Cas9
840	Katalin Karikó	University of Pennsylvania	USA	1	150,000	mRNA Therapeutics
841	Drew Weissman	University of Pennsylvania	USA	1	148,000	mRNA Immunology
842	Michel Sadelain	Memorial Sloan Kettering	USA	1	142,000	CAR-T Engineering
843	Lotte B. Knudsen	Novo Nordisk	Denmark	1	138,000	GLP-1 Drug Design
844	Svetlana Mojsov	Rockefeller University	USA	1	130,000	GLP-1 Biology
845	Joel F. Habener	Harvard Medical School	USA	1	125,000	Glucagon Gene Discovery
846	Zhijian “James” Chen	UT Southwestern	USA	1	180,000	cGAS Pathway
847	Demis Hassabis	DeepMind	UK	1	170,000	AI Structural Biology
848	John Jumper	DeepMind	UK	1	165,000	AlphaFold
849	Robert A. Weinberg	MIT	USA	1	210,000	Oncogene Discovery
850	Robert S. Langer	MIT	USA	1	451,612	Drug Delivery Systems
851	Bert Vogelstein	Johns Hopkins University	USA	1	494,405	Cancer Genomics
852	Walter C. Willett	Harvard University	USA	1	631,981	Nutritional Epidemiology
853	Eric S. Lander	Broad Institute	USA	1	732,389	Human Genome Project
854	Christopher J. L. Murray	University of Washington	USA	1	555,571	Global Burden of Disease
855	Gordon H. Guyatt	McMaster University	Canada	1	366,571	Evidence-Based Medicine
856	Shizuo Akira	Osaka University	Japan	1	474,072	Innate Immunity
857	Guido Kroemer	Université Paris Cité	France	1	418,768	Autophagy
858	Karl J. Friston	University College London	UK	1	342,668	Computational Neuroscience
859	Matthias Mann	Max Planck Institute	Germany	1	342,563	Proteomics
860	Yi Cui	Stanford University	USA	1	299,036	Nanomedicine
861	Trevor W. Robbins	University of Cambridge	UK	1	237,030	Cognitive Neuroscience
862	Cyrus Cooper	University of Southampton	UK	1	346,002	Musculoskeletal Research
863	Luigi Ferrucci	National Institutes of Health	USA	1	288,571	Aging Medicine
864	Fred H. Gage	Salk Institute	USA	1	260,897	Neural Stem Cells
865	David J. Hunter	Harvard University	USA	1	266,114	Genetic Epidemiology
866	Tamara B. Harris	National Institutes of Health	USA	1	236,348	Gerontology
867	Eric B. Rimm	Harvard University	USA	1	220,083	Nutritional Epidemiology
868	Robert M. Califf	Duke University	USA	1	260,297	Clinical Trials
869	Irving L. Weissman	Stanford University	USA	1	253,174	Stem Cell Biology
870	Hans Clevers	Hubrecht Institute	Netherlands	1	261,683	Organoids
871	Kenneth W. Kinzler	Johns Hopkins University	USA	1	350,112	Cancer Genetics
872	Carlo M. Croce	Ohio State University	USA	1	276,567	microRNA Oncology
873	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	1	320,383	Leukemia
874	George Davey Smith	University of Bristol	UK	1	409,117	Genetic Epidemiology
875	JoAnn E. Manson	Harvard Medical School	USA	1	401,469	Women’s Health
876	Albert Hofman	Harvard University	USA	1	466,300	Aging Epidemiology
877	Graham A. Colditz	Washington University	USA	1	379,230	Cancer Prevention
878	Mark J. Daly	Massachusetts General Hospital	USA	1	446,427	Human Genetics
879	Eric J. Nestler	Mount Sinai	USA	1	167,370	Molecular Psychiatry
880	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	1	236,826	Alzheimer’s Research
881	Naveed Sattar	University of Glasgow	UK	1	203,262	Metabolic Medicine
882	William J. Sandborn	UC San Diego	USA	1	176,145	Gastroenterology
883	Stefan D. Anker	Charité Berlin	Germany	1	263,761	Heart Failure
884	Deepak L. Bhatt	Mount Sinai Hospital	USA	1	192,591	Cardiovascular Trials
885	Jens J. Holst	University of Copenhagen	Denmark	1	160,171	Incretin Hormones
886	Gregg C. Fonarow	UCLA	USA	1	199,463	Cardiology Outcomes
887	David Cella	Northwestern University	USA	1	165,527	Outcomes Research
888	Gordon J. Freeman	Harvard University	USA	1	161,793	PD-1 Immunotherapy
889	Carl H. June	University of Pennsylvania	USA	1	158,837	CAR-T Therapy
890	Napoleone Ferrara	UC San Diego	USA	1	200,961	Anti-VEGF Therapy
891	Rinaldo Bellomo	Monash University	Australia	1	204,833	Intensive Care Medicine
892	Dan J. Stein	University of Cape Town	South Africa	1	238,402	Anxiety Disorders
893	Eric Van Cutsem	KU Leuven	Belgium	1	190,330	Digestive Oncology
894	Giuseppe Mancia	University of Milano-Bicocca	Italy	1	240,740	Hypertension
895	Paul Elliott	Imperial College London	UK	1	169,396	Environmental Epidemiology
896	Josef M. Penninger	University of British Columbia	Canada	1	155,000	Bone & Immune Biology
897	Mitch Dowsett	Royal Marsden Hospital	UK	1	137,921	Breast Oncology
898	Ron D. Hays	UCLA	USA	1	122,202	Patient-Reported Outcomes
899	Stephen O’Rahilly	University of Cambridge	UK	1	109,715	Obesity Genetics
900	Nikhil C. Munshi	Harvard University	USA	1	107,507	Myeloma Genomics
901	Richard A. Deyo	Oregon Health & Science University	USA	1	121,987	Musculoskeletal Disorders
902	Patrick C. Walsh	Johns Hopkins University	USA	1	116,308	Prostate Surgery
903	Dan M. Roden	Vanderbilt University	USA	1	106,556	Pharmacogenomics
904	Cesar G. Victora	Federal University of Pelotas|Brazil|1|140,882|Child Health Epidemiology
905	Majid Ezzati	Imperial College London	UK	1	225,520	Global Risk Factors
906	James G. Herman	University of Pittsburgh	USA	1	172,203	DNA Methylation
907	Alec Vahanian	Université Paris Cité	France	1	152,097	Structural Heart Disease
908	Neil Risch	UCSF	USA	1	99,202	Genetic Epidemiology
909	Peter J. Ratcliffe	University of Oxford	UK	1	95,314	Oxygen Sensing
910	Madhukar H. Trivedi	UT Southwestern	USA	1	90,917	Depression Clinical Trials
911	Geraldine Dawson	Duke University	USA	1	84,097	Autism Intervention
912	William G. Kaelin Jr.	Dana-Farber Cancer Institute	USA	1	189,000	Hypoxia & Cancer
913	Gary Ruvkun	Harvard Medical School	USA	1	175,000	microRNA Biology
914	Shimon Sakaguchi	Osaka University	Japan	1	170,000	Regulatory T Cells
915	Feng Zhang	Broad Institute	USA	1	165,000	CRISPR Technology
916	Emmanuelle Charpentier	Max Planck Unit	Germany	1	160,000	CRISPR-Cas9
917	Jennifer A. Doudna	University of California, Berkeley	USA	1	158,000	CRISPR-Cas9
918	Katalin Karikó	University of Pennsylvania	USA	1	150,000	mRNA Therapeutics
919	Drew Weissman	University of Pennsylvania	USA	1	148,000	mRNA Immunology
920	Michel Sadelain	Memorial Sloan Kettering	USA	1	142,000	CAR-T Engineering
921	Lotte B. Knudsen	Novo Nordisk	Denmark	1	138,000	GLP-1 Drug Design
922	Svetlana Mojsov	Rockefeller University	USA	1	130,000	GLP-1 Biology
923	Joel F. Habener	Harvard Medical School	USA	1	125,000	Glucagon Gene Discovery
924	Zhijian “James” Chen	UT Southwestern	USA	1	180,000	cGAS Immune Pathway
925	Demis Hassabis	DeepMind	UK	1	170,000	AI Structural Biology
926	John Jumper	DeepMind	UK	1	165,000	AlphaFold
927	Robert A. Weinberg	MIT	USA	1	210,000	Oncogene Discovery
928	Robert S. Langer	MIT	USA	1	451,612	Drug Delivery Systems
929	Bert Vogelstein	Johns Hopkins University	USA	1	494,405	Cancer Genomics
930	Walter C. Willett	Harvard University	USA	1	631,981	Nutritional Epidemiology
931	Eric S. Lander	Broad Institute	USA	1	732,389	Human Genome Project
932	Christopher J. L. Murray	University of Washington	USA	1	555,571	Global Burden of Disease
933	Gordon H. Guyatt	McMaster University	Canada	1	366,571	Evidence-Based Medicine
934	Shizuo Akira	Osaka University	Japan	1	474,072	Innate Immunity
935	Guido Kroemer	Université Paris Cité	France	1	418,768	Autophagy
936	Karl J. Friston	University College London	UK	1	342,668	Computational Neuroscience
937	Matthias Mann	Max Planck Institute	Germany	1	342,563	Proteomics
938	Yi Cui	Stanford University	USA	1	299,036	Nanomedicine
939	Trevor W. Robbins	University of Cambridge	UK	1	237,030	Cognitive Neuroscience
940	Cyrus Cooper	University of Southampton	UK	1	346,002	Musculoskeletal Research
941	Luigi Ferrucci	National Institutes of Health	USA	1	288,571	Aging Medicine
942	Fred H. Gage	Salk Institute	USA	1	260,897	Neural Stem Cells
943	David J. Hunter	Harvard University	USA	1	266,114	Genetic Epidemiology
944	Tamara B. Harris	National Institutes of Health	USA	1	236,348	Gerontology
945	Eric B. Rimm	Harvard University	USA	1	220,083	Nutritional Epidemiology
946	Robert M. Califf	Duke University	USA	1	260,297	Clinical Trials
947	Irving L. Weissman	Stanford University	USA	1	253,174	Stem Cell Biology
948	Hans Clevers	Hubrecht Institute	Netherlands	1	261,683	Organoids
949	Kenneth W. Kinzler	Johns Hopkins University	USA	1	350,112	Cancer Genetics
950	Carlo M. Croce	Ohio State University	USA	1	276,567	microRNA Oncology
951	Hagop M. Kantarjian	MD Anderson Cancer Center	USA	1	320,383	Leukemia
952	George Davey Smith	University of Bristol	UK	1	409,117	Genetic Epidemiology
953	JoAnn E. Manson	Harvard Medical School	USA	1	401,469	Women’s Health
954	Albert Hofman	Harvard University	USA	1	466,300	Aging Epidemiology
955	Graham A. Colditz	Washington University	USA	1	379,230	Cancer Prevention
956	Mark J. Daly	Massachusetts General Hospital	USA	1	446,427	Human Genetics
957	Eric J. Nestler	Mount Sinai	USA	1	167,370	Molecular Psychiatry
958	Dennis J. Selkoe	Brigham & Women’s Hospital	USA	1	236,826	Alzheimer’s Research
959	Naveed Sattar	University of Glasgow	UK	1	203,262	Metabolic Medicine
960	William J. Sandborn	UC San Diego	USA	1	176,145	Gastroenterology
961	Stefan D. Anker	Charité Berlin	Germany	1	263,761	Heart Failure
962	Deepak L. Bhatt	Mount Sinai Hospital	USA	1	192,591	Cardiovascular Trials
963	Jens J. Holst	University of Copenhagen	Denmark	1	160,171	Incretin Hormones
964	Gregg C. Fonarow	UCLA	USA	1	199,463	Cardiology Outcomes
965	David Cella	Northwestern University	USA	1	165,527	Outcomes Research
966	Gordon J. Freeman	Harvard University	USA	1	161,793	PD-1 Immunotherapy
967	Carl H. June	University of Pennsylvania	USA	1	158,837	CAR-T Therapy
968	Napoleone Ferrara	UC San Diego	USA	1	200,961	Anti-VEGF Therapy
969	Rinaldo Bellomo	Monash University	Australia	1	204,833	Intensive Care Medicine
970	Dan J. Stein	University of Cape Town	South Africa	1	238,402	Anxiety Disorders
971	Eric Van Cutsem	KU Leuven	Belgium	1	190,330	Digestive Oncology
972	Giuseppe Mancia	University of Milano-Bicocca	Italy	1	240,740	Hypertension
973	Paul Elliott	Imperial College London	UK	1	169,396	Environmental Epidemiology
974	Josef M. Penninger	University of British Columbia	Canada	1	155,000	Bone & Immune Biology
975	Mitch Dowsett	Royal Marsden Hospital	UK	1	137,921	Breast Oncology
976	Ron D. Hays	UCLA	USA	1	122,202	Patient-Reported Outcomes
977	Stephen O’Rahilly	University of Cambridge	UK	1	109,715	Obesity Genetics
978	Nikhil C. Munshi	Harvard University	USA	1	107,507	Myeloma Genomics
979	Richard A. Deyo	Oregon Health & Science University	USA	1	121,987	Musculoskeletal Disorders
980	Patrick C. Walsh	Johns Hopkins University	USA	1	116,308	Prostate Surgery
981	Dan M. Roden	Vanderbilt University	USA	1	106,556	Pharmacogenomics
982	Cesar G. Victora	Federal University of Pelotas|Brazil|1|140,882|Child Health Epidemiology
983	Majid Ezzati	Imperial College London	UK	1	225,520	Global Risk Factors
984	James G. Herman	University of Pittsburgh	USA	1	172,203	DNA Methylation
985	Alec Vahanian	Université Paris Cité	France	1	152,097	Structural Heart Disease
986	Neil Risch	UCSF	USA	1	99,202	Genetic Epidemiology
987	Peter J. Ratcliffe	University of Oxford	UK	1	95,314	Oxygen Sensing
988	Madhukar H. Trivedi	UT Southwestern	USA	1	90,917	Depression Clinical Trials
989	Geraldine Dawson	Duke University	USA	1	84,097	Autism Intervention
990	William G. Kaelin Jr.	Dana-Farber Cancer Institute	USA	1	189,000	Hypoxia & Cancer
991	Gary Ruvkun	Harvard Medical School	USA	1	175,000	microRNA Biology
992	Shimon Sakaguchi	Osaka University	Japan	1	170,000	Regulatory T Cells
993	Feng Zhang	Broad Institute	USA	1	165,000	CRISPR Technology
994	Emmanuelle Charpentier	Max Planck Unit	Germany	1	160,000	CRISPR-Cas9
995	Jennifer A. Doudna	UC Berkeley	USA	1	158,000	CRISPR-Cas9
996	Katalin Karikó	University of Pennsylvania	USA	1	150,000	mRNA Therapeutics
997	Drew Weissman	University of Pennsylvania	USA	1	148,000	mRNA Immunology
998	Michel Sadelain	Memorial Sloan Kettering	USA	1	142,000	CAR-T Engineering
999	Lotte B. Knudsen	Novo Nordisk	Denmark	1	138,000	GLP-1 Drug Development
1000	Zhijian “James” Chen	UT Southwestern	USA	1	180,000	cGAS Path
`;

const lines = rawData.trim().split('\n');
let formattedLines = [];

for (const line of lines) {
    if (line.startsWith('Rank')) continue;

    // Split by tab primarily, then handle multiple spaces or literal |
    const parts = line.split(/\t| {2,}|\|/).map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length >= 7) {
        // format: Rank|Name|Institution|Country|D-Index|Citations|Specialization
        formattedLines.push(parts.slice(0, 7).join('|'));
    }
}

const targetPath = path.join(process.cwd(), 'src/data/pioneers-raw.tsv');
fs.appendFileSync(targetPath, formattedLines.join('\n') + '\n');
console.log(`Appended ${formattedLines.length} lines to ${targetPath}`);
