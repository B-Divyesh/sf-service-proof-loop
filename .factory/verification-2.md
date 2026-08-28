# Independent product verification 2 — FAIL

Verified 2026-08-28 against candidate
`5b6e3d4e86fef70c1c80427dd722393d931a9fd4` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The candidate assets and live `/health` identity
match, and the local suite is green. The deployed product nevertheless cannot
reliably complete its first click or core job. Three live replicas each use a
different SQLite database. A demo/workspace created on one replica is rejected
by the others. The candidate also permits concurrent requests to bypass the
three-visit free limit, and the live rate allowance is multiplied by the three
replicas.

## Release-blocking findings

### Critical — the one-click demo and workspace state are split across three replicas

The required first action creates a workspace and then immediately reads it.
That flow commonly ends at **“Visits could not load — Your workspace access is
not valid.”** with an HTTP 401 console error.

- Four of four fresh browser contexts failed immediately after `/api/demo`
  returned 200.
- A captured browser demo token returned 5 HTTP 200 and 15 HTTP 401 responses
  across 20 fresh TLS connections.
- A second token returned 9 HTTP 200 and 11 HTTP 401 responses.
- The factory `verify-url.sh` passes `/`, `/privacy`, and `/terms`, but fails
  `/demo` because the 401 is logged to the console.
- Read-only Azure inspection shows active revision
  `sf-service-proof-loop--0000008` at `minReplicas: 1`, `maxReplicas: 3`, with
  **three running replicas**. The service uses a replica-local SQLite file.
- A same-connection 40/40 read probe passed, demonstrating connection affinity
  can hide the defect. Fresh-connection evidence exposes it.

This fails the mandatory one-click demo gate and the product's core persistence
boundary. Evidence:
`.factory/qa-artifacts/live-replica-diagnostic.log`,
`.factory/qa-artifacts/live-azure-topology.log`, and
`.factory/qa-artifacts/verify-demo/verify.json`.

### Major — concurrent requests bypass the advertised three-visit limit

The visit count check and insert are not atomic.

- Sequential live requests returned `201, 201, 201, 402`, as intended.
- Eight simultaneous requests to a fresh live workspace created four visits.
- Eight simultaneous requests to a fresh local candidate database all returned
  201; the workspace contained eight visits afterward.

This falsifies the `plan-limit` claim under normal concurrent API use and
weakens the paid boundary. Evidence:
`.factory/qa-artifacts/local-concurrency-validation.log` and
`.factory/qa-artifacts/live-api-adversarial.log`.

### Major — the public rate allowance is 120, not 40

The in-memory limiter is also per replica.

- On one reused connection, a 50-request burst produced 40 HTTP 200 and 10 HTTP
  429 responses. Every 429 had `Retry-After: 1`.
- Across fresh connections from one forwarded client, 130 requests produced
  **120 ordinary 404 responses and only 10 HTTP 429 responses**.
- `/health` remained exempt and returned 200.

The observed deployed allowance is 40 per replica and 120 across the active
service, contrary to the documented single-client allowance. Evidence:
`.factory/qa-artifacts/live-distributed-rate-limit.log`.

### Major — core visit data accepts invalid semantics

Both local and live APIs returned 201 for:

- `next_visit_at: "2020-01-01"`, although the exported work is presented as
  the next recurring visit;
- a checklist whose only label is whitespace.

The API correctly rejects an empty checklist, 81-character names,
601-character notes, photos without consent, four photos, and extra prices
outside 0–100000 cents. It accepts the exact $0 and $1,000 boundaries.
Evidence: `.factory/qa-artifacts/live-api-adversarial.log`.

### Minor — several mobile links are below the 44 × 44 px baseline

At 390 px, the header Demo link is 37.6 × 44 px, the wordmark is 342 × 30 px,
and the footer links are 24.8 px high. Primary actions and demo controls meet
44 px, and inline legal links are excluded from this finding. Evidence:
`.factory/qa-artifacts/live-keyboard-links.log`.

## First-read gate

The cold first screen's wording passes:

- **What it does:** sends after-visit proof and carries a client choice into
  the next visit.
- **For whom:** recurring service teams that need feedback and approved extras
  without another client app.
- **First click:** “Try it with sample data,” beside “Loads a sample visit.
  Nothing is saved.”

The action is visible without scrolling. The candidate still fails the overall
gate because that one click is not reliable on the live deployment. Screenshot:
`.factory/qa-artifacts/live-first-read-desktop.png`.

## Claims gate

`.factory/claims.json` exists with 11 entries. After the required `npm ci`,
every listed command was run independently and passed:

