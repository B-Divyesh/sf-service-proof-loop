# Independent product verification 3 — FAIL

Verified on 2026-08-29 against candidate
`0e495ea40e6e99311551b0a0db6fafead47836e3` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The candidate is green locally and its files are the
ones running in production, but the live service does not satisfy the product's
core persistence boundary. The active deployment has three replicas backed by
three unrelated local SQLite files. A demo, workspace, or proof token therefore
works only when the next request reaches the replica that created it.

## Release-blocking findings

### Critical — the one-click demo and real workspaces are split across three replicas

Fresh production evidence reproduces the previous release blocker:

- Azure reports active revision `sf-service-proof-loop--0000012`, `Single`
  revision mode, `minReplicas: 1`, **`maxReplicas: 3`**, and three running
  replicas. The checked-in contract says `max_replicas: 1`, so the deployed
  runtime configuration does not match the candidate contract.
- `EXPECTED_SHA=0e495ea… npm run test:live` created one demo, then read it over
  20 fresh TLS connections. Only **6 returned 200; 14 returned 401**.
- The complete browser suite against the live URL passed 30/34. The four
  failures all followed lost demo state: two desktop/mobile no-tracking flows
  could not find Willow Street, the desktop console captured a 401, and the
  mobile dark-mode flow timed out waiting for “Open client view.”
- An independent cold click reached `/demo` but rendered **“Visits could not
  load — Your workspace access is not valid.”** Its request log remained
  same-origin, but the product job failed.
- A fresh production workspace followed by 30 simultaneous visit writes
  returned **3 × 201, 21 × 401, and 6 × 402**. The plan limit is atomic on the
  owning replica, but most requests cannot find the workspace.
- Factory URL verification passes `/`, `/privacy`, and `/terms`; `/demo`
  returns HTTP 200 but fails the browser check because its API call logs 401.
  Evidence is in `.factory/qa-artifacts/verify3-demo/`.

This breaks the mandatory one-click sandbox, client proof links, business
workspaces, and the proof-to-next-visit loop.

### Critical — production data is not durable across replica replacement

The live topology and checked-in deployment contract both use
`replica-local-sqlite` with `mounts: null` and `volumes: null`. Even if the
service is manually reduced to one replica, every real workspace is stored on
the container's ephemeral filesystem and can disappear on a deployment or
replica replacement. A recurring-service product cannot use this as its real
persistence boundary.

The local database correctly survives across separate app instances when they
share one SQLite file. Production needs durable single-writer storage or a
shared transactional database; a replica ceiling alone is insufficient.

### Major — the live per-client rate allowance is multiplied by replica count

A 130-request burst from one forwarded client completed in 347 ms and returned
**120 × 404 and 10 × 429**. Every 429 included `Retry-After: 1`. The configured
allowance is 40 per process, so the observed public allowance is **120**, not
40. `/health` remains exempt: 100 concurrent health requests returned 100 ×
200 in 366 ms.

The Sociobot product-license verifier was also checked independently. A
45-request burst returned 30 × 200 followed by 15 × 429; all 429 responses had
`Retry-After: 4`. Its observed allowance is 30.

### Major — the paid offer conflicts with the researched brief

The researched brief specifies **$59 per business each month plus technician
seats**. The site, registry, README, and claims instead implement a **$59
one-time business license** with no seat model. The one-time Sociobot checkout
works, but the source-of-truth commercial scope was changed without recording
the deviation in the handoff.

### Major — visitor claims remain outside `.factory/claims.json`

Every listed claim test passes, but the required copy cross-check found
additional claims with no matching manifest entry and tagged test:

- README: “Workspace and production proof access use random tokens stored as
  hashes.”
- Privacy: stored data is used “only to deliver proof links, collect replies,
  and prepare next-visit exports.”
- Privacy: “This service does not receive payment card numbers.”

The current demo-only request tests and paid-link test do not prove those
broader storage/use claims.

### Minor — one README configuration default is wrong

README says `STATIC_DIR` defaults to `frontend/dist`; `AppConfig::default()`
uses `dist`. The documented run command explicitly supplies `STATIC_DIR=dist`,
so setup still works.

## Mandatory first-read test

The cold first screen itself passes the plain-words gate:

- **What it does:** sends after-visit proof and plans the next visit.
- **For whom:** recurring service teams needing client feedback and approved
  extras without another customer app.
- **First click:** “Try it with sample data,” beside “Loads a sample visit.
  Nothing is saved.”

The action is visible without scrolling. The candidate still fails the demo
requirement because that click intermittently ends at invalid workspace access.

## Claims gate

