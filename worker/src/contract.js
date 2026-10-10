/*
  Le contrat de sortie : ce que Claude Haiku a le droit de renvoyer, page par page.
  Chaque champ est une énumération fermée tirée des données du site (catalog.json),
  sauf le rythme (un entier borné ici) et la reformulation libre, désactivée par défaut.
  Le même contrat sert deux fois : comme schéma JSON imposé à l'API (structured
  outputs), puis comme validation côté proxy avant toute réponse au navigateur.
*/
import catalog from "./catalog.json" with { type: "json" };

export const PAGES = ["modele", "budget"];
export const MAX_QUERY = 300;
export const MAX_PHRASE = 220;
const VOLUME_MAX = 100000;
/* Caractères de contrôle et invisibles (dont les inversions de sens d'écriture) */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g;

const EXIGENCES = ["inconnu", "premier_jet", "fiable", "sans_faute"];
const OUI_NON = ["inconnu", "oui", "non"];

function ids(list) { return list.map((x) => x.id); }

/* Énumérations par page et par champ ; « inconnu » ou « aucune » quand la demande ne dit rien */
export function enums(page) {
  if (page === "modele") {
    return {
      tache: ["aucune"].concat(ids(catalog.modele.taches)),
      chatgpt: ["inconnu", "none"].concat(ids(catalog.modele.chatgpt)),
      claude: ["inconnu", "none"].concat(ids(catalog.modele.claude)),
      exigence: EXIGENCES,
      conversation_uniquement: OUI_NON
    };
  }
  return {
    usage: ["aucun"].concat(ids(catalog.budget.usages)),
    exigence: EXIGENCES,
    acces: ["inconnu", "app", "api"]
  };
}

/* Schéma JSON envoyé à l'API. Toutes les propriétés sont requises, aucune autre n'est admise. */
export function outputSchema(page, withPhrase) {
  const props = { pertinent: { type: "boolean" } };
  const e = enums(page);
  for (const k of Object.keys(e)) props[k] = { type: "string", enum: e[k] };
  if (page === "budget") props.rythme = { anyOf: [{ type: "integer" }, { type: "null" }] };
  if (withPhrase) props.reformulation = { type: "string" };
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}

/* Texte libre : une phrase, sans balise, sans lien, sans retour à la ligne, longueur bornée */
export function cleanPhrase(s) {
  if (typeof s !== "string") return null;
  let t = s.normalize("NFKC")
    .replace(INVISIBLE, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>`*_#[\]{}|\\]/g, " ")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\b[\w.-]+\.(?:com|fr|net|org|io|ai|co|ly|me|app|dev|xyz)\b\S*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > MAX_PHRASE) t = t.slice(0, MAX_PHRASE).replace(/\s+\S*$/, "") + "…";
  return t.length >= 3 ? t : null;
}

/*
  Validation stricte d'une sortie du modèle. Renvoie l'objet nettoyé ou null.
  Toute clé inconnue, valeur hors énumération ou type inattendu rejette la sortie entière.
*/
export function validate(page, out, withPhrase) {
  if (!out || typeof out !== "object" || Array.isArray(out)) return null;
  const e = enums(page);
  const expected = ["pertinent"].concat(Object.keys(e), page === "budget" ? ["rythme"] : [], withPhrase ? ["reformulation"] : []);
  const keys = Object.keys(out);
  if (keys.length !== expected.length || !expected.every((k) => keys.includes(k))) return null;
  if (typeof out.pertinent !== "boolean") return null;
  const clean = { pertinent: out.pertinent };
  for (const k of Object.keys(e)) {
    if (typeof out[k] !== "string" || !e[k].includes(out[k])) return null;
    clean[k] = out[k];
  }
  if (page === "budget") {
    if (out.rythme === null) clean.rythme = null;
    else if (Number.isInteger(out.rythme) && out.rythme >= 1) clean.rythme = Math.min(out.rythme, VOLUME_MAX);
    else return null;
  }
  if (withPhrase) {
    if (typeof out.reformulation !== "string") return null;
    const p = cleanPhrase(out.reformulation);
    if (p) clean.reformulation = p;
  }
  return clean;
}

/* Demande de l'utilisateur : texte seul, normalisé, borné */
export function cleanQuery(q) {
  if (typeof q !== "string") return null;
  const t = q.normalize("NFKC").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > MAX_QUERY) return null;
  return t;
}

export { catalog };
