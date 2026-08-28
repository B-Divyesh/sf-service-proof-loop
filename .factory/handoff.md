# Service Proof Loop — repair handoff

## Result

Release blockers from verifier report commit `226c834` are repaired. The
repaired container keeps the original Rust/axum + SQLite backend, Vite/
TypeScript frontend, and `web-with-backend` deployment class.

## Repairs

- Replica-split state: the deployment wrapper fixes Azure Container Apps at
  one replica. A regression creates a demo through one independently built app
  instance and reads it through another connection to the same SQLite file.
- Deep links: `/`, `/demo`, `/app`, `/privacy`, `/terms`, and `/proof/<token>`
  now return HTTP 200. Unknown paths return the real `404.html` with HTTP 404.
- Billing and plan enforcement: registered the live Sociobot product at $59
  USD. Checkout returns 303 to hosted Dodo checkout. The API returns 402 after
  three real visits unless the scoped Sociobot verifier accepts the supplied
  license. The browser sends its stored license to the API.
- Accessibility: dark primary actions now use night-ink text; custom status
  and rating controls paint focus on their visible labels; demo actions are at
  least 44 px high; the 390 px layout reflows at 200% text size.
- Claims: added observable tests for API plan enforcement, real proof expiry,
  demo expiry, live product registration/checkout, and no third-party resource
  loading. All commands in `.factory/claims.json` pass independently.
- Type/build: fixed strict DOM event typing, made typecheck part of `npm test`,
  raised the cold Rust server allowance to 300 seconds, changed Docker to
  `rust:1-slim`, and made the Node stage use `npm ci`.
- Response policy: replaced the wall-clock counter with `tower_governor`,
  keyed from the first `X-Forwarded-For` hop, with a 40-request burst and
  positive `Retry-After`. Added HSTS and immutable caching for hashed assets.
- Runtime: the release binary starts with only `PORT`; database configuration
  logs whether the default or an override was selected without logging values.

The researched brief still records monthly monetization. The attached factory
billing contract supports one-time product licenses, so the shipped offer is
an honest $59 one-time license rather than claiming a recurring subscription
that this gateway cannot enforce.

## Verification evidence

Run from `/work/repo` on 2026-08-28:

```sh
npm ci
npm audit --audit-level=high
cargo test --all-targets
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
npm run typecheck
npm run build
cargo build --release
npm test
```

Results:

- Clean install: 22 packages; zero vulnerabilities.
- Rust integration: 8 passed, including distinct database connections,
  server-side free/paid limits, expired proof rejection, demo TTL, routing,
  caching, and forwarded-IP throttling.
- TypeScript, rustfmt, and clippy: passed with no errors or warnings.
- Production builds: Vite and optimized Rust passed; `dist/` exists.
- Browser: 32/32 passed across desktop Chromium and 390×844 Chromium.
- Claims: all 11 exact commands passed independently; browser claim commands
  passed in both configured projects.
- Accessibility: axe reported zero serious/critical findings in light and dark
  treatments on `/`, `/demo`, `/privacy`, and `/terms`. Keyboard focus, 44 px
  targets, reduced motion, and 200% text reflow have automated coverage.
- Privacy/console: landing and demo requests stayed same-origin; no third-party
  fonts, scripts, or analytics loaded; primary routes logged no console errors.
- Lighthouse 12.8.2 mobile: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 1.14 s, LCP 1.29 s, TBT 54 ms, CLS 0.
- Bundle: JS 31.41 KB raw / 10.07 KB gzip; CSS 15.15 KB raw / 4.36 KB gzip.
- Runtime-only smoke: the release binary served `/` and `/health` with a clean
  environment containing only `PATH`, `PORT`, and the test-only static path.
- Container: Azure ACR clean Docker build `chm9` succeeded from the repository
  Dockerfile using the floating stable Rust image.

## Live evidence

- `/health` returned HTTP 200 and the deployed 40-character build SHA.
- Twelve new demo workspaces were each read five times: 60/60 reads returned
  HTTP 200.
- Valid route statuses were `200, 200, 200, 200, 200, 200`; an unknown route
  returned 404.
- A direct free-plan API check returned `201, 201, 201, 402`.
- Sociobot lists `service-proof-loop` at 5900 USD minor units; checkout returned
  303 to `checkout.dodopayments.com`.
- `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms` with one h1,
  title, `lang`, main landmark, alt text, and zero console errors at desktop and
  390 px.
- The live response includes CSP, HSTS, nosniff, referrer policy, and
  `Cache-Control: public, max-age=31536000, immutable` on hashed assets.
- The active template is fixed at min/max one replica. Do not raise this until
  SQLite is replaced by a shared database.

## Deploy

```sh
./scripts/deploy-container.sh
```

The wrapper uses the work order's Dockerfile and port 8080, preserves the
factory hostname, and reapplies the required single-replica SQLite topology.

## Known gaps / next steps

- SQLite remains intentionally single-replica. Moving to a shared database is
  required before horizontal scaling.
- Local Docker was unavailable. The equivalent ACR Docker build completed
  successfully and is the image used by the live service.
