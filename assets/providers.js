/* lebonmodel, éditeurs comparés et leurs repères visuels */
/*
  Éditeurs comparés, dans l'ordre d'affichage.
  key       : paramètre d'URL et champ de la recherche pour l'abonnement (?chatgpt=plus)
  app       : nom de l'appli grand public (« Votre ChatGPT », « Je n'utilise pas ChatGPT »)
  places    : où l'on fait la tâche : chat (conversation), work (agent de travail), code (agent de code).
              Sans « work », le travail de bureau se fait dans la conversation.
  agents    : les agents, en clair, pour les messages « cette tâche se fait dans un agent »
  agentWords: mots qui signalent, dans les volumes, une limite propre aux agents
  shape     : forme sur la carte (circle, square, diamond, triangle, down, hexagon, ring, pentagon)
  byDefault : affiché à la première visite (4 éditeurs au plus côte à côte)
  Fichier partagé par les deux pages : le choix des éditeurs suit l'URL (?editeurs=openai,google).
*/
window.LBM_PROVIDERS = [
  { id: "openai", name: "OpenAI", app: "ChatGPT", key: "chatgpt", shape: "circle", byDefault: true,
    places: { chat: "ChatGPT", work: "ChatGPT Work", code: "Codex" }, agents: "ChatGPT Work ou Codex", agentWords: ["Work", "Codex"] },
  { id: "anthropic", name: "Anthropic", app: "Claude", key: "claude", shape: "square", byDefault: true,
    places: { chat: "l'appli Claude", code: "Claude Code" }, agents: "Claude Code", agentWords: ["Claude Code"] },
  { id: "google", name: "Google", app: "Gemini", key: "gemini", shape: "diamond", byDefault: true,
    places: { chat: "l'appli Gemini", code: "Jules ou Antigravity" }, agents: "Jules ou Antigravity", agentWords: ["Jules", "Antigravity"] },
  { id: "mistral", name: "Mistral", app: "Vibe", key: "vibe", shape: "triangle",
    places: { chat: "Vibe (ex-Le Chat)", code: "l'agent de code de Vibe" }, agents: "l'agent de code de Vibe", agentWords: ["agent de code"] },
  { id: "xai", name: "xAI", app: "Grok", key: "grok", shape: "down",
    places: { chat: "Grok", code: "Grok Build" }, agents: "Grok Build", agentWords: ["Grok Build"] },
  { id: "deepseek", name: "DeepSeek", app: "DeepSeek", key: "deepseek", shape: "hexagon",
    places: { chat: "l'appli DeepSeek" } },
  { id: "meta", name: "Meta", app: "Meta AI", key: "metaai", shape: "ring",
    places: { chat: "Meta AI" } },
  { id: "alibaba", name: "Alibaba", app: "Qwen", key: "qwen", shape: "pentagon",
    places: { chat: "Qwen Chat" } }
];

/* Formes de la carte, centrées sur 0 : chaque éditeur se reconnaît aussi sans la couleur */
window.LBM_SHAPES = {
  circle: ["circle", { r: 6.5 }],
  square: ["rect", { x: -6, y: -6, width: 12, height: 12, rx: 3 }],
  diamond: ["path", { d: "M0 -8L8 0L0 8L-8 0Z" }],
  triangle: ["path", { d: "M0 -8L7.5 6L-7.5 6Z" }],
  down: ["path", { d: "M0 8L7.5 -6L-7.5 -6Z" }],
  hexagon: ["path", { d: "M-3.6 -6.4H3.6L7.3 0L3.6 6.4H-3.6L-7.3 0Z" }],
  pentagon: ["path", { d: "M0 -7.5L7.2 -2.3L4.4 6.3H-4.4L-7.2 -2.3Z" }],
  ring: ["circle", { r: 5.4 }]
};
