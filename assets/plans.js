/*
  lebonmodel, abonnements (vérifiés le 6 octobre 2026, Haiku 5.5 ajouté le 10 octobre 2026,
  Google, Mistral, xAI et DeepSeek ajoutés le 12 octobre 2026)
  ---------------------------------------------------------------
  chat / work / code : réglages accessibles dans la conversation, l'agent de travail
  (ChatGPT Work) et l'agent de code (Codex, Claude Code).
  Une entrée est soit une liste [modèle, effort, nom affiché], soit une chaîne
  "modèle modèle ..." qui donne accès à tous les efforts de ces modèles.
  ctx : mémoire de travail de la conversation, en tokens (null = non publiée ou celle du modèle).
  eur : prix TTC publié pour la France ; à défaut, usd (hors taxes) est converti avec la TVA.
  Aucun éditeur ne publie de quota en tokens : les volumes ci-dessous
  reprennent uniquement ce que les éditeurs publient.
  Un éditeur sans entrée ici (Meta, Alibaba) se compare à l'API seulement.
*/
window.LBM_FX = { usdToEur: 0.8909, vat: 0.2, date: "19 octobre 2026" };

window.LBM_PLANS = {
  openai: [
    { id: "free", name: "ChatGPT Gratuit", short: "Gratuit", eur: 0, usd: 0,
      chat: [["gpt56luna", "none", "Instant"], ["gpt56luna", "medium", "Think"]],
      work: [], code: [["gpt56terra", "medium", "Codex, accès limité"]],
      ctx: { instant: 27000, think: null },
      volume: ["Instant illimité", "Think et outils limités, sans chiffre publié", "3 fichiers par jour"] },
    { id: "go", name: "ChatGPT Go", short: "Go", eur: 8, usd: 8,
      chat: [["gpt56luna", "none", "Instant"], ["gpt56luna", "medium", "Think"]],
      work: [], code: [["gpt56terra", "medium", "Codex, accès limité"]],
      ctx: { instant: 54000, think: 256000 },
      volume: ["Instant illimité", "Think limité, sans chiffre publié", "80 fichiers par 3 h"] },
    { id: "plus", name: "ChatGPT Plus", short: "Plus", eur: 23, usd: 20,
      chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Medium"], ["gpt56sol", "high", "High"]],
      work: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      code: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      ctx: { instant: 54000, think: 256000 },
      volume: ["Instant illimité", "Medium et High plafonnés, sans chiffre publié", "Work et Codex : 15 à 160 messages par 5 h avec GPT-6.1 Sol, 5 à 45 avec Astra", "Agent : 40 tâches par mois"] },
    { id: "pro", name: "ChatGPT Pro", short: "Pro", eur: 103, usd: 100, priceNote: "de 103 à 510 € selon le volume",
      chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Medium"], ["gpt56sol", "high", "High"], ["gpt56sol", "xhigh", "Extra High"], ["gpt6astra", "max", "Pro"]],
      work: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      code: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      ctx: { instant: 128000, think: 400000 },
      volume: ["Pas de limite par 5 h dans Work et Codex", "Mode Pro plafonné, sans chiffre publié", "Agent : 400 tâches par mois"] },
    { id: "pro200", hidden: true, name: "ChatGPT Pro 200", short: "Pro 200", eur: 229, usd: 200, same: "pro",
      volume: ["Plus de volume que Pro à 103 €, écart non publié", "Pas de limite par 5 h dans Work et Codex"] },
    { id: "pro500", hidden: true, name: "ChatGPT Pro 500", short: "Pro 500", eur: 510, usd: 500, same: "pro",
      volume: ["25 fois le volume de Plus", "Astra en mode Ultrafast"] },
    { id: "business", name: "ChatGPT Business", short: "Business", eur: 26, usd: 25, perSeat: true, priceNote: "par personne, 21 € en annuel",
      chat: [["gpt56sol", "none", "Instant"], ["gpt56sol", "medium", "Medium"], ["gpt56sol", "high", "High"], ["gpt56sol", "xhigh", "Extra High"], ["gpt6astra", "max", "Pro"]],
      work: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      code: "gpt6astra gpt61sol gpt6luna gpt56sol gpt56terra gpt56luna",
      ctx: { instant: 54000, think: 256000 },
      volume: ["Instant quasi illimité", "15 messages Pro par mois", "Work et Codex : 15 à 150 messages par 5 h avec GPT-6.1 Sol"] }
  ],
  anthropic: [
    { id: "free", name: "Claude Gratuit", short: "Gratuit", usd: 0,
      chat: "sonnet55 haiku55 haiku45", code: [],
      ctx: null,
      volume: ["Session de 5 h, volume non publié", "PDF jusqu'à 1 000 pages", "Pas de Claude Code"] },
    { id: "pro", name: "Claude Pro", short: "Pro", usd: 20,
      chat: "opus55 sonnet55 haiku55 haiku45", code: "opus55 sonnet55 haiku55 haiku45",
      ctx: null,
      volume: ["Session de 5 h et plafond hebdomadaire, volumes non publiés", "Claude Code inclus", "Fable 5.1 seulement en crédits payants"] },
    { id: "max", name: "Claude Max 5x", short: "Max", usd: 100, priceNote: "100 $ (Max 5x) ou 200 $ (Max 20x)",
      chat: "fable51 opus55 sonnet55 haiku55 haiku45", code: "fable51 opus55 sonnet55 haiku55 haiku45",
      ctx: null,
      volume: ["5 fois le volume de Pro par session", "Fable 5.1 jusqu'à la moitié du plafond hebdomadaire"] },
    { id: "max20", hidden: true, name: "Claude Max 20x", short: "Max 20x", usd: 200, same: "max",
      volume: ["20 fois le volume de Pro par session", "Fable 5.1 jusqu'à la moitié du plafond hebdomadaire"] },
    { id: "team", name: "Claude Team", short: "Team", usd: 25, perSeat: true, priceNote: "par personne, 20 $ en annuel",
      chat: "opus55 sonnet55 haiku55 haiku45", code: "opus55 sonnet55 haiku55 haiku45",
      ctx: null,
      volume: ["1,25 fois le volume de Pro par personne", "Claude Code inclus"] }
  ],
  /* Google, vérifié le 14 octobre 2026. Gemini 4 Argon arrive dans l'appli pour AI Pro et AI Ultra depuis le 13 octobre (notes de version Gemini) ;
     son accès dans Jules ou Antigravity n'est pas confirmé par Google : le code reste sur Gemini 3.8 Flash.
     AI Plus donne Gemini 3.6 Flash et 3.1 Pro, absents d'Artificial Analysis : seul Flash-Lite y est comparé. */
  google: [
    { id: "free", name: "Gemini Gratuit", short: "Gratuit", eur: 0, usd: 0,
      chat: "gemini35lite", code: [], ctx: 32000,
      volume: ["Limites « standard », sans chiffre publié", "Remise à zéro toutes les 5 h, plafond hebdomadaire"] },
    { id: "plus", name: "Google AI Plus", short: "AI Plus", eur: 4.99, usd: 4.99,
      chat: "gemini35lite", code: [], ctx: 128000,
      volume: ["2 fois les limites de l'offre gratuite", "Gemini 3.6 Flash et 3.1 Pro, non comparés ici"] },
    { id: "pro", name: "Google AI Pro", short: "AI Pro", eur: 21.99, usd: 19.99,
      chat: "gemini4argon gemini38flash gemini35lite", code: "gemini38flash", ctx: 1000000,
      volume: ["4 fois les limites de l'offre gratuite", "Jules et Antigravity avec des limites relevées"] },
    { id: "ultra", name: "Google AI Ultra", short: "AI Ultra", eur: 99.99, usd: 99.99,
      chat: "gemini4argon gemini38flash gemini35lite", code: "gemini38flash", ctx: 1000000,
      volume: ["5 fois les limites d'AI Pro", "Deep Think, non évalué"] },
    { id: "ultra20", hidden: true, name: "Google AI Ultra 20x", short: "Ultra 20x", eur: 219.99, usd: 199.99, same: "ultra",
      volume: ["20 fois les limites d'AI Pro"] }
  ],
  /* Mistral, vérifié le 12 octobre 2026. Le Chat s'appelle Vibe depuis fin mai 2026. Mistral ne publie pas le modèle
     de chaque offre : Mistral Medium 3.5 est le modèle par défaut le plus probable. Prix en dollars HT. */
  mistral: [
    { id: "free", name: "Vibe Gratuit", short: "Gratuit", usd: 0,
      chat: "mistralmedium35", code: [], ctx: null,
      volume: ["Messages et recherches limités, sans chiffre publié", "Modèle par défaut non publié"] },
    { id: "pro", name: "Vibe Pro", short: "Pro", usd: 14.99,
      chat: "mistralmedium35", code: "mistralmedium35", ctx: null,
      volume: ["Jusqu'à 6 fois les messages de l'offre gratuite", "150 réponses Flash par jour", "Mistral Large 4 annoncé comme futur modèle par défaut"] },
    { id: "team", name: "Vibe Team", short: "Team", usd: 24.99, perSeat: true, priceNote: "par personne, 19,99 $ en annuel",
      chat: "mistralmedium35", code: "mistralmedium35", ctx: null,
      volume: ["Limites supérieures à Pro", "200 réponses Flash par jour"] }
  ],
  /* xAI, vérifié le 12 octobre 2026. Prix en dollars HT. Le modèle de l'offre gratuite n'est pas publié. */
  xai: [
    { id: "supergrok", name: "SuperGrok", short: "SuperGrok", usd: 30,
      chat: [["grok47", "high", "Expert"]], code: "grok47", ctx: null,
      volume: ["Une réserve hebdomadaire partagée entre conversation, images, voix et Grok Build", "Sans chiffre publié"] },
    { id: "heavy", hidden: true, name: "SuperGrok Heavy", short: "Heavy", usd: 300, same: "supergrok",
      volume: ["La plus grande réserve hebdomadaire, sans chiffre publié", "Prix repris de sources tierces"] },
    { id: "business", name: "Grok Business", short: "Business", usd: 30, perSeat: true,
      chat: [["grok47", "high", "Expert"]], code: "grok47", ctx: null,
      volume: ["Limites relevées, sans chiffre publié", "Grok Build inclus"] }
  ],
  /* DeepSeek, vérifié le 12 octobre 2026. Appli gratuite : Instant sur un modèle Flash (V4.1 Flash supposé),
     Expert sur V4 Pro, avec une bascule de réflexion. */
  deepseek: [
    { id: "free", name: "DeepSeek Gratuit", short: "Gratuit", usd: 0,
      chat: [["deepseekv41flash", "none", "Instant"], ["deepseekv4pro", "none", "Expert"], ["deepseekv4pro", "max", "Expert avec réflexion"]], code: [], ctx: 1000000,
      volume: ["Pas de plafond publié, débit réduit aux heures chargées", "Le mode Instant repose sur un modèle Flash : V4.1 Flash supposé"] }
  ]
};

