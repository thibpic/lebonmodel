/*
  Génère src/catalog.json à partir des données du site, pour que le proxy
  ne connaisse que les identifiants que le site sait afficher.
  À relancer après chaque changement de tasks.js, plans.js, providers.js ou budget-data.js :
    npm run catalog
*/
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../../", import.meta.url));

function load(files) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(root + f, "utf8"), ctx, { filename: f });
  return ctx.window;
}

export function buildCatalog() {
  const site = load(["assets/providers.js", "assets/tasks.js", "assets/plans.js"]);
  const budget = load(["budget/budget-data.js"]).LBM_BUDGET;
  const cats = Object.fromEntries(site.LBM_CATEGORIES.map((c) => [c.id, c.label]));
  return {
    modele: {
      taches: site.LBM_TASKS.map((t) => ({ id: t.id, famille: cats[t.cat], label: t.label, hint: t.hint })),
      editeurs: site.LBM_PROVIDERS.map((p) => ({ id: p.id, label: p.name, app: p.app })),
      /* Abonnements par éditeur, sous la clé d'URL de l'éditeur (chatgpt, claude, gemini…) */
      abonnements: Object.fromEntries(site.LBM_PROVIDERS.filter((p) => (site.LBM_PLANS[p.id] || []).some((x) => !x.hidden)).map((p) => [
        p.key, { editeur: p.id, app: p.app, offres: site.LBM_PLANS[p.id].filter((x) => !x.hidden).map((x) => ({ id: x.id, label: x.name })) }
      ]))
    },
    budget: {
      editeurs: site.LBM_PROVIDERS.map((p) => ({ id: p.id, label: p.name, app: p.app })),
      usages: budget.usages.map((u) => ({ id: u.id, label: u.label, hint: u.hint, unite: u.unit, volume: u.volume, apiOnly: !!u.apiOnly }))
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL("../src/catalog.json", import.meta.url));
  writeFileSync(out, JSON.stringify(buildCatalog(), null, 2) + "\n");
  console.log("catalog.json écrit");
}
