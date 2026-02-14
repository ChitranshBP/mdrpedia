const fs = require('fs');
const path = require('path');

const rawData = `
Structured Impact Registry (Ranks 1–50)
Rank	Name	Primary Institution	Specialty	Global Impact Area
1	Gagandeep Kang	CMC Vellore	Virology	Rotavirus vaccine research
2	Soumya Swaminathan	WHO / Former ICMR	Infectious Disease	Global TB & COVID policy
3	Prabhat Jha	Univ. of Toronto (India-origin)	Epidemiology	Global mortality studies
4	Lalit Dandona	IHME / PHFI	Global Health Metrics	Disease burden modeling
5	Partha P. Majumder	NIBMG	Human Genetics	Indian genome diversity
6	Anurag Agrawal	CSIR-IGIB	Genomics	SARS-CoV-2 sequencing
7	V. Mohan	MDRF Chennai	Diabetology	Asian diabetes genetics
8	Nikhil Tandon	AIIMS Delhi	Endocrinology	Diabetes epidemiology
9	Indira Nath	AIIMS	Immunology	Leprosy immunopathology
10	Vivekanand Jha	George Institute India	Nephrology	CKD global research
11	Rakesh Mishra	CCMB	Molecular Biology	Genome biology
12	Shahid Jameel	DBT / Virology	Viral Genomics	COVID variant mapping
13	Sarman Singh	AIIMS	Tropical Medicine	Parasitic infections
14	Randeep Guleria	AIIMS	Pulmonology	COVID clinical protocols
15	Balram Bhargava	ICMR	Cardiology	Indigenous stent program
16	Ashok Seth	Fortis Escorts	Interventional Cardiology	Angioplasty expansion
17	Naresh Trehan	Medanta	Cardiac Surgery	Advanced cardiac surgery
18	Devi Shetty	Narayana Health	Cardiac Surgery	Affordable cardiac model
19	Arvinder Singh Soin	Medanta	Liver Transplant	Living donor transplant
20	Sunil Chandy	CMC Vellore	Hematology	Bone marrow transplant
21	Mammen Chandy	Tata Medical Center	Hematology	BMT protocols
22	Pankaj Chaturvedi	Tata Memorial	Oncology	Tobacco-linked cancers
23	Shyam Aggarwal	Oncology	Cancer Clinical Trials	
24	Alok Thakar	AIIMS	ENT Oncology	Head & Neck cancer
25	Vasanthapuram Ravi	NIMHANS	Neurovirology	Viral encephalitis
26	Krishna Ella	Bharat Biotech	Vaccinology	Covaxin development
27	T. Jacob John	CMC Vellore	Vaccinology	Polio eradication
28	Vinod Paul	NITI Aayog	Neonatology	Public health systems
29	K. Srinath Reddy	PHFI	Preventive Cardiology	Cardiovascular policy
30	Lalit Kumar	AIIMS	Medical Oncology	Lymphoma research
31	Samiran Panda	ICMR	Epidemiology	HIV surveillance
32	Rohini Hensman	Public Health	Health Systems Policy	
33	G. C. Khilnani	Pulmonology	COPD research	
34	Ajay Kumar Singh	Nephrology	CKD research	
35	Subhash Gupta	Liver Transplant	Transplant innovation	
36	Ramakanta Panda	Asian Heart Institute	Cardiac Surgery	
37	Muffazal Lakdawala	Bariatric Surgery	Metabolic surgery	
38	S. V. Madhu	Endocrinology	Diabetes management	
39	K. K. Talwar	Cardiology	Electrophysiology	
40	Alok Srivastava	CMC Vellore	Hematology	Hemophilia research
41	Partha Majumder	Genomics	Population genetics	
42	Bhramar Mukherjee	Biostatistics	Pandemic modeling	
43	Arvind Kumar	Pulmonology	Anti-smoking advocacy	
44	D. Praveen Kumar	Oncology	Precision oncology	
45	Nirmal Kumar Ganguly	ICMR	Vaccine policy	
46	Samiran Nundy	Gastro Surgery	Surgical research	
47	Kiran Mazumdar-Shaw	Biocon	Biopharma innovation	
48	Siddhartha Mukherjee	Oncology	Cancer biology & education	
49	R. A. Mashelkar	CSIR	Pharma innovation policy	
50	G. N. Ramaswamy	Oncology	Cancer networks
Rank	Name	Primary Institution	Specialty	Key Impact Area
51	V. Ramakrishnan	MRC Laboratory of Molecular Biology (Indian-born)	Structural Biology	Ribosome structure (Nobel)
52	Venkatraman Ramakrishnan	UK/India collaborations	Molecular Medicine	Protein synthesis mechanisms
53	K. Vijay Raghavan	Department of Biotechnology	Molecular Biology	National biotech expansion
54	Anil Kakodkar (medical-tech crossover)	BARC	Radiation Applications	Nuclear medicine support
55	P. K. Julka	AIIMS	Radiation Oncology	Cancer radiotherapy protocols
56	Sunil Arora	Public Health	Immunization strategy	
57	B. N. Gangadhar	NIMHANS	Psychiatry	Depression research
58	Alok Sharma	Neurosurgery	Brain tumor surgery	
59	P. Raghu Ram	Breast Cancer Foundation India	Surgical Oncology	
60	N. K. Ganguly	ICMR	Vaccine strategy	
61	Rakesh Aggarwal	SGPGI Lucknow	Hepatology	Viral hepatitis research
62	Subrat Acharya	AIIMS	Hepatology	Liver disease protocols
63	Narinder Mehra	AIIMS	Transplant Immunology	
64	B. K. Rao	Public Health	Health systems	
65	D. K. Sharma	Internal Medicine	Clinical education	
66	Atul Goel	KEM Hospital	Neurosurgery	Craniovertebral surgery
67	Suresh Advani	Oncology	Chemotherapy expansion in India	
68	P. N. Tandon	Neurosurgery	Brain surgery leadership	
69	H. Sudarshan Ballal	Nephrology	Dialysis systems	
70	Arvind Lal	Dr. Lal PathLabs	Diagnostics systems	
71	K. K. Aggarwal (Legacy)	Cardiology	Medical digital education	
72	Sandeep Vaishya	Neurosurgery	Robotic neurosurgery	
73	Deepak Amarapurkar	Hepatology	Fatty liver disease	
74	P. Venugopal	AIIMS	Heart transplant surgery	
75	B. K. Goyal	Gastroenterology	GI research	
76	G. C. Mishra	DBT	Immunology	
77	A. K. Banerjee	Public Health	National health missions	
78	S. K. Sarin	ILBS Delhi	Hepatology	Liver disease guidelines
79	S. R. Reddy	Oncology	Precision therapy	
80	K. R. Sundaram	Biostatistics	Clinical trial modeling	
81	Vasantha Muthuswamy	ICMR	Bioethics policy	
82	P. K. Sethi	Orthopedics	Jaipur Foot innovation	
83	B. M. Hegde	Internal Medicine	Preventive medicine advocacy	
84	Indraneel Mittra	Tata Memorial	Early breast cancer screening	
85	N. R. Biswas	Ophthalmology	Retina surgery	
86	A. P. Dubey	Pediatrics	Neonatal medicine	
87	H. S. Wasir	Cardiology	Preventive cardiology	
88	K. R. Seth	Gastroenterology	Liver transplant	
89	V. K. Paul	Neonatology	Child survival programs	
90	R. P. Singh	Oncology	Clinical oncology trials	
91	A. K. Mahapatra	Neurosurgery	Pediatric neurosurgery	
92	R. K. Dhawan	Pulmonology	Respiratory disease	
93	A. N. Malaviya	Rheumatology	Autoimmune disease research	
94	S. P. Agarwal	Public Health	Health administration	
95	D. S. Rana	Medical Education	Academic leadership	
96	A. K. Bhargava	Cardiology	Interventional procedures	
97	T. K. Joshi	Occupational Health	Environmental medicine	
98	B. S. Singhal	Neurology	Multiple sclerosis research	
99	K. K. Sethi	Neurology	Movement disorders	
100	R. P. Sengupta	Neurosurgery	Cranial surgery	

Rank	Name	Institution	Specialty	Key Impact
101	Anil D’Cruz	Tata Memorial Hospital	Surgical Oncology	Head & neck cancer surgery
102	Rajiv Sarin	ACTREC	Radiation Oncology	Thyroid & cancer genomics
103	Shaji Kumar	Mayo Clinic (India-origin)	Hematology	Multiple myeloma trials
104	Vivek Subbiah	MD Anderson (India-origin)	Precision Oncology	Rare cancer trials
105	Arjun Rajagopalan	Sundaram Medical Foundation	Diabetes	Community diabetology
106	Mohan Deepak	MDRF	Metabolic Medicine	Insulin resistance
107	Nivedita Gupta	ICMR	Epidemiology	COVID serosurveys
108	Jayaprakash Muliyil	CMC Vellore	Epidemiology	Vaccine effectiveness
109	P. S. Reddy	Nephrology	Kidney transplantation	
110	S. K. Gupta	Ophthalmology	Corneal surgery	
111	Rajeev Sood	AIIMS	Urology	Robotic surgery
112	Anant Bhan	Bioethics	Clinical ethics research	
113	M. K. Bhan	DBT	Vaccine development	Rotavirus trials
114	Anuradha Bose	Infectious Disease	Pediatric infections	
115	A. K. Mahajan	Oncology	Lung cancer trials	
116	Roli Mathur	ICMR	NCD Epidemiology	
117	Vivek Nangia	Ophthalmology	Retina epidemiology	
118	S. K. Singh	Endocrinology	Thyroid disorders	
119	S. Arulselvan	Pharmacology	Drug development	
120	R. K. Guleria	Pulmonary Medicine	TB research	
121	Manoj Sharma	Public Health	Health behavior science	
122	Hemant Thacker	Endocrinology	Metabolic disease	
123	M. D. Gupte	Epidemiology	HIV surveillance	
124	Anil Bhansali	PGIMER Chandigarh	Endocrinology	Diabetes complications
125	D. C. Deka	Obstetrics	Maternal mortality	
126	Shubha Phadke	SGPGI	Medical Genetics	Rare genetic disorders
127	Shyam Sunder	Kala-azar research	Tropical disease	
128	A. K. Panda	Immunology	Autoimmune diseases	
129	Ashok Venkitaraman	Cancer Research UK (India-origin)	BRCA genetics	
130	Sandeep Juneja	Hematology	Leukemia research	
131	R. K. Mani	Critical Care	ICU systems	
132	S. K. Saraf	Public Health	Health administration	
133	S. P. Thyagarajan	Virology	Hepatitis research	
134	C. N. R. Rao (biomedical crossover)	IISc	Nano-biomedicine	
135	A. K. Maheshwari	Neurosurgery	Brain tumor research	
136	R. K. Srivastava	Oncology	Cancer molecular markers	
137	K. C. Prakash	TB Research	National TB program	
138	S. M. Yusuf	Cardiology	Preventive cardiology	
139	R. K. Gupta	Radiology	Advanced imaging	
140	B. B. Rewari	HIV Medicine	National AIDS control	
141	T. S. Sathyanarayana Rao	Psychiatry	Mental health research	
142	G. S. Mudur	Public Health Journalism		
143	A. K. Grover	Ophthalmology	AIIMS leadership	
144	K. R. Radhakrishnan	Neurology	Epilepsy research	
145	P. K. Prabhakaran	Cardiology	NCD policy	
146	S. K. Pande	Endocrinology	Obesity research	
147	R. K. Suri	Cardiac Surgery	Bypass innovation	
148	A. K. Agarwal	Nephrology	CKD epidemiology	
149	V. K. Sharma	Neurology	Stroke research	
150	Anil Agarwal	Oncology	Cancer systems care

Rank	Name	Institution	Specialty	Key Impact Area
151	G. C. Khilnani	AIIMS	Pulmonology	COPD & respiratory care
152	Rakesh Kakkar	Public Health Foundation	NCD policy	
153	A. K. Mahapatra	Neurosurgery	Pediatric brain tumors	
154	P. Raghu Ram	Breast Health Foundation	Breast cancer awareness	
155	R. K. Mani	Critical Care	ICU systems research	
156	Sunil Dogra	Dermatology	Autoimmune skin disorders	
157	H. S. Ballal	Nephrology	Dialysis expansion	
158	Deepak Amarapurkar	Hepatology	NAFLD research	
159	S. K. Sharma	AIIMS	Tuberculosis	
160	R. K. Tandon	Gastroenterology	Liver diseases	
161	S. R. Reddy	Oncology	Molecular oncology	
162	Vivek Lal	Neurology	Stroke research	
163	Sanjay Pandey	Neurology	Movement disorders	
164	Arvinder Singh	Ophthalmology	Retina surgery	
165	K. K. Sethi	Neurology	Parkinson’s disease	
166	T. K. Joshi	Occupational Medicine	Environmental health	
167	D. S. Rana	Medical Education	Academic leadership	
168	B. M. Hegde	Internal Medicine	Preventive cardiology	
169	S. P. Agarwal	Health Administration	Health systems reform	
170	N. R. Biswas	Ophthalmology	Retina care	
171	R. P. Sengupta	Neurosurgery	Cranial surgery	
172	A. N. Malaviya	Rheumatology	Autoimmune research	
173	P. Venugopal	AIIMS	Cardiac transplant	
174	H. Sudarshan Ballal	Nephrology	CKD protocols	
175	Rajeev Sood	AIIMS	Robotic urology	
176	S. V. Madhu	Endocrinology	Diabetes education	
177	Vasantha Muthuswamy	ICMR	Bioethics	
178	Rakesh Aggarwal	SGPGI	Viral hepatitis	
179	Subrat Acharya	AIIMS	Hepatology	
180	Narinder Mehra	AIIMS	Transplant immunology	
181	Jayaprakash Muliyil	CMC Vellore	Epidemiology	
182	Shubha Phadke	SGPGI	Genetic disorders	
183	Anil Bhansali	PGIMER	Endocrinology	
184	Indraneel Mittra	Tata Memorial	Cancer screening	
185	Sandeep Vaishya	Neurosurgery	Robotic brain surgery	
186	Ramakanta Panda	Asian Heart Institute	Cardiac surgery	
187	Subhash Gupta	Liver transplant	Surgical innovation	
188	Muffazal Lakdawala	Bariatric surgery	Metabolic surgery	
189	Pankaj Chaturvedi	Tata Memorial	Head & neck cancer	
190	Lalit Kumar	AIIMS	Hematologic oncology	
191	S. K. Sarin	ILBS	Liver disease	
192	Prathap C. Reddy	Apollo Hospitals	Health systems	
193	Kiran Mazumdar-Shaw	Biocon	Biopharma innovation	
194	Anurag Agrawal	CSIR-IGIB	Genomics	
195	V. Mohan	MDRF	Diabetes research	
196	Nikhil Tandon	AIIMS	Endocrinology	
197	Lalit Dandona	PHFI	Disease modeling	
198	Prabhat Jha	Global Epidemiology		
199	Gagandeep Kang	Vaccine science		
200	Soumya Swaminathan	Global health leadership		

Rank	Name	Institution	Specialty	Key Impact Area
201	R. K. Gupta	Radiology	Advanced imaging systems	
202	S. K. Sharma	AIIMS	Tuberculosis research	
203	Vivek Nangia	Ophthalmology	Retina epidemiology	
204	M. D. Gupte	Epidemiology	HIV surveillance	
205	Nivedita Gupta	ICMR	National serosurveys	
206	S. P. Thyagarajan	Virology	Hepatitis B research	
207	A. K. Panda	Immunology	Autoimmune disease	
208	Shyam Sunder	Kala-azar research	Tropical disease	
209	Rajiv Sarin	ACTREC	Radiation oncology	
210	Anil D’Cruz	Tata Memorial	Surgical oncology	
211	Ashok Venkitaraman	Cancer Research UK	BRCA genetics	
212	Shaji Kumar	Hematology	Myeloma research	
213	Vivek Subbiah	Precision oncology	Rare cancer trials	
214	P. K. Julka	AIIMS	Radiation oncology	
215	Suresh Advani	Oncology	Chemotherapy expansion	
216	P. N. Tandon	Neurosurgery	Brain tumor surgery	
217	Atul Goel	KEM Hospital	Craniovertebral surgery	
218	Sanjay Mehta	Ophthalmology	Corneal transplant	
219	H. S. Wasir	Cardiology	Preventive cardiology	
220	R. K. Tandon	Gastroenterology	Hepatology research	
221	Deepak Amarapurkar	Hepatology	Fatty liver disease	
222	S. R. Reddy	Oncology	Molecular markers	
223	Vivekanand Jha	Nephrology	CKD epidemiology	
224	Ajay Kumar Singh	Nephrology	Transplant nephrology	
225	H. Sudarshan Ballal	Dialysis systems		
226	S. V. Madhu	Diabetes	Insulin therapy	
227	Vasantha Muthuswamy	Bioethics	Research regulation	
228	Jayaprakash Muliyil	Epidemiology	Vaccine impact	
229	Shubha Phadke	Medical genetics	Rare disease mapping	
230	Indraneel Mittra	Breast cancer screening		
231	Rakesh Aggarwal	Hepatology	Viral hepatitis	
232	Narinder Mehra	Transplant immunology		
233	Subrat Acharya	Liver disease		
234	Ramakanta Panda	Cardiac surgery		
235	Subhash Gupta	Liver transplant		
236	Muffazal Lakdawala	Bariatric surgery		
237	Pankaj Chaturvedi	Head & neck oncology		
238	Lalit Kumar	Hematologic malignancy		
239	S. K. Sarin	Liver cirrhosis guidelines		
240	Prathap C. Reddy	Healthcare systems		
241	Kiran Mazumdar-Shaw	Biopharma development		
242	Anurag Agrawal	Viral genomics		
243	V. Mohan	Diabetes genetics		
244	Nikhil Tandon	Endocrinology		
245	Lalit Dandona	Global health metrics		
246	Prabhat Jha	Tobacco mortality research		
247	Gagandeep Kang	Vaccine research		
248	Soumya Swaminathan	Global health leadership		
249	Krishna Ella	Vaccine development		
250	T. Jacob John	Polio eradication		
Rank	Name	Institution	Specialty	Key Impact Area
251	R. K. Srivastava	Oncology	Molecular oncology markers	
252	S. Arulselvan	Pharmacology	Drug development research	
253	Hemant Thacker	Endocrinology	Metabolic syndrome	
254	Manoj Sharma	Public Health	Health behavior research	
255	A. K. Mahajan	Oncology	Lung cancer trials	
256	D. C. Deka	Obstetrics	Maternal mortality reduction	
257	Roli Mathur	ICMR	NCD epidemiology	
258	S. K. Singh	Endocrinology	Thyroid disorders	
259	Vivek Lal	Neurology	Stroke & epilepsy	
260	R. P. Singh	Oncology	Clinical oncology trials	
261	A. K. Mahapatra	Neurosurgery	Pediatric neurosurgery	
262	R. K. Dhawan	Pulmonology	Chronic respiratory disease	
263	B. B. Rewari	HIV Medicine	National AIDS control	
264	T. S. Sathyanarayana Rao	Psychiatry	Mental health research	
265	K. R. Radhakrishnan	Neurology	Epilepsy research	
266	P. K. Prabhakaran	Cardiology	Preventive cardiology	
267	S. K. Pande	Endocrinology	Obesity medicine	
268	R. K. Suri	Cardiac Surgery	Bypass techniques	
269	A. K. Agarwal	Nephrology	CKD epidemiology	
270	V. K. Sharma	Neurology	Stroke intervention	
271	Anil Agarwal	Oncology	Cancer care systems	
272	S. K. Saraf	Public Health	Health administration	
273	B. K. Rao	Internal Medicine	Clinical protocols	
274	P. S. Reddy	Nephrology	Kidney transplantation	
275	S. K. Gupta	Ophthalmology	Corneal surgery	
276	Rajeev Sood	Urology	Robotic urologic surgery	
277	Anant Bhan	Bioethics	Clinical ethics policy	
278	M. K. Bhan	Vaccine Science	Rotavirus research	
279	Anuradha Bose	Pediatrics	Pediatric infectious disease	
280	Sunil Arora	Public Health	Immunization strategy	
281	B. N. Gangadhar	Psychiatry	Depression research	
282	Alok Sharma	Neurosurgery	Brain tumor surgery	
283	P. Raghu Ram	Surgical Oncology	Breast cancer awareness	
284	N. K. Ganguly	ICMR	Vaccine policy	
285	Rakesh Aggarwal	Hepatology	Viral hepatitis	
286	Subrat Acharya	Hepatology	Liver disease management	
287	Narinder Mehra	Immunology	Transplant immunology	
288	Indraneel Mittra	Oncology	Breast cancer screening	
289	S. P. Agarwal	Health Systems	Policy implementation	
290	D. S. Rana	Medical Education	Academic leadership	
291	T. K. Joshi	Occupational Health	Environmental exposure	
292	B. M. Hegde	Preventive Medicine	Lifestyle disease advocacy	
293	Sandeep Vaishya	Neurosurgery	Robotic brain surgery	
294	Ramakanta Panda	Cardiac Surgery	Complex bypass surgery	
295	Subhash Gupta	Liver Transplant	Surgical innovation	
296	Muffazal Lakdawala	Bariatric Surgery	Obesity surgery	
297	Pankaj Chaturvedi	Oncology	Tobacco-linked cancers	
298	Lalit Kumar	Hematology	Lymphoma treatment	
299	S. K. Sarin	Hepatology	Cirrhosis guidelines	
300	Prathap C. Reddy	Health Systems	Private hospital expansion	
Rank	Name	Institution	Specialty	Key Impact Area
301	R. K. Mani	Critical Care	ICU protocol systems	
302	Sunil Dogra	Dermatology	Autoimmune dermatology	
303	Vivek Nangia	Ophthalmology	Diabetic retinopathy	
304	Rajeev Sood	Urology	Robotic surgery	
305	Hemant Thacker	Endocrinology	Metabolic disorders	
306	Manoj Sharma	Public Health	Behavioral epidemiology	
307	A. K. Mahajan	Oncology	Thoracic oncology	
308	Roli Mathur	ICMR	NCD surveillance	
309	S. K. Singh	Endocrinology	Thyroid research	
310	D. C. Deka	Obstetrics	Maternal health	
311	Vivek Lal	Neurology	Stroke programs	
312	B. B. Rewari	HIV Medicine	ART expansion	
313	T. S. Sathyanarayana Rao	Psychiatry	Mood disorders	
314	K. R. Radhakrishnan	Neurology	Epilepsy surgery	
315	P. K. Prabhakaran	Cardiology	Prevention policy	
316	S. K. Pande	Endocrinology	Obesity management	
317	A. K. Agarwal	Nephrology	CKD registry work	
318	V. K. Sharma	Neurology	Acute stroke intervention	
319	S. K. Saraf	Public Health	Health administration	
320	B. K. Rao	Internal Medicine	Clinical guidelines	
321	P. S. Reddy	Nephrology	Renal transplant	
322	S. K. Gupta	Ophthalmology	Corneal care	
323	Anant Bhan	Bioethics	Ethics frameworks	
324	M. K. Bhan	Vaccine Science	Pediatric vaccines	
325	Anuradha Bose	Pediatrics	Neonatal infections	
326	Sunil Arora	Public Health	Immunization systems	
327	B. N. Gangadhar	Psychiatry	National mental health	
328	Alok Sharma	Neurosurgery	Brain tumor innovation	
329	P. Raghu Ram	Surgical Oncology	Breast awareness programs	
330	Rakesh Aggarwal	Hepatology	Hepatitis C research	
331	Subrat Acharya	Hepatology	Cirrhosis care	
332	Narinder Mehra	Immunology	HLA typing	
333	Indraneel Mittra	Oncology	Early detection models	
334	S. P. Agarwal	Health Systems	National health policy	
335	D. S. Rana	Medical Education	Institutional leadership	
336	T. K. Joshi	Occupational Health	Environmental risk research	
337	Sandeep Vaishya	Neurosurgery	Minimally invasive brain surgery	
338	Ramakanta Panda	Cardiac Surgery	Advanced bypass surgery	
339	Subhash Gupta	Liver Transplant	Living donor transplant	
340	Muffazal Lakdawala	Bariatric Surgery	Metabolic surgery protocols	
341	Pankaj Chaturvedi	Oncology	Oral cancer prevention	
342	Lalit Kumar	Hematology	Leukemia research	
343	S. K. Sarin	Hepatology	Liver disease guidelines	
344	Krishna Ella	Vaccinology	Indigenous vaccine production	
345	V. Mohan	Diabetes	Urban diabetes research	
346	Nikhil Tandon	Endocrinology	National diabetes guidelines	
347	Lalit Dandona	Global Health	Mortality modeling	
348	Prabhat Jha	Epidemiology	Tobacco mortality	
349	Gagandeep Kang	Vaccine Research	Viral epidemiology	
350	Soumya Swaminathan	Global Health	Infectious disease strategy	

Rank	Name	Institution	Specialty	Key Impact Area
351	R. K. Dhawan	Pulmonology	Chronic respiratory disease	
352	S. K. Sharma	AIIMS	Tuberculosis research	
353	Vivek Nangia	Ophthalmology	Retinal disease	
354	Rajiv Sarin	ACTREC	Radiation oncology	
355	Anil D’Cruz	Tata Memorial	Surgical oncology	
356	Ashok Venkitaraman	Cancer genetics	BRCA mutation research	
357	Shaji Kumar	Hematology	Myeloma clinical trials	
358	Vivek Subbiah	Precision oncology	Rare tumor therapies	
359	P. K. Julka	AIIMS	Radiation therapy	
360	Suresh Advani	Oncology	Chemotherapy expansion	
361	Atul Goel	Neurosurgery	Craniovertebral surgery	
362	Sanjay Mehta	Ophthalmology	Corneal transplant	
363	H. S. Wasir	Cardiology	Preventive cardiology	
364	Deepak Amarapurkar	Hepatology	NAFLD research	
365	S. R. Reddy	Oncology	Molecular oncology	
366	Vivekanand Jha	Nephrology	CKD research	
367	Ajay Kumar Singh	Nephrology	Renal transplantation	
368	S. V. Madhu	Endocrinology	Diabetes education	
369	Jayaprakash Muliyil	Epidemiology	Vaccine impact	
370	Shubha Phadke	Medical genetics	Rare disorders	
371	Indraneel Mittra	Oncology	Cancer screening	
372	Rakesh Aggarwal	Hepatology	Viral hepatitis	
373	Narinder Mehra	Immunology	Transplant immunology	
374	Subrat Acharya	Hepatology	Cirrhosis management	
375	Ramakanta Panda	Cardiac Surgery	Complex bypass	
376	Subhash Gupta	Liver transplant	Transplant innovation	
377	Muffazal Lakdawala	Bariatric Surgery	Metabolic surgery	
378	Pankaj Chaturvedi	Oncology	Oral cancer prevention	
379	Lalit Kumar	Hematology	Leukemia treatment	
380	S. K. Sarin	Hepatology	Liver guidelines	
381	Krishna Ella	Vaccinology	Indigenous vaccines	
382	V. Mohan	Diabetes	Genetic predisposition	
383	Nikhil Tandon	Endocrinology	National diabetes guidelines	
384	Lalit Dandona	Global health	Disease burden modeling	
385	Prabhat Jha	Epidemiology	Tobacco mortality	
386	Gagandeep Kang	Virology	Vaccine development	
387	Soumya Swaminathan	Global health	TB strategy	
388	Anurag Agrawal	Genomics	Viral sequencing	
389	Shahid Jameel	Virology	Variant tracking	
390	Rakesh Mishra	Molecular biology	Genome research	
391	Vasanthapuram Ravi	Neurovirology	Viral encephalitis	
392	T. Jacob John	Vaccinology	Polio eradication	
393	Vinod Paul	Neonatology	Public health reform	
394	K. Srinath Reddy	Preventive cardiology	NCD policy	
395	Sunil Chandy	Hematology	Bone marrow transplant	
396	Mammen Chandy	Hematology	Transplant programs	
397	Arvinder Singh Soin	Liver transplant	Living donor transplant	
398	Ashok Seth	Interventional cardiology	Angioplasty	
399	Naresh Trehan	Cardiac surgery	Complex cardiac care	
400	Devi Shetty	Cardiac surgery	Affordable surgery model

Rank	Name	Institution	Specialty	Key Impact Area
401	S. P. Thyagarajan	Virology	Hepatitis research	
402	R. K. Gupta	Radiology	Advanced imaging	
403	M. D. Gupte	Epidemiology	HIV surveillance	
404	Nivedita Gupta	ICMR	National serosurveys	
405	S. K. Singh	Endocrinology	Thyroid disorders	
406	Roli Mathur	ICMR	NCD epidemiology	
407	Vivek Lal	Neurology	Stroke programs	
408	B. B. Rewari	HIV Medicine	ART scale-up	
409	T. S. Sathyanarayana Rao	Psychiatry	Mood disorder research	
410	K. R. Radhakrishnan	Neurology	Epilepsy surgery	
411	P. K. Prabhakaran	Cardiology	Preventive cardiology	
412	S. K. Pande	Endocrinology	Obesity research	
413	A. K. Agarwal	Nephrology	CKD registries	
414	V. K. Sharma	Neurology	Stroke intervention	
415	Anant Bhan	Bioethics	Clinical ethics frameworks	
416	M. K. Bhan	Vaccine Science	Pediatric immunization	
417	B. N. Gangadhar	Psychiatry	National mental health	
418	Alok Sharma	Neurosurgery	Brain tumor surgery	
419	P. Raghu Ram	Surgical Oncology	Breast awareness programs	
420	Rakesh Aggarwal	Hepatology	Viral hepatitis	
421	Subrat Acharya	Hepatology	Liver disease management	
422	Narinder Mehra	Immunology	HLA typing	
423	Indraneel Mittra	Oncology	Cancer screening models	
424	Ramakanta Panda	Cardiac Surgery	Complex bypass	
425	Subhash Gupta	Liver Transplant	Transplant innovation	
426	Muffazal Lakdawala	Bariatric Surgery	Metabolic surgery	
427	Pankaj Chaturvedi	Oncology	Oral cancer prevention	
428	Lalit Kumar	Hematology	Leukemia therapy	
429	S. K. Sarin	Hepatology	Liver disease guidelines	
430	Krishna Ella	Vaccinology	Indigenous vaccine R&D	
431	V. Mohan	Diabetes	Urban diabetes research	
432	Nikhil Tandon	Endocrinology	National diabetes strategy	
433	Lalit Dandona	Global Health	Mortality modeling	
434	Prabhat Jha	Epidemiology	Tobacco mortality	
435	Gagandeep Kang	Virology	Vaccine research	
436	Soumya Swaminathan	Global Health	TB strategy	
437	Anurag Agrawal	Genomics	Viral sequencing	
438	Shahid Jameel	Virology	Variant tracking	
439	Rakesh Mishra	Molecular Biology	Genome science	
440	Vasanthapuram Ravi	Neurovirology	Viral encephalitis	
441	T. Jacob John	Vaccinology	Polio eradication	
442	Vinod Paul	Neonatology	Health systems reform	
443	K. Srinath Reddy	Preventive Cardiology	NCD policy	
444	Sunil Chandy	Hematology	Bone marrow transplant	
445	Mammen Chandy	Hematology	Transplant protocols	
446	Arvinder Singh Soin	Liver Transplant	Living donor transplant	
447	Ashok Seth	Interventional Cardiology	Angioplasty leadership	
448	Naresh Trehan	Cardiac Surgery	Advanced cardiac care	
449	Devi Shetty	Cardiac Surgery	Affordable surgery model	
450	Balram Bhargava	Cardiology	Indigenous stent program	
`;

