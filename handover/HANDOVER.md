# Session Handover

## Active Task
Multiple parallel tasks requested mid-session. Status below:

**SWAP CORS FIX — In Progress (not yet committed)**
- Root cause confirmed: Every Jupiter swap POST endpoint blocks browser CORS. No free keyless endpoint exists.
- Decision: Cloudflare Worker proxy (40 lines, free tier 100k req/day) calling `api.jup.ag/swap/v1/swap` with a free Jupiter API key stored as a Worker Secret.
- User already has a Cloudflare account with Workers set up. Need: Cloudflare account ID/subdomain, and user to get a free Jupiter API key from portal.jup.ag.
- Quote endpoint stays on `public.jupiterapi.com/quote` (GET, works fine). Only SWAP POST goes through Worker.
- Worker URL format will be: `https://jup-swap-proxy.{username}.workers.dev`

**UI CHANGES — Not yet started**
- Rename: `SOLANA // SWAP TERMINAL` → `SOLANA // BRANTSWAP TERMINAL` everywhere (title tag, h1, log boot text, ROUTE ENGINE stat row)
- Dropdown hover: already implemented in CSS but still showing in UI — needs audit, may be OS-level that CSS can't override. Proposed fix: replace `<select>` with a custom amber div-based dropdown to bypass OS completely.
- Buy token: add manual contract address input below the dropdown — paste mint, validate (32-44 base58 chars), fetch metadata via `getAccountInfo` + Metaplex, add to list dynamically.

**PUMPSWAP POOL — Partially diagnosed**
- Error was `AccountNotInitialized 3012` on `user_base_token_account`
- Structural constraint: PumpSwap always uses SOL as the quote side — you cannot set SOL as base. Pair must be TOKEN/SOL (NATOR is base, SOL is quote). This is by design in their CPMM.
- Most likely cause: wallet connected in PumpSwap was not `EM864e...` (Account 1), or NATOR ATA was not found. Creator wallet holds NATOR in `CcJVJ76JG9KxdXU2ZZaj2kjD2ik2Ws1R1Uk7V4Hxe77p`.
- Status: pending, user should retry with Account 1 explicitly selected in Phantom.

