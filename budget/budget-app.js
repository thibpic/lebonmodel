/* lebonmodel, estimation de budget. Aucune dépendance. */
(function () {
  "use strict";

  var D = window.LBM_BUDGET;
  if (!D) return;

  var FX = D.fx.usdToEur;
  var VAT = D.fx.vat;
  var NB = " ";   // espace insécable
  var NNB = " ";  // espace fine insécable (avant ? ! ;)

  /* ---------- Raccourcis ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var byId = {};
  D.models.forEach(function (m) { byId[m.id] = m; });
  var usageById = {};
  D.usages.forEach(function (u) { usageById[u.id] = u; });
  var profileById = {};
  D.profiles.forEach(function (p) { profileById[p.id] = p; });

  /* ---------- État ---------- */
  var state = {
    profile: "travail",
    usage: "resumer",
    volume: 20,
    exig: 0,
    access: "app",
    cur: "EUR",
    showAll: false,
    expanded: false,
    open: {},
    hl: null
  };

  function readURL() {
    try {
      var p = new URLSearchParams(window.location.search);
      if (profileById[p.get("profil")]) state.profile = p.get("profil");
      if (usageById[p.get("usage")]) state.usage = p.get("usage");
      else state.usage = profileById[state.profile].start;
      var v = parseInt(p.get("rythme"), 10);
      state.volume = (v >= 1 && v <= 100000) ? v : usageById[state.usage].volume;
      var e = parseInt(p.get("exigence"), 10);
      if (e === -1 || e === 0 || e === 1) state.exig = e;
      if (p.get("acces") === "api" || p.get("acces") === "app") state.access = p.get("acces");
      else state.access = profileById[state.profile].access;
      if (p.get("devise") === "USD") state.cur = "USD";
    } catch (err) {
      state.usage = profileById[state.profile].start;
      state.volume = usageById[state.usage].volume;
    }
    if (profileById[state.profile].usages.indexOf(state.usage) === -1) state.expanded = true;
  }

  function writeURL() {
    try {
      var p = new URLSearchParams();
      p.set("profil", state.profile);
      p.set("usage", state.usage);
      p.set("rythme", String(state.volume));
      p.set("exigence", String(state.exig));
      p.set("acces", state.access);
      if (state.cur === "USD") p.set("devise", "USD");
      window.history.replaceState(null, "", window.location.pathname + "?" + p.toString() + window.location.hash);
    } catch (err) { /* aperçu sans URL modifiable */ }
  }

  /* ---------- Formats ---------- */
  var nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nfs2 = new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 2 });
  var nfs1 = new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 1 });

  function sym() { return state.cur === "EUR" ? NB + "€" : NB + "$"; }
  function toCur(usd) { return state.cur === "EUR" ? usd * FX : usd; }
  function fmtValue(v, kind) {
    if (kind === "axis") return (v >= 1 ? nf0.format(v) : nfs1.format(v)) + sym();
    if (v === 0) return "0" + sym();
    if (kind === "task") {
      if (v < 0.0001) return "<" + NB + "0,0001" + sym();
      if (v < 1) return nfs2.format(v) + sym();
      return nf2.format(v) + sym();
    }
    if (v < 0.01) return "<" + NB + "0,01" + sym();
    if (v < 10) return nf2.format(v) + sym();
    if (v < 100) return nf1.format(v) + sym();
    return nf0.format(v) + sym();
  }
  function money(usd, kind) { return fmtValue(toCur(usd), kind || "month"); }
  function idxText(v) { return nf0.format(Math.round(v)); }
  function effortLabel(e) { return D.effortLabels[e] || e; }
  function effortPhrase(lv) {
    if (lv.e === "none") return "sans réflexion";
    if (lv.e === "reasoning") return "avec la réflexion étendue";
    return "avec un effort " + effortLabel(lv.e);
  }
  function effortShort(lv) {
    if (lv.e === "none") return "sans réflexion";
    if (lv.e === "reasoning") return "réflexion étendue";
    return "effort " + effortLabel(lv.e);
  }
  function provName(p) { return D.providers[p].name; }
  function singular(unit, n) { return n < 2 ? unit.replace(/s$/, "") : unit; }
  function frDate(iso) {
    try { return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return iso; }
  }
  function markHTML(provider) { return '<span class="mark ' + provider + '" aria-hidden="true"></span>'; }

  /* ---------- Calculs ---------- */
  function required(u) {
    var raw = u.level + state.exig;
    var n = clamp(raw, 1, 5);
    var min = raw > 5 ? D.maxMargin : D.levels[n - 1].min;
    return { n: n, min: min, level: D.levels[n - 1], extra: raw > 5 };
  }

  function costTask(m, lv, u) {
    if (u.mode === "agent") return lv.task == null ? null : lv.task * u.aa;
    var p = m.price;
    var tf = m.tok;
    var think = (lv.out || 0) * u.think;
    var inCost = u["in"] * tf * p["in"] + (u.ctx || 0) * tf * p.cache;
    var outCost = (u.out * tf + think) * p.out;
    return (inCost + outCost) / 1e6;
  }

  function compute() {
    var u = usageById[state.usage];
    var req = required(u);
    var vol = state.volume;
    var configs = [];
    D.models.forEach(function (m) {
      m.levels.forEach(function (lv) {
        var t = costTask(m, lv, u);
        if (t == null) return;
        configs.push({ m: m, lv: lv, idx: lv.idx, task: t, month: t * vol });
      });
    });
    var perModel = [];
    D.models.forEach(function (m) {
      var own = configs.filter(function (c) { return c.m === m; });
      if (!own.length) return;
      var ok = own.filter(function (c) { return c.idx >= req.min; }).sort(function (a, b) { return a.month - b.month || b.idx - a.idx; });
      if (ok.length) { perModel.push(Object.assign({}, ok[0], { ok: true, all: own })); return; }
      var best = own.slice().sort(function (a, b) { return b.idx - a.idx; })[0];
      perModel.push(Object.assign({}, best, { ok: false, all: own }));
    });
    var sufficient = perModel.filter(function (p) { return p.ok; }).sort(function (a, b) { return a.month - b.month || b.idx - a.idx; });
    var insufficient = perModel.filter(function (p) { return !p.ok; }).sort(function (a, b) { return b.idx - a.idx; });
    var rec = sufficient[0] || insufficient[0];
    var other = null;
    for (var i = 0; i < sufficient.length; i++) { if (sufficient[i].m.provider !== rec.m.provider) { other = sufficient[i]; break; } }
    var nextMin = req.n < 5 ? D.levels[req.n].min : (req.min < D.maxMargin ? D.maxMargin : null);
    var margin = null;
    if (nextMin != null) {
      margin = configs.filter(function (c) { return c.idx >= nextMin; }).sort(function (a, b) { return a.month - b.month; })[0] || null;
    } else {
      margin = configs.slice().sort(function (a, b) { return b.idx - a.idx; })[0] || null;
    }
    if (margin && margin.m === rec.m && margin.lv === rec.lv) margin = null;
    var picks = {
      openai: sufficient.filter(function (x) { return x.m.provider === "openai"; })[0] || null,
      anthropic: sufficient.filter(function (x) { return x.m.provider === "anthropic"; })[0] || null
    };
    return { u: u, req: req, configs: configs, perModel: perModel, sufficient: sufficient, insufficient: insufficient, rec: rec, other: other, margin: margin, nextMin: nextMin, picks: picks };
  }

  /* ---------- Abonnements ---------- */
  function planConfigs(provider, plan, u) {
    var out = [];
    function addSpec(spec, where) {
      if (!spec || !spec.length) return;
      if (typeof spec === "string") {
        spec.split(" ").forEach(function (id) {
          var m = byId[id];
          m.levels.forEach(function (lv) { out.push({ m: m, lv: lv, where: where, label: null }); });
        });
      } else {
        spec.forEach(function (s) {
          var m = byId[s[0]];
          var lv = m.levels.filter(function (l) { return l.e === s[1]; })[0];
          if (lv) out.push({ m: m, lv: lv, where: where, label: s[2] });
        });
      }
    }
    if (u.app === "code") addSpec(plan.code, "code");
    else {
      addSpec(plan.chat, "chat");
      if (provider === "openai") addSpec(plan.code, "work");
    }
    return out;
  }

  function bestInPlan(provider, plan, u, req) {
    var cands = planConfigs(provider, plan, u).map(function (c) {
      return Object.assign({}, c, { task: costTask(c.m, c.lv, u) });
    }).filter(function (c) { return c.task != null; });
    if (!cands.length) return null;
    var headroom = Math.max.apply(null, cands.map(function (c) { return c.lv.idx; }));
    var ok = cands.filter(function (c) { return c.lv.idx >= req.min; });
    if (!ok.length) return null;
    var def = u.app === "code" ? plan.codeDef : plan.def;
    if (def) {
      var d = ok.filter(function (c) { return c.m.id === def[0] && c.lv.e === def[1] && (u.app === "code" ? c.where === "code" : c.where === "chat"); })[0];
      if (d) return Object.assign({}, d, { headroom: headroom, isDefault: true });
    }
    ok.sort(function (a, b) {
      var wa = a.where === "chat" ? 0 : 1, wb = b.where === "chat" ? 0 : 1;
      return (wa - wb) || (a.task - b.task);
    });
    return Object.assign({}, ok[0], { headroom: headroom });
  }

  function planPriceEur(provider, plan) {
    if (provider === "openai") return plan.eur;
    return plan.usd * FX * (1 + VAT);
  }

  function planPriceText(provider, plan) {
    if (plan.usd === 0) return "0" + sym();
    if (state.cur === "USD") return nf0.format(plan.usd) + NB + "$";
    var v = planPriceEur(provider, plan);
    if (provider === "openai") return nf0.format(v) + NB + "€";
    return "≈" + NB + nf0.format(Math.round(v)) + NB + "€";
  }

  function recommendPlan(provider, u, req) {
    var first = null, last = null;
    var plans = D.plans[provider];
    for (var i = 0; i < plans.length; i++) {
      var plan = plans[i];
      var b = bestInPlan(provider, plan, u, req);
      if (!b) continue;
      var eqEur = b.task * state.volume * FX;
      var res = { provider: provider, plan: plan, best: b, eqEur: eqEur, eqUsd: b.task * state.volume, heavy: false };
      if (!first) first = res;
      last = res;
      if (eqEur <= plan.cap) return res;
    }
    if (last) { last.heavy = true; return last; }
    return null;
  }

  function whereText(c, u) {
    if (c.isDefault) {
      if (c.m.provider === "openai") {
        if (c.where === "chat") return "Dans ChatGPT, le mode " + c.label + " proposé par défaut suffit.";
        return "Dans Codex, gardez le modèle par défaut, " + c.m.name + " " + effortPhrase(c.lv) + ".";
      }
      if (c.where === "chat") return "Dans l'appli Claude, gardez le réglage par défaut, " + c.m.short + " " + effortPhrase(c.lv) + ".";
      return "Dans " + (u.id === "agent" ? "l'appli Claude ou Claude Code" : "Claude Code") + ", gardez le réglage par défaut, " + c.m.short + " " + effortPhrase(c.lv) + ".";
    }
    if (c.m.provider === "openai") {
      if (c.where === "chat") return "Dans ChatGPT, choisissez le mode " + c.label + ".";
      var place = u.app === "code" ? (u.id === "agent" ? "Work ou Codex" : "Codex") : "Work";
      return "Dans " + place + ", choisissez " + c.m.name + " " + effortPhrase(c.lv) + ".";
    }
    if (c.where === "chat") {
      if (c.label && c.lv.e === "medium") return "Dans l'appli Claude, choisissez " + c.label + " (réglage par défaut).";
      if (c.label) return "Dans l'appli Claude, choisissez " + c.label + ".";
      return "Dans l'appli Claude, choisissez " + c.m.short + " " + effortPhrase(c.lv) + ".";
    }
    var p2 = u.id === "agent" ? "l'appli Claude ou Claude Code" : "Claude Code";
    return "Dans " + p2 + ", choisissez " + c.m.short + " " + effortPhrase(c.lv) + ".";
  }

  /* ---------- Contrôles ---------- */
  function renderProfiles() {
    var host = $("#profiles");
    host.innerHTML = D.profiles.map(function (p) {
      return '<label class="opt"><input class="sr-only" type="radio" name="profile" id="profil-' + p.id + '" value="' + p.id + '"' + (p.id === state.profile ? " checked" : "") + '>' +
        '<span class="opt-body"><span class="opt-title">' + esc(p.label) + '</span><span class="opt-hint">' + esc(p.hint) + "</span></span></label>";
    }).join("");
  }

  function renderUsages() {
    var host = $("#usages");
    var list = state.expanded ? D.usages.map(function (u) { return u.id; }) : profileById[state.profile].usages;
    host.innerHTML = list.map(function (id) {
      var u = usageById[id];
      var pips = "";
      for (var i = 1; i <= 5; i++) pips += '<i class="' + (i <= u.level ? "on" : "") + '"></i>';
      return '<label class="tile"><input class="sr-only" type="radio" name="usage" id="usage-' + u.id + '" value="' + u.id + '"' + (u.id === state.usage ? " checked" : "") + '>' +
        '<span class="tile-body"><span class="tile-title">' + esc(u.label) + '</span><span class="tile-hint">' + esc(u.hint) + "</span>" +
        '<span class="pips" aria-hidden="true">' + pips + '</span><span class="sr-only">Profil requis : ' + esc(D.levels[u.level - 1].name) + "</span></span></label>";
    }).join("");
    var btn = $("#all-usages");
    btn.textContent = state.expanded ? "Revenir aux usages de mon profil" : "Voir les " + D.usages.length + " usages";
    btn.setAttribute("aria-expanded", state.expanded ? "true" : "false");
  }

  function posToVol(pos) {
    var v = Math.pow(10, pos / 200);
    if (v < 20) return Math.max(1, Math.round(v));
    if (v < 100) return Math.round(v / 5) * 5;
    if (v < 1000) return Math.round(v / 10) * 10;
    if (v < 10000) return Math.round(v / 100) * 100;
    return Math.round(v / 1000) * 1000;
  }
  function volToPos(v) { return Math.round(Math.log10(Math.max(1, v)) * 200); }

  function renderVolume(syncSlider) {
    var u = usageById[state.usage];
    var slider = $("#volume");
    if (syncSlider) slider.value = String(volToPos(state.volume));
    slider.style.setProperty("--fill", (slider.value / 10) + "%");
    var v = state.volume;
    $("#volume-value").textContent = nf0.format(v) + " " + singular(u.unit, v) + " par mois";
    var perDay = v / 21.7, perWeek = v / 4.35, human;
    if (perDay >= 1.5) human = "soit environ " + nf0.format(Math.round(perDay)) + " par jour ouvré";
    else if (perDay >= 0.75) human = "soit environ 1 par jour ouvré";
    else if (perWeek >= 1.5) human = "soit environ " + nf0.format(Math.round(perWeek)) + " par semaine";
    else if (perWeek >= 0.75) human = "soit environ 1 par semaine";
    else if (v > 1) human = "quelques fois dans le mois";
    else human = "une fois dans le mois";
    $("#volume-human").textContent = human;
    slider.setAttribute("aria-valuetext", $("#volume-value").textContent);
  }

  var EXIG_NOTES = {
    "-1": "Un brouillon que vous relirez de près : on accepte un profil en dessous.",
    "0": "Le niveau attendu d'un professionnel qui connaît le sujet.",
    "1": "Aucune erreur tolérée : on prend un profil au-dessus."
  };

  function renderNotes(u) {
    $("#exig-note").textContent = EXIG_NOTES[String(state.exig)];
    var appInput = $("#access-app");
    var note = $("#access-note");
    if (u.apiOnly) {
      appInput.disabled = true;
      $("#access-api").checked = true;
      note.textContent = "Cet usage automatisé passe par l'API, il ne relève pas d'un abonnement.";
    } else {
      appInput.disabled = false;
      $("#access-" + state.access).checked = true;
      note.textContent = state.access === "app"
        ? "Offres ChatGPT et Claude, avec les réglages réellement disponibles dans chaque appli."
        : "Vous payez chaque token lu et écrit. Prix hors TVA, convertis au taux de la BCE.";
    }
  }

  function effectiveAccess(u) { return u.apiOnly ? "api" : state.access; }

  function levelChips(idx, req, ok) {
    var name = req.extra ? "Pointe, avec une marge maximale" : req.level.name;
    var a = ok ? '<span class="chip gold">Profil ' + esc(name) + " atteint</span>" : '<span class="chip warn">Profil ' + esc(name) + " non atteint</span>";
    return a + '<span class="chip num">Indice ' + idxText(idx) + " pour " + req.min + " requis</span>";
  }

  /* ---------- Carte ---------- */
  var C = { host: null, svg: null, tip: null, g: {}, pts: {}, lbls: {}, W: 0, H: 0, last: null, ready: false };
  var XMIN = 10, XMAX = 60;

  function initChart() {
    C.host = $("#chart");
    C.svg = svgEl("svg", { role: "img", "aria-labelledby": "chart-title chart-desc" }, C.host);
    svgEl("title", { id: "chart-title" }, C.svg).textContent = "Carte intelligence et coût";
    C.desc = svgEl("desc", { id: "chart-desc" }, C.svg);
    ["bands", "grid", "dim", "curves", "threshold", "points", "labels", "axes"].forEach(function (k) {
      C.g[k] = svgEl("g", { "class": k }, C.svg);
    });
    C.dimRect = svgEl("rect", { "class": "dimzone" }, C.g.dim);
    C.thLine = svgEl("line", { "class": "threshold-line" }, C.g.threshold);
    C.thLabel = svgEl("text", { "class": "threshold-label" }, C.g.threshold);
    C.tip = document.createElement("div");
    C.tip.className = "tip";
    C.tip.hidden = true;
    C.host.appendChild(C.tip);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { if (C.last) drawChart(C.last, true); });
      ro.observe(C.host);
    } else {
      window.addEventListener("resize", function () { if (C.last) drawChart(C.last, true); });
    }
    document.addEventListener("pointerdown", function (e) { if (!e.target.closest || !e.target.closest(".pt")) hideTip(); });
  }

  function margins(W) { return W < 520 ? { l: 50, r: 12, t: 30, b: 42 } : { l: 62, r: 18, t: 32, b: 44 }; }

  function drawChart(r, resizeOnly) {
    C.last = r;
    var W = C.host.clientWidth, H = C.host.clientHeight;
    if (!W || !H) return;
    C.W = W; C.H = H;
    var M = margins(W);
    C.svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    C.svg.setAttribute("width", W);
    C.svg.setAttribute("height", H);
    var pw = W - M.l - M.r, ph = H - M.t - M.b;
    function xs(v) { return M.l + (clamp(v, XMIN, XMAX) - XMIN) / (XMAX - XMIN) * pw; }

    // Domaine du coût (échelle logarithmique)
    var vals = r.perModel.map(function (p) { return toCur(p.month); });
    if (state.showAll) r.configs.forEach(function (c) { vals.push(toCur(c.month)); });
    vals = vals.filter(function (v) { return v > 0; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var lMin = Math.log10(lo) - 0.35, lMax = Math.log10(hi) + 0.35;
    if (lMax - lMin < 2) { var mid = (lMax + lMin) / 2; lMin = mid - 1; lMax = mid + 1; }
    function ys(v) { var lv = Math.log10(Math.max(v, 1e-9)); return M.t + (lMax - lv) / (lMax - lMin) * ph; }

    // Bandes des profils
    var gb = C.g.bands; gb.textContent = "";
    D.levels.forEach(function (lvl, i) {
      var x0 = xs(lvl.min), x1 = xs(i < D.levels.length - 1 ? D.levels[i + 1].min : XMAX);
      if (i % 2 === 0) svgEl("rect", { "class": "band", x: x0, y: M.t, width: Math.max(0, x1 - x0), height: ph }, gb);
      var wBand = x1 - x0;
      var name = lvl.name;
      if (wBand < name.length * 6.6 + 6) name = wBand > 30 ? name.slice(0, 3) + "." : "";
      if (name) {
        var t = svgEl("text", { "class": "band-label" + (lvl.n === r.req.n ? " current" : ""), x: (x0 + x1) / 2, y: M.t - 12, "text-anchor": "middle" }, gb);
        t.textContent = name;
      }
    });

    // Grille
    var gg = C.g.grid; gg.textContent = "";
    var ticks = [];
    for (var k = Math.ceil(lMin); k <= Math.floor(lMax); k++) ticks.push(Math.pow(10, k));
    if (ticks.length < 3) {
      var extra = [];
      for (var k2 = Math.floor(lMin); k2 <= Math.ceil(lMax); k2++) {
        [2, 5].forEach(function (f) { var v = f * Math.pow(10, k2); var lv = Math.log10(v); if (lv > lMin && lv < lMax) extra.push(v); });
      }
      ticks = ticks.concat(extra).sort(function (a, b) { return a - b; });
    }
    ticks.forEach(function (v) {
      var y = ys(v);
      svgEl("line", { "class": "gridline", x1: M.l, x2: W - M.r, y1: Math.round(y) + 0.5, y2: Math.round(y) + 0.5 }, gg);
      var tx = svgEl("text", { x: M.l - 8, y: y + 4, "text-anchor": "end" }, gg);
      tx.textContent = fmtValue(v, "axis");
    });
    var ga = C.g.axes; ga.textContent = "";
    for (var xv = 10; xv <= 60; xv += 10) {
      var xt = svgEl("text", { x: xs(xv), y: H - M.b + 18, "text-anchor": "middle" }, ga);
      xt.textContent = String(xv);
    }
    var at = svgEl("text", { "class": "axis-title", x: M.l + pw / 2, y: H - 6, "text-anchor": "middle" }, ga);
    at.textContent = "Intelligence (indice Artificial Analysis)";
    var yt = svgEl("text", { "class": "axis-title", x: 0, y: 0, "text-anchor": "middle", transform: "translate(12 " + (M.t + ph / 2) + ") rotate(-90)" }, ga);
    yt.textContent = effectiveAccess(r.u) === "app" ? "Coût mensuel en API" : "Coût par mois";

    // Zone insuffisante et seuil
    var tx0 = xs(r.req.min);
    C.dimRect.setAttribute("x", M.l);
    C.dimRect.setAttribute("y", M.t);
    C.dimRect.setAttribute("height", ph);
    C.dimRect.setAttribute("width", Math.max(0, tx0 - M.l));
    C.g.threshold.style.transform = "translate(" + tx0 + "px, 0px)";
    C.thLine.setAttribute("x1", 0); C.thLine.setAttribute("x2", 0);
    C.thLine.setAttribute("y1", M.t); C.thLine.setAttribute("y2", M.t + ph);
    var labelRight = tx0 < W - 130;
    C.thLabel.setAttribute("x", labelRight ? 7 : -7);
    C.thLabel.setAttribute("y", M.t + 15);
    C.thLabel.setAttribute("text-anchor", labelRight ? "start" : "end");
    C.thLabel.textContent = "Votre seuil : " + r.req.min;

    // Courbes d'effort
    var gc = C.g.curves; gc.textContent = "";
    if (state.showAll) {
      D.models.forEach(function (m) {
        var own = r.configs.filter(function (c) { return c.m === m; }).sort(function (a, b) { return a.idx - b.idx; });
        if (own.length < 2) return;
        var d = own.map(function (c, i) { return (i ? "L" : "M") + xs(c.idx).toFixed(1) + " " + ys(toCur(c.month)).toFixed(1); }).join(" ");
        svgEl("path", { "class": "curve " + m.provider, d: d }, gc);
        own.forEach(function (c) { svgEl("circle", { "class": "cdot " + m.provider, cx: xs(c.idx), cy: ys(toCur(c.month)), r: 2.6 }, gc); });
      });
    }

    // Points
    var obstacles = [];
    var items = [];
    r.perModel.forEach(function (p) {
      var id = p.m.id;
      var x = xs(p.idx), y = ys(toCur(p.month));
      var g = C.pts[id];
      var fresh = false;
      if (!g) {
        fresh = true;
        g = svgEl("g", { "class": "pt", tabindex: "0", "data-model": id }, C.g.points);
        svgEl("circle", { "class": "hit", r: 15 }, g);
        svgEl("circle", { "class": "halo", r: 13 }, g);
        if (p.m.provider === "openai") svgEl("circle", { "class": "shape", r: 6.5 }, g);
        else svgEl("rect", { "class": "shape", x: -6, y: -6, width: 12, height: 12, rx: 3 }, g);
        g.addEventListener("pointerenter", function () { showTip(id); });
        g.addEventListener("pointerleave", hideTip);
        g.addEventListener("focus", function () { showTip(id); });
        g.addEventListener("blur", hideTip);
        g.addEventListener("click", function () { focusModel(id, true); showTip(id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusModel(id, true); } });
        C.pts[id] = g;
      }
      var isRec = p === r.picks.openai || p === r.picks.anthropic;
      g.setAttribute("class", "pt " + p.m.provider + (p.ok ? "" : " insufficient") + (isRec ? " rec" : "") + (state.hl === id ? " hl" : ""));
      g.setAttribute("aria-label", p.m.name + ", " + effortShort(p.lv) + ", indice " + idxText(p.idx) + ", " + money(p.month) + " par mois" + (p.ok ? "" : ", en dessous de votre niveau"));
      if (fresh || resizeOnly) { g.style.transition = "none"; }
      g.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
      if (fresh || resizeOnly) { g.getBoundingClientRect(); g.style.transition = ""; }
      g._p = p; g._x = x; g._y = y;
      obstacles.push({ x: x - 9, y: y - 9, w: 18, h: 18, id: id });
      items.push({ id: id, x: x, y: y, text: p.m.short, rec: isRec, ok: p.ok, pr: isRec ? 3 : (p.ok ? 2 : 1) });
    });

    // Étiquettes, placées sans chevauchement
    var placed = [];
    var cands = [
      { dx: 11, dy: 4, a: "start" }, { dx: -11, dy: 4, a: "end" }, { dx: 0, dy: -13, a: "middle" }, { dx: 0, dy: 21, a: "middle" },
      { dx: 10, dy: -9, a: "start" }, { dx: 10, dy: 17, a: "start" }, { dx: -10, dy: -9, a: "end" }, { dx: -10, dy: 17, a: "end" }
    ];
    items.sort(function (a, b) { return b.pr - a.pr; });
    items.forEach(function (it) {
      var w = it.text.length * (it.rec ? 7.1 : 6.5) + 4, h = 14;
      var push = it.rec ? 8 : 0;
      var chosen = null;
      for (var i = 0; i < cands.length && !chosen; i++) {
        var c0c = cands[i];
        var c = { dx: c0c.dx + (c0c.dx > 0 ? push : c0c.dx < 0 ? -push : 0), dy: c0c.dy + (c0c.dx === 0 ? (c0c.dy < 0 ? -push : push) : 0), a: c0c.a };
        var bx = c.a === "start" ? it.x + c.dx : c.a === "end" ? it.x + c.dx - w : it.x + c.dx - w / 2;
        var by = it.y + c.dy - 11;
        var box = { x: bx, y: by, w: w, h: h };
        if (box.x < M.l - 4 || box.x + box.w > W - 2 || box.y < M.t + 18 || box.y + box.h > M.t + ph + 2) continue;
        if (placed.some(function (q) { return overlap(box, q); })) continue;
        if (obstacles.some(function (o) { return o.id !== it.id && overlap(box, o); })) continue;
        chosen = { c: c, box: box };
      }
      var t = C.lbls[it.id];
      if (!t) { t = svgEl("text", { "class": "lbl" }, C.g.labels); C.lbls[it.id] = t; t.style.transition = "none"; }
      t.textContent = it.text;
      if (!chosen && it.rec) {
        var c0 = { dx: cands[0].dx + push, dy: cands[0].dy, a: "start" };
        chosen = { c: c0, box: { x: it.x + c0.dx, y: it.y + c0.dy - 11, w: w, h: h } };
      }
      if (chosen) {
        placed.push(chosen.box);
        t.setAttribute("text-anchor", chosen.c.a);
        t.style.transform = "translate(" + (it.x + chosen.c.dx).toFixed(1) + "px, " + (it.y + chosen.c.dy).toFixed(1) + "px)";
        t.setAttribute("class", "lbl" + (it.rec ? " rec" : "") + (it.ok ? "" : " insufficient"));
      } else {
        t.setAttribute("class", "lbl hidden");
      }
      if (resizeOnly) { t.style.transition = "none"; t.getBoundingClientRect(); }
      requestAnimationFrame(function () { t.style.transition = ""; });
    });

    C.desc.textContent = "Recommandé : " + r.rec.m.name + ", " + effortShort(r.rec.lv) + ", indice " + idxText(r.rec.idx) + ", " + money(r.rec.month) + " par mois. Seuil requis : indice " + r.req.min + ".";
  }

  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function showTip(id) {
    var g = C.pts[id];
    if (!g || !g._p) return;
    var p = g._p, r = C.last;
    var verdict = (r && (p === r.picks.openai || p === r.picks.anthropic)) ? "Le plus adapté chez " + provName(p.m.provider) : (p.ok ? "Atteint votre niveau" : "En dessous de votre niveau");
    C.tip.innerHTML = "<strong>" + esc(p.m.name) + "</strong>" +
      '<span class="t-row"><span>Réglage</span><b>' + esc(effortShort(p.lv)) + "</b></span>" +
      '<span class="t-row"><span>Indice</span><b class="num">' + idxText(p.idx) + "</b></span>" +
      '<span class="t-row"><span>Par mois</span><b class="num">' + money(p.month) + "</b></span>" +
      '<span class="t-row"><span>Par tâche</span><b class="num">' + money(p.task, "task") + "</b></span>" +
      '<span class="t-verdict">' + verdict + "</span>";
    C.tip.hidden = false;
    var tw = C.tip.offsetWidth, th = C.tip.offsetHeight;
    var left = g._x + 18, top = g._y - th / 2;
    if (left + tw > C.W) left = g._x - tw - 18;
    if (left < 0) left = Math.max(0, Math.min(C.W - tw, g._x - tw / 2));
    top = clamp(top, 0, Math.max(0, C.H - th));
    C.tip.style.left = left + "px";
    C.tip.style.top = top + "px";
  }
  function hideTip() { if (C.tip) C.tip.hidden = true; }

  function focusModel(id, openRow) {
    state.hl = id;
    Object.keys(C.pts).forEach(function (k) { C.pts[k].classList.toggle("hl", k === id); });
    $$(".row").forEach(function (row) { row.classList.toggle("hl", row.getAttribute("data-model") === id); });
    if (openRow) {
      var row = $('.row[data-model="' + id + '"]');
      if (row) {
        row.open = true;
        state.open[id] = true;
        row.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      }
    }
  }

  /* ---------- Classement ---------- */
  function renderRanking(r) {
    var u = r.u;
    var rows = [];
    function rowHTML(p, isTop) {
      var m = p.m;
      var pct = (clamp(p.idx, XMIN, XMAX) - XMIN) / (XMAX - XMIN) * 100;
      var tick = (clamp(r.req.min, XMIN, XMAX) - XMIN) / (XMAX - XMIN) * 100;
      var status = isTop ? '<span class="chip gold">Le moins cher qui suffit</span>' : (p.ok ? "" : '<span class="chip warn">Niveau non atteint</span>');
      var gen = m.generation === "précédente" ? "génération précédente" : "génération actuelle";
      return '<li><details class="row ' + (p.ok ? "ok" : "out") + (isTop ? " top" : "") + (state.hl === m.id ? " hl" : "") + '" data-model="' + m.id + '"' + (state.open[m.id] ? " open" : "") + ">" +
        '<summary><span class="mark ' + m.provider + '" aria-hidden="true"></span>' +
        '<span class="row-name"><span class="row-title">' + esc(m.name) + " " + status + '</span><span class="row-sub">' + esc(provName(m.provider)) + ", " + esc(effortShort(p.lv)) + "</span></span>" +
        '<span class="meter-wrap" title="Indice ' + idxText(p.idx) + ', seuil ' + r.req.min + '"><span class="meter"><span class="meter-fill" style="width:' + pct.toFixed(1) + '%"></span><span class="meter-tick" style="left:' + tick.toFixed(1) + '%"></span></span><span class="meter-val num">' + idxText(p.idx) + "</span></span>" +
        '<span class="row-cost"><span class="num">' + money(p.month) + "</span><small>par mois</small></span></summary>" +
        '<dl class="row-detail">' +
        "<div><dt>Coût par " + esc(singular(u.unit, 1)) + '</dt><dd class="num">' + money(p.task, "task") + "</dd></div>" +
        "<div><dt>Prix de l'API</dt><dd>" + nf2.format(m.price["in"]).replace(/,00$/, "") + " $ en entrée, " + nf2.format(m.price.out).replace(/,00$/, "") + " $ en sortie, par million de tokens</dd></div>" +
        "<div><dt>Vitesse</dt><dd>Environ " + nf0.format(Math.round(p.lv.tps)) + " tokens par seconde</dd></div>" +
        "<div><dt>Mémoire de travail</dt><dd>" + esc(m.ctx) + "</dd></div>" +
        "<div><dt>Où le trouver</dt><dd>" + esc(m.apps) + "</dd></div>" +
        "<div><dt>Sortie</dt><dd>" + esc(frDate(m.released)) + ", " + gen + "</dd></div>" +
        "</dl></details></li>";
    }
    r.sufficient.forEach(function (p, i) { rows.push(rowHTML(p, i === 0)); });
    if (r.insufficient.length) {
      rows.push('<li class="rank-sep">En dessous de votre niveau, même au réglage maximal</li>');
      r.insufficient.forEach(function (p) { rows.push(rowHTML(p, false)); });
    }
    var list = $("#ranking");
    list.innerHTML = rows.join("");
    $$(".row", list).forEach(function (row) {
      row.addEventListener("toggle", function () { state.open[row.getAttribute("data-model")] = row.open; });
      row.addEventListener("mouseenter", function () { var g = C.pts[row.getAttribute("data-model")]; if (g) g.classList.add("hl"); });
      row.addEventListener("mouseleave", function () { var id = row.getAttribute("data-model"); var g = C.pts[id]; if (g && state.hl !== id) g.classList.remove("hl"); });
    });
    var intro = effectiveAccess(u) === "app"
      ? "Ce que coûterait chaque modèle en API, du moins cher au plus cher parmi ceux qui atteignent votre niveau."
      : "Du moins cher au plus cher parmi ceux qui atteignent votre niveau. Ouvrez une ligne pour le détail.";
    $(".ranking-head p").textContent = intro;
    $("#ranking-title").textContent = "Les " + r.perModel.length + " modèles pour cet usage";
  }

  /* ---------- Échelle des profils ---------- */
  function renderLadder() {
    var html = D.levels.map(function (lvl) {
      var who = [];
      D.models.forEach(function (m) {
        var c = m.levels.filter(function (lv) { return lv.idx >= lvl.min; }).sort(function (a, b) { return a.idx - b.idx; })[0];
        if (c) who.push("<li>" + markHTML(m.provider) + esc(m.short) + " <em>" + esc(c.e === "none" ? "sans réflexion" : c.e === "reasoning" ? "réflexion" : effortLabel(c.e)) + "</em></li>");
      });
      var next = D.levels[lvl.n];
      var range = next ? "Indice de " + lvl.min + " à " + (next.min - 1) : "Indice de " + lvl.min + " et plus";
      return '<li class="step"><span class="step-n">' + lvl.n + '</span><h3 class="step-name">' + esc(lvl.name) + '</h3><p class="step-min">' + range + "</p>" +
        '<p class="step-jobs">' + esc(lvl.jobs) + '</p><p class="step-does">' + esc(lvl.does) + '</p><p class="step-watch">' + esc(lvl.watch) + "</p>" +
        '<div class="step-who"><p>Qui y arrive, et à partir de quel effort</p><ul class="who">' + (who.join("") || "<li>Aucun modèle</li>") + "</ul></div></li>";
    }).join("");
    $("#steps").innerHTML = html;
  }

  function renderSources() {
    $("#sources").innerHTML = D.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a></li>";
    }).join("");
    var nf4 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });
    $("#fx-note").textContent = "Taux de change de la BCE du " + D.fx.date + NB + ": 1" + NB + "$ = " + nf4.format(FX) + NB + "€. " +
      "Prix de l'API hors TVA. Abonnements en TTC pour la France" + NB + ": grille officielle en euros pour ChatGPT, prix en dollars convertis avec 20" + NB + "% de TVA pour Claude.";
    $("#updated").textContent = D.updatedLabel;
  }

  /* ---------- Mise à jour générale ---------- */
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; update(); });
  }

  function renderDuo(r) {
    var u = r.u, access = effectiveAccess(u), html = "";
    ["openai", "anthropic"].forEach(function (p) {
      html += '<article class="duo-card"><p class="duo-top">' + markHTML(p) + "Chez " + provName(p) + "</p>";
      if (access === "app") {
        var res = recommendPlan(p, u, r.req);
        if (!res) {
          html += '<p class="duo-empty">Aucune offre ' + esc(provName(p)) + " n'atteint ce niveau. Comparez avec l'API.</p></article>";
          return;
        }
        var b = res.best;
        html += '<p class="duo-name">' + esc(res.plan.name) + "</p>" +
          '<p class="duo-figure num">' + esc(planPriceText(p, res.plan)) + "<span>" + (res.plan.usd === 0 ? "dans la limite des plafonds d'usage" : state.cur === "EUR" ? "par mois, TTC" : "par mois, hors taxes") + "</span></p>" +
          '<p class="duo-level">' + levelChips(b.lv.idx, r.req, true) + "</p>" +
          '<p class="duo-why">' + (res.heavy
            ? "Usage très intensif&nbsp;: en API, il coûterait environ <strong>" + money(res.eqUsd) + "</strong> par mois, au-delà de ce que les abonnements absorbent d'habitude."
            : "En API, le même usage coûterait environ <strong>" + money(res.eqUsd) + "</strong> par mois.") + "</p>" +
          '<p class="duo-where">' + esc(whereText(b, u)) + "</p>";
      } else {
        var c = r.picks[p], ok = !!c;
        if (!c) c = r.insufficient.filter(function (x) { return x.m.provider === p; })[0];
        if (!c) { html += '<p class="duo-empty">Aucun modèle disponible.</p></article>'; return; }
        html += '<p class="duo-name">' + esc(c.m.name) + "</p>" +
          '<p class="duo-figure num">' + money(c.month) + "<span>par mois, soit " + money(c.task, "task") + " par " + esc(singular(u.unit, 1)) + "</span></p>" +
          '<p class="duo-level">' + levelChips(c.idx, r.req, ok) + "</p>" +
          '<p class="duo-where">Via l\'API, ' + esc(c.m.name) + " " + esc(effortPhrase(c.lv)) + ".</p>";
      }
      html += "</article>";
    });
    $("#duo").innerHTML = html;
  }

  function update() {
    var r = compute();
    renderVolume(false);
    renderNotes(r.u);
    renderDuo(r);
    drawChart(r, false);
    renderRanking(r);
    $$(".currency button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cur") === state.cur ? "true" : "false"); });
    writeURL();
  }

  /* ---------- Thème ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function syncThemeButton() {
    var t = currentTheme();
    $("#theme-toggle").setAttribute("aria-label", t === "dark" ? "Passer en thème clair" : "Passer en thème sombre");
  }

  /* ---------- Événements ---------- */
  function bind() {
    $("#profiles").addEventListener("change", function (e) {
      if (e.target.name !== "profile") return;
      state.profile = e.target.value;
      var p = profileById[state.profile];
      if (!state.expanded || p.usages.indexOf(state.usage) === -1) {
        state.expanded = false;
        state.usage = p.start;
        state.volume = usageById[state.usage].volume;
      }
      state.access = p.access;
      state.open = {};
      renderUsages();
      renderVolume(true);
      update();
    });
    $("#usages").addEventListener("change", function (e) {
      if (e.target.name !== "usage") return;
      state.usage = e.target.value;
      state.volume = usageById[state.usage].volume;
      state.open = {};
      renderVolume(true);
      update();
    });
    $("#all-usages").addEventListener("click", function () {
      state.expanded = !state.expanded;
      if (!state.expanded && profileById[state.profile].usages.indexOf(state.usage) === -1) {
        state.usage = profileById[state.profile].start;
        state.volume = usageById[state.usage].volume;
        renderVolume(true);
        update();
      }
      renderUsages();
    });
    $("#volume").addEventListener("input", function (e) {
      state.volume = posToVol(parseInt(e.target.value, 10));
      renderVolume(false);
      schedule();
    });
    $("#exigence").addEventListener("change", function (e) { state.exig = parseInt(e.target.value, 10); update(); });
    $("#access").addEventListener("change", function (e) { state.access = e.target.value; update(); });
    $$(".currency button").forEach(function (b) {
      b.addEventListener("click", function () { state.cur = b.getAttribute("data-cur"); update(); });
    });
    $("#show-all").addEventListener("change", function (e) { state.showAll = e.target.checked; drawChart(compute(), false); });
    $("#controls").addEventListener("submit", function (e) { e.preventDefault(); });
    $("#theme-toggle").addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("lbm-theme", next); } catch (err) {}
      syncThemeButton();
    });
  }

  /* ---------- Recherche par Claude Haiku ----------
     Applique une intention renvoyée par le proxy (../assets/ai-search.js).
     Chaque valeur est revalidée contre les données de la page ; la phrase
     de réponse est composée ici, à partir des seuls libellés du site. */
  var EXIG_IA = { premier_jet: -1, fiable: 0, sans_faute: 1 };
  window.LBM_PAGE = {
    id: "budget",
    resultAnchor: "#results",
    apply: function (it) {
      if (!it || !usageById[it.usage]) return null;
      var u = usageById[it.usage];
      state.usage = u.id;
      var v = it.rythme;
      state.volume = (typeof v === "number" && v === Math.floor(v) && v >= 1) ? Math.min(v, 100000) : u.volume;
      if (EXIG_IA.hasOwnProperty(it.exigence)) state.exig = EXIG_IA[it.exigence];
      if (it.acces === "app" || it.acces === "api") state.access = it.acces;
      if (profileById[state.profile].usages.indexOf(u.id) === -1) state.expanded = true;
      state.open = {};
      $("#exig-" + (state.exig === -1 ? "low" : state.exig === 1 ? "high" : "mid")).checked = true;
      renderUsages();
      renderVolume(true);
      update();

      var r = compute(), access = effectiveAccess(u), parts = [];
      var head = "Usage retenu : " + u.label.charAt(0).toLowerCase() + u.label.slice(1) + ", " +
        nf0.format(state.volume) + " " + singular(u.unit, state.volume) + " par mois, " +
        (access === "api" ? "par l'API" : "avec un abonnement") + ".";
      ["openai", "anthropic"].forEach(function (p) {
        if (access === "app") {
          var res = recommendPlan(p, u, r.req);
          if (res) parts.push(res.plan.name + (res.plan.usd === 0 ? " (gratuit)" : " (" + planPriceText(p, res.plan) + " par mois)"));
        } else {
          var c = r.picks[p];
          if (c) parts.push(c.m.name + " chez " + provName(p) + ", environ " + money(c.month) + " par mois");
        }
      });
      var tail = !parts.length ? " Aucune offre n'atteint ce niveau : voyez le classement ci-dessous."
        : access === "app" ? " Abonnement suffisant : " + parts.join(" ou ") + "."
        : " Le plus économique au bon niveau : " + parts.join(", ou ") + ".";
      return { phrase: (head + tail).replace(/ ([:;!?])/g, NB + "$1") };
    }
  };

  /* ---------- Démarrage ---------- */
  readURL();
  renderProfiles();
  renderUsages();
  $("#exig-" + (state.exig === -1 ? "low" : state.exig === 1 ? "high" : "mid")).checked = true;
  renderVolume(true);
  renderLadder();
  renderSources();
  initChart();
  bind();
  syncThemeButton();
  update();
})();
