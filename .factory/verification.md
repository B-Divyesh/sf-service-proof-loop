# Independent product verification — FAIL

Verified on 2026-08-28 against candidate
`515ff61b9a39e536f71cea8dcc7360c1294878a5` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The local candidate can complete the proof-to-next-
visit flow, but the deployed service is not a reliable product. Live workspace
state is split across five isolated replicas, required deep links return HTTP
404, and the advertised checkout is not registered. The candidate also fails
the TypeScript gate, dark-mode accessibility, keyboard focus, the clean claim
run, and the mandatory Dockerfile contract.

## Release blockers

### Critical — live state is isolated per replica

The deployment appears to run five service replicas, each with its own SQLite
database. A workspace or proof token only works when a later request reaches
the replica that created it.

- Created 12 fresh demos and read `/api/visits` five times with each issued
  bearer token.
- Result: **12/60 reads returned 200; 48/60 returned 401**
  `{"error":"Your workspace access is not valid."}`.
- Every token succeeded exactly on its fifth read.
- A live browser consequently reached **“Visits could not load”** immediately
  after the one-click demo with the same invalid-access error.
- Twenty concurrent demo creations returned 200, but that does not make their
  resulting workspaces consistently reachable.

This breaks the core job, the one-click demo, persistence, proof links, and any
real customer workspace. SQLite must be on shared durable storage with a
single writer, or the service must use a shared database before scaling above
one replica.

### Major — every required deep link returns 404

Direct responses from the candidate deployment:

| Route | HTTP status |
| --- | ---: |
| `/` | 200 |
| `/demo` | 404 |
| `/app` | 404 |
| `/privacy` | 404 |
| `/terms` | 404 |
| `/proof/<valid-token>` | 404 |
| `/definitely-missing` | 404 |

The server sends the SPA body with the 404, so a JavaScript browser may render
the intended screen. It still logs `Failed to load resource: ... 404`, link
crawlers see dead links, and the documented demo entry point fails the required
URL verifier. `/opt/fleet/lib/verify-url.sh` passed `/` and exited 1 immediately
for `/demo` (`GET .../demo -> 404`).

### Major — production checkout is broken and access is not enforced server-side

- The advertised buy link
  `https://api.sociobot.in/api/v1/products/service-proof-loop/checkout`
  returns **404** with `{"error":"enabled factory product","status":404}`.
- The `@claim:paid-license` test only asserts the link and mocks verification;
  it never checks the live checkout.
- The “three visits free, unlimited when paid” limit exists only as a disabled
  browser button. Four direct authenticated `POST /api/visits` requests without
  any license all returned **201**.
- The billing verification service itself did rate-limit correctly: a 70-
  request burst produced 30 HTTP 200 responses and 40 HTTP 429 responses with
  `Retry-After: 4`. The observed allowance was 30 requests in that window.

### Major — accessibility requirements fail

- Axe in the dark treatment reports serious `color-contrast` failures on every
  primary action. White text on `#72b6c8` is **2.27:1**, below 4.5:1.
- Keyboard focus on the “accepted/problem” and 1–5 rating controls is invisible.
  The focused inputs have `opacity: 0`; their 3 px focus outline is hidden with
  them, and no focus style is applied to the visible sibling.
- “Reset demo” and “Start for real” are only **36 px high** at 390 px, below the
  44 px target requirement.
- At 200% text size on a 390 px viewport, the landing page grows to 411 px and
  introduces horizontal scrolling.

Light-mode axe scans found no violations on landing, workspace, client proof,
extras, visit form, privacy, or terms at desktop and 390 px. Reduced motion is
implemented correctly: transitions and animation become 0.01 ms, the spinner
runs once, and smooth scrolling is disabled.

### Major — clean claim gate was not consistently green

`.factory/claims.json` exists and lists eight claims. Each exact command was
run independently after `npm ci`.

| Claim | Fresh installed run | Warm rerun |
| --- | --- | --- |
| `demo-sandbox` | FAIL: web server exceeded the 120 s limit during the initial Rust build | PASS, 2/2 |
| `no-account` | PASS, 2/2 | not needed |
| `proof-expiry` | PASS, 2/2 | not needed |
| `next-visit-export` | PASS, 2/2 | not needed |
| `same-origin-demo` | PASS, 2/2 | not needed |
| `configurable-extras` | PASS, 2/2 | not needed |
| `paid-license` | PASS, 2/2 locally; live checkout fails | live FAIL |
| `rate-limit` | FAIL on mobile: none of 45 requests received 429; desktop passed | PASS, 2/2 |

The full warmed browser suite later passed 24/24. That does not erase the
contract rule that any failing claim command is release-blocking. The fixed
wall-clock-second limiter also makes the 45-request assertion nondeterministic
when a burst crosses a second boundary.

Unlisted or inadequately proven visitor claims also remain:

- “The free plan holds three completed visits” and paid adds unlimited visits.
- “Includes unlimited client proof links.”
- Demo workspaces expire within 24 hours.
- No third-party fonts, scripts, or analytics are loaded.
- “Only token hashes are stored” is false for the demo proof token, which is
  intentionally stored in `proof_token_demo`.
- The expiry claim test compares two displayed dates; it does not prove that an
  expired proof is rejected.

