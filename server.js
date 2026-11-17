"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const MAX_MESSAGES = 2000;
const NAME_MAX = 40;
const TEXT_MAX = 400;

/* ---------- Almacenamiento ---------- */

function createPgStore(url) {
  const { Pool } = require("pg");
  const external = /\.render\.com/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: external ? { rejectUnauthorized: false } : false,
    max: 5,
    connectionTimeoutMillis: 10000
  });
  return {
    kind: "postgres",
    async init() {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS messages (" +
          "id text PRIMARY KEY, name text NOT NULL, text text NOT NULL, " +
          "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())"
      );
      await pool.query("CREATE TABLE IF NOT EXISTS config (key text PRIMARY KEY, value text NOT NULL)");
    },
    async list() {
      const r = await pool.query(
        "SELECT id, name, text, (extract(epoch from updated_at) * 1000)::bigint AS at " +
          "FROM messages ORDER BY updated_at DESC LIMIT 500"
      );
      return r.rows.map((x) => ({ id: x.id, name: x.name, text: x.text, at: Number(x.at) }));
    },
    async count() {
      const r = await pool.query("SELECT count(*)::int AS n FROM messages");
      return r.rows[0].n;
    },
    async exists(id) {
      const r = await pool.query("SELECT 1 FROM messages WHERE id = $1", [id]);
      return r.rowCount > 0;
    },
    async upsert(id, name, text) {
      await pool.query(
        "INSERT INTO messages (id, name, text) VALUES ($1, $2, $3) " +
          "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, text = EXCLUDED.text, updated_at = now()",
        [id, name, text]
      );
    },
    async remove(id) {
      await pool.query("DELETE FROM messages WHERE id = $1", [id]);
    },
    async getConfig(key) {
      const r = await pool.query("SELECT value FROM config WHERE key = $1", [key]);
      return r.rows[0] ? r.rows[0].value : "";
    },
    async setConfig(key, value) {
      await pool.query(
        "INSERT INTO config (key, value) VALUES ($1, $2) " +
          "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [key, value]
      );
    }
  };
}

function createMemoryStore() {
  const messages = new Map();
  const config = new Map();
  return {
    kind: "memoria (se pierde al reiniciar)",
    async init() {},
    async list() {
      return Array.from(messages.values())
        .sort((a, b) => b.at - a.at)
        .slice(0, 500)
        .map((m) => ({ id: m.id, name: m.name, text: m.text, at: m.at }));
    },
    async count() { return messages.size; },
    async exists(id) { return messages.has(id); },
    async upsert(id, n, t) { messages.set(id, { id, name: n, text: t, at: Date.now() }); },
    async remove(id) { messages.delete(id); },
    async getConfig(key) { return config.get(key) || ""; },
    async setConfig(key, value) { config.set(key, value); }
  };
}

const store = DATABASE_URL ? createPgStore(DATABASE_URL) : createMemoryStore();

/* ---------- Utilidades ---------- */

const STATIC = {};
for (const [route, file, type] of [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"]
]) {
  STATIC[route] = { body: fs.readFileSync(path.join(__dirname, "public", file)), type };
}

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY"
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS, headers));
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function httpError(status, message, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { tooBig = true; return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (tooBig) return reject(httpError(413, "Solicitud demasiado grande", "too_large"));
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolve(v && typeof v === "object" && !Array.isArray(v) ? v : {});
      } catch (e) {
        reject(httpError(400, "JSON inválido", "bad_json"));
      }
    });
    req.on("error", reject);
  });
}

const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now);
  hits.set(key, arr);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) {
    const keep = v.filter((t) => now - t < 120000);
    if (keep.length) hits.set(k, keep); else hits.delete(k);
  }
}, 60000).unref();

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function isAdmin(req) {
  const k = req.headers["x-admin-key"];
  if (!ADMIN_KEY || typeof k !== "string") return false;
  const a = crypto.createHash("sha256").update(k).digest();
  const b = crypto.createHash("sha256").update(ADMIN_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

function clientIdOf(req, body) {
  const v = (body && body.clientId) || req.headers["x-client-id"];
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v) ? v : null;
}

function publicId(clientId) {
  return crypto.createHash("sha256").update(clientId).digest("hex").slice(0, 32);
}

function cleanName(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

function cleanText(v) {
  if (typeof v !== "string") return "";
  return v
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, TEXT_MAX);
}

const SPONGES = ["vainilla", "chocolate", "fresa", "limon"];
const FROSTINGS = ["rosa", "menta", "lila", "sol", "crema"];
const DECORS = ["gotas", "chispas", "cerezas", "lisa"];
const CAKE_DEFAULT = { candles: 5, tiers: 2, sponge: "vainilla", frosting: "rosa", decor: "gotas" };

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function cleanCake(v) {
  const c = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    candles: clampInt(c.candles, 0, 50, CAKE_DEFAULT.candles),
    tiers: clampInt(c.tiers, 1, 3, CAKE_DEFAULT.tiers),
    sponge: SPONGES.includes(c.sponge) ? c.sponge : CAKE_DEFAULT.sponge,
    frosting: FROSTINGS.includes(c.frosting) ? c.frosting : CAKE_DEFAULT.frosting,
    decor: DECORS.includes(c.decor) ? c.decor : CAKE_DEFAULT.decor
  };
}

