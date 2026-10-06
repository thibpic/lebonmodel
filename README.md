# lebonmodel

Le bon modèle d'IA pour chaque tâche. Un outil de [Numenys](https://numenys.fr).

On choisit ce que l'on veut faire (relire un contrat, résumer un rapport, vibecoder une application…), et lebonmodel compare les modèles d'OpenAI et d'Anthropic sur cette tâche précise : le plus adapté chez chaque éditeur, le niveau atteint (traduit en métier), le coût et la durée d'une tâche. Un filtre permet de ne garder que ce qu'offre son abonnement (ChatGPT Gratuit, Go, Plus, Pro, Business ; Claude Gratuit, Pro, Max, Team), et un comparatif montre ce que chaque formule donne pour la tâche, par gamme de prix.

Site : <https://lebonmodel.numenys.fr>

## Pages

- `index.html` : choisir un modèle selon la tâche.
- `budget/` : estimer un budget mensuel selon son usage et son volume.

## Données

| Fichier | Contenu |
|---|---|
| `assets/models.js` | Pour chaque modèle et chaque niveau d'effort : scores par évaluation, coût et durée par tâche (Artificial Analysis, Intelligence Index v4.3.2) |
| `assets/tasks.js` | Les 24 tâches, les évaluations qui les mesurent, l'échelle de métiers, le niveau requis |
| `assets/plans.js` | Les abonnements : réglages accessibles, taille de document acceptée, volumes publiés, prix |
| `budget/budget-data.js` | Données de la page budget |

`assets/models.js` est généré à partir des données publiques d'Artificial Analysis. Les autres fichiers se modifient à la main ; le site se recalcule sans étape de build.

## Méthode

- **Note par tâche** : moyenne pondérée des évaluations pertinentes (par exemple GDP.pdf et AA-LCR pour interroger un long PDF, Terminal-Bench 4.0 pour coder, l'indice juridique pour un contrat), rapportée au meilleur modèle actuel (100).
- **Niveaux** : Référence dès 93 % du meilleur score, Senior dès 82 %, Confirmé dès 68 %, Junior dès 50 %. Chaque famille de tâches a son échelle de métiers.
- **Coût d'une tâche** : coût réellement mesuré par Artificial Analysis sur l'évaluation la plus proche, sinon calcul au token.
- **Le plus adapté** : le réglage le moins coûteux qui atteint le niveau requis ; dans un abonnement, la conversation passe avant les agents.
- **Abonnements** : réglages réellement proposés dans ChatGPT, ChatGPT Work, Codex, l'appli Claude et Claude Code. Ni OpenAI ni Anthropic ne publient leurs quotas en tokens : seuls les volumes publiés sont repris.

Sources : Artificial Analysis, pages tarifaires et pages d'aide d'OpenAI et d'Anthropic, taux de change BCE. Détail dans la section Méthode du site.

## Publication

Site statique publié par GitHub Pages depuis la branche `main`, à la racine. Sous-domaine : enregistrement DNS `CNAME` `lebonmodel` vers `thibpic.github.io.`, et fichier `CNAME` à la racine du dépôt.

---

Outil indépendant, sans lien commercial avec OpenAI ni Anthropic. Estimations indicatives. © 2026 Numenys.