| Claim | Declared command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm test -- --grep @claim:demo-sandbox` | PASS, 2/2 |
| `no-account` | `npm test -- --grep @claim:no-account` | PASS, 2/2 |
| `proof-expiry` | `cargo test claim_proof_expiry_rejects_an_expired_proof` | PASS, 1/1 |
| `next-visit-export` | `npm test -- --grep @claim:next-visit-export` | PASS, 2/2 |
| `same-origin-demo` | `npm test -- --grep @claim:same-origin-demo` | PASS, 2/2 |
| `configurable-extras` | `npm test -- --grep @claim:configurable-extras` | PASS, 2/2 |
| `paid-license` | `npm test -- --grep @claim:paid-license` | PASS, 2/2 |
| `rate-limit` | `npm test -- --grep @claim:rate-limit` | PASS, 2/2 |
| `plan-limit` | `cargo test claim_plan_limit_is_server_enforced_and_a_valid_license_allows_more` | PASS, 1/1 |
| `demo-expiry` | `cargo test claim_demo_expiry_is_24_hours_and_expired_access_is_rejected` | PASS, 1/1 |
| `no-tracking` | `npm test -- --grep @claim:no-tracking` | PASS, 2/2 |

The first literal pre-install invocation could not find `tsc`; this was a
missing installed dependency, not a behavioral test result. The complete
installed rerun is in `.factory/qa-artifacts/claims-installed.log`.

The green claim suite does not cover multiple server replicas or simultaneous
plan-limit requests. Independent tests above falsify those production claims.

## Functional and security evidence

- Local demo flow works end to end on desktop and 390 px: open sample, review
  proof without an account, reply, choose an extra, see it beside the next
  visit, and export it in CSV.
- Cross-tenant export returned 404.
- Invalid response status and rating returned 400; a corrected problem report
  with rating 1 persisted successfully.
- Proof expiry and demo expiry server tests pass.
- The live Sociobot registry lists the product at 5900 USD minor units; checkout
  returns 303 to `checkout.dodopayments.com`.
- No sign-in is required, so the Entra authority requirement is not applicable.
- This is not a PWA and registers no service worker, so offline reload/update
  testing is not applicable. The online app shows a clear reconnect message.

## Privacy, headers, and browser quality

- A replica-local live demo/proof load made requests only to
  `https://service-proof-loop.sociobot.in`.
- Demo access used only `sessionStorage` key `demo:workspace`; real storage was
  untouched and no cookies were set.
- Live responses include CSP, HSTS, `nosniff`, `DENY`, restrictive permissions,
  and strict-origin referrer policy.
- Hashed JS/CSS use `Cache-Control: public, max-age=31536000, immutable`; the
  hero uses a one-day cache.
- Root, required deep links, and proof routes return 200; an unknown route
  returns 404. All landing links resolve or deliberately return the checkout
  303.
- All 13 generated `dist/` files are byte-identical to the live files.
- The live `/health` response reports the exact candidate SHA.

## Accessibility and performance

- Independent axe scans found zero serious/critical issues on landing, privacy,
  and terms at 1440 px and 390 px in light and dark treatments. A successful
  replica-local demo and proof page also had zero serious/critical issues.
- Pages have `lang=en`, one h1, one main landmark, titles, alt text, and a skip
  link.
- Keyboard focus is a visible 3 px apricot outline. Custom status/rating controls
  work with keyboard input.
- At 200% text size on 390 px, width remained 390 px with no horizontal overflow.
- Reduced motion changes transition duration to 0.00001 s and disables smooth
  scrolling.
- Live mobile Lighthouse 12.8.2: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.20 s, LCP 1.20 s, TBT 22 ms, CLS 0.
- First transfer was 67,621 bytes. Built JS is 31.40 KB raw / 10.07 KB gzip;
  CSS is 15.15 KB raw / 4.36 KB gzip; hero WebP is 18.32 KB.

## Local build and test results

| Check | Result |
| --- | --- |
| Candidate SHA / clean status | PASS |
| `npm ci` | PASS; 22 packages |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; `dist/` produced |
| `cargo test --all-targets` | PASS; 8 integration tests |
| `npm run lint` | PASS; rustfmt and Clippy with warnings denied |
| `cargo build --release` | PASS |
| `npm test` | PASS; 32/32 desktop/mobile browser tests |
| release binary with only `PATH` and `PORT` | PASS; root and health served |
| Docker build | NOT RUN; Docker is unavailable in this worker |

The Dockerfile was inspected: it uses `rust:1-slim`, declares
`ARG BUILD_SHA=dev`, builds in stages, runs as a non-root user, and exposes
8080. Local gate output is in `.factory/qa-artifacts/local-gates.log` and
`.factory/qa-artifacts/full-browser-suite.log`.

## Required remediation

1. Keep the live service at exactly one replica until SQLite is replaced by a
   shared database, and make the deployment guard durable rather than a
   post-deploy setting that the platform can overwrite.
2. Enforce the three-visit limit atomically in the database; add a concurrent
   claim test.
3. Use a shared/distributed rate limiter, or otherwise enforce one documented
   client allowance across all replicas; test over fresh connections.
4. Reject past next-visit dates and blank checklist labels at the API edge.
5. Increase non-inline mobile link hit areas to at least 44 × 44 px.
6. Re-run the cold live demo, fresh-connection persistence, distributed rate
   burst, exact claims, full suite, and container build before release.
