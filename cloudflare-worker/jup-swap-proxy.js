/**
 * BRANTSWAP — Jupiter Swap Proxy Worker
 *
 * Proxies POST requests to api.jup.ag/swap/v1/swap.
 * Injects Jupiter API key from Worker Secret (never exposed to browser).
 * Returns CORS headers so timbranthover.github.io can call it directly.
 *
 * Deploy:
 *   1. Create new Worker in Cloudflare dashboard (workers.cloudflare.com)
 *   2. Paste this file as the Worker script
 *   3. Set secret: Settings → Variables → Add Secret → JUP_API_KEY = <your key>
 *      Get free key at: https://portal.jup.ag/api-keys (60 req/min free)
 *   4. Note your Worker URL (e.g. jup-swap-proxy.yourname.workers.dev)
 *   5. In swap.html, update: var JUP_SWAP = "https://jup-swap-proxy.yourname.workers.dev";
 */

const ALLOWED_ORIGIN = "https://timbranthover.github.io";
const JUP_SWAP_URL   = "https://api.jup.ag/swap/v1/swap";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
};

export default {
  async fetch(request, env) {

    // ── CORS preflight ──────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Only accept POST ────────────────────────────────────────────
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
    }

    // ── Forward to Jupiter ──────────────────────────────────────────
    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response("Bad request body", { status: 400, headers: CORS_HEADERS });
    }

    const upstream = await fetch(JUP_SWAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.JUP_API_KEY,  // injected from Worker Secret — never visible to browser
      },
      body: body,
    });

    const data = await upstream.arrayBuffer();

    return new Response(data, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  },
};