`.factory/claims.json` exists with 11 entries. After `npm ci`, every listed
command was run independently against the local demo entry point and passed:

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

These local results do not override the independently observed production
failures or the unlisted-claim finding.

## Functional, boundary, and recovery evidence

The candidate works end to end when all requests share one database:

1. Create a workspace and completed visit.
2. Open the private proof without an account.
3. Reject an invalid status and rating, then save a valid acceptance and extra.
4. Export a CSV containing the next date, client, location, selected extra,
   detail, and price.

Independent API checks produced the expected responses:

- missing authorization 401; empty workspace name 400;
- past or malformed next date 400; blank or empty checklist 400;
- photo without consent 400; four photos 400;
- 81-character client and 601-character note 400;
- exact 80/120/80/120/600-character text boundaries 201;
- invalid reply status and rating 400, followed by a valid reply 200;
- cross-tenant export 404;
- extra prices -1 and 100001 cents 400; 0 and 100000 cents 201.

Browser form recovery also passed: an empty required client name focused the
field with “Please fill out this field”; correcting it created a proof link
without console errors. The local concurrent plan test creates exactly three
visits from eight simultaneous free writes and rejects the other five with 402.

## Privacy, security, routes, and identity

- `/health` reports the exact candidate SHA. All 13 production build files are
  byte-identical to the live files.
- Landing/demo request capture used only
  `https://service-proof-loop.sociobot.in`. No cookies were set. Demo state used
  only session key `demo:workspace`; real workspace storage stayed empty.
- Live responses include CSP, HSTS, `nosniff`, frame denial, restrictive
  permissions policy, and strict-origin referrer policy.
- Required deep links return 200; an unknown path returns 404. All extracted
  landing/privacy/terms links return 200, the checkout returns its intended
  303, and `mailto:` links are explicit.
- The Sociobot registry lists `service-proof-loop` at 5900 USD minor units, and
  checkout returns 303 to `checkout.dodopayments.com`.
- No sign-in is required, so the Entra authority check is not applicable.
- This is not a PWA and has no service worker, so offline reload/update testing
  is not applicable. The online-only reconnect state passes locally.

## Accessibility and performance

- Twelve independent live axe scans across `/`, `/privacy`, and `/terms` at
  1440 px and 390 px, in light and dark treatments, found zero serious or
  critical issues. Local demo and proof scans also pass.
- Pages have `lang=en`, route-specific titles, one h1, one main landmark, alt
  text, and a skip link. Keyboard activation reached the demo with a visible
  3 px focus outline. Custom proof controls pass the full local suite.
- At 390 px there is no horizontal overflow. Reduced motion changes the
  longest transition to 0.00001 s, disables smooth scrolling, and leaves no
  infinite animation.
- Fresh mobile Lighthouse 12.8.2: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.27 s, LCP 1.42 s, TBT 66 ms, CLS 0. Evidence:
  `.factory/qa-artifacts/lighthouse-live-3.json`.
- First transfer was 67,770 bytes. Built JS is 31.40 KB raw / 10.07 KB gzip;
  CSS is 15.29 KB raw / 4.39 KB gzip; hero WebP is 18.32 KB.

## Local gates

| Check | Result |
| --- | --- |
| Candidate SHA / initial worktree | PASS; exact SHA, clean |
| `npm ci` | PASS; 22 packages |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; rustfmt and Clippy with warnings denied |
| `cargo test --all-targets` | PASS; 10/10 backend tests |
| `npm test` | PASS; 34/34 desktop/mobile browser tests |
| `npm run build` | PASS; `dist/` produced |
| `cargo build --release` | PASS |
| release binary with only `PORT` | PASS; health, root, and deep links served |
| Docker build | NOT RUN; Docker and Podman are unavailable in this worker |

The Dockerfile was inspected: it uses `rust:1-slim`, declares
`ARG BUILD_SHA=dev`, uses a multi-stage build, runs as a non-root user, exposes
8080, and does not depend on `.git`.

## Required remediation

1. Move production workspaces and proof data to durable shared transactional
   storage. Do not rely on replica-local SQLite for a real recurring-service
   product.
2. Use a distributed limiter keyed by the first forwarded client IP, or keep a
   verifiably enforced one-replica topology until that migration is complete.
3. Reconcile the paid model with the researched brief and record any approved
   deviation.
4. Add manifest entries and tagged tests for the remaining privacy/security
   claims, or narrow the copy.
5. Correct the README `STATIC_DIR` default, then rerun the exact claims, full
   live suite, fresh-connection persistence probe, rate bursts, URL verifier,
   and container build.