## Key Decisions Made
- **Amber CRT terminal aesthetic** — non-negotiable. Dark #0a0700 bg, #ffb000 amber text, scanline overlay. No deviating.
- **Nav links = plain text only** — no borders, no backgrounds, just color. HOME is amber (#c87800), others are dim (#7a5200). Hover → #ffb000.
- **Jupiter routing preferred** over Orca/Raydium for swap because it aggregates all liquidity. Use Worker proxy to keep it.
- **Token list: SOL, USDC, NATOR only** as defaults. Wallet tokens merged in after connect. User also wants ability to paste custom mint addresses.
- **Slippage up to 10%** (added per user request; memecoin-friendly).
- **Manual token accounts** (not ATA) for SPL transfers — bypasses ATA program issues on PublicNode.
- **No Jupiter Terminal widget** — user explicitly rejected it. "I want our UI overtop whatever they are doing."
- **Cloudflare Worker for CORS** — user confirmed they already have CF account/Workers set up from another project.
- **RPC priority**: mainnet-beta first (handles jsonParsed best), PublicNode as fallback.
- **Performance**: warmJupiter() on page load pre-opens TCP/TLS; blockhash cached + refreshed every 20s; connect loads SOL + tokens in parallel via Promise.allSettled.

## Files Modified (this session + previous)
| File | Status | Summary |
|---|---|---|
| `swap.html` | Modified, committed | Full rewrite: amber terminal UI, Jupiter quote/swap, BRANTSWAP rename needed |
| `transfer.html` | Modified, committed | Universal SPL transfer, raw fetch RPC, no ATA, nav links, mobile |
| `nator_send.html` | Modified, committed | NATOR-specific send, hardcoded SRC_TA, nav links, mobile |
| `index.html` | Committed | Homepage with 3 tool links, green matrix aesthetic |
| `README.md` | Committed | NATOR origin story |
| `handover/HANDOVER.md` | New | This file |

## Current Branch & Git State
- Branch: `main`
- Clean working tree (no uncommitted changes — all pushed)
- Latest commit: `28b13d3` — "Fix swap 403, remove nav borders, remove dropdown hover highlight"
- Remote: `https://github.com/timbranthover/NatorCoin.git`
- GitHub Pages live at: `https://timbranthover.github.io/NatorCoin/`

## Important Context

### Token / Wallet Facts
- **NATOR mint**: `2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v` (100M supply, 9 decimals, fixed)
- **Creator wallet** (Account 1 / @tbranthover): `EM864eEkcJT8o6JBnodayH71ZdqmRHpDBPZWsoX8WvVu`
- **NATOR source token account**: `CcJVJ76JG9KxdXU2ZZaj2kjD2ik2Ws1R1Uk7V4Hxe77p` (holds ~90M NATOR, hardcoded in nator_send.html)
- **Phone wallet**: `AzZrpNs9K4iW265XgQPgZWdoZaB42KyRxUamSmAGH8Gy` (holds 10M NATOR)
- **Dead/failed mint** (DO NOT USE): `Fv4WvpauMMbvCQ9uqMoS8fjGrYaAqGMqD66TEfU6M2TS` — user accidentally sent ~$20 SOL to this address thinking it was a wallet. It's a program-owned mint account. SOL is unrecoverable.
- **Images**: frog photo at `https://files.catbox.moe/ik1u71.jpg`, metadata at `https://files.catbox.moe/9q60bc.json`

### CORS / API Facts
- `lite-api.jup.ag/swap` → 403 Forbidden (deprecated May 2025)
- `public.jupiterapi.com/swap` → CORS blocked (no CORS headers on POST)
- `api.jup.ag/swap` → requires API key AND has no browser CORS headers (server-side only)
- **Solution**: Cloudflare Worker proxy. 40-line Worker, free tier, injects API key server-side, returns CORS headers to browser.
- Quote endpoint `public.jupiterapi.com/quote` (GET) works fine from browser — keep it.
- `api.mainnet-beta.solana.com` returning 403 in console — this is normal rate-limiting on the free public RPC. sendTransaction calls still succeed via PublicNode fallback. Not a bug.

### Dropdown Hover Bug
- CSS `option:hover` overrides work in Firefox but NOT in Chrome/macOS — OS renders the native dropdown and ignores CSS pseudo-classes.
- The only real fix for Chrome is replacing `<select>` with a custom div-based dropdown.
- This is a known browser limitation, not a code bug.

### PumpSwap Structural Constraint
- PumpSwap CPMM: SOL is always the QUOTE side. You pick your token (NATOR) as base; SOL is fixed as quote. Cannot reverse this.
- Pool creation needs ~0.04 SOL + NATOR. With 0.04 SOL in creator wallet, it's very tight. Consider seeding just 0.01 SOL + 500K NATOR as minimum viable liquidity.

## Pending / Next Steps (ordered)

1. **Cloudflare Worker proxy** — BLOCKING for swap functionality
   - Need from user: their Cloudflare `workers.dev` subdomain (e.g. `username.workers.dev`)
   - User gets free Jupiter API key at https://portal.jup.ag/api-keys (takes 2 min)
   - Deploy Worker: create new Worker in CF dashboard, paste ~40-line script, add `JUP_API_KEY` as secret
   - Update `swap.html`: change `JUP_SWAP` constant from `public.jupiterapi.com/swap` to Worker URL
   - Also update `JUP_QUOTE` to use `api.jup.ag/swap/v1/quote` with key for consistency (or keep public.jupiterapi.com for quote since GET works)

2. **BRANTSWAP rename** — swap.html only
   - `<title>` tag: `SOLANA // BRANTSWAP TERMINAL`
   - `<h1>` text: `SOLANA // BRANTSWAP TERMINAL`
   - Log boot text: `BRANTSWAP TERMINAL v2.1`
   - ROUTE ENGINE stat: `JUPITER / BRANTSWAP`

3. **Custom dropdown** — replace `<select>` in swap.html with div-based dropdown
   - Kills OS hover highlight permanently (can't be done with CSS alone in Chrome)
   - Style: amber border, #0d0900 bg, options as `<div>` rows, hover = amber left-border only, no background fill

4. **Buy token custom address input** — swap.html
   - Below buy token dropdown: text input with placeholder "or paste mint address..."
   - On input: validate base58 length (32-44 chars), fetch `getAccountInfo`, parse Metaplex metadata PDA for name/symbol
   - On valid: add to dropdown and auto-select
   - Error states: "INVALID ADDRESS", "NO METADATA FOUND", "NOT A TOKEN MINT"

5. **PumpSwap NATOR pool** — user action required
   - Ensure Phantom is on Account 1 (`EM864e...`)
   - Go to swap.pump.fun → deposit/create → Create tab
   - Base: NATOR (`2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v`), Quote: SOL
   - Seed with whatever SOL can be spared (even 0.005 SOL works for initial price discovery)

6. **Commit + push** all above changes once complete

## Session Metadata
- Date: 2026-02-19
- Project: NatorCoin — `C:/Users/mpbra/AppData/Local/Temp/NatorCoin`
- GitHub: `https://github.com/timbranthover/NatorCoin`
- Pages: `https://timbranthover.github.io/NatorCoin/`
- Trigger: manual `/handover`
