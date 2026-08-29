# Independent product verification 9 — FAIL

Verified on 2026-08-29 against candidate
`7fbc18756626b21a0633d96210b8c330d82e9a44` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The candidate is healthy in a clean local runtime,
and the live build identity and static assets match it. Production does not,
however, use the candidate's required durable single-writer topology. Azure
Container Apps is configured for three replicas and has no volume mount. The
full live test raised the revision from one to three running replicas and
immediately reproduced split SQLite state and tripled in-memory rate limits.

After scale-out, only 138 of 400 authenticated demo reads succeeded; 262
returned `401`. Only one of 20 proof sequences succeeded. The full production
browser suite passed 20 of 42 checks. Fresh demo pages on desktop and 390 px
showed **“Visits could not load — Your workspace access is not valid.”**

## Mandatory first-read and demo gate

The cold landing screen passes the plain-words portion:

- **What it does:** “Send proof. Plan the next visit.” Approved extras move to
  the next visit.
- **For whom:** recurring service teams that need client feedback without a
  customer app.
- **What to click:** “Try it with sample data,” beside “Loads a sample visit.
  Nothing is saved.”

The three facts and action are visible in the first 390 × 844 screen. The
landing has one `h1`, one `main`, `lang=en`, a descriptive title, and no cold
console errors. Evidence: [cold desktop](evidence-9/live-cold-desktop.png),
[cold mobile](evidence-9/live-cold-mobile.png), and
[cold DOM/request capture](evidence-9/live-cold.json).

The one-click demo is not reliable and therefore the mandatory demo gate
fails. It worked before load caused scale-out. After scale-out, fresh desktop
and mobile clicks created a demo token but the following workspace request
returned `401`; both screens rendered the recovery state instead of sample
data. Evidence: [live UI audit](evidence-9/live-ui-audit.json).

## Release-blocking findings

### Critical — production uses three ephemeral SQLite writers

`EXPECTED_SHA=7fbc18756626b21a0633d96210b8c330d82e9a44 npm run
test:live` fails with **“maximum replica count drifted from the deployment
contract.”** The fresh Azure snapshot reports:

| Property | Required | Observed |
| --- | --- | --- |
| Image | candidate tag | `sf-service-proof-loop:7fbc18756626` |
| Revision | latest and active | `sf-service-proof-loop--0000031` |
| Active revision mode | Single | Single |
| Minimum replicas | 1 | 1 |
| Maximum replicas | 1 | **3** |
| `/data` Azure Files mount | present | **none** |
| Template volume | present | **none** |
| Replicas before load | 1 | 1 |
| Replicas after browser load | 1 | **3 running** |

The low-load probe initially passed while only one replica was running:
400/400 authenticated reads and 20/20 proofs. Once the full browser workload
caused the allowed scale-out, a new probe produced:

| Result after scale-out | Count |
| --- | ---: |
| Demo creation | 20/20 HTTP 200 |
| Workspace reads | 138/400 HTTP 200 |
| Lost workspace reads | **262/400 HTTP 401** |
| Complete proof sequences | **1/20** |
| Proof requests returning 404 | 5/20 |
| Proof requests impossible because the first read returned 401 | 14/20 |

The full pinned production Playwright suite passed **20/42** and failed
**22/42** across desktop and 390 px. Failures covered the demo, next-visit CSV,
extras, privacy flow, visit creation, photos, ratings, same-origin/no-tracking
claims, rate limiting, proof accessibility checks, and console cleanliness.
The repeated screen was “Your workspace access is not valid,” with a failed
same-origin `401` request. Representative screenshots are in
[`evidence-9/`](evidence-9/).

An independent eight-write free-plan probe returned 3 × `201` and 5 × `401`,
not the required atomic 3 × `201` and 5 × `402`. The absence of a durable mount
also means production workspaces can disappear on replica replacement even
without scale-out. A forced production restart was not performed because it
would mutate live service state.

Evidence:
[replicas after load](evidence-9/live-replicas-after-load.json),
[continuity after scale](evidence-9/live-continuity-after-scale.json), and
[concurrent plan writes](evidence-9/live-concurrent-plan.json).

### Major — the documented 40-request allowance becomes 120

Every API endpoint except health is documented as limited by forwarded client
IP. On one replica, independent bursts returned 40 allowed / 5 limited for 45
requests and 40 allowed / 90 limited for 130 requests. With three replicas:

| Burst | Allowed | 429 | Retry-After on 429 |
| --- | ---: | ---: | --- |
| 45 | **45** | **0** | not present |
| 130 | **120** | 10 | `1` |

This violates the mandatory server-side allowance. The eventual 429 responses
do include the correct header, but each replica maintains its own 40-request
bucket. Evidence: [rate limit after scale](evidence-9/live-rate-after-scale.json).

### Major — commercial scope differs from the researched brief

The acceptance brief specifies **$59 per business each month plus technician
seats**. The shipped product and registered checkout sell a **$59 one-time
business license** with no seat model. The copy accurately describes the
checkout, and the attached paid-unlock contract is one-time-license oriented,
but the researched product contract remains materially unmet.

## Claims preflight

`.factory/claims.json` exists with 16 entries. The literal first invocation in
the dependency-free clone stopped at `tsc: not found`. After the required
`npm ci`, every listed command was run separately and all passed locally.
Browser claims passed in both configured desktop and mobile projects.

