# Luxury X – Simple Competitor Price Comparison

One-click price comparison for **iPhone**, **Samsung Phone** and **MacBook**, with a CSV download.
React + Vite + TypeScript + Tailwind + Lucide on the front end, n8n for reading websites.
**No database**: results live in the browser's memory until the page is refreshed.

```
app/                         React app (static site)
  src/lib/parse.ts           reads model / RAM / storage / chip / cores from titles
  src/lib/match.ts           exact matching, Not Found / Price Unavailable, cheapest competitor
  src/lib/csv.ts             CSV export (the 14 agreed columns)
  src/lib/shops.ts           competitor list per category (as approved by the client)
n8n/
  luxuryx-price-compare.workflow.json   import this into n8n
  extractors.js              the website readers (source of the workflow's Code node)
  build-workflow.mjs         rebuilds the workflow JSON from extractors.js
```

## How it works

1. You press **COMPARE** on a category.
2. The app asks n8n for LuxuryX's products in that category (discontinued products are skipped).
3. The app asks n8n for each of the 7 competitors, 3 at a time, and shows progress.
4. The browser matches products exactly and builds the results table. **Download CSV** saves it.

n8n only reads public pages and public product feeds, about 1–2 requests per second per shop.
It never tries to get past a security check: a blocked site is reported as **Website Inaccessible**.
No price is ever estimated: a missing or zero price is reported as **Price Unavailable**.

A full category usually takes 1–2 minutes (Greenware is the slowest shop, about 90 seconds).

## Setup – step by step

### 1. n8n (self-hosted or n8n Cloud)

1. In n8n: **Workflows → Import from file** → choose `n8n/luxuryx-price-compare.workflow.json`.
2. Open the node **Webhook (GET from the app)** → **Options → Allowed Origins (CORS)**.
   Replace `*` with your app's address, e.g. `https://prices.luxuryx.lk`
   (for testing on your computer you can add `http://localhost:5173`, comma-separated).
3. **Save**, then switch the workflow to **Active / Publish**.
4. Copy the webhook's **Production URL**. It ends in `/webhook/luxuryx-compare`.

Self-hosted n8n: if a shop ever stops with a timeout, raise `N8N_RUNNERS_TASK_TIMEOUT`
(seconds; the default 300 is enough for every shop today).

### 2. The app

```bash
cd app
cp .env.example .env          # then put your Production URL in VITE_N8N_WEBHOOK_URL
npm install
npm run build                 # creates app/dist
```

Upload the `app/dist` folder to any static host (Netlify, Vercel, Cloudflare Pages, cPanel…).
To try it locally instead: `npm run dev` and open http://localhost:5173.

The webhook URL is not a secret. The app contains no keys or passwords.

## Matching rules (client decisions of 13 Nov 2026)

| Category | Must match exactly |
|---|---|
| iPhone | model + storage |
| Samsung Phone | model + RAM + storage (4G/5G is part of A-series model names and is never assumed) |
| MacBook | model + screen size + chip + CPU core count + RAM + storage (+ OLED / nano-texture) |

- Colour is ignored: the lowest price across colours is used on both sides.
- LuxuryX cash price is compared with the shop's cash price where the shop shows one
  (iSpot "Cash / Bank Transfer", Thundermac "Special Cash Offer"); otherwise its listed selling price.
- Official and company-warranty listings are both compared; Match Status states the warranty,
  SIM type (phones) and price type of the listing used, e.g. `Matched – Company warranty · SIM not stated · Listed selling price`.
- MacBook listings that don't state screen size or core count are used only when exactly one
  LuxuryX configuration fits; otherwise the row shows **Not Found**.
- iPlanet → **Not Comparable** (Indian store, ₹ prices) until a Sri Lankan store address is provided.
- Present Solution, Life Mobile → **Website Inaccessible** whenever they block automated access.
- Smartzone gives one reference price per model with no RAM/storage → **Not Found**.

Match statuses: `Matched`, `Not Found`, `Price Unavailable`, `Website Inaccessible`, `Not Comparable`.
Price Difference = competitor price − LuxuryX price (negative = competitor is cheaper).

## Known limits

- iSpot and Smart Mobile don't show stock per option, so Availability says **Not Shown**.
- If a shop redesigns its website, its reader may stop finding products. The app then shows
  that shop as Website Inaccessible with the reason under **Competitor check details**,
  and `n8n/extractors.js` needs a small update.
- Competitors are fixed per category as approved. Changing them needs the client's approval,
  then an edit to both `n8n/extractors.js` (`CATEGORY_SHOPS`) and `app/src/lib/shops.ts`,
  then `node n8n/build-workflow.mjs` and a re-import.

## Checks

```bash
cd app && npm test     # 31 tests: parsing, matching rules, CSV, real titles from the 13 Nov run
```
