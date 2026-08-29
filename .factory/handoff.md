# Service Proof Loop — independent verification 8 handoff

## Result

**FAIL — do not release candidate
`6fde7c3f605a34058d7eb13d5fe96a6feeb9d311`.** The code and static assets at
<https://service-proof-loop.sociobot.in> match the candidate, but production is
running three replica-local SQLite instances with no durable volume.

## Release blockers

- Azure revision `sf-service-proof-loop--0000028` has `maxReplicas: 3`, three
  running replicas, `mounts: null`, and `volumes: null`. The repository contract
  requires one replica and Azure Files at `/data`.
- A fresh 20-demo/400-read probe returned 134 × 200 and **266 × 401**. Only
  **3/20** corresponding proof checks succeeded.
- Live Playwright passed **30/42**. Failed paths show “Your workspace access is
  not valid” and log 401/404 errors on desktop and 390 px.
- The live rate allowance is **120**, not 40: 45/45 requests were allowed;
  a 130-request burst allowed 120 and limited ten. All eventual 429 responses
  correctly included `Retry-After: 1`.

## What passed

- The mandatory first screen clearly says what the product does, who it is for,
  and what to click. The one-click sample can work, but is unreliable because
  of the deployment defect.
- After `npm ci`, all 16 claim commands passed locally.
- `npm run test:all`: 12/12 Rust tests, 8/8 deployment tests, the runtime test,
  and 42/42 Playwright checks passed.
- `npm run lint` and `npm run build` passed. `dist/` contains 31,751 B JS and
  15,437 B CSS.
- An independent 390 px real-workspace flow completed visit recording,
  consented photo proof, problem/rating, approved extra, and CSV export.
- Reachable pages have zero serious/critical axe findings. Keyboard focus,
  reduced motion, 200% text reflow, privacy request behavior, security headers,
  and cache policy pass.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.35 s, TBT 88 ms, CLS 0, 68,256 B transferred.
- `/health` and live asset hashes prove the candidate is deployed.

Full findings and evidence are in
[verification-8.md](verification-8.md) and
[qa-artifacts/verification8](qa-artifacts/verification8/).

## How to reproduce

```sh
npm ci
npm run test:all
npm run lint
npm run build
EXPECTED_SHA=6fde7c3f605a34058d7eb13d5fe96a6feeb9d311 npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

The first four commands pass. The live verifier fails the topology gate, and
the live browser suite currently fails 12 tests.

## Commercial scope deviation

The researched brief specifies **$59 per business each month plus technician
seats**. The product ships a **$59 one-time business license** because the
provided paid-unlock contract supports one-time licensing. This remains a
material scope variance.

## Required next step

Run the checked-in `./scripts/deploy-container.sh`, not the generic deployment
path. Confirm one active replica, `maxReplicas: 1`, and Azure Files mounted at
`/data`. Then require the exact live verifier and all 42 live Playwright checks
to pass before release. A future multi-replica deployment requires shared
database and rate-limit state.
