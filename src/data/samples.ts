export interface MeetingSample {
  id: string;
  title: string;
  description: string;
  languages: string[];
  notes: string;
  transcript: string;
}

export const MEETING_SAMPLES: MeetingSample[] = [
  {
    id: "tech-sync-darija-french",
    title: "IT Startup Algiers - Migration & Stripe integration",
    description: "Technical sync showing typical modern Algerian French-Darija code-switching (mix of Algerian Darija and French).",
    languages: ["Darija", "French"],
    notes: "Focus on task owners and database secrets in Google Secret Manager.",
    transcript: `Yassine: Salam l'équipe, wach rakoum ready pour notre daily standup? Lyoum lezemna darori nshofo la migration de la base de données l'cloud Run, et fin wsalna m3a l'API dial stripe.

Meriem: Salam Yassine, oui ready. Pour Stripe, dert l'intégration de la v3, l-front-end kheddam mzyan. Mazal ghir ndir la validation f backend context bach ndezzo les webhooks l-secure endpoints. On aura besoin de tester ça sur sandbox lyoum l'3shiya.

Yassine: C'est parfait Meriem. Ta3ich, ndiro l-test lyoum à 16h00. Chkoun elli rah ytkelef b l'aws config pour les clés d'API?

Amine: Salam, ana nqder n-handle-ha (n-géri-ha). Ghadi ncreyi les secrets f Google Secret Manager tma fin ghadi nkhabiw la clé privée Stripe et la config du serveur. Bach hka kolchi hani f secruity aspect. Concernant la migration de Postgres pour le Cloud SQL, rani bdit la réplication des tables hier soir, tout s'est bien passé. Mazal ghir chi index khasshom chwiya dial optimisation l'parce que l'query latency hbat chwiya m3a les jointures s3ab.

Yassine: Ya3tik esaha Amine. Hada point crucial pour la performance de la prod. Chhal l'waqt lazemna pour finir l'indexation?

Amine: Nqder nkemmelha d'ici ghodwa sba7 m3a 10h. Safi, ghir tkon ready, n-partagi l-rapport de test f slack.

Yassine: Super! Khlas, Meriem tkemmel sandbox tests f 16h. Amine y-optimize les index de Postgres d'ici ghodwa m3a 10h. Netlaqaw sba7 pour valider l-build complet.`
  },
  {
    id: "arabic-english-marketing",
    title: "Regional Launch Strategy - Media Campaign (Algiers Launch)",
    description: "Multilingual marketing plan switching between Standard Arabic and English for a regional product launch in Algiers.",
    languages: ["Arabic", "English"],
    notes: "Document budget allocations and social media timelines.",
    transcript: `Sarah: أهلاً بالجميع، شكراً لانضمامكم اليوم. Let's review our launching timeline for the new mobile application. We have only 3 weeks left.

Khaled: أهلاً سارة، أهلًا بكل الفريق. بالنسبة للتسويق الرقمي، we already completed the design assets for Facebook and Instagram. لكن بالنسبة لـ YouTube video advertisements, ما زلنا ننتظر موافقة العميل على النص النهائي. It's taking longer than expected.

Sarah: We cannot afford a delay. خالد، هل يمكنك الاتصال بالعميل مباشرةً اليوم? We need that script approved by tomorrow noon at the absolute latest.

Khaled: نعم بالتأكيد، سأتصل به فوراً بعد هذا الاجتماع للحصول على الموافقة الشفهية ثم المكتوبة.

Layla: Hi team, regarding the digital PR and press releases. لقد قمت بصياغة البيان الصحفي بلغتين: English and Arabic. It targets regional magazines directly. وسيكون جاهزاً للتوزيع بمجرد تأكيد تاريخ الإطلاق الرسمي.

Sarah: Excellent work Layla! هذا بالتحديد ما نحتاجه. ليلى، يرجى إرسال المسودة إلى أمين لتدقيق الملخص المالي المذكور في البيان. أمين، هل ميزانية الإطلاق جاهزة؟

Amine: نعم سارة، الميزانية جاهزة بالكامل. We have allocated 15,000 USD for social ads, and 5,000 USD for influencers. سأقوم بإرسال ملف الـ Excel التفصيلي لليلى لمراجعته خلال ساعة من الآن.

Sarah: Perfect. سأقوم بتلخيص النقاط: خالد يتواصل مع العميل لاعتماد نص الفيديو اليوم. ليلى ترسل المسودة لأمين. أمين يشارك الميزانية المالية بالتفصيل مع ليلى اليوم. شكراً جزيلاً للجميع ونلتقي غداً.`
  },
  {
    id: "oran-logistic-customs",
    title: "Logistique & Importation - Port d'Oran (Oranais Accent)",
    description: "Coordination of maritime containers at Oran Port, featuring western Algerian Oranais dialect and French technical terms.",
    languages: ["Darija", "French"],
    notes: "Focus on customs clearance, transport pricing, and container delivery deadlines.",
    transcript: `Kaddour: Salam ki rakoum l'équipe? Labes 3likoum? Lyoum lezem ngueddo ga3 l-wraq m3a l-douane dial port d'Oran (wahran). Sel3a rahi f l-babor raba3 iyam w khassna nkhalsso l-frais de surestarié bach ma n-perdu-ch ktem d-drahem.

Wahiba: Salam khoya Kaddour, ki rak? Labes l-hamdoullah. Pour les conteneurs de pièces de rechange, l-transitaire rani hdart m3ah lyoum sba7. Qal-li ga3 les déclarations de douane rahom prêts, mazal ghir l'immatriculation d'importation w le chèque de banque pour acquitter les taxes de douane. Khassna n-signo-h m3a l-directeur financier f d-dar.

Kaddour: Saha, mlih bezzaf. Chhal rahi la facture dial l-transit ga3 f l'ensemble? 

Redouane: Salam l'khawa, ki rakoum? Wahiba, l'facture fiha 82 millions de centimes (DZD) m3a les frais de manutention de l'Eport. Ana n-proposi n-khelsso-ha lyoum f l'3shiya direct. Wila ma khlesnach lyoum, ghedda iqad l'babor i-décharger d'autres marchandises w d-dossier i-bloqua f le bureau central.

Kaddour: Ya3tikoum es-saha ga3. Wahiba, t'rouhi lyoum l'3shiya direct l'Hydra/Oran centre bach t-géri le chèque de banque m3a l-comptable. Redouane, nta t-kellem transporteur t'dir m3ah rdv ghedda m3a 8h sba7 bach i-déplacer les camions l'Port d'Oran. Khlas?

Redouane: Khlas, rani d'accord. Ghedda sba7 8h n-koun fel port m3a les chauffeurs n-géri d-déchargement.`
  },
  {
    id: "constantine-maintenance-elec",
    title: "Maintenance Électrique - Zone Industrielle Constantine (Constantinois)",
    description: "High voltage maintenance session with East Constantine (Constantinois) expressions mixed with French power grid terminology.",
    languages: ["Darija", "French"],
    notes: "Includes power line shutdowns, security parameters, and maintenance report deadlines.",
    transcript: `Tarek: Salam 3likoum l'khawa, wach ntouma ready pour le plan de coupure électrique de la zone Est de Constantine? Khassna n-géri-w la maintenance des transformateurs bla ma ndiro l-moushkil l-les usines de textile.

Sofiane: Salam Tarek, labes? Oui ready. La coupure de sécurité rahi programmée pour samedi sba7, men 5h ta3 sba7 tal 11h. Rani hdarte m3a l'Sonalgas w l-directeur de la zone, rani ba3te-lhom l'e-mail de notification. Khassna ghir n-validi-w la liste des techniciens li ghadi ykouno sur site.

Mounir: Salam l'khawa, ya3tikom es-saha. Concernant le matériel de rechange, rani jibte les isolateurs de rechange w les disjoncteurs de protection de 30 kilovolts. Kolchi rah fel dépôt. Mechi kma l-marra li fatet, d-matériel lyoum rani verified kolchi b l'appareil de test.

Tarek: Ya3tik es-saha Mounir, khedma mliha. Khassna zoudj (deux) techniciens qualifiés pour l-cellule principale. Sofiane, chkoun li ghadi ykoun chef d'équipe samedi sba7?

Sofiane: Ghadi ykoun Kamel, huya li 3ando l'expérience fel transformateur s3ib. N-géri m3ah ghedda sba7 le brief technique et de sécurité. L-rapport de maintenance lezem ykoun ready fel bureau de Tarek d'ici dimanche m3a 14h.

Tarek: C'est parfait. Khlas: coupure samedi sba7 à 5h, Kamel y-géri l'équipe, Mounir i-fourni l-matériel fel site, w Sofiane y-rédige le rapport pour dimanche 14h. Baraka Allah fikoum.`
  },
  {
    id: "french-darija-cafeteria",
    title: "Projet de Restauration - Algiers Business Center",
    description: "Casual meeting exploring food delivery logistics, catering to local Algerian corporate tastes.",
    languages: ["French", "Darija"],
    notes: "Focus on delivery area and selected menu items.",
    transcript: `Karim: Bonsoir tout le monde, l-lyoum bghina n-valider l'offre finale de la cafétéria dial business district f Sidi Yahia (Hydra). On doit proposer un menu varié qui plait aux cadres.

Nadia: Salam Karim. Derna sondage la semaine lli fatet, w les résultats bînate bli les salariés préfèrent des repas sains et rapides, avec une bonne touche algérienne. B7al chorba express, bourek, des salades fraîches, w les jus naturels. Khassna ndiro attention ls7ab diet feedback.

Karim: Idée wa3ra Nadia! Des plats sains à emporter, c'est super tendance. Rachid, pour la logistique de livraison, chnou drti m3a Yassir Express w les livreurs directs?

Rachid: Salam Karim w Nadia. Hdrte m3a Yassir, ils nous proposent 22% de commission sur chaque commande. Je trouve ça chwiya ghali. Donc, ran-proposi ndiro 3 livreurs à nous avec des motos sghar pour couvrir la zone de Hydra sba7 w l'3shiya. Ça va réduire les coûts et on va contrôler la qualité.

Nadia: C'est judicieux Rachid, mais nbeddo ghir b 2 livreurs f l'début 7tal nchofou l'volume des commandes kifach ghadi ykoun. Hka n-minimiser l-risk.

Karim: D'accord, alors on commence avec 2 livreurs ghedda. Nadia t-finaliser la carte de menu saine d'ici jeudi sba7, et Rachid yqad l'contrat de leasing dial les motos hna l'vendredi.`
  }
];
