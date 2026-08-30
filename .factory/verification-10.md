# Independent product verification 10 — FAIL

Verified 2026-08-29–30 against candidate
`f85577356b7108ad203b5e802c1180b8b497b914` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The clean local candidate is healthy, and production
serves its exact build. Production does not use the mandatory durable
single-writer topology: the live Container App has `maxReplicas: 3`, no
`/data` mount, and no template volume. Load scaled it to three independent
SQLite writers.

This is user-visible. A fresh stress run returned only 196/400 authenticated
workspace reads and 6/20 proof reads. Both independent desktop and 390 px
one-click demos ended on **“Visits could not load — Your workspace access is
not valid.”** The live browser suite passed 36/42. A single forwarded client
received 120 responses before the three separate limiters began returning 429.

## Mandatory first-read and demo gate

The cold first screen passes the plain-words test on desktop and 390 px:

- **What it does:** sends proof after a visit and carries approved extras into
  the next visit.
- **For whom:** recurring service teams that need client feedback without a
  customer app.
- **What to click:** “Try it with sample data,” followed by “Loads a sample
  visit. Nothing is saved.”

The action and three facts are above the fold. Early live checks opened the
seeded demo while one replica was active. The mandatory usable demo gate fails
under load: after scale-out, fresh desktop and mobile clicks stored a demo token
but the next workspace request returned 401. Evidence:
[cold desktop](evidence-10/live-first-read-desktop.png),
[cold mobile](evidence-10/live-first-read-mobile.png), and
[failed demo audit](evidence-10/live-browser-audit.json).

## Release-blocking findings

### Critical — production has three ephemeral SQLite writers

The SHA-pinned `npm run test:live` fails immediately with **“maximum replica
count drifted from the deployment contract.”** Fresh Azure evidence reports:

| Property | Required | Observed |
| --- | --- | --- |
| Image | candidate tag | `sf-service-proof-loop:f85577356b71` |
| Active revision mode | Single | Single |
| Active revision | one | one (`0000034`) |
| Minimum replicas | 1 | 1 |
| Maximum replicas | 1 | **3** |
| `/data` Azure Files mount | present | **none** |
| Template volume | present | **none** |
| Running replicas after load | 1 | **3** |

The writable Azure Files share exists but is not attached. Split state was
reproduced independently:

| Live check | Required | Observed |
| --- | ---: | ---: |
| Fresh demos created | 20 | 20 |
| Authenticated reads | 400/400 | **196/400** |
| Reads returning 401 | 0 | **204** |
| Matching proof reads | 20/20 | **6/20** |
| Concurrent free writes | 3×201 + 5×402 | **3×201 + 5×401** |
| Full live browser suite | 42/42 | **36/42** |

The six browser failures included two live claim cases and both mobile proof
accessibility flows. Those could not reach proof controls because the workspace
token was rejected. Desktop and mobile console checks recorded the same 401.

Evidence: [topology](evidence-10/live-topology-app.json),
[replicas](evidence-10/live-replicas-after-load.json),
[continuity](evidence-10/live-continuity.json),
[plan-limit](evidence-10/live-plan-limit.json), and
[live Playwright](evidence-10/live-playwright.log).

### Major — the documented 40-request allowance is tripled

Rate limiting works on one local process, but limiter state is not shared:

| Burst | Allowed | 429 | `Retry-After: 1` |
| --- | ---: | ---: | --- |
| 45 requests | **45** | 0 | n/a |
| 130 requests | **120** | 10 | 10/10 |

The effective production burst allowance is 120, not the documented 40.
Evidence: [live rate probe](evidence-10/live-rate-limit.json).

### Major — commercial delivery differs from the researched contract

The brief specifies **$59 per business each month plus technician seats**. The
live checkout sells a **$59 one-time business license** with no seat model.
`.factory/scope-decision.json` documents the conflict with the supplied
one-time Sociobot paid-unlock contract, and the copy truthfully describes what
is sold. It remains a material variance from the researched acceptance scope.

## Claims gate

`.factory/claims.json` exists with 16 entries. The literal dependency-free
pre-install invocation produced `tsc: not found` for Node-backed commands and
`vite: not found` for runtime. After the required clean `npm ci`, every exact
command was run separately and all 16 passed. Those pre-install exits are setup
failures, not failed assertions. Full output:
[claims-installed.log](evidence-10/claims-installed.log).

| Claim | Clean installed result |
| --- | --- |
| demo-sandbox | PASS |
| no-account | PASS |
| proof-expiry | PASS |
| next-visit-export | PASS |
| same-origin-demo | PASS locally; **FAIL live after scale** |
| configurable-extras | PASS |
| paid-license | PASS |
| rate-limit | PASS locally; **FAIL live allowance** |
| plan-limit | PASS locally; **FAIL live split state** |
| demo-expiry | PASS |
| no-tracking | PASS locally; live stays same-origin but cannot load sample |
| access-token-hashing | PASS |
| privacy-data-flow | PASS locally |
| photo-upload | PASS locally |
| problem-rating | PASS locally |
| zero-config-runtime | PASS |

