/*
  lebonmodel, proxy de recherche (Cloudflare Worker).
  Modèle : celui d'OpenRouter nommé par OPENROUTER_MODEL dès que ce réglage et le secret
  OPENROUTER_API_KEY sont posés ; sinon Claude Haiku 5.5 en direct (ANTHROPIC_API_KEY).

  POST /recherche  { "page": "modele" | "budget", "q": "..." }
  → 200 { "page": ..., "intention": { ...valeurs fermées... } }

  Sécurités, dans l'ordre :
  1. Origine autorisée seulement (ALLOWED_ORIGINS), méthode et taille de requête bornées.
  2. Limitation de débit par adresse IP et globale (bindings Rate Limiting).
  3. Demande nettoyée et bornée à 300 caractères, encadrée et neutralisée dans le prompt.
  4. Sortie imposée par un schéma JSON à valeurs fermées (structured outputs, ou appel
     d'outil forcé via OpenRouter).
  5. Sortie revalidée ici ; tout écart est rejeté. Le navigateur revalide encore.
  Les clés d'API ne quittent jamais le Worker (secrets OPENROUTER_API_KEY, ANTHROPIC_API_KEY).
*/
import Anthropic from "@anthropic-ai/sdk";
import { PAGES, cleanQuery, outputSchema, validate } from "./contract.js";
import { systemPrompt, userMessage } from "./prompt.js";

const MODEL = "claude-haiku-5-5";
const TOOL = "reglages";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_BODY = 2048;
const MAX_TOKENS = 1024;

function origins(env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function json(body, status, origin, extra) {
  const h = {
    ...(extra || {}),
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
    h["access-control-expose-headers"] = "x-lbm-model";
  }
  return new Response(body == null ? null : JSON.stringify(body), { status, headers: h });
}

async function underLimit(binding, key) {
  if (!binding) return true; /* en local, sans binding */
  const { success } = await binding.limit({ key });
  return success;
}

/* OpenRouter si le modèle et la clé sont posés, sinon Anthropic en direct */
export function backend(env) {
  return env.OPENROUTER_MODEL && env.OPENROUTER_API_KEY ? "openrouter" : "anthropic";
}

function parseOut(page, text, withPhrase) {
  if (typeof text !== "string") return null;
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return null; }
  return validate(page, parsed, withPhrase);
}

async function viaAnthropic(env, page, query, withPhrase, client) {
  const anthropic = client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 15000, maxRetries: 1 });
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: systemPrompt(page, withPhrase), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage(query) }],
    output_config: { effort: "low", format: { type: "json_schema", schema: outputSchema(page, withPhrase) } }
  });
  if (msg.stop_reason === "refusal") return { pertinent: false };
  if (msg.stop_reason !== "end_turn") return null;
  const block = msg.content.find((b) => b.type === "text");
  return block ? parseOut(page, block.text, withPhrase) : null;
}

/*
  OpenRouter, API compatible OpenAI. La sortie passe par un appel d'outil forcé dont les
  paramètres sont le schéma à valeurs fermées : c'est ce que déclarent la plupart des
  hébergeurs, Jev compris (tool_choice), là où response_format json_schema est rare.
  data_collection "deny" écarte les hébergeurs qui gardent les demandes.
*/
async function viaOpenRouter(env, page, query, withPhrase, fetcher) {
  const res = await (fetcher || fetch)(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.OPENROUTER_API_KEY,
      "content-type": "application/json",
      "http-referer": "https://lebonmodel.numenys.fr",
      "x-title": "lebonmodel"
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      reasoning: { effort: "low", exclude: true },
      messages: [
        { role: "system", content: systemPrompt(page, withPhrase) },
        { role: "user", content: userMessage(query) }
      ],
      tools: [{
        type: "function",
        function: { name: TOOL, description: "Réglages de la page déduits de la demande.", strict: true, parameters: outputSchema(page, withPhrase) }
      }],
      tool_choice: { type: "function", function: { name: TOOL } },
      provider: { data_collection: "deny" }
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    const err = new Error("openrouter");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const choice = data && data.choices && data.choices[0];
  if (!choice || !choice.message) return null;
  if (choice.message.refusal) return { pertinent: false };
  if (choice.finish_reason !== "stop" && choice.finish_reason !== "tool_calls") return null;
  const call = (choice.message.tool_calls || []).find((c) => c.function && c.function.name === TOOL);
  return parseOut(page, call ? call.function.arguments : choice.message.content, withPhrase);
}

/*
  Si OpenRouter échoue ou rend une sortie invalide, et que ANTHROPIC_API_KEY est posé,
  la demande repart sur Haiku : la recherche ne tombe pas avec un hébergeur.
  client : client Anthropic ou fonction fetch simulés, pour les tests ; anthropic : client
  Anthropic simulé pour le repli. trace.model reçoit le modèle qui a répondu (et la raison
  d'un repli), renvoyé dans l'en-tête x-lbm-model pour vérifier sans lire les journaux.
*/
export async function interpret(env, page, query, client, anthropic, trace) {
  const withPhrase = env.PHRASE_LIBRE === "on";
  const t = trace || {};
  if (backend(env) !== "openrouter") {
    t.model = MODEL + (env.OPENROUTER_MODEL ? "; openrouter: cle_absente" : "");
    return viaAnthropic(env, page, query, withPhrase, client);
  }
  t.model = env.OPENROUTER_MODEL;
  let out = null, failure = null;
  try { out = await viaOpenRouter(env, page, query, withPhrase, client); } catch (e) { failure = e; }
  if (out) return out;
  if (!env.ANTHROPIC_API_KEY) { if (failure) throw failure; return null; }
  const why = failure ? "erreur_" + (failure.status || failure.name || "reseau") : "sortie_invalide";
  console.log("repli haiku", why);
  t.model = MODEL + "; repli: " + why;
  return viaAnthropic(env, page, query, withPhrase, anthropic);
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
    const trace = {};
    try {
      intention = await interpret(env, body.page, q, undefined, undefined, trace);
    } catch (e) {
      console.log(backend(env), e && e.status, e && e.name);
      return json({ erreur: "indisponible" }, 502, allowed, { "x-lbm-model": trace.model || "" });
    }
    const via = { "x-lbm-model": trace.model || "" };
    if (!intention) return json({ erreur: "sortie_invalide" }, 502, allowed, via);
    console.log("modele", trace.model);
    return json({ page: body.page, intention }, 200, allowed, via);
  }
};
