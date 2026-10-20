# État

Mis à jour le 2026-10-20.

- Site : statique, publié par GitHub Pages depuis la racine de `main` sur le domaine `lebonmodel.numenys.fr` (fichier `CNAME`). Deux pages : choix du modèle par tâche (`index.html`), estimation de budget (`budget/`). Huit éditeurs, 24 tâches.
- Données : `assets/models.js` issu d'Artificial Analysis ; mises à jour quotidiennes par une routine cloud (PR depuis `claude/project-thread-mrzue2`, fusion après contrôle node et Playwright).
- Recherche : relais `worker/` (Cloudflare Worker), modèle de décision via OpenRouter avec repli sur Claude Haiku 5.5. Déploiement et secrets : à la main de Thibaut.
- Vérification : `scripts/ci.sh` (avant commit) et `scripts/verifier.sh` (vérificateur). Pas de GitHub Actions.
