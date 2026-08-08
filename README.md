# ClearLend — Identity-Powered DeFi Lending

ClearLend is an identity-gated DeFi lending platform built on the Cleanverse compliance infrastructure. Borrowers use Cleanverse Verified Identity (CVI / A-Pass) and Cleanverse Verified Assets (CVA / A-Token) to access a lending pool where verified users borrow with less collateral and better interest rates — simply by proving who they are.

- Gate all access behind a valid A-Pass credential
- Compute a Reputation Score (0–100) from CVI status + CVA history
- Five borrowing tiers from Unranked → Bronze → Silver → Gold → Platinum
- Lender pool accepting verified A-Token deposits with pro-rata yield
- Full on-chain audit trail for every loan event
- Deployed for Base network (testnet demo for hackathon)

## Stack

- **Frontend**: React 19 + TanStack Router + React Query + Tailwind CSS v4
- **Backend**: h3 via TanStack Start (serverless, Vercel-compatible)
- **Identity / Assets**: Cleanverse CVI (A-Pass) + CVA (A-Token) sandbox API
- **Deployment**: Vercel (free tier — SSR + API routes)

## Development

You need Node.js (v20+) and npm / pnpm / bun.

```sh
git clone <this-repository-url>
cd <repository-name>
cp .env.example .env.local   # fill in Cleanverse sandbox keys
npm install
npm run dev
```

Then open http://localhost:5173.

## Cleanverse integration

See `src/lib/clearlend/api.ts` for the API client and `src/server-functions` for server-side wrappers. Required env vars:

- `CLEANVERSE_API_ID` — Sandbox API Id
- `CLEANVERSE_API_KEY` — Sandbox API key
- `CLEANVERSE_BASE_URL` — API base (defaults to sandbox endpoint)
- `APP_NETWORK` — Target chain (default `Base`)

Docs: https://docs.cleanverse.com/ (access code required — see hackathon brief).

## Scripts

| Script            | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Vite + HMR dev server                                    |
| `npm run build`   | Production build (client + SSR)                          |
| `npm run preview` | Preview the built app locally                            |
| `npm run lint`    | ESLint pass                                              |
| `npm run start`   | Run the SSR server entry (used on Vercel / Node deploys) |

## Deployment — Vercel

The project is a standard Vite SSR app with an h3 entry (`src/server.ts`). To deploy:

1. Push the repo to GitHub / GitLab.
2. Import the project in Vercel.
3. Set the framework preset to **Vite** (or Other).
4. Under _Environment Variables_ set `CLEANVERSE_API_ID`, `CLEANVERSE_API_KEY`, `CLEANVERSE_BASE_URL`, `NEXT_PUBLIC_SITE_URL` (optional).
5. Build command: `npm run build`
6. Output directory: `dist/client`
7. Install command: `npm install`
8. Deploy.

The free tier works — Cleanverse API calls are proxied through server functions so API keys never reach the browser.

## Project layout

```
src/
├─ components/
│  ├─ clearlend/      Brand shell, score ring, tier badge, logo
│  └─ ui/             shadcn-style primitives (card, button, dialog, …)
├─ lib/clearlend/
│  ├─ api.ts          Cleanverse REST client (CVI + CVA endpoints)
│  ├─ store.tsx       Context store with state + side effects
│  ├─ types.ts        Tiers, loans, audit, notifications, pool constants
│  └─ format.ts       USD / token / date helpers
├─ routes/            TanStack file-based router
│  ├─ index.tsx       Landing page
│  ├─ connect.tsx     Wallet connect + identity gate
│  ├─ verify.tsx      A-Pass onboarding flow
│  ├─ faq.tsx
│  ├─ app.tsx         App shell + identity gate re-check
│  ├─ app.index.tsx   Dashboard
│  ├─ app.score.tsx   Reputation score breakdown
│  ├─ app.borrow.tsx  Loan calculator + borrow flow
│  ├─ app.loans.tsx   Active / history loans + repay
│  ├─ app.lend.tsx    Lender deposit / withdraw
│  ├─ app.analytics.tsx
│  ├─ app.leaderboard.tsx
│  ├─ app.audit.tsx   On-chain audit trail
│  ├─ app.notifications.tsx
│  └─ app.settings.tsx
├─ server-functions/  h3 server functions (proxy Cleanverse calls)
├─ server.ts          SSR entry (exports a `fetch` handler)
└─ start.ts           TanStack Start middleware setup
```

## Licence

MIT — see `LICENCE` (add file in repo root).
