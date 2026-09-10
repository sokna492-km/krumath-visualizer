# KruMath Visualizer

Interactive mathematics demonstration tool for the classroom — part of [KruMath](https://krumath.com).

**Production URL:** `https://krumath.com/math-visualizer`  
**Auth:** soft gate — anyone can use the app; **Export PNG** requires a signed-in (non-anonymous) KruMath account.

## What it is

KruMath Visualizer helps teachers explain secondary-school mathematics on a large screen. Open one page, pick a concept, and walk students through it live: adjust equations, move points, change parameters, show or hide elements, and reset when you need a fresh start.

## Local development

```bash
npm install
cp .env.example .env   # optional for local DEV; soft gate is skipped in DEV
npm run dev
```

Dev server: `http://localhost:8080/math-visualizer/` (Vite `base` is `/math-visualizer/`).

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Production | Same Supabase project as KruMath (`NEXT_PUBLIC_SUPABASE_URL`) |
| `VITE_SUPABASE_ANON_KEY` | Production | Same as KruMath anon key |
| `VITE_KRUMATH_ORIGIN` | Optional | e.g. `http://localhost:3000` so sign-in / home hit local KruMath |

Vite embeds `VITE_*` at **build time**. Changing keys requires rebuild + redeploy. Never commit `.env`.

## Soft gate

- Browse concepts, edit, animate, and use presentation mode without signing in.
- **Export PNG** (graph toolbar) calls `requireSignedInForAction`:
  - **DEV:** always allowed
  - **Production:** unsigned / anonymous → `/sign-in?returnUrl=/math-visualizer`
- Home links point at `https://krumath.com/home` (or `VITE_KRUMATH_ORIGIN/home`).

See [KRUMATH_GAME_INTEGRATION.md](./KRUMATH_GAME_INTEGRATION.md) for the full host integration playbook.

## Deploy (Cloudflare Worker)

```bash
# Set VITE_SUPABASE_* in the environment for the build
npm run deploy
```

Worker name: `math-visualizer` ([wrangler.toml](./wrangler.toml)).

### Operator checklist

1. Build/deploy with Supabase env present.
2. Cloudflare route (more specific than main `krumath` Worker):

   `krumath.com/math-visualizer*` → `math-visualizer`

3. Smoke-test: browse unsigned OK; Export redirects to sign-in; after sign-in, Export works; assets load from `/math-visualizer/assets/...`.
4. Maintainer adds a home card on `krumath.com/home` (KruMath monorepo — **not** this repo).

## Topics covered

Functions, coordinate geometry, geometry, transformations, vectors, trigonometry, calculus, inequalities, sequences and series, statistics, probability.

## Contributing

Contributions are welcome. Keep the focus on clarity and usefulness for classroom teaching.

## About KruMath

KruMath is an educational mathematics platform. This visualizer is one piece of that work: making abstract ideas easier to see, touch, and talk about in real lessons.
