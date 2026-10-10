/*
  lebonmodel, réglages de la recherche par Claude Haiku.
  endpoint : adresse du proxy (dossier worker/), par exemple
             "https://lebonmodel-recherche.<compte>.workers.dev".
             Vide : la barre de recherche reste masquée.
  phrase   : affiche la reformulation libre de Haiku, si le proxy l'envoie
             (PHRASE_LIBRE = "on"). Désactivé par défaut.
*/
window.LBM_AI = { endpoint: "", phrase: false };
