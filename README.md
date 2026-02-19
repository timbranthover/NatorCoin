# NATOR

**A Solana frog meme coin, launched entirely from scratch — no pump.fun, no backend, no BS.**

Mint: [`2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v`](https://solscan.io/token/2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v)
Supply: 100,000,000 NATOR (fixed forever, 9 decimals)
GitHub Pages: https://timbranthover.github.io/NatorCoin/

---

## The Story

The goal was simple: launch a Solana SPL token as cheaply as possible, with full control, without handing money or trust to any launchpad platform like pump.fun. Just raw on-chain transactions, a Phantom wallet, and a browser.

The entire tool is a single HTML file. No npm, no Node, no backend server — just `@solana/web3.js` loaded from a CDN, running in a browser tab, signing transactions with Phantom. The page is hosted on GitHub Pages, which makes it free and public.

Getting there took longer than expected.

---

## The Obstacles (and How We Got Past Them)

**RPC rate limits.**
The default Solana mainnet-beta RPC (`api.mainnet-beta.solana.com`) started returning 403s almost immediately. Switched to [PublicNode](https://solana-rpc.publicnode.com), which is free, stable, and doesn't require an API key.

**Phantom extension context invalidation.**
After leaving the browser tab idle for a while, Phantom's injected `window.solana` object stopped responding — signing requests would hang silently. The fix was a full Chrome restart. Not elegant, but it worked.

**GitHub Pages going 404.**
The repo was set to private. GitHub Pages only serves from public repos on the free plan. Made it public, waited a minute, pages came up.

**The Associated Token Program was broken on PublicNode.**
This was the most annoying one. The standard Solana flow for creating a token account uses the Associated Token Program (ATA), which derives a deterministic address from your wallet and mint. On PublicNode's RPC, ATA account creation transactions were failing silently — transactions confirmed but the accounts didn't exist.

The fix: bypass the ATA entirely. Instead of calling the Associated Token Program, we used `SystemProgram.createAccount` to allocate 165 bytes of space at a freshly-generated keypair address, then called `Token.InitializeAccount` directly. This is how SPL tokens worked before ATAs existed. Verbose, but bulletproof.

**`confirmTransaction` timing out.**
Solana's `confirmTransaction` uses a WebSocket subscription internally, which has its own timeout and reconnect issues. After a few failures, we switched to polling: after sending a transaction, the code loops every 2 seconds calling `getSignatureStatus` until it sees `finalized` (or errors out). Slower, but it never silently fails.

**The dead first mint.**
The first successful mint run created a token account, minted 100M NATOR into it — and then the mint authority was revoked. Everything looked fine. But when we checked Solscan later, the token showed supply = 0. What happened: the token account was created at a keypair address that we didn't hold the private key for in the right place, and the account had closed (rent reclaim). The tokens were gone, the mint authority was gone, and there was no way to recover.

Started over with a fresh mint keypair. This time, verified the token account balance before revoking authority.

---

## The Final Working Flow

Five transactions, in order:

**TX1 — Create and Initialize the Mint**
Allocates 82 bytes on-chain for a new mint account using a freshly generated keypair. Sets decimals to 9 and assigns the creator's wallet as mint authority.

**TX2 — Create Metaplex Metadata**
Derives the metadata PDA for the mint and creates it via the Metaplex Token Metadata program. Sets:
- Name: `NATOR`
- Symbol: `NATOR`
- URI: `https://files.catbox.moe/9q60bc.json` (points to the token metadata JSON, which references the frog image)

The frog image is hosted at: https://files.catbox.moe/ik1u71.jpg

**TX3 — Create Token Account + Mint Supply**
Creates a token account manually (SystemProgram.createAccount at a fresh keypair, then InitializeAccount) owned by the creator's wallet. Then calls MintTo: 100,000,000 tokens (with 9 decimal places = `100_000_000_000_000_000` raw units).

**TX4 — Transfer to Phone Wallet**
Creates a token account for a second wallet (same manual method, no ATA), then transfers 10,000,000 NATOR to it.

**TX5 — Revoke Mint Authority**
Calls `SetAuthority` with `AuthorityType.MintTokens` and null new authority. Supply is now fixed forever.

**Total cost: ~0.01–0.015 SOL (roughly $1–2 at the time)**

---

## Token Details

| Field | Value |
|---|---|
| Name | NATOR |
| Symbol | NATOR |
| Decimals | 9 |
| Total Supply | 100,000,000 |
| Mint Authority | Revoked |
| Mint Address | `2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v` |
| Image | https://files.catbox.moe/ik1u71.jpg |
| Metadata JSON | https://files.catbox.moe/9q60bc.json |

Distribution:
- 90,000,000 NATOR — computer wallet (creator)
- 10,000,000 NATOR — phone wallet

---

## What's in This Repo

```
NatorCoin/
├── index.html          # The token launcher — creates mint, metadata, token accounts, mints supply
├── nator_send.html     # Transfer Terminal — send NATOR to any wallet address
└── README.md           # You are here
```

### index.html
The full NATOR launch tool. Connects to Phantom, walks through the five transactions described above. Not needed post-launch, but preserved here as a record of how it was done.

### nator_send.html
An amber CRT-style terminal interface for transferring NATOR. Paste in a destination wallet address, enter an amount, and send. It reads your current NATOR balance dynamically and handles token account creation for the recipient if they don't already have one.

Live at: https://timbranthover.github.io/NatorCoin/nator_send.html

---

## Using the Transfer Terminal

1. Go to https://timbranthover.github.io/NatorCoin/nator_send.html
2. Make sure you have Phantom installed and connected to **Mainnet**
3. Click **Connect Wallet** — your NATOR balance will load automatically
4. Paste a destination Solana wallet address into the recipient field
5. Enter the amount of NATOR to send
6. Click **Send** and approve the transaction in Phantom

If the recipient doesn't have a NATOR token account yet, the terminal will create one for them as part of the same transaction. This costs a small amount of extra SOL (rent for the new account, ~0.002 SOL).

---

## Key Links

- **Solscan token page:** https://solscan.io/token/2VwjCeAc1iZpefKHNj43t1MpNcyr9CsGYtM3FbXSGG9v
- **Transfer Terminal:** https://timbranthover.github.io/NatorCoin/nator_send.html
- **GitHub Pages root:** https://timbranthover.github.io/NatorCoin/
- **Token image:** https://files.catbox.moe/ik1u71.jpg
- **Metadata JSON:** https://files.catbox.moe/9q60bc.json

---

## Technical Notes

- RPC endpoint: `https://solana-rpc.publicnode.com` (free, no API key)
- Token accounts created manually via `SystemProgram.createAccount` + `Token.InitializeAccount` — no Associated Token Program
- Transaction confirmation via polling (`getSignatureStatus`) rather than `confirmTransaction`
- All signing done client-side via Phantom browser extension
- No server, no database, no wallet private keys stored anywhere
