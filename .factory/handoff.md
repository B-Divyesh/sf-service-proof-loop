# Service Proof Loop — verification 12 handoff

## Result

**FAIL — do not release.** Candidate
`0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80` was independently tested at
`https://service-proof-loop.sociobot.in` on 2026-08-30 UTC.

The source passes all local claims and quality gates, and production serves the
exact candidate. The live `sf-service-proof-loop` deployment has three
ephemeral SQLite writers: `maxReplicas=3`, three live replicas, and no `/data`
mount. Requests lose workspace/proof state across replicas and the per-client
rate allowance is tripled.

## Exact live evidence

- `/health` returns the full candidate SHA.
- Image: `sociobotregistry.azurecr.io/sf-service-proof-loop:0e02b1e9c27c`.
- Revision `sf-service-proof-loop--0000039` is active with three replicas.
- 20 demos → 136/400 successful workspace reads and 6/20 successful proofs.
- Eight concurrent free writes → 3 × 201 and 5 × 401, not 3 × 201 and 5 × 402.
- 45-request burst → 45 allowed and 0 limited.
- 130-request burst → 120 allowed and 10 limited; 429s include `Retry-After: 1`.
- Live Playwright → 25 passed, 17 failed across desktop and 390 px.
- Failed users see “Visits could not load — Your workspace access is not
  valid,” and the console records the same-origin 401.

Full findings: [.factory/verification-12.md](verification-12.md).

## Local verification

All of the following passed from the clean candidate:

```sh
npm ci
# every command in .factory/claims.json, run separately
npm run test:all
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

That covers 16/16 claims, 12 Rust tests, 23 Node/runtime tests, 42 Playwright
tests, Rustfmt, Clippy, TypeScript, the production build, and dependency audit.
A fresh local release server also passed normal, invalid, recovery, tenant
isolation, boundary, export, and concurrent-plan checks.

No product source was modified. No Docker-compatible engine is installed, so
the container was not rebuilt locally; the exact candidate container is live.

## First-read, privacy, accessibility, and performance

The cold first screen passes: it states the job, audience, and “Try it with
sample data” action in plain words on desktop and 390 px. The initial click
worked, but the demo fails after live scale-out and is therefore not reliable.

Requests stayed on the product origin, no cookies were set, demo state used
only `sessionStorage`, and real `localStorage` remained empty. Security headers
and asset caching pass. Reachable pages have no serious/critical axe findings;
local keyboard, visible focus, reduced motion, 44 px targets, and 200% reflow
pass. Lighthouse scored 100/100/100/100 with 1.201 s LCP and 0 CLS. Initial JS
is 10.14 kB gzip and CSS is 4.41 kB gzip.

## Required next step

Redeploy only through `./scripts/deploy-container.sh`, restoring the `/data`
mount and one-replica ceiling. Then require both commands to pass after
sustained load:

```sh
EXPECTED_SHA=0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80 npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Do not raise the replica count unless both SQLite state and rate-limit state
move to a shared service.

The researched subscription-plus-seats model still differs from the accepted
$59 one-time license recorded in `.factory/scope-decision.json`.
