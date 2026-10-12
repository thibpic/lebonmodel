# lebonmodel

Le bon modèle d'IA pour chaque tâche. Un outil de [Numenys](https://numenys.fr).

On choisit ce que l'on veut faire (relire un contrat, résumer un rapport, vibecoder une application…), et lebonmodel compare les modèles des grands éditeurs sur cette tâche précise : le plus adapté chez chaque éditeur, le niveau atteint (traduit en métier), le coût et la durée d'une tâche. Huit éditeurs sont couverts (OpenAI, Anthropic, Google, Mistral, xAI, DeepSeek, Meta, Alibaba) ; on en compare quatre au plus côte à côte, OpenAI, Anthropic et Google par défaut, et un encart signale quand un éditeur non affiché fait mieux ou moins cher. Un filtre permet de ne garder que ce qu'offre son abonnement (ChatGPT, Claude, Gemini, Vibe, Grok, DeepSeek), et un comparatif montre ce que chaque formule donne pour la tâche, par gamme de prix.

Site : <https://lebonmodel.numenys.fr>

## Pages

- `index.html` : choisir un modèle selon la tâche.
- `budget/` : estimer un budget mensuel selon son usage et son volume.

## Barre de recherche

Sur les deux pages, une barre de recherche laisse décrire son besoin en une phrase (« relire un contrat de 40 pages avec ChatGPT Plus »). Un modèle de langage, choisi dans le proxy (via OpenRouter, ou Claude Haiku 5.5 en direct), la traduit en réglages du site (tâche ou usage, éditeur, abonnements, exigence, volume), choisis dans des listes fermées, et le site compose sa réponse à partir de son propre calcul. L'appel passe par un petit proxy (`worker/`) qui garde la clé d'API, limite le débit et revalide chaque réponse : voir [worker/README.md](worker/README.md). La barre reste masquée tant que l'adresse du proxy n'est pas renseignée dans `assets/ai-config.js`.

## Données

| Fichier | Contenu |
|---|---|
| `assets/providers.js` | Les éditeurs : nom, appli, clé d'URL, où se fait la tâche (conversation, agents), forme et couleur sur la carte, affichage par défaut |
| `assets/models.js` | Pour chaque modèle et chaque niveau d'effort : scores par évaluation, coût et durée par tâche (Artificial Analysis, Intelligence Index v4.3.2) |
| `assets/tasks.js` | Les 24 tâches, les évaluations qui les mesurent, l'échelle de métiers, le niveau requis |
| `assets/plans.js` | Les abonnements, par éditeur : réglages accessibles, taille de document acceptée, volumes publiés, prix ; les gammes de prix du comparatif |
| `budget/budget-data.js` | Données de la page budget |
| `assets/ai-config.js` | Adresse du proxy de recherche (vide : barre masquée) |

`assets/models.js` est généré à partir des données publiques d'Artificial Analysis. Les autres fichiers se modifient à la main ; le site se recalcule sans étape de build.

### Ajouter un modèle ou un éditeur

- **Modèle** : une entrée dans `assets/models.js` (champ `provider` = id de l'éditeur) et dans `budget/budget-data.js` (même `id`). `generation: "précédente"` le masque par défaut sur la page principale, sauf s'il est le choix retenu chez son éditeur. Effort `"default"` pour un modèle à réglage unique.
- **Scores manquants** : Artificial Analysis ne publie en texte que dix évaluations pour les modèles hors OpenAI et Anthropic (Briefcase, GDPval-AA, AutomationBench, Terminal-Bench 4.0, SciCode, HLE, GDP.pdf, CritPt, AA-LCR). Les autres clés de `s` (sous-scores Briefcase, `acc`, `nohall`, indices métiers) sont estimées à partir du niveau mesuré d'indice le plus proche, au prorata de l'indice, et listées dans `imp`. Les coûts `c` suivent le coût par tâche mesuré, les durées `t` les tokens de sortie et la vitesse (`costEst: 1`). `hall` et `acc` restent `null` tant qu'ils ne sont pas mesurés. Dès qu'une valeur est publiée, la remplacer et la retirer de `imp`.
- **Abonnement** : une liste sous l'id de l'éditeur dans `LBM_PLANS` (`assets/plans.js`) et dans `plans` (`budget/budget-data.js`), puis la colonne de l'éditeur dans `LBM_TIERS`. Un éditeur sans abonnement en France (Meta, Alibaba) n'a pas d'entrée : il se compare à l'API.
- **Éditeur** : une entrée dans `assets/providers.js`, une couleur (`--<id>`) et une forme dans `assets/providers.css`.
- Après tout changement de tâches, d'usages, d'abonnements ou d'éditeurs : `npm run catalog` dans `worker/`, puis redéployer le proxy, sinon la recherche ignore les nouvelles valeurs.

## Méthode

- **Note par tâche** : moyenne pondérée des évaluations pertinentes (par exemple GDP.pdf et AA-LCR pour interroger un long PDF, Terminal-Bench 4.0 pour coder, l'indice juridique pour un contrat), rapportée au meilleur modèle actuel (100).
- **Niveaux** : Référence dès 93 % du meilleur score, Senior dès 82 %, Confirmé dès 68 %, Junior dès 50 %. Chaque famille de tâches a son échelle de métiers.
- **Coût d'une tâche** : coût réellement mesuré par Artificial Analysis sur l'évaluation la plus proche, sinon calcul au token.
- **Le plus adapté** : le réglage le moins coûteux qui atteint le niveau requis ; dans un abonnement, la conversation passe avant les agents.
- **Abonnements** : réglages réellement proposés dans les applis (ChatGPT, Claude, Gemini, Vibe, Grok, DeepSeek) et leurs agents (ChatGPT Work, Codex, Claude Code, Jules, Grok Build). Aucun éditeur ne publie ses quotas en tokens : seuls les volumes publiés sont repris. Quand l'éditeur ne dit pas quel modèle sert une offre, le plus probable est retenu et signalé.

Sources : Artificial Analysis, pages tarifaires et pages d'aide des éditeurs, taux de change BCE. Détail dans la section Méthode du site.

## Publication

Site statique publié par GitHub Pages depuis la branche `main`, à la racine. Sous-domaine : enregistrement DNS `CNAME` `lebonmodel` vers `thibpic.github.io.`, et fichier `CNAME` à la racine du dépôt.

---

Outil indépendant, sans lien commercial avec les éditeurs comparés. Estimations indicatives. © 2026 Numenys.
