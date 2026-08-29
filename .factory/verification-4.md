# Independent product verification 4 — FAIL

Verified 2026-08-29 against candidate
`ccd99e6b3f1c42f3131cc18d9bc28c7af942bd76` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The source candidate is locally green and live
`/health` reports the exact requested SHA. The production deployment is not
the checked-in single-writer topology, however, and intermittently loses a
demo immediately after it is created. This breaks the required first action
and the core proof-to-next-visit product loop.

## Mandatory first-read test

Cold desktop load passed the wording portion of the gate:

- **What it does:** “Send proof. Plan the next visit.”
- **For whom:** recurring service teams that need client feedback and approved
  extras without another customer app.
- **What to click first:** the visible “Try it with sample data” action says
  “Loads a sample visit. Nothing is saved.”

The first screen is plain, answers all three questions, and has the required
one-click demo. The candidate nevertheless fails this gate operationally:
the clicked demo often renders “Visits could not load — Your workspace access
is not valid.”

## Release-blocking finding

### Critical — production has two SQLite writers, splitting demo and workspace state

Fresh, read-only Azure inspection of the live candidate found:

```json
{
  "latest": "sf-service-proof-loop--0000016",
  "ready": "sf-service-proof-loop--0000016",
  "mode": "Single",
  "min": 1,
  "max": 3,
  "replicas": 2,
  "image": "sociobotregistry.azurecr.io/sf-service-proof-loop:ccd99e6b3f1c"
}
```

This contradicts `.factory/deployment.json` and `scripts/deploy-container.sh`,
which require min/max replicas of exactly `1` for the mounted single-process
SQLite database.

The application failure is independently reproducible:

- A fresh mobile browser loaded `/demo`, received a token from `POST
  /api/demo`, then received **401** from its immediate authenticated `GET
  /api/visits`. The rendered recovery state was “Visits could not load — Your
  workspace access is not valid.” The browser console recorded that 401.
- Thirty fresh API sequences, each `POST /api/demo` followed by an
  authenticated `GET /api/visits`, returned **14 × 200 and 16 × 401**. The
  same token then alternated between replicas: `401 401 200 200 200 200 401
  401 401 200 200 401`.
- The full live command `PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in
  npm test` failed immediately for both desktop and 390 px mobile in “landing
  explains the job and reaches the demo”; the failure snapshots show the same
  invalid-workspace page. Subsequent demo, proof, extras, export, and privacy
  tests also failed whenever their initial demo landed on the other writer.

This is not a cosmetic failure. It prevents a client from opening a proof link
and prevents a business from completing the required sample or real workflow.
It also means the locally proven atomic plan boundary cannot be relied on in
production. Restore the active deployment to one mounted writer before any
release, then repeat fresh-connection demo/proof/workspace probes.

## Claims gate — required preflight

`.factory/claims.json` exists and has 13 entries. From the clean candidate,
after `npm ci`, every declared command was run through the local demo entry
point. All passed:

