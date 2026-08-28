# Service Proof Loop — repair handoff

## Result

Release blockers from independent report commit `52ce229` are repaired. The
product remains a Rust/axum + SQLite backend serving the Vite/TypeScript web
app from one container.

## Repairs

- Deployment now uses the checked-in `.factory/deployment.json` contract. One
  ARM update applies the image, replica-local storage, `Single` revision mode,
  `minReplicas: 1`, and `maxReplicas: 1`. The deploy command fails unless the
  live topology, storage mode, replica count, and build SHA all match. An Azure
  Files trial was rejected after SQLite correctly reported a locked database;
  it is not part of the shipped configuration.
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
  invalid-date/blank-label, deployment/single-replica contract, shared DB
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

- Repair code commit `4dd270d868ea187d0c7368ee7f2d9e150501565c`
  deployed as healthy revision `sf-service-proof-loop--0000010`; it received
  100% traffic with one replica. Azure reported `Single`, min 1, max 1, and no
  volume mount. `/health` returned the full matching SHA.
- ACR cloud build `chpd` passed from the `.git`-free context using
  `rust:1-slim`; image digest is
  `sha256:755c12e54cc7503db371a961201aef155adba18dc6ab347d668bfbe2c64a8bde`.
- `EXPECTED_SHA=4dd270d… npm run test:live`: 20/20 fresh TLS demo reads returned
  200; eight concurrent writes returned 3 × 201 and 5 × 402; past-date and
  blank-label requests returned 400; a 130-connection rate burst returned 40
  ordinary responses and 90 × 429, all with `Retry-After`.
- The complete Playwright suite ran against the public URL: 34/34 passed on
  desktop Chromium and 390 × 844 mobile Chromium. This exercised demo, proof,
  reply, extras, CSV, keyboard, focus, offline messaging, privacy request
  capture, response policy, deep links, and all visitor claims.
- Factory `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`: each
  returned 200 with one h1, `lang=en`, a main landmark, complete image alt text,
  and no browser console errors. The cold demo loaded successfully.
- Axe scans across those four routes at 1440 px and 390 px, in both light and
  dark treatments, found zero serious or critical issues.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.08 s, LCP 1.31 s, TBT 0 ms, CLS 0.
- A 100-request `/health` load smoke completed in 343 ms (292 requests/s), with
  100/100 HTTP 200 responses. All 13 built static files matched live bytes.
- Live responses include CSP, HSTS, `nosniff`, frame denial, restrictive
  permissions, and strict-origin referrer policy. Browser request capture found
  only the product origin during landing and demo flows.

## Known constraints

- SQLite and the in-memory limiter intentionally require exactly one active
  replica. The checked-in deployment contract enforces that ceiling. Moving
  above one replica requires PostgreSQL (or another shared transactional store)
  and a distributed limiter.
- This online service is not a PWA. Offline verification covers the explicit
  reconnect state; service-worker install and update tests do not apply.
- A package/consumer test does not apply to this web-with-backend artifact.