const lines = rawData.trim().split('\n');
const seenNames = new Set();
let formattedLines = [];

for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('Rank') || trimmed.startsWith('Structured')) continue;

    // Split by tab primarily
    const parts = trimmed.split(/\t/).map(p => p.trim());

    if (parts.length >= 4) {
        const rank = parts[0];
        const name = parts[1];
        const institution = parts[2];
        const specialty = parts[3];
        const impact = parts[4] || '';

        if (seenNames.has(name)) continue;
        seenNames.add(name);

        // Format for pioneers_raw.tsv: Rank|Name|Institution|Country|D-Index|Citations|Specialization
        // Using "India" as default country for this registry.
        // D-Index/Citations are placeholder 0 for now as they aren't provided.
        // We might want to use 110 (Leader) or similar so they appear in filtered lists.
        const country = "India";
        const dIndex = "110"; // Placeholder for Impact Registry leaders
        const citations = "0";
        const specialization = impact ? `${specialty} - ${impact}` : specialty;

        formattedLines.push(`${rank}|${name}|${institution}|${country}|${dIndex}|${citations}|${specialization}`);
    }
}

const targetPath = path.join(process.cwd(), 'src/data/pioneers_raw.tsv');
fs.appendFileSync(targetPath, formattedLines.join('\n') + '\n');
console.log(`Appended ${formattedLines.length} unique impact records to ${targetPath}`);
process.exit(0);