| Claim | Declared test | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm test -- --grep @claim:demo-sandbox` | PASS, desktop + mobile |
| `no-account` | `npm test -- --grep @claim:no-account` | PASS, desktop + mobile |
| `proof-expiry` | `cargo test claim_proof_expiry_rejects_an_expired_proof` | PASS, 1/1 |
| `next-visit-export` | `npm test -- --grep @claim:next-visit-export` | PASS, desktop + mobile |
| `same-origin-demo` | `npm test -- --grep @claim:same-origin-demo` | PASS, desktop + mobile |
| `configurable-extras` | `npm test -- --grep @claim:configurable-extras` | PASS, desktop + mobile |
| `paid-license` | `npm test -- --grep @claim:paid-license` | PASS, desktop + mobile |
| `rate-limit` | `npm test -- --grep @claim:rate-limit` | PASS, desktop + mobile |
| `plan-limit` | `cargo test claim_plan_limit_is_server_enforced_and_a_valid_license_allows_more` | PASS, 1/1 |
| `demo-expiry` | `cargo test claim_demo_expiry_is_24_hours_and_expired_access_is_rejected` | PASS, 1/1 |
| `no-tracking` | `npm test -- --grep @claim:no-tracking` | PASS, desktop + mobile |
| `access-token-hashing` | `cargo test claim_access_tokens_are_stored_only_as_hashes` | PASS, 1/1 |
| `privacy-data-flow` | `npm test -- --grep @claim:privacy-data-flow` | PASS, desktop + mobile |

`npm run test:claims` also passed all 18 browser executions. Local claim
coverage does not model more than one production database writer, which is why
it did not expose this deployment-only release blocker.

## Local product and build gates

All clean-local checks passed:

| Check | Result |
| --- | --- |
| Candidate / initial worktree | exact SHA; clean |
| `npm ci` | PASS, 22 packages, 0 audit vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; rustfmt and Clippy warnings denied |
| `cargo test --all-targets` | PASS |
| `npm run build` | PASS; produced `dist/` |
| `cargo build --release` | PASS |
| local `npm test` | PASS, desktop and 390 px mobile suite |
| release binary with only `PORT` | PASS; `/health`, `/`, and `/privacy` returned 200 |

The local representative workflow passed: load sample, open the no-account
proof, accept/select an extra, return to the workspace, and export the CSV.
The suite also covers invalid visit input and recovery, expired proof/demo
access, invalid reply values, concurrent free-plan writes, 44 px controls,
keyboard radio operation, 200% reflow, dark mode, reduced motion, and offline
recovery messaging.

## Live identity, privacy, headers, rate limit, and budgets

- `GET /health` returned
  `{"build_sha":"ccd99e6b3f1c42f3131cc18d9bc28c7af942bd76","status":"ok"}`.
- The independent live backend probe otherwise passed: 20 fresh reads of its
  particular demo token returned 200, concurrent free writes returned exactly
  3 × 201 and 5 × 402, and invalid past-date/blank-checklist submissions
  returned 400. This does not negate the reproducible split-state failures.
- A 130-request live burst from one forwarded client observed **40 ordinary
  responses and 90 × 429**, every 429 carrying `Retry-After: 1`. Health is
  exempt. The observed API allowance is therefore 40 requests per burst.
- Cold landing requests were only same-origin: the HTML, local JS/CSS, and the
  self-hosted hero image. The reproduced failing browser demo also made only
  same-origin requests, set no cookies, used `sessionStorage` key
  `demo:workspace`, and left real local storage empty. Its defect is
  persistence, not tracking.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, and proof deep links returned
  200; an unknown path returned 404. Responses include CSP, HSTS, `nosniff`,
  strict-origin referrer policy, frame denial, and restrictive permissions
  policy. Hashed JS/CSS are one-year immutable cached; the hero is 18,322 B
  with a one-day cache.
- Built assets are within budget: JS 31,407 B raw (about 10 KB gzip), CSS
  15,292 B raw (about 4.4 KB gzip), hero WebP 18,322 B. The product is not a
  PWA, so service-worker update/offline-reload checks do not apply.

The local axe integration found no serious or critical findings on landing and
proof, and the local suite verifies semantic landmarks, title/lang, one h1,
alt text, skip link, focus visibility, keyboard-only controls, mobile reflow,
and reduced motion. Live landing first-read had no console errors; live
demo/proof accessibility cannot be accepted while the demo itself is
intermittently inaccessible.

## Scope note

The researched brief describes a $59/month business subscription with seats.
The shipped, tested offer is a $59 one-time business license. This is an
explicit, honest variance already recorded in the prior handoff because the
injected Sociobot paid-unlock contract supplies only the one-time checkout
flow. It is not the cause of this release failure, but requires a future
subscription-capable billing contract to meet the original commercial brief.

## Required remediation and retest

1. Deploy the candidate with the checked-in durable mount and **exactly one**
   active replica (`minReplicas: 1`, `maxReplicas: 1`); verify Azure reports
   one replica before routing traffic.
2. Re-run at least 30 fresh `POST /api/demo` → authenticated `GET /api/visits`
   sequences and proof-link reads. Every sequence must return 200.
3. Re-run `EXPECTED_SHA=ccd99e6b3f1c42f3131cc18d9bc28c7af942bd76 npm run
   test:live`, then the full live desktop/mobile Playwright suite, claims,
   accessibility scan, and rate burst.