/* Lignes du comparatif par gamme de prix */
window.LBM_TIERS = [
  { label: "Gratuit", openai: "free", anthropic: "free", google: "free", mistral: "free", deepseek: "free" },
  { label: "Moins de 10 €", openai: "go", google: "plus" },
  { label: "Environ 20 €", openai: "plus", anthropic: "pro", google: "pro", mistral: "pro", xai: "supergrok" },
  { label: "Environ 100 €", openai: "pro", anthropic: "max", google: "ultra" },
  { label: "Environ 200 €", openai: "pro200", anthropic: "max20", google: "ultra20" },
  { label: "En équipe, par personne", openai: "business", anthropic: "team", mistral: "team", xai: "business" }
];

window.LBM_SOURCES = [
  { label: "Artificial Analysis, Intelligence Index v4.3.2, scores et coûts par évaluation", url: "https://artificialanalysis.ai/leaderboards/models" },
  { label: "Artificial Analysis, méthodologie des évaluations", url: "https://artificialanalysis.ai/methodology/intelligence-benchmarking" },
  { label: "OpenAI, tarifs de l'API", url: "https://developers.openai.com/api/docs/pricing" },
  { label: "OpenAI, offres ChatGPT", url: "https://chatgpt.com/pricing" },
  { label: "OpenAI, GPT-5.6 et GPT-6 Pro dans ChatGPT", url: "https://help.openai.com/articles/20001354" },
  { label: "OpenAI, ChatGPT Work et Codex", url: "https://help.openai.com/articles/20001275" },
  { label: "OpenAI, limites de Codex par offre", url: "https://developers.openai.com/codex/pricing" },
  { label: "Anthropic, tarifs de l'API", url: "https://platform.claude.com/docs/en/about-claude/pricing" },
  { label: "Anthropic, offres Claude", url: "https://claude.com/pricing" },
  { label: "Anthropic, Claude Pro", url: "https://support.claude.com/en/articles/8325606" },
  { label: "Anthropic, Claude Max", url: "https://support.claude.com/en/articles/11049741" },
  { label: "Anthropic, taille de contexte par modèle", url: "https://support.claude.com/en/articles/8606394" },
  { label: "Google, offres Google AI", url: "https://gemini.google/fr/subscriptions/" },
  { label: "Google, limites de l'appli Gemini", url: "https://support.google.com/gemini/answer/16275805" },
  { label: "Mistral, offres Vibe", url: "https://mistral.ai/pricing" },
  { label: "xAI, offres Grok", url: "https://x.ai/pricing" },
  { label: "xAI, tarifs de l'API", url: "https://docs.x.ai/docs/models" },
  { label: "DeepSeek, tarifs de l'API", url: "https://api-docs.deepseek.com/quick_start/pricing" },
  { label: "Banque centrale européenne, taux de change", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" }
];