Material landing, legal, README, and product claims map to the claims file;
non-goals are stated as exclusions.

## Clean local gates

| Check | Result |
| --- | --- |
| Candidate and tree before QA | exact SHA; clean |
| `npm ci` | PASS — 22 packages, 0 vulnerabilities |
| Every exact claim command | PASS after install |
| `npm run test:all` | PASS — 12 Rust, 14 Node, runtime, 42 Playwright |
| `npm run lint` | PASS — rustfmt and Clippy, warnings denied |
| TypeScript | PASS through `npm test` |
| `npm run build` | PASS; `dist/` produced |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| Release runtime with defaults | PASS — port 8080 and build identity |
| Docker execution | Not run — no container engine installed |

The Dockerfile statically meets the contract: `rust:1-slim`, build-arg identity,
multi-stage build, non-root runtime, port 8080, and no `.git` dependency.

## Independent functional and boundary checks

A fresh local release server completed the smallest useful product:

1. Created a workspace and $0/$1,000 boundary extras.
2. Recorded a consented-photo visit and opened its private proof.
3. Rejected an invalid reply, then saved a problem, rating 2, comment, and
   approved $1,000 extra.
4. Read exact state in the workspace and exported a CSV containing `1000.00`.
5. Confirmed another tenant receives 404 for that export.
6. Confirmed visits two and three return 201 and visit four returns 402.
7. Restarted the service and confirmed workspace access persisted.

The API returned actionable errors for empty workspace, missing auth, past and
malformed dates, blank checklist, photo without consent, four photos,
601-character notes, and prices outside $0–$1,000. Evidence:
[independent flow](evidence-10/independent-local-flow.json) and
[persistence](evidence-10/local-persistence.json).

## Accessibility, privacy, security, and performance

- Local `npm run test:a11y` passed 4/4 across desktop and 390 px. Axe found no
  serious/critical WCAG A/AA issues on landing or proof in light/dark themes.
- Keyboard proof choices, rating arrows, Enter submission, focus transfer,
  announcements, 44 px targets, and 200% reflow pass locally.
- Live landing has one `h1`, one `main`, `lang=en`, alt text, no overflow, and
  no serious/critical axe findings at either viewport. Reduced-motion measured
  0.01 ms and focus uses a 3 px apricot ring.
- `verify-url.sh` passes `/` and fails `/demo` on the 401 console error.
- Browser logs contain only the product origin, no cookies, analytics, external
  scripts, or external fonts. Demo storage is in `sessionStorage`; real
  `localStorage` remains empty.
- Responses include CSP, HSTS, `nosniff`, frame denial, strict-origin referrer
  policy, and camera/microphone/geolocation denial.
- Routes, metadata assets, and internal links resolve; unknown routes return a
  styled 404. Checkout returns the expected hosted-checkout redirect.
- `/health` returns the full candidate SHA. Live HTML, JS, CSS, and hero hashes
  are byte-identical to local `dist/`. Hashed assets have immutable one-year
  caching; shared imagery has a one-day policy.

The build contains 31,751 B JS (10.15 kB gzip), 15,437 B CSS (4.41 kB gzip),
no fonts, and an 18,322 B hero. Fresh Lighthouse JSON reports 100/100/100/100;
FCP 1.230 s, LCP 1.402 s, TBT 86.5 ms, CLS 0, and 68,288 B transfer. Lighthouse
emitted a tab-crash cleanup error after writing the complete warning-free JSON.

Evidence: [browser audit](evidence-10/live-browser-audit.json),
[headers](evidence-10/live-root-headers.txt),
[hashes](evidence-10/live-local-sha256.txt),
[links](evidence-10/live-routes-links.json), and
[Lighthouse summary](evidence-10/lighthouse-summary.json).

This is not a PWA and makes no offline-reload claim; its offline state tells
users to reconnect. It is not a library or CLI. It has no sign-in, so Entra is
not applicable. It has no runtime AI feature; no brief-required AI step is
missing.

## Required remediation

1. Deploy this exact candidate with `./scripts/deploy-container.sh`, mount
   `service-proof-loop-data` at `/data`, and enforce one active replica.
2. Require the SHA-pinned verifier to pass 400/400 reads, 20/20 proofs,
   3×201 + 5×402 writes, and both rate bursts.
3. Require the live Playwright suite to pass 42/42 after load.
4. Resolve or explicitly accept the subscription/seat variance at product
   contract level.
