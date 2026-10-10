/*
  lebonmodel, abonnements (vérifiés le 6 octobre 2026, Haiku 5.5 ajouté le 10 octobre 2026)
  ---------------------------------------------------------------
  chat / work / code : réglages accessibles dans la conversation, l'agent de travail
  (ChatGPT Work) et l'agent de code (Codex, Claude Code).
  Une entrée est soit une liste [modèle, effort, nom affiché], soit une chaîne
  "modèle modèle ..." qui donne accès à tous les efforts de ces modèles.
  ctx : mémoire de travail de la conversation, en tokens (null = non publiée ou celle du modèle).
  Ni OpenAI ni Anthropic ne publient de quota en tokens : les volumes ci-dessous
  reprennent uniquement ce que les éditeurs publient.
*/
window.LBM_FX = { usdToEur: 0.8924, vat: 0.2, date: "9 octobre 2026" };

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
  ]
};

/* Lignes du comparatif par gamme de prix */
window.LBM_TIERS = [
  { label: "Gratuit", openai: "free", anthropic: "free" },
  { label: "Moins de 10 €", openai: "go", anthropic: null },
  { label: "Environ 20 €", openai: "plus", anthropic: "pro" },
  { label: "Environ 100 €", openai: "pro", anthropic: "max" },
  { label: "Environ 200 €", openai: "pro200", anthropic: "max20" },
  { label: "En équipe, par personne", openai: "business", anthropic: "team" }
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
  { label: "Banque centrale européenne, taux de change", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" }
];
