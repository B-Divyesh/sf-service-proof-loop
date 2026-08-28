# Service Proof Loop — repair handoff

## Result

Release blockers from independent report commit `52ce229` are repaired. The
product remains a Rust/axum + SQLite backend serving the Vite/TypeScript web
app from one container.

## Repairs

- Deployment now uses the checked-in `.factory/deployment.json` contract. One
  ARM update applies the image, `Single` revision mode, `minReplicas: 1`,
  `maxReplicas: 1`, and the existing `service-proof-loop-data` Azure Files
  mount at `/data`. The deploy command fails unless the live topology, mount,
  replica count, and build SHA all match.
- The free-plan decision and visit insert are one conditional SQLite write.
  Eight simultaneous unlicensed writes now create exactly three visits; the
  other five return 402. A valid fixture license still permits later visits.
- With one active replica, the forwarded-IP rate limiter has one shared live
  allowance. Every API route remains limited; `/health` remains exempt; 429
  responses include `Retry-After`.
- The API rejects dates before today and rejects blank or whitespace-only
  checklist labels. Checklist labels are trimmed and limited to 120 characters.
- The header wordmark, navigation links, and footer links now expose at least
  44 × 44 CSS px touch targets at a 390 px viewport.
- `scripts/verify-live.mjs` preserves the fresh-connection replica, concurrent
  plan-limit, semantic validation, rate-limit, and identity probes.

## Reproduction and regression evidence

Before the fix, the focused regression tests observed seven 201 responses from
eight simultaneous free writes; a past date also returned 201. After the fix:

- `npm ci`: 22 packages installed; `npm audit --audit-level=high`: 0 issues.
- `npm run typecheck`: pass.
- `npm run lint`: rustfmt and Clippy with warnings denied pass.
- `npm run build`: pass; `dist/` produced. JS 31.40 KB raw / 10.07 KB gzip;
  CSS 15.29 KB raw / 4.38 KB gzip.
- `cargo test --all-targets`: 10/10 pass, including atomic concurrency,
  invalid-date/blank-label, persistent-data/single-replica contract, shared DB
  access, rate limiting, expiry, deep-link, and identity regressions.
- `npm test`: 34/34 pass on desktop Chromium and a 390 × 844 mobile viewport.
  This includes the full demo-to-proof-to-next-visit flow, keyboard/focus,
  serious/critical axe scans, 200% reflow, privacy request capture, offline
  messaging, response headers, deep links, dark mode, and 44 px targets.
- `cargo build --release`: pass.
- Release binary launched with only `PATH` and `PORT`; `/health` and `/`
  returned 200.
- Local `npm run test:live`: 20/20 fresh-connection demo reads returned 200;
  concurrent plan statuses were 3 × 201 and 5 × 402; both semantic validation
  probes returned 400; 130 fresh connections yielded 40 ordinary responses and
  90 rate-limited responses with `Retry-After`.

Run the local gates:

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
npm run build
cargo test --all-targets
cargo build --release
npm test
```

Run the live repair probe after deployment:

```sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
```

## Live deployment evidence

To be recorded after deploying the committed repair.

## Known constraints

- SQLite and the in-memory limiter intentionally require exactly one active
  replica. The checked-in deployment contract enforces that ceiling. Moving
  above one replica requires PostgreSQL (or another shared transactional store)
  and a distributed limiter.
- This online service is not a PWA. Offline verification covers the explicit
  reconnect state; service-worker install and update tests do not apply.
- A package/consumer test does not apply to this web-with-backend artifact.