### Major — available type gate fails

`npx tsc --noEmit -p frontend/tsconfig.json` exits non-zero with seven errors in
`frontend/src/main.ts` at lines 183, 205–206, and 321. They are strict-null and
`EventTarget`/`HTMLFormElement` type errors in form submit handlers.

### Major — Dockerfile violates the mandatory build contract

The server stage uses `FROM rust:1.88-bookworm`. The work order explicitly
requires `rust:1-slim` or `rust:1-alpine` and forbids a pinned minor toolchain.
The worker has no Docker executable, so a container build could not be rerun.
The two constituent production builds did pass.

## First-read test

The cold first screen itself passes the plain-words test:

- **What it does:** sends proof after a visit and carries a client choice into
  the next visit.
- **For whom:** recurring service teams needing client feedback and approved
  extras without another customer app.
- **What to click:** “Try it with sample data,” beside “Loads a sample visit.
  Nothing is saved.”

The visible one-click action exists and worked in the initial cold run. It is
not reliable in production because the new demo token usually reaches a
different replica on the next request.

## Functional evidence

When requests happened to reach the correct live replica, the smallest useful
flow worked end to end:

1. Opened the sample workspace with no real storage present.
2. Opened the private proof in a fresh context without an account.
3. Submitted a rating and selected “Inside refrigerator.”
4. Saw status `ACCEPTED` and the $28 extra beside the next visit.
5. Exported a 200 CSV containing Maya Chen, Willow Street, the selected extra,
   and `28.00`.
6. Reset the demo and confirmed its token changed while `real:workspace`
   remained absent.

API validation and recovery behaved correctly in the candidate:

- Empty workspace name: 400.
- Invalid next date: 400.
- Empty checklist: 400.
- Photo without consent: 400.
- Four photos: 400.
- 601-character note: 400.
- Extra price -1 or 100001 cents: 400.
- Exact 0 and 100000-cent boundaries: 201.
- Exact name/note boundaries: 201.
- Missing authorization: 401.
- Cross-tenant export attempt: 404.
- Invalid response followed by a problem report and rating 1: 400, then 200,
  with the recovered response persisted.

## Rate limiting

The product API is limited before all `/api` routes; `/health` is exempt.

- A timed 60-request live burst from one forwarded client produced **40 HTTP
  200** and **20 HTTP 429** with `Retry-After: 1`.
- The observed per-instance allowance is **40 requests per wall-clock second**.
- A 250-request unknown-route burst over roughly two seconds produced 120 404
  and 130 429 responses. Because limiter state is also per replica, the live
  deployment does not provide one coherent distributed allowance.
- `/health` remained 200 after the burst.

## Privacy and security

- Landing and successful demo flows contacted only
  `https://service-proof-loop.sociobot.in`; there were no analytics, external
  scripts, or third-party fonts.
- The product origin set no cookies in the tested flow. Demo access used
  `sessionStorage`; real access remained absent.
- Present headers: CSP, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  and a restrictive Permissions Policy.
- HSTS is absent.
- Photo consent and tenant-scoped export checks passed.

## Build, tests, and runtime

| Check | Result |
| --- | --- |
| Candidate SHA / live `/health` | PASS; full SHA matches |
| Live HTML, JS, CSS, hero hashes vs `dist/` | PASS; byte-identical |
| `npm ci` | PASS; 22 packages, 0 vulnerabilities |
| `cargo test --all-targets` | PASS; 3 integration tests |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --all-targets --all-features -- -D warnings` | PASS |
| `npx tsc --noEmit -p frontend/tsconfig.json` | **FAIL; 7 errors** |
| `npm run build` | PASS; `dist/` produced |
| `cargo build --release` | PASS |
| `npm test` after fresh test DB and warm compile | PASS; 24/24 |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| release binary with only `PORT` | PASS; root and health 200 |
| Docker build | NOT RUN; Docker binary unavailable |

## Performance and caching

Live Lighthouse 12.8.2 mobile, light treatment:

- Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- FCP 1.1 s, LCP 1.2 s, TBT 40 ms, CLS 0, interactive 1.2 s.
- Initial transfer 67,092 bytes.
- JS 31.39 KB raw / 10.06 KB build gzip.
- CSS 14.70 KB raw / 4.30 KB build gzip.
- Hero WebP 18.32 KB.

The size and timing budgets pass. Caching does not: hashed JS/CSS and the hero
have no `Cache-Control` header, and Lighthouse reports a zero cache lifetime for
64,630 bytes of static resources.

## Required remediation before another verification

1. Use one shared durable database, or force a single replica until storage is
   shared; verify create/read/update across independent connections.
2. Return 200 for all valid SPA routes and proof links while retaining a real
   404 for unknown routes.
3. Register and exercise the live Sociobot product; enforce plan limits on the
   server and add an end-to-end checkout/license claim test.
4. Fix dark contrast, visible focus for custom radios, touch targets, and 200%
   text reflow; scan both color treatments.
5. Make every claim command pass from a cold clone and add missing claim tests.
6. Fix TypeScript errors and add the type check to the normal test script.
7. Use an allowed floating stable Rust image and rerun the exact Docker build.
8. Add immutable caching for hashed assets.
