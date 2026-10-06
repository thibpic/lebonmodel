/*
  lebonmodel, données de la page budget
  ---------------------------------------------------------------
  Ce fichier est le seul à modifier quand les prix ou les scores
  changent. Tout le reste du site se recalcule à partir d'ici.

  Prix API : dollars US par million de tokens, hors taxes.
  idx  : Artificial Analysis Intelligence Index v4.3.2
  task : coût mesuré par Artificial Analysis pour une tâche de l'index (USD)
  out  : tokens de sortie (réflexion comprise) par tâche de l'index
  tps  : vitesse de sortie mesurée (tokens par seconde)
  est  : score estimé par Artificial Analysis (pas de mesure complète)
*/
window.LBM_BUDGET = {
  updated: "2026-10-06",
  updatedLabel: "6 octobre 2026",
  fx: { usdToEur: 0.8925, vat: 0.2, date: "5 octobre 2026", source: "Banque centrale européenne" },

  providers: {
    openai: { name: "OpenAI", shape: "circle" },
    anthropic: { name: "Anthropic", shape: "square" }
  },

  effortLabels: {
    none: "sans réflexion",
    reasoning: "réflexion étendue",
    low: "faible",
    medium: "moyen",
    high: "élevé",
    xhigh: "très élevé",
    max: "maximal"
  },

  /* Échelle des niveaux : seuil minimal d'indice pour chaque profil */
  levels: [
    {
      n: 1, name: "Assistant", min: 15,
      jobs: "Assistant de direction, stagiaire efficace",
      does: "Reformule, trie, extrait et répond aux questions simples. Suit très bien une consigne claire.",
      watch: "À relire dès que le sujet devient pointu."
    },
    {
      n: 2, name: "Junior", min: 25,
      jobs: "Chargé de mission junior, rédacteur",
      does: "Rédige des contenus propres, résume, traduit avec le bon registre, répond aux clients.",
      watch: "Manque de recul sur un dossier complexe."
    },
    {
      n: 3, name: "Confirmé", min: 40,
      jobs: "Consultant ou analyste confirmé",
      does: "Analyse des chiffres, croise des sources, structure une recommandation, écrit du code courant.",
      watch: "Vérifiez ses conclusions quand l'enjeu est fort."
    },
    {
      n: 4, name: "Expert", min: 46,
      jobs: "Expert senior, manager, architecte",
      does: "Raisonne en plusieurs étapes, arbitre entre des options, conçoit et livre une application complète.",
      watch: "Plus cher : réservez-le aux tâches qui le justifient."
    },
    {
      n: 5, name: "Pointe", min: 52,
      jobs: "Associé de cabinet, chercheur, architecte principal",
      does: "Tient des problèmes ouverts et difficiles, travaille des heures en autonomie, reprend une grosse base de code.",
      watch: "Le plus lent et le plus cher des profils."
    }
  ],
  /* Seuil utilisé quand on demande « sans faute » sur un usage déjà au niveau Pointe */
  maxMargin: 55,

  models: [
    /* ---------------- OpenAI ---------------- */
    {
      id: "gpt6astra", provider: "openai", name: "GPT-6 Astra", short: "Astra",
      tier: "Haut de gamme", generation: "actuelle", released: "2026-09-03",
      price: { in: 10, cache: 1, out: 50 }, tok: 1, ctx: "1 M tokens",
      apps: "ChatGPT Pro (mode Pro), Work et Codex dès Plus avec un quota réduit",
      levels: [
        { e: "low", idx: 45.8, task: 0.8175, out: 4433, tps: 57.3 },
        { e: "medium", idx: 49.6, task: 1.5406, out: 9590, tps: 53.0 },
        { e: "high", idx: 50.9, task: 1.7253, out: 11813, tps: 59.7 },
        { e: "xhigh", idx: 52.4, task: 2.3088, out: 16901, tps: 63.5 },
        { e: "max", idx: 52.7, task: 3.2575, out: 27206, tps: 63.3 }
      ]
    },
    {
      id: "gpt61sol", provider: "openai", name: "GPT-6.1 Sol", short: "6.1 Sol",
      tier: "Équilibré", generation: "actuelle", released: "2026-09-29",
      price: { in: 2, cache: 0.1, out: 10 }, tok: 1, ctx: "1 M tokens",
      apps: "Work et Codex dès ChatGPT Plus, API",
      levels: [
        { e: "low", idx: 42.1, task: 0.1308, out: 3977, tps: 50.8 },
        { e: "medium", idx: 47.8, task: 0.2137, out: 8070, tps: 52.0 },
        { e: "high", idx: 50.2, task: 0.3191, out: 13192, tps: 53.2 },
        { e: "xhigh", idx: 51.0, task: 0.3929, out: 17619, tps: 59.4 },
        { e: "max", idx: 51.8, task: 0.7242, out: 38128, tps: 58.3 }
      ]
    },
    {
      id: "gpt6luna", provider: "openai", name: "GPT-6 Luna", short: "6 Luna",
      tier: "Économique", generation: "actuelle", released: "2026-09-22",
      price: { in: 0.1, cache: 0.01, out: 0.5 }, tok: 1, ctx: "1 M tokens",
      apps: "Work et Codex dès ChatGPT Plus, API",
      levels: [
        { e: "none", idx: 18.5, task: 0.0113, out: 3758, tps: 126.2 },
        { e: "low", idx: 21.5, task: 0.0045, out: 2087, tps: 135.6 },
        { e: "medium", idx: 29.9, task: 0.0175, out: 11456, tps: 135 },
        { e: "high", idx: 32.9, task: 0.0290, out: 19703, tps: 134.8 },
        { e: "xhigh", idx: 34.6, task: 0.0422, out: 27487, tps: 137.9 },
        { e: "max", idx: 38.1, task: 0.0678, out: 50012, tps: 147.0 }
      ]
    },
    {
      id: "gpt56sol", provider: "openai", name: "GPT-5.6 Sol", short: "5.6 Sol",
      tier: "Haut de gamme", generation: "précédente", released: "2026-07-09",
      price: { in: 4, cache: 0.4, out: 20 }, tok: 1, ctx: "1 M tokens",
      apps: "Le modèle des modes Instant et Thinking de ChatGPT Plus et Pro",
      levels: [
        { e: "none", idx: 28.3, task: null, out: null, tps: 88.6, est: true },
        { e: "low", idx: 33.5, task: 0.2606, out: 3974, tps: 75.1 },
        { e: "medium", idx: 39.2, task: 0.5050, out: 7874, tps: 91.1 },
        { e: "high", idx: 42.3, task: 0.8080, out: 13250, tps: 83.5 },
        { e: "xhigh", idx: 44.0, task: 1.1844, out: 19576, tps: 95.7 },
        { e: "max", idx: 47.0, task: 1.9885, out: 29309, tps: 96.6 }
      ]
    },
    {
      id: "gpt56terra", provider: "openai", name: "GPT-5.6 Terra", short: "5.6 Terra",
      tier: "Intermédiaire", generation: "précédente", released: "2026-07-09",
      price: { in: 2, cache: 0.2, out: 12 }, tok: 1, ctx: "1 M tokens",
      apps: "API uniquement",
      levels: [
        { e: "none", idx: 20.8, task: 0.1397, out: 3129, tps: 100.9 },
        { e: "low", idx: 27.5, task: 0.1445, out: 3871, tps: 102.9 },
        { e: "medium", idx: 30.1, task: 0.1834, out: 5478, tps: 103.0 },
        { e: "high", idx: 34.2, task: 0.3379, out: 11294, tps: 101.4 },
        { e: "xhigh", idx: 38.0, task: 0.6318, out: 20367, tps: 112.1 },
        { e: "max", idx: 42.1, task: 1.3987, out: 38897, tps: 124.8 }
      ]
    },
    {
      id: "gpt56luna", provider: "openai", name: "GPT-5.6 Luna", short: "5.6 Luna",
      tier: "Économique", generation: "précédente", released: "2026-07-09",
      price: { in: 0.2, cache: 0.02, out: 1.2 }, tok: 1, ctx: "1 M tokens",
      apps: "Le modèle de ChatGPT gratuit et Go",
      levels: [
        { e: "none", idx: 15.5, task: 0.0101, out: 2027, tps: 110.4 },
        { e: "low", idx: 21.0, task: 0.0098, out: 2514, tps: 111.3 },
        { e: "medium", idx: 25.0, task: 0.0156, out: 4486, tps: 112.6 },
        { e: "high", idx: 32.1, task: 0.0440, out: 13862, tps: 114.0 },
        { e: "xhigh", idx: 34.6, task: 0.0853, out: 23625, tps: 128.8 },
        { e: "max", idx: 37.3, task: 0.1783, out: 41235, tps: 127.7 }
      ]
    },

    /* ---------------- Anthropic ---------------- */
    /* tok 1.3 : depuis Claude 4.7, un même texte compte environ 30 % de tokens en plus (documentation Anthropic) */
    {
      id: "fable51", provider: "anthropic", name: "Claude Fable 5.1", short: "Fable 5.1",
      tier: "Haut de gamme", generation: "actuelle", released: "2026-09-01",
      price: { in: 10, cache: 0.25, out: 50 }, tok: 1.3, ctx: "1 M tokens",
      apps: "Claude Max (jusqu'à la moitié du quota hebdomadaire), Pro avec crédits",
      levels: [
        { e: "low", idx: 46.82, task: 2.37, out: 21562, tps: 54.4 },
        { e: "medium", idx: 48.92, task: 2.98, out: 27888, tps: 55.1 },
        { e: "high", idx: 51.15, task: 3.91, out: 38054, tps: 57.1 },
        { e: "xhigh", idx: 53.2, task: 5.98, out: 60538, tps: 68.4 },
        { e: "max", idx: 53.35, task: 7.63, out: 78111, tps: 61.4 }
      ]
    },
    {
      id: "opus55", provider: "anthropic", name: "Claude Opus 5.5", short: "Opus 5.5",
      tier: "Haut de gamme", generation: "actuelle", released: "2026-09-22",
      price: { in: 4, cache: 0.2, out: 20 }, tok: 1.3, ctx: "1 M tokens",
      apps: "Claude Pro, Max et Team, modèle par défaut de Claude Code",
      levels: [
        { e: "low", idx: 42.31, task: 0.55, out: 10151, tps: 79.1 },
        { e: "medium", idx: 51.24, task: 1.34, out: 25745, tps: 78.8 },
        { e: "high", idx: 53.58, task: 1.82, out: 35584, tps: 78.1 },
        { e: "xhigh", idx: 55.99, task: 3.46, out: 65667, tps: 78.2 },
        { e: "max", idx: 57.62, task: 5.98, out: 119166, tps: 96.6 }
      ]
    },
    {
      id: "sonnet55", provider: "anthropic", name: "Claude Sonnet 5.5", short: "Sonnet 5.5",
      tier: "Équilibré", generation: "actuelle", released: "2026-09-28",
      price: { in: 2, cache: 0.2, out: 10 }, tok: 1.3, ctx: "1 M tokens",
      apps: "Claude gratuit, Pro et Max, Claude Code",
      levels: [
        { e: "low", idx: 35.87, task: 0.42, out: 14253, tps: 100.9 },
        { e: "medium", idx: 40.84, task: 0.59, out: 20938, tps: 103.3 },
        { e: "high", idx: 46.75, task: 1.12, out: 37327, tps: 103.1 },
        { e: "xhigh", idx: 51.9, task: 2.75, out: 74810, tps: 106.2 },
        { e: "max", idx: 56.0, task: 7.67, out: 197430, tps: 127.5 }
      ]
    },
    {
      id: "haiku45", provider: "anthropic", name: "Claude Haiku 4.5", short: "Haiku 4.5",
      tier: "Économique", generation: "actuelle", released: "2025-10-15",
      price: { in: 1, cache: 0.1, out: 5 }, tok: 1, ctx: "200 k tokens",
      apps: "Claude gratuit et payant, API (Haiku 5.5 annoncé)",
      levels: [
        { e: "none", idx: 15.41, task: null, out: null, tps: 91.4, est: true },
        { e: "reasoning", idx: 16.88, task: 0.28, out: 18485, tps: 111.5 }
      ]
    }
  ],

  /*
    Usages. Deux façons de compter :
    - mode "chat" : tokens lus (in), contexte relu en cache (ctx), réponse visible (out),
      et part de la réflexion mesurée par Artificial Analysis que l'usage déclenche (think).
    - mode "agent" : nombre de tâches équivalentes à celles de l'index (aa),
      multiplié par le coût réel mesuré pour chaque modèle.
    app : "chat" (application de conversation) ou "code" (agents : Codex, Claude Code, Work)
    apiOnly : usage automatisé, qui ne passe pas par un abonnement
  */
  usages: [
    { id: "question", label: "Poser des questions du quotidien", hint: "Une explication, un conseil, une idée", level: 1, mode: "chat", in: 150, ctx: 0, out: 450, think: 0.01, volume: 60, unit: "questions", app: "chat" },
    { id: "reformuler", label: "Reformuler un mail ou un texte", hint: "Ton, orthographe, concision", level: 1, mode: "chat", in: 450, ctx: 0, out: 350, think: 0.01, volume: 40, unit: "textes", app: "chat" },
    { id: "traduire", label: "Traduire un document", hint: "Quelques pages, avec le bon registre", level: 2, mode: "chat", in: 3500, ctx: 0, out: 3800, think: 0.02, volume: 8, unit: "documents", app: "chat" },
    { id: "resumer", label: "Résumer un long document", hint: "Rapport, PDF ou compte rendu de 30 pages", level: 2, mode: "chat", in: 25000, ctx: 0, out: 900, think: 0.03, volume: 20, unit: "documents", app: "chat" },
    { id: "rediger", label: "Rédiger une note ou un article", hint: "Proposition, post, note de synthèse", level: 2, mode: "chat", in: 2500, ctx: 0, out: 2200, think: 0.05, volume: 12, unit: "rédactions", app: "chat" },
    { id: "excel", label: "Analyser un tableau ou des chiffres", hint: "Fichier Excel, export comptable, budget", level: 3, mode: "chat", in: 20000, ctx: 0, out: 1500, think: 0.08, volume: 15, unit: "analyses", app: "chat" },
    { id: "brief", label: "Préparer une décision", hint: "Croiser des documents, peser des options", level: 3, mode: "chat", in: 12000, ctx: 0, out: 2000, think: 0.1, volume: 8, unit: "dossiers", app: "chat" },
    { id: "juridique", label: "Question juridique, fiscale ou RH", hint: "Un premier avis avant de voir un expert", level: 4, mode: "chat", in: 6000, ctx: 0, out: 1800, think: 0.15, volume: 6, unit: "questions", app: "chat" },
    { id: "recherche", label: "Mener une recherche web approfondie", hint: "Veille, benchmark, état de l'art sourcé", level: 3, mode: "agent", aa: 1.5, volume: 10, unit: "recherches", app: "chat" },
    { id: "agent", label: "Confier une longue tâche à un agent", hint: "Plusieurs heures de travail en autonomie", level: 5, mode: "agent", aa: 25, volume: 8, unit: "tâches", app: "code" },
    { id: "extraction", label: "Extraire des données de documents", hint: "Factures, CV, contrats, en série", level: 1, mode: "chat", in: 2500, ctx: 800, out: 350, think: 0.005, volume: 2000, unit: "documents", app: "chat", apiOnly: true },
    { id: "support", label: "Répondre aux clients automatiquement", hint: "Un assistant sur votre site ou votre messagerie", level: 2, mode: "chat", in: 1500, ctx: 3000, out: 250, think: 0.01, volume: 3000, unit: "conversations", app: "chat", apiOnly: true },
    { id: "classer", label: "Trier des milliers d'éléments", hint: "Tickets, avis, mails, classés en masse", level: 1, mode: "chat", in: 300, ctx: 600, out: 15, think: 0.002, volume: 20000, unit: "éléments", app: "chat", apiOnly: true },
    { id: "script", label: "Écrire un script ou une formule", hint: "Macro Excel, requête SQL, petit script Python", level: 3, mode: "chat", in: 2500, ctx: 0, out: 1200, think: 0.08, volume: 20, unit: "scripts", app: "chat" },
    { id: "vibecoding", label: "Vibecoder une application", hint: "Une session d'environ une heure avec un agent de code", level: 4, mode: "agent", aa: 4, volume: 20, unit: "sessions", app: "code" },
    { id: "refactor", label: "Reprendre une grosse base de code", hint: "Déboguer, refactorer, migrer un projet existant", level: 5, mode: "agent", aa: 10, volume: 8, unit: "sessions", app: "code" },
    { id: "revue", label: "Relire le code à chaque modification", hint: "Revue automatique des pull requests", level: 4, mode: "agent", aa: 0.6, volume: 120, unit: "revues", app: "code" },
    { id: "maths", label: "Résoudre un problème scientifique difficile", hint: "Maths, physique, modélisation", level: 5, mode: "chat", in: 2000, ctx: 0, out: 2500, think: 0.6, volume: 10, unit: "problèmes", app: "chat" }
  ],

  profiles: [
    { id: "decouverte", label: "Je découvre l'IA", hint: "Quelques questions de temps en temps", usages: ["question", "reformuler", "traduire", "resumer", "rediger", "excel"], start: "question", access: "app" },
    { id: "travail", label: "Je l'utilise au travail", hint: "Rédaction, synthèse, analyse", usages: ["reformuler", "resumer", "rediger", "excel", "brief", "juridique", "recherche", "script"], start: "resumer", access: "app" },
    { id: "delegation", label: "Je lui confie des tâches", hint: "Agents, recherche, automatisation", usages: ["recherche", "agent", "brief", "extraction", "support", "classer"], start: "recherche", access: "app" },
    { id: "code", label: "Je code avec l'IA", hint: "Du script au vibecoding", usages: ["script", "vibecoding", "refactor", "revue", "agent", "maths"], start: "vibecoding", access: "app" }
  ],

  /*
    Abonnements. Prix France TTC par mois. ChatGPT : grille officielle en euros.
    Claude : prix publiés en dollars hors taxes, convertis (taux BCE + TVA 20 %).
    chat / code : réglages accessibles (modèle, effort) dans l'application de conversation
    et dans les agents (Work, Codex, Claude Code). def / codeDef : réglage par défaut.
    cap : repère indicatif, en euros d'équivalent API par mois, au-delà duquel
    les plafonds d'usage risquent de gêner (les quotas ne sont pas publiés en tokens).
  */
  plans: {
    openai: [
      { id: "free", name: "ChatGPT Gratuit", eur: 0, usd: 0, cap: 3, def: ["gpt56luna", "none"],
        chat: [["gpt56luna", "none", "Instant"], ["gpt56luna", "medium", "Think"]], code: [] },
      { id: "go", name: "ChatGPT Go", eur: 8, usd: 8, cap: 10, def: ["gpt56luna", "none"],
        chat: [["gpt56luna", "none", "Instant"], ["gpt56luna", "medium", "Think"]], code: [] },
      { id: "plus", name: "ChatGPT Plus", eur: 23, usd: 20, cap: 150, def: ["gpt56sol", "none"], codeDef: ["gpt61sol", "medium"],
        chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Thinking Medium"], ["gpt56sol", "high", "Thinking High"]],
        code: "gpt6astra gpt61sol gpt6luna", codeLabel: "Work ou Codex" },
      { id: "pro100", name: "ChatGPT Pro", eur: 103, usd: 100, cap: 800, def: ["gpt56sol", "none"], codeDef: ["gpt61sol", "medium"],
        chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Thinking Medium"], ["gpt56sol", "high", "Thinking High"], ["gpt56sol", "xhigh", "Thinking Extra High"], ["gpt6astra", "max", "Pro"]],
        code: "gpt6astra gpt61sol gpt6luna", codeLabel: "Work ou Codex" },
      { id: "pro200", name: "ChatGPT Pro 200", eur: 229, usd: 200, cap: 2500, def: ["gpt56sol", "none"], codeDef: ["gpt61sol", "medium"],
        chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Thinking Medium"], ["gpt56sol", "high", "Thinking High"], ["gpt56sol", "xhigh", "Thinking Extra High"], ["gpt6astra", "max", "Pro"]],
        code: "gpt6astra gpt61sol gpt6luna", codeLabel: "Work ou Codex" },
      { id: "pro500", name: "ChatGPT Pro 500", eur: 510, usd: 500, cap: Infinity, def: ["gpt56sol", "none"], codeDef: ["gpt61sol", "medium"],
        chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Thinking Medium"], ["gpt56sol", "high", "Thinking High"], ["gpt56sol", "xhigh", "Thinking Extra High"], ["gpt6astra", "max", "Pro"]],
        code: "gpt6astra gpt61sol gpt6luna", codeLabel: "Work ou Codex" }
    ],
    anthropic: [
      { id: "free", name: "Claude Gratuit", usd: 0, cap: 3, def: ["sonnet55", "medium"],
        chat: [["sonnet55", "medium", "Sonnet 5.5"], ["haiku45", "none", "Haiku 4.5"]], code: [] },
      { id: "pro", name: "Claude Pro", usd: 20, cap: 150, def: ["sonnet55", "medium"], codeDef: ["opus55", "medium"],
        chat: "opus55 sonnet55 haiku45", code: "opus55 sonnet55", codeLabel: "Claude Code" },
      { id: "max5", name: "Claude Max 5x", usd: 100, cap: 800, def: ["opus55", "medium"], codeDef: ["opus55", "medium"],
        chat: "fable51 opus55 sonnet55 haiku45", code: "fable51 opus55 sonnet55", codeLabel: "Claude Code" },
      { id: "max20", name: "Claude Max 20x", usd: 200, cap: Infinity, def: ["opus55", "medium"], codeDef: ["opus55", "medium"],
        chat: "fable51 opus55 sonnet55 haiku45", code: "fable51 opus55 sonnet55", codeLabel: "Claude Code" }
    ]
  },

  sources: [
    { label: "Artificial Analysis, Intelligence Index v4.3.2 et coûts par tâche", url: "https://artificialanalysis.ai/leaderboards/models" },
    { label: "Méthodologie de l'Intelligence Index", url: "https://artificialanalysis.ai/methodology/intelligence-benchmarking" },
    { label: "OpenAI, tarifs de l'API", url: "https://developers.openai.com/api/docs/pricing" },
    { label: "OpenAI, offres ChatGPT", url: "https://chatgpt.com/pricing" },
    { label: "OpenAI, Codex et ses offres", url: "https://developers.openai.com/codex/pricing" },
    { label: "Anthropic, tarifs de l'API", url: "https://platform.claude.com/docs/en/about-claude/pricing" },
    { label: "Anthropic, vue d'ensemble des modèles", url: "https://platform.claude.com/docs/en/models/overview" },
    { label: "Anthropic, offres Claude", url: "https://claude.com/pricing" },
    { label: "Taux de change de référence BCE", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" }
  ]
};
