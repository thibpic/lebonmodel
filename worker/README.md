# Proxy de recherche lebonmodel

Petit Cloudflare Worker qui fait le lien entre la barre de recherche du site et Claude Haiku 5.5. Le site restant statique (GitHub Pages), la clé d'API ne peut pas être dans le navigateur : elle vit ici, en secret.

```
navigateur ──POST /recherche { page, q }──▶ Worker ──▶ API Anthropic (claude-haiku-5-5)
           ◀── { page, intention } ─────────        ◀── JSON imposé par un schéma
```

## Ce que Haiku a le droit de répondre

Haiku ne rédige rien pour le visiteur : il traduit la demande en réglages du site. Sa réponse est un objet JSON dont chaque champ est une **liste fermée** tirée des données du site (`src/catalog.json`) :

| Page | Champs |
|---|---|
| Choisir un modèle (`modele`) | `pertinent`, `tache` (24 tâches ou `aucune`), `chatgpt` et `claude` (abonnements, `none` ou `inconnu`), `exigence`, `conversation_uniquement` |
| Estimer un budget (`budget`) | `pertinent`, `usage` (18 usages ou `aucun`), `rythme` (entier ou `null`), `exigence`, `acces` |

Le paragraphe de réponse affiché sur le site est **composé par le site** à partir de ces valeurs et de son propre calcul (tâche retenue, niveau requis, modèle le plus adapté, prix). Aucun mot écrit par Haiku n'est affiché.

## Sécurités

1. **Clé d'API côté serveur** : secret `ANTHROPIC_API_KEY` du Worker, jamais envoyé au navigateur.
2. **Origine** : seules les origines de `ALLOWED_ORIGINS` sont servies (CORS). Un script hors navigateur peut falsifier l'en-tête `Origin`, d'où les points suivants.
3. **Débit** : 8 demandes par minute et par adresse IP, 120 par minute pour tout le site (bindings *Rate Limiting* de Cloudflare, dans `wrangler.toml`). Requête limitée à 2 Ko, demande à 300 caractères.
4. **Coût plafonné** : Haiku 5.5 à effort `low`, `max_tokens` 1 024. À compléter par une **limite de dépense mensuelle** sur l'espace de travail de la clé, dans la console Anthropic.
5. **Injection de prompt** : le métaprompt (`src/prompt.js`) traite la demande comme une donnée entre balises `<demande>`, que la demande ne peut pas refermer (les chevrons sont neutralisés). Surtout, même une injection réussie ne peut produire qu'une valeur de la liste : le schéma JSON est imposé par l'API (*structured outputs*), puis **revalidé par le Worker** (clé inconnue, valeur hors liste ou type inattendu : tout est rejeté), puis **revalidé par la page** contre ses propres données.
6. **Affichage** : le navigateur n'insère que du texte (`textContent`), jamais de HTML venu du réseau.
7. **Refus et sorties tronquées** : un refus du modèle vaut « hors sujet » ; une sortie coupée ou invalide renvoie une erreur et le site invite à choisir dans la liste.
8. **Données personnelles** : la barre rappelle de ne pas en saisir. Le Worker ne journalise pas les demandes.

## Le paragraphe libre de Haiku, désactivé

Le Worker sait aussi demander à Haiku une phrase de reformulation (« Vous voulez… »). On ne peut pas garantir le contenu d'un texte libre comme on garantit une valeur de liste : le schéma n'en contraint que la forme. Cette phrase est donc **désactivée** (`PHRASE_LIBRE = "off"` dans `wrangler.toml` et `phrase: false` dans `assets/ai-config.js`). Si on l'active un jour, elle reste nettoyée (220 caractères, sans balise, lien ni retour à la ligne), affichée comme du texte et signalée « Reformulé par Claude Haiku ».

## Déployer

Prérequis : un compte Cloudflare et une clé d'API Anthropic.

```sh
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy          # régénère le catalogue, lance les tests, publie
```

`wrangler` affiche l'adresse du Worker, par exemple `https://lebonmodel-recherche.<compte>.workers.dev`. Il reste à la reporter dans `assets/ai-config.js` (`endpoint`) : tant que ce champ est vide, la barre reste masquée sur le site.

Pour tester en local : `npx wrangler dev`, avec la clé dans un fichier `.dev.vars` (`ANTHROPIC_API_KEY=...`) et `http://localhost:8000` ajouté à `ALLOWED_ORIGINS`.

## Garder le catalogue à jour

`src/catalog.json` est généré depuis `assets/tasks.js`, `assets/plans.js` et `budget/budget-data.js`. Après un changement de tâches, d'usages ou d'abonnements : `npm run deploy` (le test `catalog.json est à jour` échoue sinon). Entre-temps, une valeur que la page ne connaît plus est simplement ignorée.

## Tests

```sh
npm test
```

Ils couvrent le schéma fermé, la validation des sorties (valeurs hors liste, clés en trop, types), le nettoyage de la demande et de la phrase libre, les filtres du Worker (origine, méthode, format, taille, débit) et l'appel à Haiku avec un client simulé.
