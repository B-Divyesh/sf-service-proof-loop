# Service Proof Loop — independent verification 18

## Result

**PASS** for candidate commit `a857121cbae59a0d6f636b2da4ec18223240fb39`
at <https://service-proof-loop.sociobot.in> on 2026-09-02 UTC.

No product source was modified. This report, the handoff, and verification
evidence are the only repository changes.

## First-read and demo gate

The cold live page answers the three required questions in its first screen:

- What it does: “Send proof. Plan the next visit.”
- Who it is for: recurring service teams that need client feedback and
  approved extras without requiring a client app.
- What to do first: “Try it with sample data,” beside “Loads a sample visit.
  Nothing is saved.”

The action opened `/demo` in one click. Five clean browser contexts reached the
seeded Willow Street workspace in 849–893 ms (862 ms mean). The persistent
banner said “Demo — sample data, nothing is saved” and offered both **Reset
demo** and **Start for real**. The first-read and one-click-demo gate passed.

Screenshots are in `.factory/evidence-verification-18/`.

## Claims-first gate

`.factory/claims.json` contains 19 claims and 19 distinct exact commands. After
the documented `npm ci` install, every command was run individually and exited
zero:

| Claims | Result |
| --- | --- |
| `demo-sandbox`, `no-account`, `proof-expiry`, `next-visit-export` | PASS |
| `same-origin-demo`, `configurable-extras`, `paid-license`, `rate-limit` | PASS |
| `plan-limit`, `license-workspace-boundary`, `demo-expiry` | PASS |
| `no-tracking`, `access-token-hashing`, `privacy-data-flow` | PASS |
| `photo-upload`, `problem-rating`, `zero-config-runtime` | PASS |
| `proof-page-privacy`, `deployment-continuity` | PASS |

The live claim probe observed 20/20 seeded proofs and 400/400 simultaneous
authenticated reads. Eight concurrent free-plan writes produced exactly three
`201` responses and five `402` responses. Invalid past dates and blank
checklist labels returned `400`.

## Candidate and deployment identity

| Check | Fresh evidence |
| --- | --- |
| Clean source HEAD | `a857121cbae59a0d6f636b2da4ec18223240fb39` |
| `GET /health` | `200`, `status: ok`, exact full candidate SHA |
| Active deployment | revision `sf-service-proof-loop--0000051`; one active revision; one replica |
| Image | `sociobotregistry.azurecr.io/sf-service-proof-loop:a857121cbae5` |
| Durable state | scoped Azure Files `sf-service-proof-loop-data` mounted at `/data` |
| JS SHA-256 | local and live `1ad43a1278fd92807a427a45ed3a17f54e379e9841a34e5ba24e93570da61c18` |
| CSS SHA-256 | local and live `66ce0eecf6c2a09cdd994ea365930d830fe00bd5530f37770a1525131f517a89` |
| Hero SHA-256 | local and live `ae4634f842108fa6e6fb72b5302216bd96fefae27523a8b77c5477e284f6f955` |

`npm run test:live:persistence` replaced only the product's single live
replica. The replica name changed, health recovered with the candidate SHA,
and the pre-restart demo workspace, visit, and proof all remained readable.

## Local quality gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages installed; 0 vulnerabilities |
| `npm run test:all` | PASS — 13 Rust API/integration tests and 46 desktop/mobile browser tests |
| `npm run typecheck` | PASS, including every claim and aggregate run |
| `npm run lint` | PASS — Rust formatting and Clippy with warnings denied |
| `npm run test:runtime` | PASS — release binary starts with an empty environment on port 8080 |
| `npm run build` | PASS — production `dist/` generated |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |

The verifier image has no Docker, Podman, or Buildah executable, so a second
local container build could not run. The exact Vite production build, Rust
release build, empty-environment runtime test, Dockerfile contract, matching
live assets, and live container build identity were verified.

## Product flow, boundaries, and recovery

