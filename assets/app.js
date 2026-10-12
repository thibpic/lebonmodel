/* lebonmodel, logique de l'outil. Aucune dépendance. */
(function () {
  "use strict";

  var M = window.LBM_MODELS, TASKS = window.LBM_TASKS, EV = window.LBM_EVALS, LEVELS = window.LBM_LEVELS,
    CUTS = window.LBM_CUTS, DOMS = window.LBM_DOMAINS, CATS = window.LBM_CATEGORIES, PLANS = window.LBM_PLANS,
    TIERS = window.LBM_TIERS, SOURCES = window.LBM_SOURCES, FX = window.LBM_FX;
  if (!M || !TASKS || !PLANS) return;

  var NB = " ", NNB = " ";
  var PROV = { openai: "OpenAI", anthropic: "Anthropic" };
  var KEY = { openai: "oa", anthropic: "an" };

  /* ---------- Raccourcis ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function fr(s) { return String(s).replace(/ ([:;!?%])/g, function (m, c) { return (c === ":" || c === "%" ? NB : NNB) + c; }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var byId = {}; M.forEach(function (m) { byId[m.id] = m; });
  var taskById = {}; TASKS.forEach(function (t) { taskById[t.id] = t; });
  var planIdx = { openai: {}, anthropic: {} };
  ["openai", "anthropic"].forEach(function (p) { PLANS[p].forEach(function (pl) { planIdx[p][pl.id] = pl; }); });

  /* ---------- État ---------- */
  var state = { task: "pdf", oa: "all", an: "all", exig: 0, sort: "fit", showAll: false, cur: "EUR", chatOnly: false, open: {}, hl: null, cat: null };

  function readURL() {
    try {
      var p = new URLSearchParams(window.location.search);
      if (taskById[p.get("tache")]) state.task = p.get("tache");
      var oa = p.get("chatgpt"), an = p.get("claude");
      if (oa && (oa === "all" || oa === "none" || (planIdx.openai[oa] && !planIdx.openai[oa].hidden))) state.oa = oa;
      if (an && (an === "all" || an === "none" || (planIdx.anthropic[an] && !planIdx.anthropic[an].hidden))) state.an = an;
      var e = parseInt(p.get("exigence"), 10);
      if (e === -1 || e === 0 || e === 1) state.exig = e;
      if (p.get("tri") === "best") state.sort = "best";
      if (p.get("devise") === "USD") state.cur = "USD";
      if (p.get("conversation") === "1") state.chatOnly = true;
    } catch (err) { /* aperçu sans URL */ }
    state.cat = taskById[state.task].cat;
  }
  function writeURL() {
    try {
      var p = new URLSearchParams();
      p.set("tache", state.task);
      if (state.oa !== "all") p.set("chatgpt", state.oa);
      if (state.an !== "all") p.set("claude", state.an);
      if (state.exig) p.set("exigence", String(state.exig));
      if (state.sort !== "fit") p.set("tri", state.sort);
      if (state.cur !== "EUR") p.set("devise", state.cur);
      if (state.chatOnly) p.set("conversation", "1");
      window.history.replaceState(null, "", window.location.pathname + "?" + p.toString() + window.location.hash);
    } catch (err) {}
  }

  /* ---------- Formats ---------- */
  var nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var sig2 = new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 2 });
  var sig1 = new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 1 });
  function sym() { return state.cur === "EUR" ? NB + "€" : NB + "$"; }
  function toCur(usd) { return state.cur === "EUR" ? usd * FX.usdToEur : usd; }
  function fmtCur(v) {
    if (v === 0) return "0" + sym();
    if (v < 0.01) return sig2.format(v) + sym();
    if (v < 10) return nf2.format(v) + sym();
    if (v < 100) return nf1.format(v) + sym();
    return nf0.format(v) + sym();
  }
  function money(usd) { return fmtCur(toCur(usd)); }
  function axisMoney(v) { return (v >= 1 ? nf0.format(v) : sig1.format(v)) + sym(); }
  function perUnit(usd) {
    var v = toCur(usd);
    if (v <= 0) return "";
    var n = 1 / v;
    if (n < 2) return "";
    var r = n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
    return "≈" + NB + nf0.format(r) + " pour 1" + sym();
  }
  function fmtDur(s) {
    if (s < 1) return "moins d'1" + NB + "s";
    if (s < 60) return "≈" + NB + nf0.format(Math.round(s)) + NB + "s";
    if (s < 3600) return "≈" + NB + nf0.format(Math.round(s / 60)) + NB + "min";
    var h = Math.floor(s / 3600), mn = Math.round((s - h * 3600) / 60);
    return "≈" + NB + h + NB + "h" + (mn ? NB + String(mn).padStart(2, "0") : "");
  }
  function pct(v) { return nf0.format(Math.round(v * 100)) + NB + "%"; }

  var EFF = { none: "sans réflexion", reasoning: "réflexion activée", low: "effort faible", medium: "effort moyen", high: "effort élevé", xhigh: "effort très élevé", max: "effort maximal" };
  var EFF_WITH = { none: "sans réflexion", reasoning: "avec la réflexion activée", low: "avec un effort faible", medium: "avec un effort moyen", high: "avec un effort élevé", xhigh: "avec un effort très élevé", max: "avec un effort maximal" };
  function job(t, n) { return DOMS[t.domain][n - 1]; }
  function isFem(word) { return /^plume/.test(word); }
  function dUn(word) { return (isFem(word) ? "d'une " : "d'un ") + word; }
  function unA(word) { return (isFem(word) ? "une " : "un ") + word; }
  function markHTML(p) { return '<span class="mark ' + p + '" aria-hidden="true"></span>'; }

  /* ---------- Calculs ---------- */
  function score(lv, w) { var s = 0, tw = 0; for (var k in w) { s += lv.s[k] * w[k]; tw += w[k]; } return s / tw; }
  function costOf(m, lv, rec) {
    var c = 0;
    for (var k in rec) {
      if (k === "tok") {
        var a = rec.tok, tf = m.tok, th = a[2] * (lv.o || 300);
        c += (a[0] * tf * m.price["in"] + (a[1] * tf + th) * m.price.out) / 1e6;
      } else c += lv.c[k] * rec[k];
    }
    return c;
  }
  function durOf(m, lv, rec) {
    var d = 0;
    for (var k in rec) {
      if (k === "tok") {
        var a = rec.tok, tf = m.tok, th = a[2] * (lv.o || 300);
        d += 1.5 + (a[1] * tf + th) / (lv.tps || 80);
      } else d += lv.t[k] * rec[k];
    }
    return d;
  }
  function levelOf(q) { var n = 1; for (var i = 0; i < CUTS.length; i++) if (q >= CUTS[i] - 1e-9) n = i + 2; return n; }
  function usesEstimate(lv, t) {
    if (!lv.imp) return false;
    for (var k in t.w) if (lv.imp.indexOf(k) >= 0) return true;
    return false;
  }

  function computeRows(t) {
    var rows = [];
    M.forEach(function (m) {
      m.levels.forEach(function (lv) {
        rows.push({ m: m, lv: lv, s: score(lv, t.w), c: costOf(m, lv, t.cost), d: durOf(m, lv, t.cost), est: usesEstimate(lv, t) });
      });
    });
    var hi = 0;
    rows.forEach(function (r) { if (!r.est && r.s > hi) hi = r.s; });
    rows.forEach(function (r) { r.q = clamp(r.s / hi, 0, 1); r.n = levelOf(r.q); });
    return rows;
  }

  /* ---------- Abonnements ---------- */
  function planOf(provider, id) {
    var p = planIdx[provider][id];
    if (!p) return null;
    if (p.same) {
      var base = planIdx[provider][p.same], o = {};
      for (var k in base) o[k] = base[k];
      ["id", "name", "short", "eur", "usd", "volume", "priceNote"].forEach(function (k) { if (p[k] !== undefined) o[k] = p[k]; });
      if (p.priceNote === undefined) delete o.priceNote;
      return o;
    }
    return p;
  }
  var surfaceCache = {};
  function surfaceList(plan, provider, surface) {
    var ck = provider + "|" + plan.id + "|" + surface;
    if (surfaceCache[ck]) return surfaceCache[ck];
    var spec = plan[surface], out = {};
    if (spec && spec.length) {
      if (typeof spec === "string") {
        spec.split(" ").forEach(function (id) { byId[id].levels.forEach(function (lv) { out[id + "|" + lv.e] = ""; }); });
      } else spec.forEach(function (s) { out[s[0] + "|" + s[1]] = s[2]; });
    }
    surfaceCache[ck] = out;
    return out;
  }
  function surfacesFor(provider, t) {
    var out = [];
    t.where.forEach(function (w) {
      if (state.chatOnly && w !== "chat") return;
      var s = provider === "anthropic" && w === "work" ? "chat" : w;
      if (out.indexOf(s) < 0) out.push(s);
    });
    return out;
  }
  function ctxLimit(provider, plan, surface, r) {
    if (provider === "openai" && surface === "chat" && plan.ctx) {
      var lim = r.lv.e === "none" ? plan.ctx.instant : plan.ctx.think;
      return lim == null ? null : Math.min(lim, r.m.ctxTok);
    }
    return r.m.ctxTok;
  }
  function accessIn(provider, plan, t, r) {
    var surfs = surfacesFor(provider, t);
    var found = null;
    for (var i = 0; i < surfs.length; i++) {
      var list = surfaceList(plan, provider, surfs[i]);
      var key = r.m.id + "|" + r.lv.e;
      if (key in list) {
        var lim = ctxLimit(provider, plan, surfs[i], r);
        var a = { surface: surfs[i], label: list[key], limit: lim, fits: !t.ctx || lim == null || t.ctx <= lim, unknownCtx: lim == null && !!t.ctx, plan: plan };
        if (a.fits) return a;
        if (!found) found = a;
      }
    }
    return found;
  }
  function accessApi(t, r) {
    return { surface: "api", label: "", limit: r.m.ctxTok, fits: !t.ctx || t.ctx <= r.m.ctxTok, plan: null };
  }
  function isApiTask(t) { return t.where.indexOf("api") >= 0; }
  function selection(provider) { return state[KEY[provider]]; }
  function access(r, t) {
    var sel = selection(r.m.provider);
    if (sel === "none") return null;
    if (sel === "all" || isApiTask(t)) return accessApi(t, r);
    return accessIn(r.m.provider, planOf(r.m.provider, sel), t, r);
  }

  var SURF_RANK = { chat: 0, work: 1, code: 2, api: 0 };
  function choose(cands, need) {
    var usable = cands.filter(function (r) { return r.acc && r.acc.fits; });
    /* Dans un abonnement, la conversation passe avant les agents : plus simple, et souvent hors quota d'agent */
    var ok = usable.filter(function (r) { return r.n >= need; }).sort(function (a, b) {
      return (SURF_RANK[a.acc.surface] - SURF_RANK[b.acc.surface]) || a.c - b.c || b.q - a.q;
    });
    if (ok.length) return { r: ok[0], ok: true };
    var top = usable.slice().sort(function (a, b) { return b.q - a.q || a.c - b.c; })[0];
    return top ? { r: top, ok: false } : null;
  }
  function strongest(cands) {
    var usable = cands.filter(function (r) { return r.acc && r.acc.fits; });
    return usable.slice().sort(function (a, b) { return b.q - a.q || a.c - b.c; })[0] || null;
  }

  function needLevel(t) { return clamp(t.need + state.exig, 1, 5); }

  function compute() {
    var t = taskById[state.task];
    var rows = computeRows(t);
    rows.forEach(function (r) { r.acc = access(r, t); });
    var need = needLevel(t);
    var picks = {};
    ["openai", "anthropic"].forEach(function (p) {
      picks[p] = selection(p) === "none" ? null : choose(rows.filter(function (r) { return r.m.provider === p; }), need);
    });
    var reps = M.map(function (m) {
      var own = rows.filter(function (r) { return r.m === m; });
      var c = choose(own, need);
      var best = strongest(own);
      var anyRow = own.slice().sort(function (a, b) { return b.q - a.q; })[0];
      var cheapestOk = own.filter(function (r) { return r.n >= need; }).sort(function (a, b) { return a.c - b.c; })[0];
      return { m: m, fit: c, best: best, usable: !!c, ghost: cheapestOk || anyRow, own: own };
    });
    return { t: t, rows: rows, need: need, picks: picks, reps: reps };
  }

  /* Pour atteindre le niveau : quelle offre du même éditeur, sinon l'API */
  function upgradeHint(provider, t, need, rows) {
    if (isApiTask(t)) return "";
    var own = rows.filter(function (r) { return r.m.provider === provider; });
    var order = PLANS[provider].filter(function (p) { return !p.hidden; });
    var cur = selection(provider);
    var curIdx = -1;
    order.forEach(function (p, i) { if (p.id === cur) curIdx = i; });
    for (var i = curIdx + 1; i < order.length; i++) {
      var plan = planOf(provider, order[i].id);
      var ok = own.some(function (r) { var a = accessIn(provider, plan, t, r); return a && a.fits && r.n >= need; });
      if (ok) return plan.name + " (" + priceText(provider, plan) + ")";
    }
    var api = own.filter(function (r) { return r.n >= need && (!t.ctx || t.ctx <= r.m.ctxTok); }).sort(function (a, b) { return a.c - b.c; })[0];
    if (api) return "l'API, avec " + api.m.name + " (" + money(api.c) + " la tâche)";
    return "";
  }

  function priceText(provider, plan) {
    if (!plan.usd && !plan.eur) return "gratuit";
    if (provider === "openai") {
      if (state.cur === "USD") return nf0.format(plan.usd) + NB + "$" + (plan.perSeat ? " par personne" : "") + " par mois";
      return nf0.format(plan.eur) + NB + "€" + (plan.perSeat ? " par personne" : "") + " par mois";
    }
    if (state.cur === "USD") return nf0.format(plan.usd) + NB + "$ HT" + (plan.perSeat ? " par personne" : "") + " par mois";
    var ttc = plan.usd * FX.usdToEur * (1 + FX.vat);
    return "≈" + NB + nf0.format(Math.round(ttc)) + NB + "€" + (plan.perSeat ? " par personne" : "") + " par mois";
  }

  function whereSentence(r) {
    var a = r.acc, m = r.m, lv = r.lv;
    if (!a) return "";
    if (a.surface === "api") return "Via l'API, appelez " + m.name + " " + EFF_WITH[lv.e] + ".";
    if (m.provider === "openai") {
      if (a.surface === "chat") return "Dans ChatGPT, choisissez le mode " + a.label + (a.label === "Pro" ? " (GPT-6 Pro)" : "") + ".";
      if (a.surface === "work") return "Dans ChatGPT Work, choisissez " + m.name + " " + EFF_WITH[lv.e] + ".";
      if (a.label) return "Dans Codex, avec l'accès limité de votre offre (" + m.name + ").";
      return "Dans Codex, choisissez " + m.name + " " + EFF_WITH[lv.e] + ".";
    }
    if (a.surface === "code") return "Dans Claude Code, choisissez " + m.short + " " + EFF_WITH[lv.e] + ".";
    return "Dans l'appli Claude, choisissez " + m.short + " " + EFF_WITH[lv.e] + ".";
  }
  function whereShort(r) {
    var a = r.acc;
    if (!a) return "hors de vos abonnements";
    if (a.surface === "api") return "API";
    if (r.m.provider === "openai") {
      if (a.surface === "chat") return "ChatGPT, mode " + a.label;
      if (a.surface === "work") return "ChatGPT Work";
      return "Codex";
    }
    return a.surface === "code" ? "Claude Code" : "Appli Claude";
  }
  function settingText(r) {
    if (r.acc && r.acc.surface === "chat" && r.m.provider === "openai" && r.acc.label) return "mode " + r.acc.label;
    return EFF[r.lv.e];
  }

  /* ---------- Rendu : choix de la tâche ---------- */
  function renderCats() {
    $("#cats").innerHTML = CATS.map(function (c) {
      return '<button type="button" class="cat" role="tab" data-cat="' + c.id + '" aria-selected="' + (c.id === state.cat) + '">' + esc(c.label) + "</button>";
    }).join("");
  }
  function renderTasks() {
    var list = TASKS.filter(function (t) { return t.cat === state.cat; });
    $("#tasks").innerHTML = list.map(function (t) {
      return '<button type="button" class="task" role="radio" data-task="' + t.id + '" aria-checked="' + (t.id === state.task) + '">' +
        '<span class="task-label">' + esc(t.label) + '</span><span class="task-hint">' + esc(t.hint) + "</span></button>";
    }).join("");
  }

  function selectTask(id, scroll) {
    state.task = id;
    state.cat = taskById[id].cat;
    state.open = {};
    state.hl = null;
    renderCats();
    renderTasks();
    update();
    if (scroll) {
      var el = $("#resultat");
      var top = el.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  /* ---------- Rendu : réglages ---------- */
  function renderSelects() {
    ["openai", "anthropic"].forEach(function (p) {
      var sel = $(p === "openai" ? "#sel-openai" : "#sel-anthropic");
      var opts = [["all", "Tout comparer"]];
      PLANS[p].forEach(function (pl) { if (!pl.hidden) opts.push([pl.id, pl.name]); });
      opts.push(["none", p === "openai" ? "Je n'utilise pas ChatGPT" : "Je n'utilise pas Claude"]);
      sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '"' + (state[KEY[p]] === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
    });
    $("#exig-" + (state.exig === -1 ? "low" : state.exig === 1 ? "high" : "mid")).checked = true;
    $("#sort-" + state.sort).checked = true;
    $("#chat-only").checked = state.chatOnly;
  }

  /* ---------- Rendu : résultat ---------- */
  function renderHead(R) {
    var t = R.t, need = R.need;
    $("#task-title").textContent = t.label;
    var j = job(t, need);
    var line;
    if (need === 1) line = "Tâche simple&nbsp;: même un modèle de niveau <strong>Débutant</strong>, celui " + esc(dUn(j)) + ", fait l'affaire. Le moins cher l'emporte.";
    else line = "Il faut au moins le niveau <strong>" + LEVELS[need - 1] + "</strong>, celui " + esc(dUn(j)) + ".";
    if (state.exig === 1) line += " Vous visez le sans-faute&nbsp;: on monte d'un cran.";
    if (state.exig === -1) line += " Un premier jet vous suffit&nbsp;: on descend d'un cran.";
    $("#need-line").innerHTML = line;
    var note = $("#api-note");
    if (isApiTask(t)) {
      note.hidden = false;
      note.textContent = fr("Cette tâche s'automatise par l'API : vos abonnements ChatGPT ou Claude ne s'appliquent pas, on compare donc les prix à l'usage.");
    } else note.hidden = true;
  }

  function levelBar(n, need) {
    var h = "";
    for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return '<div class="levelbar" aria-hidden="true">' + h + "</div>";
  }

  function renderPicks(R) {
    var t = R.t, need = R.need, html = "";
    ["openai", "anthropic"].forEach(function (p) {
      var sel = selection(p), pick = R.picks[p];
      html += '<article class="pick" data-provider="' + p + '"><p class="pick-top">' + markHTML(p) + "Chez " + PROV[p] + "</p>";
      if (sel === "none") {
        html += '<p class="pick-empty">Vous avez indiqué ne pas utiliser ' + (p === "openai" ? "ChatGPT" : "Claude") + '. Choisissez «' + NB + "Tout comparer" + NB + "» pour le voir.</p></article>";
        return;
      }
      if (!pick && state.chatOnly && t.where.indexOf("chat") < 0 && !isApiTask(t) && sel !== "all") {
        html += '<p class="pick-empty">' + esc(fr("Cette tâche se fait dans un agent (" + (p === "openai" ? "ChatGPT Work ou Codex" : "Claude Code") + "), pas dans la conversation.")) + "</p></article>";
        return;
      }
      if (!pick) {
        var plan0 = planOf(p, sel);
        html += '<p class="pick-empty">' + esc(plan0 ? plan0.name : PROV[p]) + " ne propose rien pour cette tâche. " + esc(fr(upgradeHint(p, t, need, R.rows) ? "Il faut passer à " + upgradeHint(p, t, need, R.rows) + "." : "")) + "</p></article>";
        return;
      }
      var r = pick.r;
      var jobTxt = job(t, r.n);
      html += '<p class="pick-name">' + esc(r.m.name) + "</p>";
      html += '<p class="pick-setting">' + esc(cap(settingText(r))) + (r.acc && r.acc.surface !== "api" && r.acc.plan ? ", inclus dans " + esc(r.acc.plan.name) : "") + "</p>";
      html += '<p class="pick-job">Travaille ici comme ' + esc(unA(jobTxt)) + ", niveau <strong>" + LEVELS[r.n - 1] + "</strong>.</p>" + levelBar(r.n, need);
      html += '<div class="pick-stats">' +
        '<div class="stat"><span class="stat-label">Note sur la tâche</span><span class="stat-value num">' + nf0.format(Math.round(r.q * 100)) + '</span><span class="stat-sub">sur 100</span></div>' +
        '<div class="stat"><span class="stat-label">Coût d\'une tâche</span><span class="stat-value num">' + money(r.c) + '</span><span class="stat-sub">' + (r.acc.surface === "api" ? esc(perUnit(r.c) || "au prix de l'API") : "valeur au prix de l'API") + "</span></div>" +
        '<div class="stat"><span class="stat-label">Durée</span><span class="stat-value num">' + fmtDur(r.d) + '</span><span class="stat-sub">par ' + esc(t.unit) + "</span></div></div>";
      html += '<p class="pick-where">' + esc(fr(whereSentence(r))) + "</p>";
      var notes = [];
      if (!pick.ok) {
        var up = upgradeHint(p, t, need, R.rows);
        notes.push('<span class="warn">' + esc(fr("C'est le mieux disponible, mais il reste sous le niveau " + LEVELS[need - 1] + "." + (up ? " Pour l'atteindre : " + up + "." : ""))) + "</span>");
      }
      if (r.acc && r.acc.plan && sel !== "all") {
        var plan = r.acc.plan;
        var vol = plan.volume.filter(function (v) {
          if (r.acc.surface === "chat" && /Work|Codex|Claude Code/.test(v) && p === "openai") return false;
          return true;
        }).slice(0, 2);
        if (vol.length) notes.push(esc(fr("Avec " + plan.name + " : " + vol.join(", ") + ".")));
        var tooBig = R.rows.some(function (x) { return x.m.provider === p && x.acc && !x.acc.fits; });
        if (tooBig && t.ctx) notes.push(esc(fr("Le document fait environ " + nf0.format(Math.round(t.ctx / 500)) + " pages : certains modes de " + plan.name + " ne peuvent pas le lire en entier.")));
        if (r.acc.unknownCtx) notes.push(esc("Taille de document acceptée non publiée pour ce mode."));
      }
      if ((t.w.acc || t.w.nohall) && r.lv.hall != null) notes.push(esc(fr("Quand il ne sait pas, il invente une réponse dans " + pct(r.lv.hall) + " des cas (AA-Omniscience).")));
      if (r.acc && r.acc.label === "Pro") notes.push(esc("Le mode Pro n'est pas évalué : nous le montrons comme GPT-6 Astra au maximum."));
      if (r.est || r.lv.est) notes.push(esc("Note en partie estimée à partir du même modèle."));
      if (notes.length) html += '<div class="pick-notes">' + notes.map(function (n) { return "<p>" + n + "</p>"; }).join("") + "</div>";
      html += "</article>";
    });
    $("#picks").innerHTML = html;
  }

  /* ---------- Carte ---------- */
  var C = { host: null, svg: null, tip: null, g: {}, pts: {}, lbls: {}, W: 0, H: 0, last: null };
  function initChart() {
    C.host = $("#chart");
    C.svg = svgEl("svg", { role: "img", "aria-labelledby": "chart-title chart-desc" }, C.host);
    svgEl("title", { id: "chart-title" }, C.svg).textContent = "Niveau et coût des modèles sur la tâche";
    C.desc = svgEl("desc", { id: "chart-desc" }, C.svg);
    ["bands", "grid", "dim", "curves", "threshold", "points", "labels", "axes"].forEach(function (k) { C.g[k] = svgEl("g", { "class": k }, C.svg); });
    C.dimRect = svgEl("rect", { "class": "dimzone" }, C.g.dim);
    C.thLine = svgEl("line", { "class": "threshold-line" }, C.g.threshold);
    C.thLabel = svgEl("text", { "class": "threshold-label" }, C.g.threshold);
    C.tip = document.createElement("div");
    C.tip.className = "tip"; C.tip.hidden = true;
    C.host.appendChild(C.tip);
    if ("ResizeObserver" in window) new ResizeObserver(function () { if (C.last) drawChart(C.last, true); }).observe(C.host);
    else window.addEventListener("resize", function () { if (C.last) drawChart(C.last, true); });
    document.addEventListener("pointerdown", function (e) { if (!e.target.closest || !e.target.closest(".pt")) hideTip(); });
  }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function drawChart(R, resizeOnly) {
    C.last = R;
    var W = C.host.clientWidth, H = C.host.clientHeight;
    if (!W || !H) return;
    C.W = W; C.H = H;
    var narrow = W < 560;
    var Mg = narrow ? { l: 50, r: 12, t: 30, b: 40 } : { l: 64, r: 18, t: 32, b: 42 };
    C.svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var pw = W - Mg.l - Mg.r, ph = H - Mg.t - Mg.b;
    var t = R.t;

    var shown = R.reps.map(function (rp) { return rp.fit ? rp.fit.r : rp.ghost; });
    var pool = shown.slice();
    if (state.showAll) pool = pool.concat(R.rows);
    var qmin = Math.min.apply(null, pool.map(function (r) { return r.q; }));
    var XMIN = clamp(Math.floor((qmin * 100 - 6) / 10) * 10, 0, 80), XMAX = 100;
    function xs(v) { return Mg.l + (clamp(v, XMIN, XMAX) - XMIN) / (XMAX - XMIN) * pw; }
    var vals = pool.map(function (r) { return toCur(r.c); }).filter(function (v) { return v > 0; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var lMin = Math.log10(lo) - 0.35, lMax = Math.log10(hi) + 0.35;
    if (lMax - lMin < 2) { var mid = (lMax + lMin) / 2; lMin = mid - 1; lMax = mid + 1; }
    function ys(v) { return Mg.t + (lMax - Math.log10(Math.max(v, 1e-12))) / (lMax - lMin) * ph; }

    // Bandes de niveaux
    var gb = C.g.bands; gb.textContent = "";
    var edges = [0].concat(CUTS.map(function (c) { return c * 100; })).concat([100]);
    for (var i = 0; i < 5; i++) {
      var a = Math.max(edges[i], XMIN), b = Math.min(edges[i + 1], XMAX);
      if (b <= a) continue;
      var x0 = xs(a), x1 = xs(b);
      if (i % 2 === 1) svgEl("rect", { "class": "band", x: x0, y: Mg.t, width: Math.max(0, x1 - x0), height: ph }, gb);
      var wBand = x1 - x0, label = cap(job(t, i + 1));
      if (wBand < label.length * 6.3 + 8) label = LEVELS[i];
      if (wBand < label.length * 6.3 + 8) label = wBand > 34 ? LEVELS[i].slice(0, 4) + "." : "";
      if (label) {
        var tx = svgEl("text", { "class": "band-label" + (i + 1 === R.need ? " need" : ""), x: (x0 + x1) / 2, y: Mg.t - 12, "text-anchor": "middle" }, gb);
        tx.textContent = label;
      }
    }

    // Grille
    var gg = C.g.grid; gg.textContent = "";
    var ticks = [];
    for (var k = Math.ceil(lMin); k <= Math.floor(lMax); k++) ticks.push(Math.pow(10, k));
    if (ticks.length < 3) {
      for (var k2 = Math.floor(lMin); k2 <= Math.ceil(lMax); k2++) [2, 5].forEach(function (f) { var v = f * Math.pow(10, k2), lv = Math.log10(v); if (lv > lMin && lv < lMax) ticks.push(v); });
      ticks.sort(function (x, y) { return x - y; });
    }
    ticks.forEach(function (v) {
      var y = Math.round(ys(v)) + 0.5;
      svgEl("line", { "class": "gridline", x1: Mg.l, x2: W - Mg.r, y1: y, y2: y }, gg);
      svgEl("text", { x: Mg.l - 8, y: y + 4, "text-anchor": "end" }, gg).textContent = axisMoney(v);
    });
    var ga = C.g.axes; ga.textContent = "";
    for (var xv = Math.ceil(XMIN / 10) * 10; xv <= XMAX; xv += 10) svgEl("text", { x: xs(xv), y: H - Mg.b + 18, "text-anchor": "middle" }, ga).textContent = String(xv);
    svgEl("text", { "class": "axis-title", x: Mg.l + pw / 2, y: H - 4, "text-anchor": "middle" }, ga).textContent = "Note sur la tâche (100 = le meilleur actuel)";

    // Seuil
    var thx = R.need > 1 ? xs(CUTS[R.need - 2] * 100) : Mg.l;
    C.dimRect.setAttribute("x", Mg.l); C.dimRect.setAttribute("y", Mg.t); C.dimRect.setAttribute("height", ph);
    C.dimRect.setAttribute("width", Math.max(0, thx - Mg.l));
    C.g.threshold.style.display = R.need > 1 ? "" : "none";
    C.g.threshold.style.transform = "translate(" + thx + "px, 0px)";
    C.thLine.setAttribute("x1", 0); C.thLine.setAttribute("x2", 0); C.thLine.setAttribute("y1", Mg.t); C.thLine.setAttribute("y2", Mg.t + ph);
    var right = thx < W - 140;
    C.thLabel.setAttribute("x", right ? 7 : -7); C.thLabel.setAttribute("y", Mg.t + 15); C.thLabel.setAttribute("text-anchor", right ? "start" : "end");
    C.thLabel.textContent = "Niveau requis";

    // Courbes d'effort
    var gc = C.g.curves; gc.textContent = "";
    if (state.showAll) {
      M.forEach(function (m) {
        var own = R.rows.filter(function (r) { return r.m === m; }).sort(function (a, b) { return a.q - b.q; });
        if (own.length < 2) return;
        var off = !own.some(function (r) { return r.acc && r.acc.fits; });
        svgEl("path", { "class": "curve " + m.provider + (off ? " off" : ""), d: own.map(function (r, i) { return (i ? "L" : "M") + xs(r.q * 100).toFixed(1) + " " + ys(toCur(r.c)).toFixed(1); }).join(" ") }, gc);
        own.forEach(function (r) { svgEl("circle", { "class": "cdot " + m.provider + (r.acc && r.acc.fits ? "" : " off"), cx: xs(r.q * 100), cy: ys(toCur(r.c)), r: 2.6 }, gc); });
      });
    }

    // Points
    var obstacles = [], items = [];
    var pickRows = [R.picks.openai && R.picks.openai.r, R.picks.anthropic && R.picks.anthropic.r];
    R.reps.forEach(function (rp) {
      var r = rp.fit ? rp.fit.r : rp.ghost, id = rp.m.id;
      var x = xs(r.q * 100), y = ys(toCur(r.c));
      var g = C.pts[id], fresh = false;
      if (!g) {
        fresh = true;
        g = svgEl("g", { "class": "pt", tabindex: "0", "data-model": id }, C.g.points);
        svgEl("circle", { "class": "hit", r: 15 }, g);
        svgEl("circle", { "class": "halo", r: 13 }, g);
        if (rp.m.provider === "openai") svgEl("circle", { "class": "shape", r: 6.5 }, g);
        else svgEl("rect", { "class": "shape", x: -6, y: -6, width: 12, height: 12, rx: 3 }, g);
        g.addEventListener("pointerenter", function () { showTip(id); });
        g.addEventListener("pointerleave", hideTip);
        g.addEventListener("focus", function () { showTip(id); });
        g.addEventListener("blur", hideTip);
        g.addEventListener("click", function () { focusModel(id, true); showTip(id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusModel(id, true); } });
        C.pts[id] = g;
      }
      var isPick = pickRows.indexOf(r) >= 0;
      var off = !rp.fit;
      g.setAttribute("class", "pt " + rp.m.provider + (off ? " off" : "") + (isPick ? " pick" : "") + (state.hl === id ? " hl" : ""));
      g.setAttribute("aria-label", rp.m.name + ", " + EFF[r.lv.e] + ", note " + Math.round(r.q * 100) + " sur 100, niveau " + LEVELS[r.n - 1] + ", " + money(r.c) + " la tâche" + (off ? ", hors de vos abonnements" : ""));
      if (fresh || resizeOnly) g.style.transition = "none";
      g.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
      if (fresh || resizeOnly) { g.getBoundingClientRect(); g.style.transition = ""; }
      g._r = r; g._rp = rp; g._x = x; g._y = y;
      obstacles.push({ x: x - 9, y: y - 9, w: 18, h: 18, id: id });
      items.push({ id: id, x: x, y: y, text: rp.m.short, pick: isPick, off: off, pr: isPick ? 3 : off ? 1 : 2 });
    });

    var placed = [];
    var cands = [{ dx: 11, dy: 4, a: "start" }, { dx: -11, dy: 4, a: "end" }, { dx: 0, dy: -13, a: "middle" }, { dx: 0, dy: 21, a: "middle" },
      { dx: 10, dy: -9, a: "start" }, { dx: 10, dy: 17, a: "start" }, { dx: -10, dy: -9, a: "end" }, { dx: -10, dy: 17, a: "end" }];
    items.sort(function (a, b) { return b.pr - a.pr; });
    items.forEach(function (it) {
      var w = it.text.length * (it.pick ? 7.1 : 6.5) + 4, h = 14, push = it.pick ? 8 : 0, chosen = null;
      for (var i = 0; i < cands.length && !chosen; i++) {
        var c0 = cands[i];
        var c = { dx: c0.dx + (c0.dx > 0 ? push : c0.dx < 0 ? -push : 0), dy: c0.dy + (c0.dx === 0 ? (c0.dy < 0 ? -push : push) : 0), a: c0.a };
        var bx = c.a === "start" ? it.x + c.dx : c.a === "end" ? it.x + c.dx - w : it.x + c.dx - w / 2;
        var box = { x: bx, y: it.y + c.dy - 11, w: w, h: h };
        if (box.x < Mg.l - 4 || box.x + box.w > W - 2 || box.y < Mg.t + 18 || box.y + box.h > Mg.t + ph + 2) continue;
        if (placed.some(function (q) { return overlap(box, q); })) continue;
        if (obstacles.some(function (o) { return o.id !== it.id && overlap(box, o); })) continue;
        chosen = { c: c, box: box };
      }
      var tl = C.lbls[it.id];
      if (!tl) { tl = svgEl("text", { "class": "lbl" }, C.g.labels); C.lbls[it.id] = tl; tl.style.transition = "none"; }
      tl.textContent = it.text;
      if (!chosen && it.pick) { var cc = { dx: 11 + push, dy: 4, a: "start" }; chosen = { c: cc, box: { x: it.x + cc.dx, y: it.y - 7, w: w, h: h } }; }
      if (chosen) {
        placed.push(chosen.box);
        tl.setAttribute("text-anchor", chosen.c.a);
        tl.style.transform = "translate(" + (it.x + chosen.c.dx).toFixed(1) + "px, " + (it.y + chosen.c.dy).toFixed(1) + "px)";
        tl.setAttribute("class", "lbl" + (it.pick ? " pick" : "") + (it.off ? " off" : ""));
      } else tl.setAttribute("class", "lbl hidden");
      if (resizeOnly) { tl.style.transition = "none"; tl.getBoundingClientRect(); }
      requestAnimationFrame(function () { tl.style.transition = ""; });
    });

    var p1 = R.picks.openai, p2 = R.picks.anthropic;
    C.desc.textContent = "Pour " + t.label + ". " +
      (p1 ? "Chez OpenAI : " + p1.r.m.name + ", note " + Math.round(p1.r.q * 100) + ", " + money(p1.r.c) + ". " : "") +
      (p2 ? "Chez Anthropic : " + p2.r.m.name + ", note " + Math.round(p2.r.q * 100) + ", " + money(p2.r.c) + "." : "");
  }

  function showTip(id) {
    var g = C.pts[id];
    if (!g || !g._r) return;
    var r = g._r, t = C.last.t, need = C.last.need;
    var verdict = !g._rp.fit ? "Hors de vos abonnements" : r.n >= need ? "Atteint le niveau requis" : "Sous le niveau requis";
    C.tip.innerHTML = "<strong>" + esc(r.m.name) + "</strong>" +
      '<span class="t-row"><span>Réglage</span><b>' + esc(EFF[r.lv.e]) + "</b></span>" +
      '<span class="t-row"><span>Note</span><b class="num">' + Math.round(r.q * 100) + " / 100</b></span>" +
      '<span class="t-row"><span>Niveau</span><b>' + esc(cap(job(t, r.n))) + "</b></span>" +
      '<span class="t-row"><span>Coût d\'une tâche</span><b class="num">' + money(r.c) + "</b></span>" +
      '<span class="t-row"><span>Durée</span><b class="num">' + fmtDur(r.d) + "</b></span>" +
      '<span class="t-verdict">' + verdict + "</span>";
    C.tip.hidden = false;
    var tw = C.tip.offsetWidth, th = C.tip.offsetHeight;
    var left = g._x + 18, top = g._y - th / 2;
    if (left + tw > C.W) left = g._x - tw - 18;
    if (left < 0) left = clamp(g._x - tw / 2, 0, Math.max(0, C.W - tw));
    C.tip.style.left = left + "px";
    C.tip.style.top = clamp(top, 0, Math.max(0, C.H - th)) + "px";
  }
  function hideTip() { if (C.tip) C.tip.hidden = true; }
  function focusModel(id, openRow) {
    state.hl = id;
    Object.keys(C.pts).forEach(function (k) { C.pts[k].classList.toggle("hl", k === id); });
    $$(".row").forEach(function (row) { row.classList.toggle("hl", row.getAttribute("data-model") === id); });
    if (openRow) {
      var row = $('.row[data-model="' + id + '"]');
      if (row) { row.open = true; state.open[id] = true; row.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }); }
    }
  }

  /* ---------- Classement ---------- */
  function evalValue(k, lv) {
    var v = lv.s[k];
    if (k === "brief" || k === "briefA" || k === "briefP" || k === "gdpval") return nf0.format(Math.round(v * 2000 + 500)) + " Elo";
    if (k === "fin" || k === "strat" || k === "legal" || k === "eco" || k === "eng") return nf0.format(Math.round(v * 100)) + " / 100";
    return pct(v);
  }
  function plansWith(m) {
    var out = [];
    PLANS[m.provider].forEach(function (pl) {
      if (pl.hidden) return;
      var inChat = Object.keys(surfaceList(pl, m.provider, "chat")).some(function (k) { return k.indexOf(m.id + "|") === 0; });
      var inOther = ["work", "code"].some(function (s) { return Object.keys(surfaceList(pl, m.provider, s)).some(function (k) { return k.indexOf(m.id + "|") === 0; }); });
      if (inChat) out.push(pl.short);
      else if (inOther) out.push(pl.short + (m.provider === "openai" ? " (Work, Codex)" : " (Claude Code)"));
    });
    return out.length ? out.join(", ") : "API uniquement";
  }

  function renderRanking(R) {
    var t = R.t, need = R.need;
    var reps = R.reps.map(function (rp) {
      var r = rp.fit ? (state.sort === "best" ? rp.best : rp.fit.r) : rp.ghost;
      return { rp: rp, r: r, usable: !!rp.fit, ok: rp.fit && r.n >= need };
    });
    var usable = reps.filter(function (x) { return x.usable; }), out = reps.filter(function (x) { return !x.usable; });
    if (state.sort === "fit") {
      usable.sort(function (a, b) {
        if (a.ok !== b.ok) return a.ok ? -1 : 1;
        return a.ok ? (a.r.c - b.r.c || b.r.q - a.r.q) : (b.r.q - a.r.q || a.r.c - b.r.c);
      });
    } else usable.sort(function (a, b) { return b.r.q - a.r.q || a.r.c - b.r.c; });
    out.sort(function (a, b) { return b.r.q - a.r.q; });
    var tick = (CUTS[Math.max(0, need - 2)] || 0) * 100;
    function row(x, i, isOut) {
      var r = x.r, m = r.m, top = i === 0 && !isOut;
      var chips = "";
      if (!isOut && !x.ok) chips += '<span class="chip">Sous le niveau requis</span>';
      if (isOut) chips += '<span class="chip">Hors de vos abonnements</span>';
      var evals = Object.keys(t.w).sort(function (a, b) { return t.w[b] - t.w[a]; }).map(function (k) {
        return "<li>" + esc(EV[k].name) + " <b>" + evalValue(k, r.lv) + "</b></li>";
      }).join("");
      return '<li><details class="row ' + (x.ok ? "ok" : "") + (top ? " top" : "") + (isOut ? " out" : "") + (state.hl === m.id ? " hl" : "") + '" data-model="' + m.id + '"' + (state.open[m.id] ? " open" : "") + ">" +
        '<summary><span class="rank-n num">' + (isOut ? "" : i + 1) + "</span>" + markHTML(m.provider) +
        '<span class="row-name"><span class="row-title">' + esc(m.name) + " " + chips + '</span><span class="row-sub">' + esc(cap(EFF[r.lv.e])) + ", " + esc(isOut ? plansWith(m) : whereShort(r)) + "</span></span>" +
        '<span class="meter-wrap" title="Note ' + Math.round(r.q * 100) + ' sur 100"><span class="meter"><span class="meter-fill" style="width:' + (r.q * 100).toFixed(1) + '%"></span>' + (need > 1 ? '<span class="meter-tick" style="left:' + tick.toFixed(1) + '%"></span>' : "") + '</span><span class="meter-val num">' + Math.round(r.q * 100) + "</span></span>" +
        '<span class="row-level">' + esc(cap(job(t, r.n))) + "</span>" +
        '<span class="row-cost"><span class="num">' + money(r.c) + "</span><small>la tâche</small></span></summary>" +
        '<dl class="row-detail"><ul class="evals" aria-label="Scores qui comptent pour cette tâche">' + evals + "</ul>" +
        "<div><dt>Coût et durée</dt><dd>" + money(r.c) + " et " + fmtDur(r.d) + " par " + esc(t.unit) + (perUnit(r.c) ? ", " + perUnit(r.c) : "") + "</dd></div>" +
        "<div><dt>Prix de l'API</dt><dd>" + esc(String(m.price["in"]).replace(".", ",")) + NB + "$ en entrée, " + esc(String(m.price.out).replace(".", ",")) + NB + "$ en sortie, par million de tokens</dd></div>" +
        "<div><dt>Dans les abonnements</dt><dd>" + esc(plansWith(m)) + "</dd></div>" +
        "<div><dt>Mémoire de travail</dt><dd>" + esc(m.ctx) + "</dd></div>" +
        (r.lv.hall != null ? "<div><dt>Quand il ne sait pas</dt><dd>il invente dans " + pct(r.lv.hall) + " des cas</dd></div>" : "") +
        (r.est ? "<div><dt>Précision</dt><dd>Note en partie estimée</dd></div>" : "") +
        "</dl></details></li>";
    }
    var html = usable.map(function (x, i) { return row(x, i, false); }).join("");
    if (out.length) html += '<li class="rank-sep">Hors de vos abonnements</li>' + out.map(function (x, i) { return row(x, i, true); }).join("");
    var list = $("#ranking");
    list.innerHTML = html;
    $$(".row", list).forEach(function (row) {
      row.addEventListener("toggle", function () { state.open[row.getAttribute("data-model")] = row.open; });
      row.addEventListener("mouseenter", function () { var g = C.pts[row.getAttribute("data-model")]; if (g) g.classList.add("hl"); });
      row.addEventListener("mouseleave", function () { var id = row.getAttribute("data-model"), g = C.pts[id]; if (g && state.hl !== id) g.classList.remove("hl"); });
    });
    $("#ranking-sub").textContent = state.sort === "fit"
      ? "Chaque modèle à son réglage le moins cher qui atteint le niveau requis. Ouvrez une ligne pour voir les scores qui comptent ici."
      : "Chaque modèle à son meilleur réglage disponible. Ouvrez une ligne pour voir les scores qui comptent ici.";
  }

  /* ---------- Formules par gamme ---------- */
  function renderTiers(R) {
    var t = R.t, need = R.need, host = $("#tiers");
    if (isApiTask(t)) {
      host.innerHTML = '<p class="tier-cell empty">' + esc(fr("Tâche automatisée : elle passe par l'API, les abonnements ne s'appliquent pas.")) + "</p>";
      return;
    }
    var html = '<div class="tier-row head" role="row"><div role="columnheader">Gamme</div><div role="columnheader">' + markHTML("openai") + 'ChatGPT</div><div role="columnheader">' + markHTML("anthropic") + "Claude</div></div>";
    TIERS.forEach(function (tier) {
      html += '<div class="tier-row" role="row"><div class="tier-label" role="rowheader">' + esc(tier.label) + "</div>";
      ["openai", "anthropic"].forEach(function (p) {
        var id = tier[p];
        if (!id) { html += '<div class="tier-cell empty" role="cell">Pas d\'offre à ce prix</div>'; return; }
        var plan = planOf(p, id);
        var own = R.rows.filter(function (r) { return r.m.provider === p; }).map(function (r) {
          return { r: r, a: accessIn(p, plan, t, r) };
        }).filter(function (x) { return x.a; });
        var fits = own.filter(function (x) { return x.a.fits; });
        var best = fits.slice().sort(function (a, b) { return b.r.q - a.r.q || a.r.c - b.r.c; })[0];
        var cheapOk = fits.filter(function (x) { return x.r.n >= need; }).sort(function (a, b) { return a.r.c - b.r.c; })[0];
        var body;
        if (!best) body = '<p class="tier-best muted">Rien pour cette tâche dans cette offre.</p>';
        else {
          var rb = best.r;
          var how = rb.m.provider === "openai" && best.a.surface === "chat" ? "mode " + best.a.label : rb.m.short + ", " + EFF[rb.lv.e];
          var place = best.a.surface === "chat" ? (p === "openai" ? "ChatGPT" : "l'appli") : best.a.surface === "work" ? "Work" : (p === "openai" ? "Codex" : "Claude Code");
          body = '<p class="tier-best">Jusqu\'au niveau <strong>' + LEVELS[rb.n - 1] + "</strong>, " + esc(job(t, rb.n)) + '<br><span class="muted">' + esc(cap(how)) + " dans " + esc(place) + "</span></p>";
          if (best.a.surface !== "chat" && t.where.indexOf("chat") >= 0) {
            var chatList = surfaceList(plan, p, "chat");
            var bc = fits.filter(function (x) {
              if (!((x.r.m.id + "|" + x.r.lv.e) in chatList)) return false;
              var lim = ctxLimit(p, plan, "chat", x.r);
              return !t.ctx || lim == null || t.ctx <= lim;
            }).sort(function (a, b) { return b.r.q - a.r.q; })[0];
            if (bc) {
              var lab = p === "openai" ? "mode " + chatList[bc.r.m.id + "|" + bc.r.lv.e] : bc.r.m.short + ", " + EFF[bc.r.lv.e];
              body += '<p class="tier-best muted">Dans la conversation&nbsp;: ' + esc(LEVELS[bc.r.n - 1]) + ", " + esc(lab) + "</p>";
            } else body += '<p class="tier-best muted">' + esc("Rien d'équivalent dans la conversation.") + "</p>";
          }
          if (!cheapOk) body += '<p class="tier-best muted">' + esc("N'atteint pas le niveau " + LEVELS[need - 1] + " requis.") + "</p>";
        }
        var tooBig = own.some(function (x) { return !x.a.fits; });
        var vol = plan.volume.slice(0, 3).map(function (v) { return "<li>" + esc(fr(v)) + "</li>"; }).join("");
        if (tooBig && t.ctx) vol = "<li>" + esc(fr("Certains modes ne lisent pas un document de " + nf0.format(Math.round(t.ctx / 500)) + " pages")) + "</li>" + vol;
        html += '<div class="tier-cell" role="cell"><p class="tier-plan"><b>' + esc(plan.name) + '</b><span class="tier-price">' + esc(priceText(p, plan)) + "</span></p>" + body + '<ul class="tier-vol">' + vol + "</ul></div>";
      });
      html += "</div>";
    });
    host.innerHTML = html;
  }

  function renderSources() {
    $("#sources").innerHTML = SOURCES.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a></li>"; }).join("");
    var nf4 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });
    $("#fx-note").textContent = "Taux de la BCE du " + FX.date + NB + ": 1" + NB + "$ = " + nf4.format(FX.usdToEur) + NB + "€. Prix de l'API hors taxes. ChatGPT publie ses prix en euros TTC pour la France ; Claude publie en dollars hors taxes, que nous convertissons avec 20" + NB + "% de TVA.";
  }

  /* ---------- Mise à jour ---------- */
  function update() {
    var R = compute();
    renderHead(R);
    renderPicks(R);
    drawChart(R, false);
    renderRanking(R);
    renderTiers(R);
    $$(".currency button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cur") === state.cur ? "true" : "false"); });
    writeURL();
  }

  /* ---------- Thème ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function syncThemeButton() { $("#theme-toggle").setAttribute("aria-label", currentTheme() === "dark" ? "Passer en thème clair" : "Passer en thème sombre"); }

  /* ---------- Événements ---------- */
  function bind() {
    $("#cats").addEventListener("click", function (e) {
      var b = e.target.closest(".cat"); if (!b) return;
      state.cat = b.getAttribute("data-cat");
      renderCats(); renderTasks();
    });
    $("#cats").addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var i = CATS.map(function (c) { return c.id; }).indexOf(state.cat);
      i = (i + (e.key === "ArrowRight" ? 1 : -1) + CATS.length) % CATS.length;
      state.cat = CATS[i].id; renderCats(); renderTasks();
      var b = $('.cat[data-cat="' + state.cat + '"]'); if (b) b.focus();
    });
    $("#tasks").addEventListener("click", function (e) {
      var b = e.target.closest(".task"); if (!b) return;
      selectTask(b.getAttribute("data-task"), window.innerWidth < 760);
    });

    $("#sel-openai").addEventListener("change", function (e) { state.oa = e.target.value; state.open = {}; update(); });
    $("#sel-anthropic").addEventListener("change", function (e) { state.an = e.target.value; state.open = {}; update(); });
    $("#exigence").addEventListener("change", function (e) { state.exig = parseInt(e.target.value, 10); update(); });
    $("#chat-only").addEventListener("change", function (e) { state.chatOnly = e.target.checked; state.open = {}; update(); });
    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; update(); });
    $("#settings").addEventListener("submit", function (e) { e.preventDefault(); });
    $$(".currency button").forEach(function (b) { b.addEventListener("click", function () { state.cur = b.getAttribute("data-cur"); update(); }); });
    $("#show-all").addEventListener("change", function (e) { state.showAll = e.target.checked; drawChart(compute(), false); });
    $("#theme-toggle").addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("lbm-theme", next); } catch (err) {}
      syncThemeButton();
    });
  }

  /* ---------- Recherche par Claude Haiku ----------
     Applique une intention renvoyée par le proxy (assets/ai-search.js).
     Chaque valeur est revalidée contre les données de la page ; la phrase
     de réponse est composée ici, à partir des seuls libellés du site. */
  var EXIG_IA = { premier_jet: -1, fiable: 0, sans_faute: 1 };
  var EXIG_TXT = { "-1": "un premier jet suffit", "1": "sans faute" };
  function planOk(p, id) { return id === "none" || (planIdx[p][id] && !planIdx[p][id].hidden); }
  window.LBM_PAGE = {
    id: "modele",
    resultAnchor: "#resultat",
    apply: function (it) {
      if (!it || !taskById[it.tache]) return null;
      state.task = it.tache;
      state.cat = taskById[it.tache].cat;
      if (planOk("openai", it.chatgpt)) state.oa = it.chatgpt;
      if (planOk("anthropic", it.claude)) state.an = it.claude;
      if (EXIG_IA.hasOwnProperty(it.exigence)) state.exig = EXIG_IA[it.exigence];
      if (it.conversation_uniquement === "oui") state.chatOnly = true;
      if (it.conversation_uniquement === "non") state.chatOnly = false;
      state.open = {};
      state.hl = null;
      renderCats();
      renderTasks();
      renderSelects();
      update();

      var R = compute(), t = R.t, bits = [];
      ["openai", "anthropic"].forEach(function (p) {
        var sel = selection(p);
        if (sel !== "all" && sel !== "none") bits.push(planIdx[p][sel].name);
      });
      var head = "Tâche retenue : " + t.label.charAt(0).toLowerCase() + t.label.slice(1);
      if (bits.length) head += ", avec " + bits.join(" et ");
      if (EXIG_TXT[String(state.exig)]) head += ", " + EXIG_TXT[String(state.exig)];
      head += ". Il faut au moins le niveau " + LEVELS[R.need - 1] + ".";
      var picks = [];
      ["openai", "anthropic"].forEach(function (p) {
        var pk = R.picks[p];
        if (pk) picks.push(pk.r.m.name + " (" + settingText(pk.r) + ") chez " + PROV[p]);
      });
      var tail = picks.length ? " Le plus adapté : " + picks.join(", et ") + "." : " Aucun modèle de vos abonnements ne convient : voyez le classement ci-dessous.";
      return { phrase: fr(head + tail) };
    }
  };

  /* ---------- Démarrage ---------- */
  readURL();
  renderCats();
  renderTasks();
  renderSelects();
  renderSources();
  initChart();
  bind();
  syncThemeButton();
  update();
})();
