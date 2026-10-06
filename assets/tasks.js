/*
  lebonmodel, tâches
  ---------------------------------------------------------------
  w     : poids des évaluations qui mesurent le mieux la tâche (voir LBM_EVALS)
  cost  : comment estimer le coût d'une tâche
          { ev: x }  coût mesuré par Artificial Analysis sur cette évaluation, multiplié par x
          { tok: [entrée, sortie, réflexion] }  calcul au token ; réflexion = multiple
          des tokens qu'utilise le modèle sur une question courte
  ctx   : taille du document à lire, en tokens (0 si sans objet)
  where : où l'on fait la tâche : chat (conversation), work (agent de travail), code (agent de code), api
  need  : niveau requis par défaut (1 Débutant, 2 Junior, 3 Confirmé, 4 Senior, 5 Référence)
*/
window.LBM_EVALS = {
  brief: { name: "AA-Briefcase", text: "projets de travail intellectuel réalistes sur des milliers de documents, notés sur la réussite, l'analyse et la présentation" },
  briefA: { name: "AA-Briefcase, qualité d'analyse", text: "la qualité du raisonnement dans des livrables professionnels" },
  briefP: { name: "AA-Briefcase, présentation", text: "la clarté et la mise en forme des livrables" },
  gdpval: { name: "GDPval-AA", text: "220 tâches de métiers réels (notes, tableaux, présentations) départagées par un jury" },
  auto: { name: "AutomationBench", text: "657 automatisations entre outils métier : messagerie, tableur, CRM, support" },
  tb4: { name: "Terminal-Bench 4.0", text: "des tâches de développement menées en autonomie dans un terminal" },
  scicode: { name: "SciCode", text: "du code Python validé par des tests" },
  hle: { name: "Humanity's Last Exam", text: "2 158 questions d'experts de niveau doctorat" },
  pdf: { name: "GDP.pdf", text: "des réponses à tirer de longs documents PDF, dans 10 domaines" },
  critpt: { name: "CritPt", text: "des problèmes de physique de niveau recherche" },
  lcr: { name: "AA-LCR", text: "des questions sur des dossiers d'environ 100 000 tokens" },
  acc: { name: "AA-Omniscience, exactitude", text: "6 000 questions de connaissance sur 42 sujets" },
  nohall: { name: "AA-Omniscience, prudence", text: "la part des cas où le modèle reconnaît qu'il ne sait pas au lieu d'inventer" },
  fin: { name: "Indice Finance et comptabilité", text: "connaissances, analyse et reporting financiers" },
  strat: { name: "Indice Stratégie et opérations", text: "stratégie, planification et opérations" },
  legal: { name: "Indice Juridique", text: "droit des contrats, recherche et rédaction juridiques, conformité" },
  eco: { name: "Indice Économie", text: "analyse économique et modélisation" }
};

window.LBM_LEVELS = ["Débutant", "Junior", "Confirmé", "Senior", "Référence"];
/* Seuils : part du meilleur score actuel sur la tâche */
window.LBM_CUTS = [0.5, 0.68, 0.82, 0.93];

window.LBM_DOMAINS = {
  redaction: ["stagiaire en communication", "rédacteur junior", "rédacteur confirmé", "plume senior", "plume de dirigeant"],
  document: ["assistant", "chargé d'études", "analyste", "analyste senior", "directeur d'études"],
  juridique: ["stagiaire juridique", "juriste junior", "juriste confirmé", "avocat senior", "associé de cabinet d'avocats"],
  analyse: ["stagiaire", "chargé d'études", "data analyst", "data analyst senior", "head of data"],
  finance: ["assistant comptable", "comptable", "contrôleur de gestion", "responsable financier", "directeur financier"],
  conseil: ["assistant", "chargé de mission", "consultant", "manager", "associé de cabinet de conseil"],
  recherche: ["stagiaire documentaliste", "chargé de veille", "chargé de recherche", "chercheur confirmé", "directeur de recherche"],
  sciences: ["étudiant en licence", "étudiant en master", "doctorant", "chercheur", "professeur d'université"],
  ops: ["assistant administratif", "gestionnaire", "spécialiste des opérations", "responsable des opérations", "directeur des opérations"],
  dev: ["stagiaire développeur", "développeur junior", "développeur confirmé", "développeur senior", "architecte logiciel"]
};

window.LBM_CATEGORIES = [
  { id: "ecrire", label: "Écrire" },
  { id: "document", label: "Lire un document" },
  { id: "analyser", label: "Analyser, décider" },
  { id: "chercher", label: "Chercher, raisonner" },
  { id: "automatiser", label: "Automatiser" },
  { id: "coder", label: "Coder" }
];

