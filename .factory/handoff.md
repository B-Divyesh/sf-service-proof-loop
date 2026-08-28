# Service Proof Loop — handoff

## What shipped

- A responsive landing page and working product with the “glacial minimal
  ceramics” visual system, original generated hero art, social image, favicon,
  dark treatment, and reduced-motion behavior.
- A Rust/Axum service with SQLite migrations, structured logs, graceful
  shutdown, tenant-scoped workspace tokens, hashed proof tokens, 14-day proof
  expiry, input limits, security headers, and forwarded-IP rate limiting.
- A technician flow for visit details, checklist completion, consented photo
  uploads, notes, next date, and private proof-link creation.
- A no-account client proof page with evidence, accept/problem choices, a
  1–5 rating, comments, and configurable extra choices.
- A business workspace where replies and approved extras appear beside the next
  visit, plus a CSV export that carries those extras forward.
- An isolated one-click demo at `/demo`. Each reset provisions a random
  workspace with a 24-hour TTL and realistic sample data.
- A $59 monthly business tier using Sociobot checkout and license verification.
  A free workspace can record three visits. Paid status adds unlimited visits.
- Privacy, terms, 404, route metadata, crawler files, and complete run and
  deployment documentation.

## Verification

Run from `/work/repo`:

```sh
npm install
npm run build
cargo test
npm test
```

Verified on 2026-08-28:

- `npm run build`: pass; output in `dist/`.
- Initial JavaScript: 31.39 KB raw / 10.06 KB gzip.
- CSS: 14.70 KB raw / 4.30 KB gzip.
- Hero WebP: 18.32 KB. Social image: 73.99 KB.
- `cargo test`: 3 integration tests passed.
- `npm test`: 24 browser tests passed across desktop Chromium and a 390 px
  mobile viewport.
- All eight entries in `.factory/claims.json` pass through their listed grep
  commands as part of the browser suite.
- Axe WCAG A/AA scan: no serious or critical findings on the landing and client
  proof pages at both viewports.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.2 s, CLS 0, total blocking time 0 ms.
- Security headers were confirmed on the built service. The CSP permits only
  this origin plus the Sociobot license endpoint.
- Load smoke: 1,000 `/health` requests at concurrency 50 returned HTTP 200.
  The local run sustained 234 requests per second.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- The image was visually reviewed. It has no text artifacts, logos, people, or
  broken geometry.

The local worker did not include a Docker executable, so `docker build` could
not run here. Both build stages were verified separately: `npm run build` and
`cargo test`/`cargo build`. The Dockerfile uses Rust 1.88, Node 22, a non-root
runtime user, `/data` for SQLite, and the required `BUILD_SHA` argument.

## Operations

- The container starts with only `PORT` and defaults to port 8080.
- `/health` returns the embedded build SHA and is exempt from rate limits.
- SQLite defaults to `/data/service-proof-loop.db`.
- Demo workspaces expire after 24 hours and are removed during later demo
  provisioning.
- Generated image source and its prompt live in `assets/src/`. Runtime variants
  are generated in `frontend/public/assets/`.

## Known gaps and next steps

- Workspace access is possession-based and stored in one browser. Add team
  account login and invitations before supporting distributed technician teams.
- Photo files are size-limited but stored in SQLite as data URLs. Move them to
  first-party object storage before high-volume use.
- Demo expiry cleanup is opportunistic. Add a scheduled cleanup when demo
  volume justifies it.
- The factory still needs to register the billing product and set its return
  URL before production checkout can complete.
