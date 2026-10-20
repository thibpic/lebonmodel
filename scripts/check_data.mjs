// Évalue chaque fichier JS de données avec node : aucune exception, globales attendues présentes.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const FICHIERS = [
  ["assets/providers.js", ["LBM_PROVIDERS"]],
  ["assets/models.js", ["LBM_MODELS"]],
  ["assets/tasks.js", []],
  ["assets/plans.js", ["LBM_PLANS"]],
  ["assets/ai-config.js", ["LBM_AI"]],
  ["budget/budget-data.js", []],
];

const contexte = { window: {}, console };
contexte.self = contexte.globalThis = contexte.window;
vm.createContext(contexte);
let erreurs = 0;
for (const [fichier, attendues] of FICHIERS) {
  try {
    vm.runInContext(readFileSync(fichier, "utf8"), contexte, { filename: fichier });
    for (const nom of attendues) {
      if (!(nom in contexte.window) && !(nom in contexte)) throw new Error(`globale ${nom} absente`);
    }
    console.log(`ok  ${fichier}`);
  } catch (e) {
    erreurs++;
    console.error(`KO  ${fichier} : ${e.message}`);
  }
}
process.exit(erreurs ? 1 : 0);