window.LBM_TASKS = [
  /* Écrire */
  { id: "reformuler", cat: "ecrire", label: "Corriger ou reformuler un mail", hint: "Ton, orthographe, clarté", domain: "redaction", need: 1,
    w: { briefP: 0.6, gdpval: 0.4 }, cost: { tok: [450, 350, 0.3] }, ctx: 1000, where: ["chat"], unit: "mail",
    kw: "mail email message courriel corriger reformuler orthographe ton relire réponse" },
  { id: "rediger", cat: "ecrire", label: "Rédiger un post, un article, une lettre", hint: "Un texte soigné à partir de vos idées", domain: "redaction", need: 2,
    w: { briefP: 0.45, gdpval: 0.35, briefA: 0.2 }, cost: { tok: [1200, 1300, 1] }, ctx: 2000, where: ["chat"], unit: "texte",
    kw: "rédiger écrire post linkedin article lettre blog discours newsletter texte contenu" },
  { id: "traduire", cat: "ecrire", label: "Traduire un document", hint: "Une dizaine de pages, avec le bon registre", domain: "redaction", need: 2,
    w: { gdpval: 0.5, briefP: 0.3, acc: 0.2 }, cost: { tok: [5000, 5500, 0.6] }, ctx: 6000, where: ["chat"], unit: "document",
    kw: "traduire traduction anglais langue document english version" },
  { id: "synthese", cat: "ecrire", label: "Écrire une note de synthèse", hint: "À partir de plusieurs documents", domain: "redaction", need: 3,
    w: { gdpval: 0.35, briefA: 0.25, pdf: 0.3, nohall: 0.1 }, cost: { pdf: 1 }, ctx: 40000, where: ["chat", "work"], unit: "note",
    kw: "note synthèse compte rendu résumé rapport mémo brief dossier" },

  /* Lire un document */
  { id: "pdf", cat: "document", label: "Interroger un long PDF", hint: "Un rapport ou une étude d'une centaine de pages", domain: "document", need: 2,
    w: { pdf: 0.7, lcr: 0.3 }, cost: { pdf: 1 }, ctx: 50000, where: ["chat", "work"], unit: "document",
    kw: "pdf document rapport étude questions lire comprendre fichier" },
  { id: "resumer", cat: "document", label: "Résumer un très long document", hint: "Environ 300 pages", domain: "document", need: 2,
    w: { lcr: 0.7, pdf: 0.3 }, cost: { lcr: 1.5 }, ctx: 150000, where: ["chat", "work"], unit: "document",
    kw: "résumer résumé long livre rapport 300 pages synthèse document" },
  { id: "croiser", cat: "document", label: "Croiser plusieurs documents", hint: "Retrouver et recouper une information", domain: "document", need: 3,
    w: { lcr: 0.5, pdf: 0.5 }, cost: { lcr: 1 }, ctx: 90000, where: ["chat", "work"], unit: "recherche",
    kw: "croiser comparer documents recouper vérifier information plusieurs fichiers" },
  { id: "contrat", cat: "document", label: "Relire un contrat", hint: "Repérer les clauses à risque", domain: "juridique", need: 4,
    w: { legal: 0.6, pdf: 0.3, nohall: 0.1 }, cost: { pdf: 1.2 }, ctx: 20000, where: ["chat", "work"], unit: "contrat",
    kw: "contrat juridique clause avocat droit cgv bail accord risque juriste" },

  /* Analyser, décider */
  { id: "tableur", cat: "analyser", label: "Analyser un tableau de chiffres", hint: "Un export Excel, des ventes, un budget", domain: "analyse", need: 3,
    w: { fin: 0.3, briefA: 0.3, gdpval: 0.2, scicode: 0.2 }, cost: { gdpval: 0.5 }, ctx: 30000, where: ["chat", "work"], unit: "analyse",
    kw: "excel tableau chiffres données analyse ventes budget kpi statistiques csv" },
  { id: "finance", cat: "analyser", label: "Lire un bilan, bâtir un prévisionnel", hint: "Comptes, budget, trésorerie", domain: "finance", need: 4,
    w: { fin: 0.7, briefA: 0.3 }, cost: { gdpval: 1 }, ctx: 30000, where: ["chat", "work"], unit: "dossier",
    kw: "bilan comptabilité finance prévisionnel budget trésorerie compte de résultat business plan daf" },
  { id: "strategie", cat: "analyser", label: "Préparer une décision stratégique", hint: "Peser des options, recommander", domain: "conseil", need: 4,
    w: { strat: 0.6, briefA: 0.3, eco: 0.1 }, cost: { gdpval: 1 }, ctx: 20000, where: ["chat", "work"], unit: "dossier",
    kw: "stratégie décision options recommandation marché plan organisation conseil" },
  { id: "livrable", cat: "analyser", label: "Produire un livrable complet", hint: "Présentation, rapport ou tableau finalisé", domain: "conseil", need: 4,
    w: { brief: 0.5, gdpval: 0.5 }, cost: { gdpval: 1 }, ctx: 30000, where: ["work", "chat"], unit: "livrable",
    kw: "livrable présentation powerpoint slides rapport document final client" },
  { id: "projet", cat: "analyser", label: "Mener un dossier de fond", hint: "Des dizaines de documents, plusieurs semaines", domain: "conseil", need: 4,
    w: { brief: 0.7, briefA: 0.3 }, cost: { brief: 1 }, ctx: 0, where: ["work", "code"], unit: "étape",
    kw: "projet dossier mission audit due diligence long semaines agent" },

  /* Chercher, raisonner */
  { id: "question", cat: "chercher", label: "Obtenir une réponse fiable", hint: "Une question de culture ou de métier", domain: "recherche", need: 3,
    w: { acc: 0.7, nohall: 0.3 }, cost: { omni: 1 }, ctx: 0, where: ["chat"], unit: "question",
    kw: "question réponse fiable fait culture savoir connaissance vrai info" },
  { id: "expert", cat: "chercher", label: "Répondre à une question d'expert", hint: "Niveau doctorat, tous domaines", domain: "recherche", need: 4,
    w: { hle: 0.7, acc: 0.3 }, cost: { hle: 1 }, ctx: 0, where: ["chat"], unit: "question",
    kw: "expert question difficile pointue doctorat médecine science spécialiste" },
  { id: "recherche", cat: "chercher", label: "Faire une recherche approfondie", hint: "Veille ou état de l'art sourcé", domain: "recherche", need: 3,
    w: { acc: 0.35, briefA: 0.3, hle: 0.2, nohall: 0.15 }, cost: { gdpval: 1.5 }, ctx: 0, where: ["work", "chat"], unit: "recherche",
    kw: "recherche approfondie deep research veille benchmark sources web état de l'art" },
  { id: "maths", cat: "chercher", label: "Résoudre un problème scientifique", hint: "Maths, physique, modélisation", domain: "sciences", need: 4,
    w: { hle: 0.4, critpt: 0.6 }, cost: { hle: 0.5, critpt: 0.5 }, ctx: 0, where: ["chat"], unit: "problème",
    kw: "maths mathématiques physique problème calcul équation science démonstration" },

  /* Automatiser */
  { id: "automatiser", cat: "automatiser", label: "Automatiser une tâche entre vos outils", hint: "Mails, tableur, CRM, support", domain: "ops", need: 3,
    w: { auto: 1 }, cost: { auto: 1 }, ctx: 0, where: ["work", "code"], unit: "automatisation",
    kw: "automatiser automatisation workflow zapier crm outils agent processus routine" },
  { id: "extraire", cat: "automatiser", label: "Extraire des données en série", hint: "Factures, CV, bons de commande", domain: "ops", need: 2,
    w: { pdf: 0.6, nohall: 0.4 }, cost: { tok: [2500, 300, 0.3] }, ctx: 3000, where: ["api"], unit: "document",
    kw: "extraire extraction factures cv données série masse ocr champs api" },
  { id: "support", cat: "automatiser", label: "Répondre aux clients automatiquement", hint: "Un assistant sur votre site", domain: "ops", need: 3,
    w: { auto: 0.4, acc: 0.3, nohall: 0.3 }, cost: { tok: [2500, 250, 0.5] }, ctx: 3000, where: ["api"], unit: "conversation",
    kw: "support client chatbot assistant site service client faq réponse automatique" },

  /* Coder */
  { id: "formule", cat: "coder", label: "Écrire une formule Excel ou SQL", hint: "Une recherche, un calcul, une requête", domain: "dev", need: 2,
    w: { scicode: 0.6, tb4: 0.4 }, cost: { scicode: 1 }, ctx: 0, where: ["chat"], unit: "formule",
    kw: "formule excel sql requête recherchev macro calcul tableur" },
  { id: "script", cat: "coder", label: "Écrire un script", hint: "Python, macro, petit outil", domain: "dev", need: 3,
    w: { scicode: 0.5, tb4: 0.5 }, cost: { scicode: 3 }, ctx: 0, where: ["chat", "code"], unit: "script",
    kw: "script python code programme macro vba automatiser petit outil" },
  { id: "vibecoder", cat: "coder", label: "Créer une application en vibecoding", hint: "Une fonctionnalité complète par un agent", domain: "dev", need: 4,
    w: { tb4: 0.85, auto: 0.15 }, cost: { tb4: 1 }, ctx: 0, where: ["code"], unit: "fonctionnalité",
    kw: "vibecoding vibecoder application app site web créer développer agent code" },
  { id: "reprendre", cat: "coder", label: "Reprendre un gros projet de code", hint: "Déboguer, refactorer, migrer", domain: "dev", need: 5,
    w: { tb4: 0.75, scicode: 0.25 }, cost: { tb4: 2 }, ctx: 0, where: ["code"], unit: "chantier",
    kw: "debug déboguer refactor refactoriser migrer base de code legacy gros projet bug" }
];
