(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* Banderines */
  (function () {
    var svg = $("bunting"), ns = "http://www.w3.org/2000/svg", classes = ["f-a", "f-b", "f-c", "f-d"];
    var y = function (x) { var t = x / 1200; return 6 + 2 * t * (1 - t) * 52; };
    var line = document.createElementNS(ns, "path");
    line.setAttribute("d", "M0 6 Q 600 58 1200 6");
    line.setAttribute("class", "string");
    svg.appendChild(line);
    for (var i = 0, x = 30; x < 1190; i++, x += 58) {
      var p = document.createElementNS(ns, "polygon"), y0 = y(x);
      p.setAttribute("points", (x - 20) + "," + y0 + " " + (x + 20) + "," + y0 + " " + x + "," + (y0 + 42));
      p.setAttribute("class", classes[i % 4]);
      svg.appendChild(p);
    }
  })();

  /* Generador de mensajes */
  var OPEN = [
    function (n) { return "¡Feliz cumpleaños" + n + "!"; },
    function (n) { return "¡Hoy es tu día" + n + "!"; },
    function (n) { return "Que este nuevo año de vida empiece con una sonrisa" + n + "."; },
    function (n) { return "¡Felicidades" + n + "!"; },
    function (n) { return "Un abrazo grande en tu cumpleaños" + n + "."; },
    function (n) { return "Hoy el mundo celebra que existes" + n + "."; },
    function (n) { return "¡Qué bueno que naciste" + n + "!"; },
    function (n) { return "Hoy toca brindar por ti" + n + "."; }
  ];
  var WISH = [
    "Ojalá tengas un día lleno de risas, buena comida y gente que te quiere.",
    "Que cada meta que te pongas este año se convierta en una buena noticia.",
    "Te deseo salud, tranquilidad y muchas razones para celebrar.",
    "Que la alegría te encuentre en lo pequeño y en lo grande.",
    "Mereces un año con más abrazos, más música y menos prisas.",
    "Que los próximos meses te traigan ideas nuevas y la energía para hacerlas realidad.",
    "Que nunca te falte alguien con quien reírte hasta que duela la barriga.",
    "Espero que hoy te consientan tanto como tú consientes a los demás.",
    "Que este año tengas más días buenos que en cualquiera de los anteriores.",
    "Que tu camino se llene de oportunidades y de gente que celebra tus logros.",
    "Que el pastel sea grande y los problemas, pequeños.",
    "Que todo lo bueno que repartes vuelva a ti multiplicado.",
    "Que este año te sorprenda en el mejor sentido.",
    "Gracias por ser como eres; el mundo se ve mejor con tu forma de ser."
  ];
  var CLOSE = [
    "A disfrutar este día al máximo.",
    "Con mucho cariño.",
    "¡A celebrar como se debe!",
    "Que sea un día inolvidable.",
    "Aquí estamos para festejarte.",
    "¡Hoy se come pastel sin culpa!",
    "Un año más, y lo mejor está por venir.",
    "Te mandamos muchísima buena energía.",
    "¡Brindemos por ti!",
    "Disfruta cada minuto."
  ];
  var birthdayName = "";
  var current = "";
  var touched = false;
  var genName = null;
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function makeMessage() {
    var n = birthdayName ? ", " + birthdayName : "";
    var text, tries = 0;
    do {
      text = pick(OPEN)(n) + " " + pick(WISH) + " " + pick(CLOSE);
      tries++;
    } while (text === current && tries < 5);
    return text;
  }
  function showMessage() { genName = birthdayName; current = makeMessage(); $("genText").textContent = current; }
  showMessage();

  $("genNext").addEventListener("click", function () { touched = true; showMessage(); });
  $("genCopy").addEventListener("click", function () {
    var btn = $("genCopy");
    function done(ok) {
      btn.textContent = ok ? "Copiado" : "Selecciona y copia";
      setTimeout(function () { btn.textContent = "Copiar"; }, 1800);
    }
    function fallback() {
      try {
        var r = document.createRange(); r.selectNodeContents($("genText"));
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      } catch (e) {}
      done(false);
    }
    try {
      navigator.clipboard.writeText(current).then(function () { done(true); }, fallback);
    } catch (e) { fallback(); }
  });
  $("genUse").addEventListener("click", function () {
    touched = true;
    $("textInput").value = current;
    updateCounter();
    $("textInput").focus();
    $("form").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* Formulario */
  function updateCounter() { $("counter").textContent = $("textInput").value.length + " / 400"; }
  $("textInput").addEventListener("input", updateCounter);
  function setStatus(t) { $("status").textContent = t; }

  function burst() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cs = getComputedStyle(document.documentElement);
    var colors = ["--accent", "--sun", "--mint", "--violet"].map(function (k) { return cs.getPropertyValue(k).trim(); });
    var r = $("submitBtn").getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    for (var i = 0; i < 26; i++) {
      var b = document.createElement("span");
      b.className = "bit";
      b.style.left = ox + "px"; b.style.top = oy + "px";
      b.style.background = colors[i % colors.length];
      document.body.appendChild(b);
      var dx = (Math.random() - 0.5) * 320, dy = -80 - Math.random() * 180, rot = Math.random() * 540;
      var a = b.animate([
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)", opacity: 1, offset: 0.55 },
        { transform: "translate(" + dx * 1.1 + "px," + (dy + 260) + "px) rotate(" + rot * 1.5 + "deg)", opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "ease-out" });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(b);
    }
  }

  /* Identidad del visitante y conexión con el servidor */
  function loadClientId() {
    var key = "muro_client_id";
    try {
      var v = localStorage.getItem(key);
      if (v && /^[A-Za-z0-9_-]{16,64}$/.test(v)) return v;
    } catch (e) {}
    var bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    var s = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    try { localStorage.setItem(key, s); } catch (e) {}
    return s;
  }
  var clientId = loadClientId();
  var adminKey = "";
  try { adminKey = localStorage.getItem("muro_admin_key") || ""; } catch (e) {}
  var isOwner = false;

  function api(path, body) {
    var headers = { "Content-Type": "application/json", "x-client-id": clientId };
    if (adminKey) headers["x-admin-key"] = adminKey;
    return fetch(path, {
      method: body ? "POST" : "GET",
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "error"); e.status = r.status; e.code = j.code; throw e; }
        return j;
      });
    });
  }

  function errText(err) {
    var s = err && err.status;
    if (s === 429) return "Demasiados intentos seguidos. Espera un momento.";
    if (s === 409) return "El muro está lleno. Avisa al organizador.";
    if (s === 401) return "Clave incorrecta.";
    if (s === 400) return "Revisa tu nombre y tu mensaje.";
    return "No se pudo guardar. Inténtalo de nuevo.";
  }

  /* Muro */
  var messages = [];
  var firstLoad = true;
  var nameDirty = false;

  function titleText() {
    var h = $("title"); h.textContent = "";
    h.appendChild(document.createTextNode("¡Feliz cumpleaños"));
    if (birthdayName) {
      h.appendChild(document.createTextNode(", "));
      var s = document.createElement("span"); s.className = "hl"; s.textContent = birthdayName; h.appendChild(s);
    }
    h.appendChild(document.createTextNode("!"));
  }
  function fmtDate(ms) {
    try { return new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short" }); } catch (e) { return ""; }
  }

  function deleteMessage(m) {
    var req = isOwner ? api("/api/admin/delete", { id: m.id }) : api("/api/message/delete", {});
    return req.then(function () {
      if (m.mine) { $("submitBtn").textContent = "Publicar mensaje"; }
      return refresh();
    });
  }

  function renderWall() {
    var wall = $("wall"); wall.textContent = "";
    $("count").textContent = messages.length ? messages.length + (messages.length === 1 ? " mensaje" : " mensajes") : "";
    if (!messages.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.textContent = "Todavía no hay mensajes. El primero puede ser el tuyo.";
      wall.appendChild(e); return;
    }
    messages.forEach(function (m, i) {
      var card = document.createElement("article"); card.className = "msg t-" + (i % 4);
      var p = document.createElement("p"); p.textContent = m.text; card.appendChild(p);
      var f = document.createElement("footer");
      var who = document.createElement("span"); who.className = "who"; who.textContent = m.name || "Alguien";
      var right = document.createElement("span"); right.style.cssText = "display:flex;align-items:center;gap:8px";
      var when = document.createElement("span"); when.className = "when"; when.textContent = fmtDate(m.at);
      right.appendChild(when);
      if (isOwner || m.mine) {
        var del = document.createElement("button");
        del.type = "button"; del.className = "btn small"; del.textContent = "Borrar";
        var armed = false, t = null;
        del.addEventListener("click", function () {
          if (!armed) {
            armed = true; del.textContent = "¿Seguro?";
            t = setTimeout(function () { armed = false; del.textContent = "Borrar"; }, 3000);
            return;
          }
          clearTimeout(t); del.disabled = true;
          deleteMessage(m).catch(function (err) { del.disabled = false; del.textContent = "Borrar"; setStatus(errText(err)); });
        });
        right.appendChild(del);
      }
      f.appendChild(who); f.appendChild(right); card.appendChild(f);
      wall.appendChild(card);
    });
  }

  function refresh() {
    return api("/api/state").then(function (s) {
      if (!nameDirty) {
        birthdayName = typeof s.name === "string" ? s.name : "";
        titleText();
        if (isOwner) $("nameInput").value = birthdayName;
      }
      if (!touched && genName !== birthdayName) showMessage();
      messages = Array.isArray(s.messages) ? s.messages : [];
      renderWall();
      if (firstLoad) {
        firstLoad = false;
        var mine = messages.filter(function (m) { return m.mine; })[0];
        if (mine) {
          if (!$("authorInput").value) $("authorInput").value = mine.name;
          if (!$("textInput").value) { $("textInput").value = mine.text; updateCounter(); }
          $("submitBtn").textContent = "Actualizar mi mensaje";
        }
      }
    }).catch(function () {
      if (firstLoad) {
        var w = $("wall"); w.textContent = "";
        var e = document.createElement("div"); e.className = "empty";
        e.textContent = "No se pudieron cargar los mensajes. Recarga la página en un momento.";
        w.appendChild(e);
      }
    });
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("authorInput").value.trim().slice(0, 40);
    var text = $("textInput").value.trim().slice(0, 400);
    if (!name || !text) { setStatus("Escribe tu nombre y tu mensaje antes de publicar."); return; }
    $("submitBtn").disabled = true; setStatus("Publicando…");
    api("/api/message", { name: name, text: text }).then(function () {
      setStatus("Listo, tu mensaje ya está en el muro. Puedes cambiarlo cuando quieras.");
      $("submitBtn").textContent = "Actualizar mi mensaje";
      burst();
      return refresh();
    }).catch(function (err) { setStatus(errText(err)); })
      .then(function () { $("submitBtn").disabled = false; });
  });

  /* Modo organizador */
  function setOwner(on) {
    isOwner = on;
    $("ownerBox").hidden = !on;
    $("adminToggle").hidden = on;
    $("adminForm").hidden = true;
    if (on && !nameDirty) $("nameInput").value = birthdayName;
    renderWall();
  }
  function adminStatus(t) { $("adminStatus").textContent = t; }

  $("adminToggle").addEventListener("click", function () {
    $("adminForm").hidden = false;
    $("adminKeyInput").focus();
  });
  $("adminForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = $("adminKeyInput").value;
    if (!k) return;
    var prev = adminKey;
    adminKey = k;
    adminStatus("Comprobando…");
    api("/api/admin/check", {}).then(function () {
      try { localStorage.setItem("muro_admin_key", k); } catch (err) {}
      $("adminKeyInput").value = "";
      adminStatus("");
      setOwner(true);
    }).catch(function (err) {
      adminKey = prev;
      adminStatus(err && err.status === 429 ? "Demasiados intentos. Espera un minuto." : "Clave incorrecta.");
    });
  });
  $("ownerExit").addEventListener("click", function () {
    adminKey = "";
    try { localStorage.removeItem("muro_admin_key"); } catch (e) {}
    nameDirty = false;
    setOwner(false);
    refresh();
  });
  $("nameInput").addEventListener("input", function () {
    nameDirty = true;
    birthdayName = $("nameInput").value.trim().slice(0, 40);
    titleText();
  });
  $("nameInput").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); $("nameSave").click(); }
  });
  $("nameSave").addEventListener("click", function () {
    var v = $("nameInput").value.trim().slice(0, 40);
    var btn = $("nameSave");
    btn.disabled = true;
    api("/api/admin/name", { name: v }).then(function () {
      nameDirty = false;
      btn.textContent = "Guardado";
      setTimeout(function () { btn.textContent = "Guardar nombre"; }, 1500);
      return refresh();
    }).catch(function (err) { adminStatus(errText(err)); })
      .then(function () { btn.disabled = false; });
  });

  /* Arranque */
  refresh();
  if (adminKey) {
    api("/api/admin/check", {}).then(function () { setOwner(true); }).catch(function (err) {
      if (err && err.status === 401) {
        adminKey = "";
        try { localStorage.removeItem("muro_admin_key"); } catch (e) {}
      }
    });
  }
  setInterval(function () { if (!document.hidden) refresh(); }, 20000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
})();