async function loadCake() {
  const raw = await store.getConfig("cake");
  if (!raw) return Object.assign({}, CAKE_DEFAULT);
  try { return cleanCake(JSON.parse(raw)); } catch (e) { return Object.assign({}, CAKE_DEFAULT); }
}

/* ---------- API ---------- */

async function handleState(req, res) {
  const cid = clientIdOf(req, null);
  const mine = cid ? publicId(cid) : null;
  const [name, cake, rows] = await Promise.all([store.getConfig("birthday_name"), loadCake(), store.list()]);
  sendJson(res, 200, {
    name,
    cake,
    messages: rows.map((m) => ({ id: m.id, name: m.name, text: m.text, at: m.at, mine: m.id === mine }))
  });
}

async function handleApiPost(req, res, route) {
  const ip = clientIp(req);
  if (route === "/api/admin/check" && limited("a:" + ip, 10, 60000)) {
    throw httpError(429, "Demasiados intentos", "rate_limited");
  }
  if (limited("w:" + ip, 30, 60000)) throw httpError(429, "Demasiados intentos", "rate_limited");
  const body = await readBody(req, 8192);

  if (route === "/api/message") {
    const cid = clientIdOf(req, body);
    const name = cleanName(body.name);
    const text = cleanText(body.text);
    if (!cid) throw httpError(400, "Identificador inválido", "bad_client");
    if (!name || !text) throw httpError(400, "Falta el nombre o el mensaje", "empty");
    const id = publicId(cid);
    if (!(await store.exists(id)) && (await store.count()) >= MAX_MESSAGES) {
      throw httpError(409, "El muro está lleno", "full");
    }
    await store.upsert(id, name, text);
    return sendJson(res, 200, { ok: true, id });
  }

  if (route === "/api/message/delete") {
    const cid = clientIdOf(req, body);
    if (!cid) throw httpError(400, "Identificador inválido", "bad_client");
    await store.remove(publicId(cid));
    return sendJson(res, 200, { ok: true });
  }

  if (route.startsWith("/api/admin/")) {
    if (!isAdmin(req)) throw httpError(401, "Clave incorrecta", "unauthorized");
    if (route === "/api/admin/check") return sendJson(res, 200, { ok: true });
    if (route === "/api/admin/settings") {
      const name = cleanName(body.name);
      const cake = cleanCake(body.cake);
      await store.setConfig("birthday_name", name);
      await store.setConfig("cake", JSON.stringify(cake));
      return sendJson(res, 200, { ok: true, name, cake });
    }
    if (route === "/api/admin/delete") {
      if (typeof body.id !== "string" || !/^[a-f0-9]{32}$/.test(body.id)) {
        throw httpError(400, "Identificador inválido", "bad_id");
      }
      await store.remove(body.id);
      return sendJson(res, 200, { ok: true });
    }
  }

  throw httpError(404, "No encontrado", "not_found");
}

const server = http.createServer(async (req, res) => {
  try {
    const route = new URL(req.url, "http://localhost").pathname;

    if (req.method === "GET" || req.method === "HEAD") {
      if (route === "/healthz") return send(res, 200, "ok", { "Content-Type": "text/plain" });
      if (route === "/api/state") return await handleState(req, res);
      const file = STATIC[route];
      if (file) {
        return send(res, 200, req.method === "HEAD" ? "" : file.body, {
          "Content-Type": file.type,
          "Cache-Control": route === "/" || route === "/index.html" ? "no-cache" : "public, max-age=300"
        });
      }
      throw httpError(404, "No encontrado", "not_found");
    }

    if (req.method === "POST" && route.startsWith("/api/")) {
      return await handleApiPost(req, res, route);
    }

    throw httpError(405, "Método no permitido", "method");
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (res.headersSent) return res.end();
    sendJson(res, status, { error: status === 500 ? "Error del servidor" : err.message, code: err.code || "error" });
  }
});

store
  .init()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log("Muro de Felicitaciones en el puerto " + PORT + " · almacenamiento: " + store.kind);
      if (!ADMIN_KEY) console.warn("ADMIN_KEY no está definida: el modo organizador está desactivado.");
    });
  })
  .catch((err) => {
    console.error("No se pudo iniciar el almacenamiento:", err.message);
    process.exit(1);
  });

process.on("SIGTERM", () => server.close(() => process.exit(0)));
