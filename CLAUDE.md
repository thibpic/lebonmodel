# lebonmodel

Comparateur « le bon modèle d'IA pour chaque tâche » : site statique (HTML/CSS/JS sans dépendance ni build) et petit relais de recherche (`worker/`, Cloudflare Worker). Description complète : `README.md`.

## Méthode
- Thibaut dit ce qu'il veut ; l'agent conçoit, code, teste, corrige, nettoie, intègre, déploie et exploite sans lui faire valider un commit, une fusion, un déploiement ou un correctif.
- Question à Thibaut seulement si le résultat voulu est ambigu, si la demande contredit `docs/DECISIONS.md`, l'architecture ou une autre demande, ou si l'action est irréversible hors du code (envoi à un tiers, suppression de données ou de ressources réelles, dépense, engagement commercial ou juridique, ouverture à des clients). Sur ces points, aucun arbitrage en silence : une question groupée, option recommandée en tête, le reste du travail continue.
- Chaîne : `scripts/ci.sh` (périmètre touché) vert avant chaque commit ; commit sur `main` et push aussitôt, rebase si main a bougé ; pas de branche longue. Une session cloud qui ne peut pousser que sa branche `claude/…` la pousse et ouvre une PR avec le libellé `integrer`. Le vérificateur (Mac de Thibaut) lance `scripts/verifier.sh` à chaque push, intègre les PR `integrer` vertes, avance `prod` au vert et fait corriger ou annuler au rouge ; son verdict se lit sur la branche `verifie`. Aucun déploiement à la main.
- Un bug corrigé arrive avec le test qui échouait avant. Un arbitrage nouveau s'écrit daté, avec sa raison, dans `docs/DECISIONS.md` ; l'état dans `docs/ETAT.md` ; le reste à faire dans `docs/BACKLOG.md`.
- Garde-fous : jamais affaiblir une authentification, un contrôle d'accès ou un test pour passer ; jamais de push forcé sur main ou prod ; jamais de secret dans le dépôt (Thibaut les saisit). Base de production : script versionné, sauvegarde horodatée avant, retour arrière prêt, notification après ; supprimer des données réelles reste une question.
- Français partout (code, commits `type: description courte`, journaux), sans écriture inclusive ni tiret cadratin.

## Dépôt public
Le dépôt est public et GitHub Pages sert la racine de `main` : rien de personnel, de stratégique ni de confidentiel dans aucun fichier (code, docs, commits), aucun identifiant ni secret. `CLAUDE.md`, `docs/`, `scripts/`, `worker/` et `README.md` sont exclus de la publication par `_config.yml` (voir `docs/DECISIONS.md`).

## Conventions du site
- Pas de build, pas de dépendance : le site se recalcule dans le navigateur à partir des fichiers de données (`assets/providers.js`, `models.js`, `tasks.js`, `plans.js`, `budget/budget-data.js`). Ajouter un modèle, un abonnement ou un éditeur : suivre la section « Données » du `README.md`.
- `assets/models.js` est généré à partir d'Artificial Analysis ; valeurs estimées listées dans `imp`, à remplacer dès qu'une mesure est publiée.
- Après tout changement de tâches, d'usages, d'abonnements ou d'éditeurs : `npm run catalog` dans `worker/` (régénère `worker/src/catalog.json`, un test échoue sinon), puis le relais doit être redéployé.
- Code JS en IIFE, `var`, sans module ; le DOM ne reçoit que du texte (`textContent`), jamais de HTML venu du réseau.
- `assets/ai-config.js` : adresse du relais ; vide, la barre de recherche est masquée.

## Pièges
- Mise à jour quotidienne des données par une routine cloud : elle pousse `claude/project-thread-mrzue2`, ouvre une PR et la fusionne après contrôle (node + Playwright). Ne pas supprimer cette branche ni changer ce circuit sans en parler.
- Le relais (`worker/`) se déploie avec `npm run deploy` sur Cloudflare ; ce déploiement et ses secrets restent à la main de Thibaut (voir `docs/ETAT.md`).
- Domaine : fichier `CNAME` à la racine ; ne pas le supprimer.

## Vérification
- Avant commit : `scripts/ci.sh` (données évaluées par node, tests du relais si `worker/node_modules` existe, ouverture des deux pages dans Chromium si `CHROMIUM_PATH` ou `chromium` est disponible).
- Suite complète : `scripts/verifier.sh` (conteneur sans secret, `npm ci` du relais, Chromium via `uv run --with playwright`).
- Après changement visible : ouvrir `index.html` et `budget/index.html` (serveur statique quelconque) et regarder la console.
- Après publication : `https://lebonmodel.numenys.fr/` et `/budget/` répondent 200.
