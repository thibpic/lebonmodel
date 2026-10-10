/*
  lebonmodel, proxy de recherche propulsé par Claude Haiku 5.5 (Cloudflare Worker).

  POST /recherche  { "page": "modele" | "budget", "q": "..." }
  → 200 { "page": ..., "intention": { ...valeurs fermées... } }

  Sécurités, dans l'ordre :
  1. Origine autorisée seulement (ALLOWED_ORIGINS), méthode et taille de requête bornées.
  2. Limitation de débit par adresse IP et globale (bindings Rate Limiting).
  3. Demande nettoyée et bornée à 300 caractères, encadrée et neutralisée dans le prompt.
  4. Sortie imposée par un schéma JSON à valeurs fermées (structured outputs).
  5. Sortie revalidée ici ; tout écart est rejeté. Le navigateur revalide encore.
  La clé d'API ne quitte jamais le Worker (secret ANTHROPIC_API_KEY).
*/
import Anthropic from "@anthropic-ai/sdk";
import { PAGES, cleanQuery, outputSchema, validate } from "./contract.js";
import { systemPrompt, userMessage } from "./prompt.js";

const MODEL = "claude-haiku-5-5";
const MAX_BODY = 2048;

function origins(env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function json(body, status, origin) {
  const h = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "vary": "Origin"
  };
  if (origin) {
    h["access-control-allow-origin"] = origin;
    h["access-control-allow-methods"] = "POST, OPTIONS";
    h["access-control-allow-headers"] = "content-type";
    h["access-control-max-age"] = "86400";
  }
  return new Response(body == null ? null : JSON.stringify(body), { status, headers: h });
}

async function underLimit(binding, key) {
  if (!binding) return true; /* en local, sans binding */
  const { success } = await binding.limit({ key });
  return success;
}

export async function interpret(env, page, query, client) {
  const withPhrase = env.PHRASE_LIBRE === "on";
  const anthropic = client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 15000, maxRetries: 1 });
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: systemPrompt(page, withPhrase), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage(query) }],
    output_config: { effort: "low", format: { type: "json_schema", schema: outputSchema(page, withPhrase) } }
  });
  if (msg.stop_reason === "refusal") return { pertinent: false };
  if (msg.stop_reason !== "end_turn") return null;
  const block = msg.content.find((b) => b.type === "text");
  if (!block) return null;
  let parsed;
  try { parsed = JSON.parse(block.text); } catch (e) { return null; }
  return validate(page, parsed, withPhrase);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const allowed = origins(env).includes(origin) ? origin : null;

    if (url.pathname !== "/recherche") return json({ erreur: "introuvable" }, 404, allowed);
    if (!allowed) return json({ erreur: "origine" }, 403, null);
    if (request.method === "OPTIONS") return json(null, 204, allowed);
    if (request.method !== "POST") return json({ erreur: "methode" }, 405, allowed);
    if (!(request.headers.get("content-type") || "").startsWith("application/json")) return json({ erreur: "format" }, 415, allowed);

    const ip = request.headers.get("cf-connecting-ip") || "inconnue";
    if (!(await underLimit(env.RL_IP, ip))) return json({ erreur: "trop_de_demandes" }, 429, allowed);
    if (!(await underLimit(env.RL_GLOBAL, "global"))) return json({ erreur: "sature" }, 429, allowed);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ erreur: "trop_long" }, 413, allowed);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ erreur: "format" }, 400, allowed); }
    if (!body || typeof body !== "object" || !PAGES.includes(body.page)) return json({ erreur: "page" }, 400, allowed);
    const q = cleanQuery(body.q);
    if (!q) return json({ erreur: "demande" }, 400, allowed);

    let intention;
    try {
      intention = await interpret(env, body.page, q);
    } catch (e) {
      console.log("anthropic", e && e.status, e && e.name);
      return json({ erreur: "indisponible" }, 502, allowed);
    }
    if (!intention) return json({ erreur: "sortie_invalide" }, 502, allowed);
    return json({ page: body.page, intention }, 200, allowed);
  }
};