An independent live 390 px flow opened the sample proof, selected **Inside
refrigerator**, chose rating 4, saved a comment, and returned to the workspace.
The workspace showed `accepted` and the chosen extra. The downloaded CSV had
the required header, selected extra, and `28.00` price.

Independent invalid-input checks returned “Choose today or a future next visit
date” for a past date and “Photo consent is required before photos can be
shared” for an unconsented upload. Correcting each input then created the proof.
The claim suite also verified the three-photo/1 MB boundaries, problem status,
rating persistence, configurable extras, 14-day proof expiry, 24-hour demo
expiry, and the three-free-visit limit.

Two fresh demo tenants received different workspace and visit IDs. A workspace
token could not export the other workspace's visit (`404`), and an invalid
token received `401`. Proof access tokens and real workspace tokens are tested
as SHA-256-only database values.

The smallest useful product from the brief is present end to end: technician
checklist/photo capture, private client proof, accept/problem/rating, client
extras, and next-visit CSV handoff. Dispatch, payroll, payments, public-review
campaigns, and worker tracking remain out of scope.

## Privacy, security, and request limits

A Playwright request log covering landing, demo creation, proof review, reply,
workspace return, and CSV export contained only
`https://service-proof-loop.sociobot.in`. No analytics, third-party scripts, or
third-party fonts loaded. Normal route checks produced no console or page
errors.

The root response sends CSP with `frame-ancestors 'none'`, HSTS, nosniff,
frame denial, strict-origin referrer policy, and a restrictive permissions
policy. Private proof HTML and API responses both send `Cache-Control: private,
no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`. Hashed JS and CSS
send `Cache-Control: public, max-age=31536000, immutable`.

The product API's fresh 45-request forwarded-IP burst allowed 40 requests and
returned five `429` responses, all with `Retry-After: 1`. The live continuity
probe repeated the 40/5 split and observed 40 allowed plus 90 limited in a
130-request burst. The product-specific Sociobot license-verification route
allowed 30 of 130 simultaneous requests and returned 100 `429` responses with
`Retry-After: 4`.

Checkout registry evidence showed USD 59.00, and the checkout endpoint returned
`303` to `checkout.dodopayments.com`. The accepted commercial variance remains
documented in `.factory/scope-decision.json`: this artifact truthfully sells a
$59 one-time license for one workspace because the supplied billing contract
does not support the researched monthly-plus-seat model.

## Accessibility, mobile, and performance

The fleet `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`: correct
title, `lang=en`, one H1, one main landmark, alt text, and no console errors.
Fresh live axe scans at desktop and 390 px found zero serious or critical
findings on the landing, demo, privacy, terms, 404, and private-proof views.

Keyboard-only navigation reached and activated the demo as the first tab stop
with a visible 3 px solid focus outline. Proof response and rating controls
also showed a 3 px focus outline within the viewport. Measured mobile controls
were at least 44 px; 200% text reflow stayed within 390 px. Reduced-motion
emulation reported `scroll-behavior: auto`, no running animations, and near-zero
transitions.

Fresh Lighthouse 12.8.2 mobile results:

| Metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.2 s |
| LCP | 1.4 s |
| Total blocking time | 70 ms |
| CLS | 0 |
| Total transfer | 69 KiB |

The production build emits 33,629 bytes of JavaScript (10.57 kB gzip), 15,437
bytes of CSS (4.41 kB gzip), no web fonts, and an 18,322-byte hero WebP. All
budgets pass.

## Defects by severity

- Critical: none observed.
- High: none observed.
- Moderate: none observed.
- Low: none observed.
- Verification-environment limitation: no local OCI container engine was
  installed. This did not prevent component build or live image verification.

The product has no sign-in, service worker/PWA contract, library package, or
CLI, so Entra, offline-reload, package-consumer, and CLI checks do not apply.

## Recheck commands

```sh
npm ci
npm run test:all
npm run lint
npm run build
EXPECTED_SHA=a857121cbae59a0d6f636b2da4ec18223240fb39 npm run test:live
EXPECTED_SHA=a857121cbae59a0d6f636b2da4ec18223240fb39 npm run test:live:persistence
```
