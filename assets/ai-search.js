/*
  lebonmodel, barre de recherche propulsée par Claude Haiku 5.5.
  Le navigateur n'appelle jamais l'API d'Anthropic : il envoie la demande au proxy
  (dossier worker/), qui renvoie uniquement des valeurs fermées. La page les
  revalide (window.LBM_PAGE.apply) avant de s'en servir, et tout texte est
  affiché avec textContent, jamais interprété comme du HTML.
*/
(function () {
  "use strict";
  var cfg = window.LBM_AI || {};
  var form = document.getElementById("ai-search");
  var page = window.LBM_PAGE;
  if (!form || !page || typeof page.apply !== "function") return;
  if (typeof cfg.endpoint !== "string" || !/^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/.test(cfg.endpoint)) return;

  var input = form.querySelector("input");
  var button = form.querySelector("button");
  var answer = document.getElementById("ai-answer");
  var url = cfg.endpoint.replace(/\/+$/, "") + "/recherche";
  var MAX = 300, busy = false;
  form.hidden = false;
  if (window.innerWidth < 560) input.setAttribute("placeholder", "Décrivez votre besoin…");

  var MSG = {
    vide: "Décrivez ce que vous voulez faire en quelques mots.",
    long: "Votre demande dépasse 300 caractères : raccourcissez-la.",
    incompris: "Je n'ai pas reconnu de tâche à confier à une IA. Essayez par exemple « relire un contrat de 40 pages avec ChatGPT Plus », ou choisissez dans la liste.",
    debit: "Trop de demandes en peu de temps. Réessayez dans une minute, ou choisissez dans la liste.",
    panne: "La recherche est indisponible pour le moment. Choisissez dans la liste, le comparateur fonctionne sans elle."
  };

  function show(lines, kind) {
    answer.textContent = "";
    answer.className = "ai-answer" + (kind ? " " + kind : "");
    lines.forEach(function (l) {
      var p = document.createElement("p");
      if (l.label) {
        var b = document.createElement("span");
        b.className = "ai-label";
        b.textContent = l.label;
        p.appendChild(b);
      }
      p.appendChild(document.createTextNode(l.text));
      answer.appendChild(p);
    });
    if (kind === "ok" && page.resultAnchor) {
      var a = document.createElement("a");
      a.href = page.resultAnchor;
      a.className = "ai-link";
      a.textContent = "Voir le résultat";
      answer.appendChild(a);
    }
    answer.hidden = false;
  }

  function done() { busy = false; button.disabled = false; form.removeAttribute("aria-busy"); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var q = input.value.replace(/\s+/g, " ").trim();
    if (q.length < 2) return show([{ text: MSG.vide }], "info");
    if (q.length > MAX) return show([{ text: MSG.long }], "info");
    busy = true; button.disabled = true; form.setAttribute("aria-busy", "true");
    show([{ text: "Claude Haiku lit votre demande…" }], "wait");

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page: page.id, q: q }),
      credentials: "omit",
      referrerPolicy: "strict-origin",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (res.status === 429) throw { msg: MSG.debit };
      if (!res.ok) throw { msg: MSG.panne };
      return res.json();
    }).then(function (data) {
      var it = data && data.page === page.id ? data.intention : null;
      if (!it || typeof it !== "object" || typeof it.pertinent !== "boolean") throw { msg: MSG.panne };
      var out = it.pertinent ? page.apply(it) : null;
      if (!out || typeof out.phrase !== "string") return show([{ text: MSG.incompris }], "info");
      var lines = [{ text: out.phrase }];
      if (cfg.phrase === true && typeof it.reformulation === "string" && it.reformulation) {
        lines.unshift({ label: "Reformulé par Claude Haiku : ", text: it.reformulation.slice(0, 220) });
      }
      show(lines, "ok");
    }).catch(function (err) {
      show([{ text: err && err.msg ? err.msg : MSG.panne }], "info");
    }).then(function () { clearTimeout(timer); done(); });
  });
})();
