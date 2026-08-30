# Independent verification 12 — Service Proof Loop

**Result: FAIL**

Verified on 2026-08-30 UTC.

- Candidate: `0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80`
- Live URL: `https://service-proof-loop.sociobot.in`
- Artifact: web with Rust/Axum backend and SQLite
- Product source changed during QA: no

The candidate code is healthy locally, and the live site serves the exact
candidate bytes. Production is not configured to run that code safely. The
allowed `sf-service-proof-loop` app has three live replicas, permits three
replicas, and has no `/data` volume mount. Each replica therefore has separate
SQLite data and a separate in-memory rate limiter. The product loses access to
newly created workspaces and proofs as requests move between replicas.

## Release-blocking findings

### Critical — production splits customer state across three ephemeral writers

The mandatory SHA-pinned live verifier failed immediately:

```text
Error: maximum replica count drifted from the deployment contract
image: sociobotregistry.azurecr.io/sf-service-proof-loop:0e02b1e9c27c
revision: sf-service-proof-loop--0000039
min/max replicas: 1/3
mounts: null
volumes: null
```

A separate scoped read of `sf-service-proof-loop` found one active revision
with three live replicas. Fresh independent load then produced:

- 20/20 demo creations returned 200.
- Only 136/400 authenticated workspace reads returned 200; 264 returned 401.
- Only 6/20 matching proof reads returned 200; 14 returned 404.
- Eight concurrent free-plan writes returned 3 × 201 and 5 × 401, instead of
  the required 3 × 201 and 5 × 402.
- The full live Playwright run passed 25/42 and failed 17/42.

The browser failure is clear on both viewports: **“Visits could not load — Your
workspace access is not valid.”** Failed loads also emit a same-origin 401 in
the browser console. Photo upload, problem/rating, proof creation, the privacy
data flow, demo claims, and live accessibility flows cannot complete reliably.

Evidence: [topology](verification-evidence-12/live-topology.json),
[load probes](verification-evidence-12/live-probes.json), and
[failed demo capture](verification-evidence-12/verify-demo/screenshot-mobile.png).

### High — the documented per-client request allowance is tripled live

The local limiter allows 40 requests per forwarded client and returns 429 with
`Retry-After: 1` after that. Production maintains one limiter per replica:

- 45-request burst: 45 allowed, 0 limited.
- 130-request burst: 120 allowed, 10 limited.
- Every observed 429 included `Retry-After: 1`.

The observed production allowance is therefore 120, not the documented 40.
This independently violates the mandatory server-endpoint rate-limit contract.

## First-read and demo test

The cold first screen itself passes the plain-words test at desktop and 390 px:

- What it does: **“Send proof. Plan the next visit.”**
- For whom: recurring service teams needing client feedback and approved
  extras without another customer app.
- What to click: **“Try it with sample data,”** beside **“Loads a sample visit.
  Nothing is saved.”**
- Three visible facts cover proof expiry, account-free client links, and price.

The initial cold click opened the realistic Willow Street sample, showed the
persistent demo banner, and exposed Reset demo and Start for real. Under the
required live browser run, later one-click demos failed after replicas scaled.
The existence of a good first screen does not make the required demo reliable.

Evidence: [first-read record](verification-evidence-12/first-read.json),
[desktop](verification-evidence-12/first-read-desktop.png), and
[390 px](verification-evidence-12/first-read-mobile.png).

## Claims gate

`.factory/claims.json` exists with 16 entries. Every listed command was run
separately from the clean candidate before other product QA. All 16 passed
locally. Each browser claim ran in both desktop and 390 px projects.

| Claim | Clean candidate | Live consequence |
| --- | --- | --- |
| demo-sandbox | PASS | FAIL under load; new demo token often receives 401 |
| no-account | PASS | Client proof is not reliably reachable |
| proof-expiry | PASS | Not contradicted |
| next-visit-export | PASS | End-to-end live flow is unreliable |
| same-origin-demo | PASS | Requests remain same-origin, including failed requests |
| configurable-extras | PASS | Live workspace can lose authorization |
| paid-license | PASS | Registry price, checkout redirect, and restore path pass |
| rate-limit | PASS at 40 | FAIL live; allowance observed at 120 |
| plan-limit | PASS | FAIL live; writes split into 201 and 401 |
| demo-expiry | PASS | Not contradicted |
| no-tracking | PASS | No tracking observed; demo can still fail with 401 |
| access-token-hashing | PASS | Not contradicted |
| privacy-data-flow | PASS | Live test failed |
| photo-upload | PASS | Live test failed |
| problem-rating | PASS | Live test failed |
| zero-config-runtime | PASS | Empty-environment runtime starts on port 8080 |

