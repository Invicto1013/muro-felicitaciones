(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = "http://www.w3.org/2000/svg";

  function se(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  /* Banderines */
  (function () {
    var svg = $("bunting"), classes = ["f-a", "f-b", "f-c", "f-d"];
    var y = function (x) { var t = x / 1200; return 6 + 2 * t * (1 - t) * 52; };
    se("path", { d: "M0 6 Q 600 58 1200 6", "class": "string" }, svg);
    for (var i = 0, x = 30; x < 1190; i++, x += 58) {
      var y0 = y(x);
      se("polygon", { points: (x - 20) + "," + y0 + " " + (x + 20) + "," + y0 + " " + x + "," + (y0 + 42), "class": classes[i % 4] }, svg);
    }
  })();

  /* Estado compartido de la página */
  var birthdayName = "";
  var DEFAULT_CAKE = { candles: 5, tiers: 2, sponge: "vainilla", frosting: "rosa", decor: "gotas" };
  var SPONGE = {
    vainilla: ["#F2D49B", "#DDB468", "Vainilla"],
    chocolate: ["#7A4B33", "#5C3624", "Chocolate"],
    fresa: ["#F59DB5", "#DE7C98", "Fresa"],
    limon: ["#F7E27A", "#E3C84A", "Limón"]
  };
  var FROST = {
    rosa: ["#FF8FB3", "#E9658F", "Rosa"],
    menta: ["#8EE3CF", "#5CC8AE", "Menta"],
    lila: ["#B9A4FF", "#9378F0", "Lila"],
    sol: ["#FFD66B", "#F0B93A", "Sol"],
    crema: ["#FFF6E6", "#EADCC0", "Crema"]
  };
  var DECORS = [["gotas", "Gotas"], ["chispas", "Chispas"], ["cerezas", "Cerezas"], ["lisa", "Lisa"]];
  var cake = copy(DEFAULT_CAKE);
  var draft = copy(DEFAULT_CAKE);
  var dirty = false;
  var isOwner = false;

  function normalizeCake(c) {
    var r = copy(DEFAULT_CAKE);
    if (!c || typeof c !== "object") return r;
    var n = Math.round(Number(c.candles)); if (isFinite(n)) r.candles = Math.min(Math.max(n, 0), 50);
    var t = Math.round(Number(c.tiers)); if (isFinite(t)) r.tiers = Math.min(Math.max(t, 1), 3);
    if (SPONGE[c.sponge]) r.sponge = c.sponge;
    if (FROST[c.frosting]) r.frosting = c.frosting;
    if (DECORS.some(function (d) { return d[0] === c.decor; })) r.decor = c.decor;
    return r;
  }

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

  function burst(origin) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cs = getComputedStyle(document.documentElement);
    var colors = ["--accent", "--sun", "--mint", "--violet"].map(function (k) { return cs.getPropertyValue(k).trim(); });
    var r = (origin || $("submitBtn")).getBoundingClientRect();
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

  /* Pastel */
  var RY = 11;
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  function edgeY(W, x) {
    var t = (x - 180) / (W / 2);
    return RY * Math.sqrt(Math.max(0, 1 - t * t));
  }
  function rowPlan(r, W, s) {
    var step = r > 1 ? Math.min(7, 15 / (r - 1)) : 0, rows = [], total = 0;
    for (var i = 0; i < r; i++) {
      var dy = (i - (r - 1) / 2) * step;
      var sc = Math.sqrt(Math.max(0.1, 1 - Math.pow(dy / (RY - 1), 2)));
      var half = Math.max(0, (W / 2 - 14) * sc);
      var cap = Math.max(1, Math.floor(2 * half / s) + 1);
      rows.push({ dy: dy, half: half, cap: cap });
      total += cap;
    }
    return { rows: rows, total: total };
  }
  function distribute(n, rows) {
    var counts = rows.map(function () { return 0; }), left = n;
    while (left > 0) {
      var best = -1, bestRatio = 2;
      for (var i = 0; i < rows.length; i++) {
        if (counts[i] < rows[i].cap) {
          var ratio = counts[i] / rows[i].cap;
          if (ratio < bestRatio) { bestRatio = ratio; best = i; }
        }
      }
      if (best < 0) break;
      counts[best]++; left--;
    }
    return counts;
  }

  function drawCandles(svg, n, topY, topW) {
    if (n <= 0) return;
    var s = n <= 12 ? 14 : n <= 24 ? 11 : 8.5;
    var ch = n <= 12 ? 26 : n <= 24 ? 22 : 18;
    var cw = n <= 12 ? 5 : n <= 24 ? 4.2 : 3.4;
    var rows = 1, plan = rowPlan(1, topW, s);
    for (; rows <= 6; rows++) { plan = rowPlan(rows, topW, s); if (plan.total >= n) break; }
    if (rows > 6) plan = rowPlan(6, topW, s);
    var counts = distribute(n, plan.rows), idx = 0;
    plan.rows.forEach(function (row, i) {
      var c = counts[i], sp = c > 1 ? Math.min(s, 2 * row.half / (c - 1)) : 0, by = topY + row.dy;
      for (var j = 0; j < c; j++) {
        var x = 180 + (j - (c - 1) / 2) * sp;
        var g = se("g", {}, svg);
        se("rect", { x: x - cw / 2, y: by - ch, width: cw, height: ch, rx: 1, "class": "cd-" + (idx % 4) }, g);
        var wt = by - ch - 3, f = ch / 26;
        se("line", { x1: x, y1: by - ch, x2: x, y2: wt, "class": "wick" }, g);
        var fg = se("g", { "class": "flame-g" }, g);
        se("ellipse", { cx: x, cy: wt - 6 * f, rx: 7 * f, ry: 9 * f, "class": "glow" }, fg);
        se("path", {
          d: "M" + x + "," + wt + " C" + (x - 4 * f) + "," + (wt - 4 * f) + " " + (x - 1.5 * f) + "," + (wt - 9 * f) + " " + x + "," + (wt - 14 * f) +
            " C" + (x + 1.5 * f) + "," + (wt - 9 * f) + " " + (x + 4 * f) + "," + (wt - 4 * f) + " " + x + "," + wt + " Z",
          "class": "flame"
        }, fg);
        se("path", {
          d: "M" + x + "," + wt + " C" + (x - 2.2 * f) + "," + (wt - 2 * f) + " " + (x - 0.8 * f) + "," + (wt - 5 * f) + " " + x + "," + (wt - 7.7 * f) +
            " C" + (x + 0.8 * f) + "," + (wt - 5 * f) + " " + (x + 2.2 * f) + "," + (wt - 2 * f) + " " + x + "," + wt + " Z",
          "class": "flame-in"
        }, fg);
        fg.style.animationDelay = "-" + ((idx * 0.27) % 1.1).toFixed(2) + "s";
        idx++;
      }
    });
  }

  function renderCake() {
    var svg = $("cake");
    svg.textContent = "";
    var sp = SPONGE[cake.sponge] || SPONGE.vainilla, fr = FROST[cake.frosting] || FROST.rosa;
    svg.style.setProperty("--sponge", sp[0]);
    svg.style.setProperty("--sponge-d", sp[1]);
    svg.style.setProperty("--frost", fr[0]);
    svg.style.setProperty("--frost-d", fr[1]);
    svg.setAttribute("aria-label", "Pastel de cumpleaños con " + cake.candles + (cake.candles === 1 ? " vela" : " velas"));
    $("blowBtn").hidden = cake.candles === 0;

    se("ellipse", { cx: 180, cy: 277, rx: 160, ry: 14, "class": "c-shadow" }, svg);
    se("ellipse", { cx: 180, cy: 270, rx: 152, ry: 14, "class": "c-plate" }, svg);

    var tiers = cake.tiers;
    var widths = tiers === 1 ? [220] : tiers === 2 ? [250, 170] : [270, 200, 135];
    var h = tiers === 1 ? 72 : tiers === 2 ? 58 : 48;
    var bottom = 266, topY = bottom, topW = widths[0];
    var rand = rng(11 + tiers * 7 + cake.candles + cake.decor.length);

    widths.forEach(function (W, i) {
      var y0 = bottom - h, rx = W / 2, x1 = 180 - rx, x2 = 180 + rx;
      var g = se("g", {}, svg);
      /* cuerpo, relleno y cobertura del borde */
      se("path", { d: "M" + x1 + "," + y0 + " L" + x1 + "," + bottom + " A" + rx + "," + RY + " 0 0 0 " + x2 + "," + bottom + " L" + x2 + "," + y0 + " Z", "class": "c-sponge" }, g);
      var yb = bottom - 14;
      se("path", { d: "M" + x1 + "," + yb + " A" + rx + "," + RY + " 0 0 0 " + x2 + "," + yb + " L" + x2 + "," + (yb + 5) + " A" + rx + "," + RY + " 0 0 1 " + x1 + "," + (yb + 5) + " Z", "class": "c-frost-d" }, g);
      se("path", { d: "M" + x1 + "," + y0 + " L" + x1 + "," + (y0 + 9) + " A" + rx + "," + RY + " 0 0 0 " + x2 + "," + (y0 + 9) + " L" + x2 + "," + y0 + " A" + rx + "," + RY + " 0 0 1 " + x1 + "," + y0 + " Z", "class": "c-frost" }, g);
      se("ellipse", { cx: 180, cy: y0, rx: rx, ry: RY, "class": "c-top" }, g);

      if (cake.decor === "gotas") {
        var nd = Math.max(4, Math.round(W / 26)), step = W / nd, maxLen = Math.min(22, h * 0.32);
        for (var d = 0; d < nd; d++) {
          var xa = x1 + d * step + step * 0.25, xb = xa + step * 0.5, xm = (xa + xb) / 2;
          var ye = y0 + 9 + edgeY(W, xm), len = 6 + Math.round(rand() * (maxLen - 6)), rr = (xb - xa) / 2;
          se("path", { d: "M" + xa + "," + (ye - 3) + " L" + xa + "," + (ye + len) + " A" + rr + "," + rr + " 0 0 0 " + xb + "," + (ye + len) + " L" + xb + "," + (ye - 3) + " Z", "class": "c-frost" }, g);
        }
      } else if (cake.decor === "chispas") {
        var ns = Math.round(W / 7), k, sx, sy;
        for (k = 0; k < ns; k++) {
          var ang = rand() * 6.283, rad = Math.sqrt(rand());
          sx = 180 + Math.cos(ang) * rad * (rx - 10); sy = y0 + Math.sin(ang) * rad * (RY - 3);
          se("rect", { x: sx - 3, y: sy - 1.2, width: 6, height: 2.4, rx: 1.2, "class": "cd-" + Math.floor(rand() * 4), transform: "rotate(" + Math.round(rand() * 180) + " " + sx + " " + sy + ")" }, g);
        }
        var nb = Math.round(W / 16);
        for (k = 0; k < nb; k++) {
          sx = x1 + 10 + rand() * (W - 20); sy = y0 + 4 + edgeY(W, sx);
          se("rect", { x: sx - 3, y: sy - 1.2, width: 6, height: 2.4, rx: 1.2, "class": "cd-" + Math.floor(rand() * 4), transform: "rotate(" + Math.round(rand() * 180) + " " + sx + " " + sy + ")" }, g);
        }
      } else if (cake.decor === "cerezas") {
        for (var cx = x1 + 20; cx <= x2 - 20; cx += 30) {
          var cy = bottom + edgeY(W, cx) - 5;
          se("path", { d: "M" + cx + "," + (cy - 5) + " q 3,-8 9,-9", "class": "stem" }, g);
          se("circle", { cx: cx, cy: cy, r: 6, "class": "cherry" }, g);
          se("circle", { cx: cx - 2, cy: cy - 2, r: 1.8, "class": "cherry-hl" }, g);
        }
      }

      if (i === 0) {
        var label = birthdayName ? "¡Feliz cumple, " + birthdayName + "!" : "¡Feliz cumple!";
        var pw = Math.min(W - 40, 230), ph = 22, yc = y0 + (h + 17) / 2;
        se("rect", { x: 180 - pw / 2, y: yc - ph / 2, width: pw, height: ph, rx: 5, "class": "c-plaque" }, g);
        var fs = Math.max(8, Math.min(16, (pw - 14) / (label.length * 0.5)));
        var t = se("text", { x: 180, y: (yc + fs * 0.34).toFixed(1), "font-size": fs.toFixed(1), "class": "c-plaque-text" }, g);
        t.textContent = label;
      }

      topY = y0; topW = W; bottom = y0;
    });

    drawCandles(svg, cake.candles, topY, topW);
  }

  function relight() {
    $("cake").classList.remove("out");
    $("blowBtn").textContent = "Soplar las velas";
  }
  $("blowBtn").addEventListener("click", function () {
    var out = $("cake").classList.toggle("out");
    $("blowBtn").textContent = out ? "Encender de nuevo" : "Soplar las velas";
    if (out) burst($("blowBtn"));
  });

  /* Título */
  function titleText() {
    var h = $("title"); h.textContent = "";
    h.appendChild(document.createTextNode("¡Feliz cumpleaños"));
    if (birthdayName) {
      h.appendChild(document.createTextNode(", "));
      var s = document.createElement("span"); s.className = "hl"; s.textContent = birthdayName; h.appendChild(s);
    }
    h.appendChild(document.createTextNode("!"));
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

  /* Panel del organizador */
  function pressedGroup(group, value) {
    Array.prototype.forEach.call(group.children, function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === String(value)));
    });
  }
  function syncControls(skipCandles) {
    if (!skipCandles) $("candlesInput").value = draft.candles;
    pressedGroup($("tiersSeg"), draft.tiers);
    pressedGroup($("spongeSw"), draft.sponge);
    pressedGroup($("frostSw"), draft.frosting);
    pressedGroup($("decorSeg"), draft.decor);
  }
  function setDraft(key, value, skipCandles) {
    draft[key] = value;
    cake = copy(draft);
    dirty = true;
    relight();
    syncControls(skipCandles);
    renderCake();
  }
  function buildSeg(container, options, key, asNumber) {
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = o[1];
      b.setAttribute("data-v", o[0]); b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { setDraft(key, asNumber ? Number(o[0]) : o[0]); });
      container.appendChild(b);
    });
  }
  function buildSwatches(container, map, key) {
    Object.keys(map).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sw";
      b.style.background = map[k][0];
      b.title = map[k][2];
      b.setAttribute("aria-label", map[k][2]);
      b.setAttribute("data-v", k); b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { setDraft(key, k); });
      container.appendChild(b);
    });
  }
  buildSeg($("tiersSeg"), [["1", "1 piso"], ["2", "2 pisos"], ["3", "3 pisos"]], "tiers", true);
  buildSwatches($("spongeSw"), SPONGE, "sponge");
  buildSwatches($("frostSw"), FROST, "frosting");
  buildSeg($("decorSeg"), DECORS, "decor", false);

  function clampCandles(v) { return Math.min(Math.max(v, 0), 50); }
  $("candlesMinus").addEventListener("click", function () { setDraft("candles", clampCandles(draft.candles - 1)); });
  $("candlesPlus").addEventListener("click", function () { setDraft("candles", clampCandles(draft.candles + 1)); });
  $("candlesInput").addEventListener("input", function () {
    var v = parseInt($("candlesInput").value, 10);
    if (isNaN(v)) return;
    setDraft("candles", clampCandles(v), true);
  });
  $("candlesInput").addEventListener("blur", function () { $("candlesInput").value = draft.candles; });

  $("nameInput").addEventListener("input", function () {
    dirty = true;
    birthdayName = $("nameInput").value.trim().slice(0, 40);
    titleText();
    renderCake();
  });
  $("nameInput").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); $("ownerSave").click(); }
  });
  function ownerStatus(t) { $("ownerStatus").textContent = t; }
  $("ownerSave").addEventListener("click", function () {
    var btn = $("ownerSave");
    btn.disabled = true; ownerStatus("Guardando…");
    api("/api/admin/settings", { name: $("nameInput").value.trim().slice(0, 40), cake: draft }).then(function () {
      dirty = false;
      ownerStatus("Guardado. Ya lo ve todo el mundo.");
      return refresh();
    }).catch(function (err) { ownerStatus(errText(err)); })
      .then(function () { btn.disabled = false; });
  });

  /* Muro */
  var messages = [];
  var firstLoad = true;

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
      if (!dirty) {
        var newName = typeof s.name === "string" ? s.name : "";
        var newCake = normalizeCake(s.cake);
        var changed = newName !== birthdayName || JSON.stringify(newCake) !== JSON.stringify(cake) || firstLoad;
        birthdayName = newName;
        cake = newCake;
        draft = copy(newCake);
        if (changed) {
          titleText();
          renderCake();
          if (isOwner) { $("nameInput").value = birthdayName; syncControls(); }
        }
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
      burst($("submitBtn"));
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
    if (on) { $("nameInput").value = birthdayName; syncControls(); }
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
    dirty = false;
    setOwner(false);
    refresh();
  });

  /* Arranque */
  syncControls();
  renderCake();
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
