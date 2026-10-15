# Proxy de recherche lebonmodel

Petit Cloudflare Worker qui fait le lien entre la barre de recherche du site et un modèle de langage. Le site restant statique (GitHub Pages), la clé d'API ne peut pas être dans le navigateur : elle vit ici, en secret.

```
navigateur ──POST /recherche { page, q }──▶ Worker ──▶ OpenRouter (modèle OPENROUTER_MODEL)
           ◀── { page, intention } ─────────        ou API Anthropic (claude-haiku-5-5)
                                                    ◀── JSON imposé par un schéma
```

## Quel modèle

- **OpenRouter**, dès que la variable `OPENROUTER_MODEL` (dans `wrangler.toml`, aujourd'hui `~typesafe/jev-latest`, l'alias qui suit la dernière version de Jev) **et** le secret `OPENROUTER_API_KEY` sont posés. Jev est un modèle de décision, refusé sur `chat/completions` : avec `OPENROUTER_API = "decisions"`, le Worker appelle `/api/alpha/decisions` et pose une question fermée par champ du contrat (`src/decisions.js` : oui/non pour `pertinent`, un choix parmi les valeurs autorisées pour chaque autre champ, un choix parmi des volumes fixes pour le rythme ; pas de reformulation libre). Pour un modèle de conversation (`OPENROUTER_API` vide), la sortie passe par un appel d'outil forcé (`tools` + `tool_choice`) dont les paramètres sont le schéma à valeurs fermées. Le Worker revalide de toute façon chaque sortie. `data_collection: "deny"` écarte les hébergeurs qui conservent les demandes. Si OpenRouter échoue ou rend une sortie invalide et que `ANTHROPIC_API_KEY` est posé, la demande repart sur Haiku (trace « repli haiku » dans `npx wrangler tail`).
- **Sinon, Claude Haiku 5.5 en direct** (secret `ANTHROPIC_API_KEY`), comme avant. Passer de l'un à l'autre ne demande qu'un redéploiement.

Vérifier quel modèle a répondu : chaque réponse du Worker porte l'en-tête `x-lbm-model` (onglet Réseau du navigateur, requête `recherche`, ou `npx wrangler tail` qui affiche « modele … »). Il vaut le modèle OpenRouter, ou `claude-haiku-5-5` suivi de la raison (`repli: erreur_404`, `repli: sortie_invalide`, `openrouter: cle_absente`).

Changer de modèle : modifier `OPENROUTER_MODEL` dans `wrangler.toml`, puis `npx wrangler deploy`. Choisir un modèle qui gère l'appel d'outil (*tool_choice*) sur OpenRouter.

## Ce que le modèle a le droit de répondre

Le modèle ne rédige rien pour le visiteur : il traduit la demande en réglages du site. Sa réponse est un objet JSON dont chaque champ est une **liste fermée** tirée des données du site (`src/catalog.json`) :

| Page | Champs |
|---|---|
| Choisir un modèle (`modele`) | `pertinent`, `tache` (24 tâches ou `aucune`), `editeur` (8 éditeurs ou `inconnu`), un champ d'abonnement par éditeur qui en vend (`chatgpt`, `claude`, `gemini`, `vibe`, `grok`, `deepseek` : offre, `none` ou `inconnu`), `exigence`, `conversation_uniquement` |
| Estimer un budget (`budget`) | `pertinent`, `usage` (18 usages ou `aucun`), `editeur`, `rythme` (entier ou `null`), `exigence`, `acces` |

Le paragraphe de réponse affiché sur le site est **composé par le site** à partir de ces valeurs et de son propre calcul (tâche retenue, niveau requis, modèle le plus adapté, prix). Aucun mot écrit par le modèle n'est affiché.

## Sécurités

1. **Clé d'API côté serveur** : secrets `OPENROUTER_API_KEY` et `ANTHROPIC_API_KEY` du Worker, jamais envoyés au navigateur.
2. **Origine** : seules les origines de `ALLOWED_ORIGINS` sont servies (CORS). Un script hors navigateur peut falsifier l'en-tête `Origin`, d'où les points suivants.
3. **Débit** : 8 demandes par minute et par adresse IP, 120 par minute pour tout le site (bindings *Rate Limiting* de Cloudflare, dans `wrangler.toml`). Requête limitée à 2 Ko, demande à 300 caractères.
4. **Coût plafonné** : effort de réflexion `low`, `max_tokens` 1 024. À compléter par une **limite de dépense** sur la clé (réglage *Credit limit* de la clé dans OpenRouter, ou limite mensuelle de l'espace de travail dans la console Anthropic).
5. **Injection de prompt** : le métaprompt (`src/prompt.js`) traite la demande comme une donnée entre balises `<demande>`, que la demande ne peut pas refermer (les chevrons sont neutralisés). Surtout, même une injection réussie ne peut produire qu'une valeur de la liste : le schéma JSON est imposé par l'API (*structured outputs*), puis **revalidé par le Worker** (clé inconnue, valeur hors liste ou type inattendu : tout est rejeté), puis **revalidé par la page** contre ses propres données.
6. **Affichage** : le navigateur n'insère que du texte (`textContent`), jamais de HTML venu du réseau.
7. **Refus et sorties tronquées** : un refus du modèle vaut « hors sujet » ; une sortie coupée ou invalide renvoie une erreur et le site invite à choisir dans la liste.
8. **Données personnelles** : la barre rappelle de ne pas en saisir. Le Worker ne journalise pas les demandes.

## Le paragraphe libre de Haiku, désactivé

Le Worker sait aussi demander à Haiku une phrase de reformulation (« Vous voulez… »). On ne peut pas garantir le contenu d'un texte libre comme on garantit une valeur de liste : le schéma n'en contraint que la forme. Cette phrase est donc **désactivée** (`PHRASE_LIBRE = "off"` dans `wrangler.toml` et `phrase: false` dans `assets/ai-config.js`). Si on l'active un jour, elle reste nettoyée (220 caractères, sans balise, lien ni retour à la ligne), affichée comme du texte et signalée « Reformulé par Claude Haiku ».

## Déployer

Prérequis : un compte Cloudflare et une clé OpenRouter (ou Anthropic).

```sh
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY   # la clé est demandée par le terminal, jamais écrite dans un fichier
# renseigner OPENROUTER_MODEL dans wrangler.toml
npm run deploy          # régénère le catalogue, lance les tests, publie
```

`wrangler` affiche l'adresse du Worker, par exemple `https://lebonmodel-recherche.<compte>.workers.dev`. Il reste à la reporter dans `assets/ai-config.js` (`endpoint`) : tant que ce champ est vide, la barre reste masquée sur le site.

Pour tester en local : `npx wrangler dev`, avec la clé dans un fichier `.dev.vars` (`OPENROUTER_API_KEY=...`, ignoré par git) et `http://localhost:8000` ajouté à `ALLOWED_ORIGINS`.

## Garder le catalogue à jour

`src/catalog.json` est généré depuis `assets/providers.js`, `assets/tasks.js`, `assets/plans.js` et `budget/budget-data.js`. Après un changement de tâches, d'usages ou d'abonnements : `npm run deploy` (le test `catalog.json est à jour` échoue sinon). Entre-temps, une valeur que la page ne connaît plus est simplement ignorée.

## Tests

```sh
npm test
```

Ils couvrent le schéma fermé, la validation des sorties (valeurs hors liste, clés en trop, types), le nettoyage de la demande et de la phrase libre, les filtres du Worker (origine, méthode, format, taille, débit) et l'appel au modèle (OpenRouter et Anthropic) avec des clients simulés.