| Claim | Local result |
| --- | --- |
| `demo-sandbox` | PASS — reset changes the demo token and does not touch real storage |
| `no-account` | PASS — fresh context opens proof |
| `proof-expiry` | PASS — expired proof returns 410 |
| `next-visit-export` | PASS — chosen extra appears in CSV |
| `same-origin-demo` | PASS — demo requests stay on product origin |
| `configurable-extras` | PASS — added choice appears on proof |
| `paid-license` | PASS — Sociobot checkout/registry and restore fixture |
| `rate-limit` | PASS locally — 429 with `Retry-After`; FAIL live after scale |
| `plan-limit` | PASS locally — atomic three-visit limit; FAIL live after scale |
| `demo-expiry` | PASS — at most 24 hours and expired access rejected |
| `no-tracking` | PASS — no third-party font, script, or analytics requests |
| `access-token-hashing` | PASS — raw production tokens absent from SQLite |
| `privacy-data-flow` | PASS locally; FAIL live after scale |
| `photo-upload` | PASS locally; FAIL live after scale |
| `problem-rating` | PASS locally; FAIL live after scale |
| `zero-config-runtime` | PASS — empty environment, port 8080 |

Landing, legal pages, and README claim-like statements map to declared claims
or explicit non-goals. No additional material behavior claim was found.

## Clean local quality gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, zero audit vulnerabilities |
| every command in `.factory/claims.json` | PASS after install |
| `npm run test:all` | PASS — 12 Rust, 12 Node, runtime, 42 Playwright |
| `npm run typecheck` | PASS through `npm test` |
| `npm run lint` | PASS — rustfmt and Clippy, warnings denied |
| `npm run build` | PASS — `dist/` produced |
| `cargo build --release --bin service-proof-loop` | PASS through runtime gate |
| Dockerfile build | Not run — no Docker, Podman, Buildah, or nerdctl available |

The production build contains 31,751 B JavaScript (10.15 KB gzip), 15,437 B
CSS (4.41 KB gzip), no font files, and an 18,322 B hero. These are comfortably
inside the required budgets.

## Independent functional and boundary checks

A fresh local release server and database completed the useful loop:
workspace creation → consented photo/checklist visit → private proof → client
problem with rating 2 → approved extra → workspace status → next-visit CSV.
The CSV contained the exact client, location, extra, next date, and `$1000.00`
boundary price.

The API rejected an empty business name, missing authorization, a past date,
blank checklist label, 601-character note, photo without consent, four photos,
invalid response state, rating 0, seven extras, and prices below $0 or above
$1,000. Exact $0 and $1,000 prices were accepted. The fourth unlicensed visit
returned `402`. All errors supplied a concrete corrective next step. Evidence:
[local boundary flow](evidence-9/local-boundary-flow.json).

Production could not complete the same reliable loop after scale-out because
the token and its data frequently landed on different replicas.

## Accessibility, mobile, keyboard, motion, and privacy

- Local axe, dark-mode, keyboard, focus, touch-target, and 200% text checks
  passed on desktop and 390 px. The live landing independently produced zero
  WCAG A/AA axe violations at both sizes.
- Focus is a visible 3 px apricot ring. The keyboard test operates proof state,
  rating arrows, submission, heading focus, and live announcement. Reduced
  motion caps transition/animation duration at 0.01 ms.
- The 390 px landing and 200% text have no horizontal overflow. All images have
  alternatives, controls have names, headings are ordered, and each audited
  route has one `h1` and one `main`.
- Live proof accessibility could not be completed after scale-out because the
  demo returned 401 before proof controls existed. This is an availability
  failure, not an axe finding.
- Cold landing and demo recordings contacted only the product origin. No
  cookies were set. Demo access used `sessionStorage['demo:workspace']`; real
  local storage remained empty. The failing request was same-origin.
- Root/API responses include CSP, HSTS, `nosniff`, frame denial, strict-origin
  referrer policy, and camera/microphone/geolocation denial.
- The product is not a PWA and makes no offline-reload claim. Its offline state
  gives a reconnect instruction. It has no sign-in, so Entra verification is
  not applicable. It is not a library or CLI.

Evidence: [UI/accessibility/privacy audit](evidence-9/live-ui-audit.json),
[headers](evidence-9/health-headers.txt), and
[route/link audit](evidence-9/live-routes-links.json).

## Live identity, routing, caching, and performance

- `/health` returns the exact candidate SHA.
- Live SHA-256 values match local `dist/` for JS, CSS, hero, social image, and
  both sample SVGs.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; shared images use a
  one-day cache.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, robots, sitemap, icons, and social
  assets resolve. Unknown routes return the styled HTTP 404. Internal links
  resolve; checkout returns 303 to hosted Dodo checkout; explicit `mailto:`
  links are present.
- Fresh Lighthouse 12.8.2 output recorded Performance 98, Accessibility 100,
  Best Practices 100, SEO 100; FCP 1.326 s, LCP 1.498 s, TBT 143 ms, CLS 0,
  and 68,274 B transfer. Lighthouse printed a tab-crash cleanup warning after
  producing the complete JSON report.

Evidence: [health](evidence-9/health.json),
[Lighthouse](evidence-9/lighthouse-live.json), and the asset header captures in
[`evidence-9/`](evidence-9/).

## Required release action

Deploy this exact candidate only with the checked-in
`./scripts/deploy-container.sh`, then require all of these before release:

1. Mount Azure Files `service-proof-loop-data` at `/data`.
2. Set `minReplicas=1`, `maxReplicas=1`, keep one active revision, and verify
   exactly one running replica.
3. Require the SHA-pinned `npm run test:live` to pass 400/400 reads, 20/20
   proofs, validation, atomic plan limits, and both rate bursts.
4. Require the full live Playwright suite to pass 42/42 on desktop and 390 px.
5. Resolve or formally re-scope the subscription/technician-seat variance.
