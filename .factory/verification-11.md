# Independent product verification 11 — FAIL

Verified on 2026-08-30 against candidate
`76bb34982a36bc6de33ffec0e9400e652847c5be` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The candidate is healthy in a clean local checkout,
and production serves its exact frontend and build identity. The live Container
App does not satisfy the candidate's mandatory durable single-writer contract.
It runs three ephemeral SQLite replicas with three independent rate buckets.

This is user-visible, not a configuration-only concern. A fresh connection per
request produced 140/400 successful authenticated workspace reads, 260/400
`401` responses, 0/20 matching proof reads, and 2 x `201` plus 6 x `401`
concurrent writes. After that load, fresh desktop and 390 px one-click demos
both ended at **“Visits could not load — Your workspace access is not valid.”**
The live Playwright suite passed only 8/42 cases.

## Mandatory first-read and one-click demo gate

The cold first screen passes the plain-words portion:

- **What it does:** “Send proof. Plan the next visit.”
- **For whom:** recurring service teams that need client feedback and approved
  extras without another customer app.
- **What to click:** “Try it with sample data,” followed by “Loads a sample
  visit. Nothing is saved.”

The action and all three facts are visible in the first desktop viewport. One
early low-load click reached the seeded “Completed visits” workspace in about
346 ms. After normal multi-request load activated the configured replicas, the
same fresh action failed on both desktop and mobile with a `401` console error.
The persistent demo banner, reset action, separate `sessionStorage` key, and
empty real-workspace storage were present. Because the mandatory demo is not
reliably usable, the deployed candidate fails this gate.

Evidence: `verification-evidence-11/first-read.json`,
`verification-evidence-11/one-click-timing.json`,
`verification-evidence-11/live-desktop-after-demo.png`, and
`verification-evidence-11/live-mobile-after-demo.png`.

## Release-blocking findings

### Critical — production runs three ephemeral SQLite writers

The SHA-pinned `EXPECTED_SHA=76bb... npm run test:live` failed immediately with
“maximum replica count drifted from the deployment contract.” Fresh Azure
evidence showed:

| Property | Required | Observed |
| --- | --- | --- |
| Image | candidate tag | `sf-service-proof-loop:76bb34982a36` |
| Ready revision | current | `sf-service-proof-loop--0000037` |
| Revision mode | Single | Single |
| Minimum replicas | 1 | 1 |
| Maximum replicas | 1 | **3** |
| Running replicas | 1 | **3** |
| `/data` Azure Files mount | present | **none** |
| Template volume | present | **none** |

This directly contradicts `.factory/deployment.json`, the README deployment
contract, and the backend's SQLite persistence boundary. The live health route
does return the full candidate SHA.

Evidence: `verification-evidence-11/live-verifier.log`,
`verification-evidence-11/live-topology.json`,
`verification-evidence-11/live-revisions.json`, and
`verification-evidence-11/live-replicas.json`.

### Critical — workspace, proof, and plan state is split across replicas

The release verifier's fresh-connection strategy was repeated independently:

| Live check | Required | Observed |
| --- | ---: | ---: |
| Demo creation | 20/20 | 20/20 |
| Authenticated workspace reads | 400/400 | **140/400** |
| Unauthorized reads | 0 | **260** |
| Matching proof reads | 20/20 | **0/20** |
| Concurrent free writes | 3 x 201 + 5 x 402 | **2 x 201 + 6 x 401** |
| Live desktop/mobile suite | 42/42 | **8/42** |

The browser failures include the landing-to-demo path and the demo-sandbox,
no-account, CSV export, configurable extras, privacy flow, photo upload,
problem/rating, rate-limit, no-tracking, console, and proof accessibility
checks in both viewports. The common visible state is a saved demo token whose
next request reaches a replica that does not know it.

Evidence: `verification-evidence-11/live-impact.json`,
`verification-evidence-11/live-playwright.log`, and the desktop/mobile failed
demo screenshots.

### Major — deployed request allowance is tripled

The documented product allowance is a burst of 40 requests per forwarded
client, then `429` with `Retry-After: 1`. Fresh connection bursts observed:

| Burst | Allowed | 429 | Correct `Retry-After` |
| --- | ---: | ---: | ---: |
| 45 | **45** | 0 | n/a |
| 130 | **120** | 10 | 10/10 |

Thus a single client can make 120 requests before limiting, because each live
replica owns a separate 40-request bucket. This fails the backend rate-limit
acceptance contract even though header behavior is correct once limiting
begins.

Evidence: `verification-evidence-11/live-impact.json`.

## Claims gate

`.factory/claims.json` exists with 16 entries. Each ID has exactly one source
test tagged `@claim:<id>` or one exact named Rust/runtime test. After clean
`npm ci`, every listed command was run verbatim and all 16 passed locally.

| Claim | Clean candidate | Live consequence |
| --- | --- | --- |
| demo-sandbox | PASS | FAIL after scale; seeded workspace often returns 401 |
| no-account | PASS | FAIL live proof flow |
| proof-expiry | PASS | Not contradicted |
| next-visit-export | PASS | FAIL live workflow |
| same-origin-demo | PASS | Same-origin remains true; demo fails to load |
| configurable-extras | PASS | FAIL live workflow |
| paid-license | PASS | Registry is $59 USD; checkout returns 303; restore path passes |
| rate-limit | PASS at 40 | FAIL live; observed allowance 120 |
| plan-limit | PASS | FAIL live; authorization splits before plan result |
| demo-expiry | PASS | Not contradicted |
| no-tracking | PASS | Same-origin remains true; demo fails to load |
| access-token-hashing | PASS | Not contradicted |
| privacy-data-flow | PASS | FAIL live workflow |
| photo-upload | PASS | FAIL live workflow |
| problem-rating | PASS | FAIL live workflow |
| zero-config-runtime | PASS | Not contradicted |

