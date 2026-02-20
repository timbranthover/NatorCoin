/**
 * BRANTSWAP — Jupiter Swap Proxy Worker
 * Proxies POST /  → api.jup.ag/swap/v1/swap
 * Proxies POST /quote → api.jup.ag/swap/v1/quote  (backup)
 * GET  /debug      → shows whether JUP_API_KEY secret is loaded (never reveals the value)
 */

const ALLOWED_ORIGIN = "https://timbranthover.github.io";
const JUP_SWAP_URL   = "https://api.jup.ag/swap/v1/swap";
const JUP_QUOTE_URL  = "https://api.jup.ag/swap/v1/quote";

const CORS = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS preflight ──────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── /debug — confirms secret is loaded without exposing it ──────
    // Visit https://square-fog-2a16.timbranthover.workers.dev/debug
    if (url.pathname === "/debug") {
      const keyLoaded  = !!(env.JUP_API_KEY && env.JUP_API_KEY.length > 0);
      const keyLength  = keyLoaded ? env.JUP_API_KEY.length : 0;
      const keyPreview = keyLoaded ? env.JUP_API_KEY.slice(0,4) + "..." + env.JUP_API_KEY.slice(-4) : "NOT SET";
      return new Response(JSON.stringify({
        status: "ok",
        secret_loaded: keyLoaded,
        key_length: keyLength,
        key_preview: keyPreview,   // first4...last4 — safe to expose, useless without middle
        worker: "jup-swap-proxy",
        target: JUP_SWAP_URL,
      }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // ── Only accept POST for swap/quote ────────────────────────────
    if (request.method !== "POST") {
      return new Response("Method Not Allowed — use POST / or GET /debug", {
        status: 405, headers: CORS,
      });
    }

    // ── Read body ──────────────────────────────────────────────────
    let body;
    try { body = await request.text(); }
    catch (e) { return new Response("Bad request body", { status: 400, headers: CORS }); }

    // ── Pick upstream URL ──────────────────────────────────────────
    const upstream_url = url.pathname === "/quote" ? JUP_QUOTE_URL : JUP_SWAP_URL;

    // ── Guard: fail fast if secret missing ────────────────────────
    if (!env.JUP_API_KEY) {
      return new Response(JSON.stringify({ error: "JUP_API_KEY secret not set in Worker" }), {
        status: 500, headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // ── Forward to Jupiter ────────────────────────────────────────
    const upstream = await fetch(upstream_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.JUP_API_KEY,
      },
      body: body,
    });

    const data = await upstream.arrayBuffer();

    return new Response(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  },
};