Landing, legal, demo, and README copy were cross-checked. Material behavior
claims map to the claims file; no new unlisted product claim was found.

## Clean local quality gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, 0 vulnerabilities |
| every exact command in `.factory/claims.json` | PASS — 16/16 |
| `npm run test:all` | PASS — 12 Rust, 23 Node/runtime, 42 browser tests |
| `npm run lint` | PASS — rustfmt and Clippy with warnings denied |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — `dist/` produced |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| production container build | Not rerun; no Docker-compatible engine installed |

The Dockerfile statically follows the supplied contract: floating `rust:1-slim`,
multi-stage build, `.git`-independent inputs, `BUILD_SHA=dev`, non-root runtime,
and port 8080. The exact candidate image is running live, which proves the
production image built and started.

## Independent functional and boundary checks

A fresh local release server and SQLite database completed the smallest useful
loop: demo workspace → configurable extra → consented photo/checklist visit →
private proof → invalid reply → recovered problem/rating 2 → approved $1,000
extra → workspace → next-visit CSV. The CSV contained the exact client,
location, extra, and `1000.00`; another tenant received 404 for that export.

The API rejected a missing token, negative and over-$1,000 prices, past and
malformed dates, empty and blank checklists, a photo without consent, four
photos, and 601-character notes. It accepted $0/$1,000, three photos, and 600
characters. Eight simultaneous free writes produced exactly 3 × 201 and 5 ×
402 locally. The Rust integration suite also confirms restart persistence,
14-day proof expiry, 24-hour demo expiry, token hashing, and build identity.

Evidence: [local boundary flow](verification-evidence-12/local-boundary-flow.json).

## Accessibility, privacy, security, and responsive behavior

- Local axe, dark mode, keyboard operation, route focus, live announcements,
  44 px targets, and 200% reflow passed in both browser projects.
- A direct keyboard check measured a 3 px apricot focus ring on the proof radio
  control. Reduced-motion CSS measured at 0.01 ms.
- When a live proof happened to reach its owning replica, independent axe
  WCAG A/AA scans found no serious or critical findings on desktop or 390 px.
  There was no horizontal overflow at normal size or 200% text.
- The live accessibility suite still fails because proof controls disappear
  behind the 401 error state. This is availability, not an axe violation.
- A fresh landing/demo recording contacted only
  `https://service-proof-loop.sociobot.in`, set no cookies, stored the demo key
  only in `sessionStorage`, and left `localStorage` empty.
- `/` passes the factory `verify-url.sh`; `/demo` fails it on the console 401.
- Responses include CSP, HSTS, `nosniff`, frame denial, strict-origin referrer
  policy, and camera/microphone/geolocation denial.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, robots, sitemap, and assets return
  200; an unknown route returns a styled HTTP 404.

## Identity, caching, and performance

`/health` returns the full candidate SHA. Live HTML, JavaScript, CSS, and hero
SHA-256 values are byte-identical to local `dist/`.

- JavaScript: 31,751 B raw / 10,144 B gzip.
- CSS: 15,437 B raw / 4,414 B gzip.
- Hero WebP: 18,322 B. No web fonts ship.
- Hashed JS/CSS: one-year immutable cache. Hero: one-day cache.
- Lighthouse 12.8.2 mobile: 100 Performance, 100 Accessibility, 100 Best
  Practices, 100 SEO; FCP 1.051 s, LCP 1.201 s, TBT 25.5 ms, CLS 0, 68,256 B.

Evidence: [build and assets](verification-evidence-12/build-and-assets.txt) and
[Lighthouse JSON](verification-evidence-12/lighthouse-live.json).

This is not a PWA, library, or CLI. It makes no offline-reload claim and ships
no service worker. It has no sign-in, so Entra is not applicable. It has no
runtime AI feature, and the core proof-to-next-visit task does not need one.

## Commercial scope note

The researched brief says `$59 per business each month plus technician seats`.
The product and public checkout sell a `$59 one-time business license` without
a seat model. `.factory/scope-decision.json` records this as an accepted
variance because the supplied paid-unlock contract supports one-time licenses.
It remains a material difference from the research, but it is not the cause of
this verification's release failure.

## Required remediation

1. Redeploy this exact candidate through `./scripts/deploy-container.sh` so the
   allowed app mounts durable SQLite at `/data`, runs one active revision, and
   enforces `minReplicas=1`, `maxReplicas=1`.
2. Require `EXPECTED_SHA=0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80 npm run test:live`
   to pass all 400 workspace reads, all 20 proof reads, atomic plan limits, and
   both rate bursts.
3. Require the full live Playwright suite to pass 42/42 after sustained load.