Exact per-claim logs and the result table are under
`verification-evidence-11/claims/`. Landing, legal, demo documentation, and
README claims were cross-checked; no material unlisted product claim was found.

## Clean local quality gates

| Check | Result |
| --- | --- |
| Candidate before QA | exact SHA; clean tree |
| `npm ci` | PASS — 22 packages, 0 vulnerabilities |
| `npm run test:all` | PASS — 12 Rust, 18 Node, runtime, 42 Playwright |
| `npm run lint` | PASS — rustfmt and Clippy with warnings denied |
| `npm run typecheck` | PASS |
| Exact `npm run build` | PASS; `dist/` produced |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| All 16 claim commands | PASS |
| Docker execution | Not run; no Docker or Podman engine is installed |

The live candidate container and `/health` prove that the multi-stage image was
built and runs. Static review confirms `rust:1-slim`, `.git`-independent build,
non-root runtime, `PORT=8080`, and build-argument identity.

## Independent functional, boundary, and recovery checks

A fresh local release process completed the smallest useful loop:

1. Created an isolated business workspace and extras at the accepted $0 and
   $1,000 boundaries; -$0.01 and $1,000.01 were rejected.
2. Rejected past and malformed dates, empty and blank checklists, a photo
   without consent, four photos, and 601-character notes with actionable 400s.
3. Accepted three consented photos and exactly 600 note characters.
4. Rejected an invalid reply state, ratings 0 and 6, and seven extras; a valid
   problem reply with rating 2 then saved successfully.
5. Returned that reply and a $1,000 extra to the workspace and CSV.
6. Returned 404 when another tenant tried to export that visit.
7. Enforced three free visits atomically (3 x 201, 5 x 402 under concurrency).
8. Enforced the local 40-request allowance (40 x 404, 5 x 429, every 429 with
   `Retry-After: 1`).

The Rust integration suite separately passed durable restart persistence,
hashed access tokens, proof expiry, demo TTL, and health/build identity.
Evidence: `verification-evidence-11/local-boundary-flow.json` and
`verification-evidence-11/test-all.log`.

## Accessibility, privacy, security, routing, and performance

- Local axe, keyboard, dark-mode, 200% text reflow, 44 px target, and proof
  interaction checks passed in desktop and 390 px projects.
- Fresh live landing and error-state axe scans found no serious or critical
  findings. Both viewports have one `h1`, one `main`, `lang=en`, no horizontal
  overflow, and designed 3 px apricot focus outlines.
- Reduced-motion media matched, left no active animation, and used automatic
  rather than smooth scrolling.
- Live landing/demo requests stayed on the product origin. There were no
  cookies, analytics, third-party scripts, or third-party fonts. Demo access
  remained in `sessionStorage`; real workspace storage remained empty.
- The live failed demo logs a 401 console error, so the no-console-error gate
  fails even though there are no JavaScript page errors.
- HTML, API, asset, and 404 responses include CSP, HSTS, `nosniff`, frame
  denial, strict-origin referrer policy, and camera/microphone/geolocation
  denial. Valid routes return 200 and an unknown route returns the styled 404.
- Live HTML, JS, CSS, and hero SHA-256 values exactly match local `dist/`.
  JS is 31,751 B (10.15 kB gzip), CSS 15,437 B (4.41 kB gzip), the hero is
  18,322 B, and there are no web fonts. Hashed JS/CSS use one-year immutable
  caching; the hero uses one-day caching.
- Fresh mobile Lighthouse: Performance 99, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.201 s, LCP 1.355 s, TBT 107 ms, CLS 0, 68,288 B transfer.

Evidence: `verification-evidence-11/live-browser-audit.json`,
`verification-evidence-11/live-headers-hashes-bundles.log`, and
`verification-evidence-11/lighthouse-summary.json`.

This is not a PWA, library, or CLI. It makes no offline-reload claim and has no
service worker. It has no sign-in, so Entra is not applicable. It has no
runtime AI feature; the brief does not imply a missing AI step.

## Commercial contract note

The researched opportunity says $59 per business each month plus technician
seats. The supplied paid-unlock work-order contract supports a $59 one-time
business license and no seat model. `.factory/scope-decision.json` records the
previous work order's explicit acceptance of that variance. Product copy and
the live Sociobot registry truthfully match the accepted one-time delivery.
This is a material researched-scope variance, but it is not the cause of this
verification's release failure.

## Required remediation

1. Redeploy this exact source through `./scripts/deploy-container.sh` so
   `service-proof-loop-data` is mounted at `/data`, revision mode is Single,
   and min/max replicas are 1/1.
2. Require the SHA-pinned live verifier to pass topology, 400/400 workspace
   reads, 20/20 proofs, 3 x 201 plus 5 x 402 writes, validation, and both rate
   bursts.
3. Run the full live Playwright suite after the load probes and require 42/42,
   including desktop and 390 px one-click demos with zero console errors.
