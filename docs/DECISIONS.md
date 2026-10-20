# Décisions

Arbitrages datés, avec leur raison. Tout agent les compare à chaque demande.

## 2026-10-20 · Méthode « zéro clic », version légère
Le dépôt adopte la chaîne commune : `scripts/ci.sh` avant commit, `scripts/verifier.sh` par le vérificateur, commit direct sur `main`. Raison : le site est statique et sa routine de mise à jour fonctionne ; on n'ajoute que les garde-fous, sans toucher au circuit existant.

## 2026-10-20 · Circuit de la routine quotidienne conservé
La routine cloud met à jour les données depuis `claude/project-thread-mrzue2`, ouvre une PR et la fusionne elle-même après contrôle. Raison : elle marche et n'a pas besoin d'être refaite ; la branche reste. Les autres branches `claude/*` (travail déjà fusionné) sont supprimées.

## 2026-10-20 · CLAUDE.md et docs/ non publiés
Le dépôt est public et Pages sert la racine. Pour ne pas publier les fichiers de méthode, `.nojekyll` est retiré et `_config.yml` exclut `CLAUDE.md`, `docs/`, `scripts/`, `worker/`, `README.md`. Raison : ce sont des fichiers de travail, sans intérêt pour les visiteurs. Ils restent lisibles sur GitHub, donc sans contenu sensible dans aucun cas. Retour arrière : remettre `.nojekyll` et supprimer `_config.yml`.

## 2026-10-12 · Recherche en langage naturel par un relais
La clé d'API ne peut pas être dans un site statique : un Worker (`worker/`) traduit la demande en réglages choisis dans des listes fermées, revalidés par le Worker puis par la page. Aucun texte libre du modèle n'est affiché (`PHRASE_LIBRE` désactivé). Raison : un schéma fermé garantit les valeurs, pas un texte libre. Détail : `worker/README.md`.

## 2026-10-12 · Site sans dépendance ni build
HTML, CSS et JS vanilla, données dans des fichiers JS. Raison : publication directe par Pages, aucune chaîne à entretenir.
