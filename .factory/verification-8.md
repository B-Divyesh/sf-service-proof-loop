# Independent product verification 8 — FAIL

Verified on 2026-08-29 against candidate
`6fde7c3f605a34058d7eb13d5fe96a6feeb9d311` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The live image and static assets match the candidate,
but the production topology does not match its required durable single-writer
contract. Azure is running three replicas, permits three replicas, and mounts
no volume. Fresh workspaces therefore exist on only one of three SQLite files.
In an independent 20-demo probe, 266 of 400 immediate authenticated reads
returned `401`, and only 3 of 20 proof checks succeeded. The live browser suite
passed 30 of 42 checks.

The same deployment also multiplies the documented per-client API allowance.
A 45-request burst received no `429`; a 130-request burst allowed 120 requests
before returning ten `429` responses. The required allowance is 40, with at
most two refill requests during the probe.

## Mandatory first-read and demo gate

The cold first screen itself passes the plain-words test:

- **What it does:** “Send proof. Plan the next visit,” with client feedback and
  approved extras carried into the next visit.
- **For whom:** recurring service teams that do not want another customer app.
- **What to click first:** “Try it with sample data,” beside “Loads a sample
  visit. Nothing is saved.”

All three answers, the action, its explanation, and the three plain facts fit
inside the first 390 × 844 viewport. The initial cold click opened `/demo`,
showed Willow Street, and displayed the persistent “Demo — sample data,
nothing is saved” banner with **Reset demo** and **Start for real**.

The demo is not reliable enough to satisfy the acceptance contract. A later
fresh `/demo` verification rendered “Visits could not load — Your workspace
access is not valid” and logged a `401`. An independent desktop run required
nine reloads to reach its workspace; mobile required three. Evidence:

- [desktop first read](qa-artifacts/verification8/first-read-desktop.png)
- [mobile first read](qa-artifacts/verification8/first-read-mobile.png)
- [successful one-click result](qa-artifacts/verification8/one-click-demo.png)
- [live mobile 401 failure](qa-artifacts/verification8/live-demo-401-mobile.png)
- [live `/demo` URL check](qa-artifacts/verification8-demo/verify.json)

## Release-blocking findings

### Critical — production state is split across three ephemeral replicas

Fresh Azure evidence for active revision `sf-service-proof-loop--0000028`:

| Property | Required | Observed |
| --- | --- | --- |
| Candidate image | `6fde7c3f605a` | `sociobotregistry.azurecr.io/sf-service-proof-loop:6fde7c3f605a` |
| Active revision mode | Single | Single |
| Minimum replicas | 1 | 1 |
| Maximum replicas | 1 | **3** |
| Running replicas | 1 | **3** |
| `/data` volume mount | Azure Files | **none** |
| Template volumes | Azure Files | **none** |

`EXPECTED_SHA=6fde7c3f605a34058d7eb13d5fe96a6feeb9d311 npm run
test:live` fails immediately with “maximum replica count drifted from the
deployment contract.” The output is in
[live-verifier.txt](qa-artifacts/verification8/live-verifier.txt).

The direct continuity probe created all 20 demos successfully, then launched
20 authenticated reads for each token at once:

| Result | Count |
| --- | ---: |
| Demo creation | 20/20 HTTP 200 |
| Workspace read | 134 HTTP 200 |
| Workspace read | **266 HTTP 401** |
| Matching proof | **3/20 HTTP 200** |

Every demo sequence lost its workspace on 10–17 of 20 reads. The full pinned
Playwright suite against production passed 30/42 and failed 12 checks across
desktop and 390 px. Failures included mobile visit creation, photo upload,
problem/rating, the demo request claim, proof accessibility checks, and
console-error checks. Full output:
[playwright-live.txt](qa-artifacts/verification8/playwright-live.txt).

### Major — the live request allowance is 120, not 40

Every server endpoint except `/health` is documented as limited by forwarded
client IP. Fresh bursts from one client produced:

| Burst | Allowed | 429 | Retry-After |
| --- | ---: | ---: | --- |
| 45 requests | **45** | **0** | not present |
| 130 requests | **120** | 10 | `1` on every 429 |

The three independent in-memory limiters triple the configured burst of 40.
This violates the mandatory backend contract even though eventual `429`
responses have the correct header.

### Major — shipped commercial scope differs from the researched brief

The brief specifies **$59 per business each month plus technician seats**.
The product and live checkout ship a **$59 one-time business license** with no
seat billing. The copy discloses the actual offer and the checkout correctly
redirects to Dodo through Sociobot, but this remains a material scope variance.

### Low — the real 404 response lacks social metadata

`/definitely-missing` correctly returns HTTP 404 with a styled page, title,
description, canonical link, one `h1`, and landmarks. It has no Open Graph or
Twitter card metadata, although the site-structure contract asks every route
to provide it.

## Claims preflight

`.factory/claims.json` exists with 16 entries. The literal pre-install
invocation from the clean checkout could not find `tsc`/`vite`, as expected
before dependencies are installed. After the required `npm ci`, every listed
command was run separately and all claims passed. Each ID occurs on exactly
one tagged test. Complete output is in
[claims.txt](qa-artifacts/verification8/claims.txt).

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS — desktop and 390 px |
| `no-account` | PASS — desktop and 390 px |
| `proof-expiry` | PASS — Rust integration test |
| `next-visit-export` | PASS — desktop and 390 px |
| `same-origin-demo` | PASS — desktop and 390 px |
| `configurable-extras` | PASS — desktop and 390 px |
| `paid-license` | PASS — registry, hosted checkout, restore fixture |
| `rate-limit` | PASS locally — forwarded-IP burst and `Retry-After` |
| `plan-limit` | PASS — server-side limit and concurrency fixture |
| `demo-expiry` | PASS — 24-hour boundary and expired access |
| `no-tracking` | PASS — same-origin requests |
| `access-token-hashing` | PASS — direct database inspection |
| `privacy-data-flow` | PASS — proof, reply, workspace, and CSV |
| `photo-upload` | PASS — limits, consent, and saved images |
| `problem-rating` | PASS — saved and returned to workspace |
| `zero-config-runtime` | PASS — empty environment, port 8080 |

Landing and README claim-like statements map to these claims; no unlisted
material behavior claim was found.

## Local quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, zero audit findings |
| `npm run test:all` | PASS — 12/12 Rust, 8/8 Node, runtime, 42/42 Playwright |
| `npm run typecheck` | PASS through `npm test` |
| `npm run lint` | PASS — rustfmt and Clippy, warnings denied |
| `npm run build` | PASS — `dist/` produced |
| `cargo build --release` | PASS through runtime gate |
| Container build | Not run — no Docker/Podman/Buildah/nerdctl in this worker |

Outputs: [test-all.txt](qa-artifacts/verification8/test-all.txt),
[lint.txt](qa-artifacts/verification8/lint.txt), and
[build.txt](qa-artifacts/verification8/build.txt).

## Functional, boundary, and recovery evidence

A fresh local 390 px real workspace completed the smallest useful product:
workspace creation, empty state, completed visit, consented photo, private
proof, client problem/rating, chosen oven extra, workspace return, and CSV
export. The CSV contained the correct next date, client, location, extra,
detail, and `$35.00`. The proof expiry was exactly 14 days. Evidence:
[local real flow](qa-artifacts/verification8/local-real-flow-mobile.png).

Independent validation covered empty business name, missing authorization,
no checklist items, a blank checklist label, a past date, a 601-character
note, a photo without consent, four photos, invalid response status, rating 0,
seven extras, and extra prices below $0 or above $1,000. Each returned 400 or
401 as appropriate. Exact boundary prices $0 and $1,000 were accepted. The UI
recovered from empty checklist, past date, and missing photo consent, then
created the proof successfully.

Those same handlers are correct on the owning live replica, but every
authenticated live case first returned `[401, 401, expected]`; proof cases
returned `[404, 404, expected]`. A valid live visit needed three attempts
(`401, 401, 201`), its proof needed three (`404, 404, 200`), its response needed
three (`404, 404, 200`), and its export needed three (`401, 401, 200`). Eight
simultaneous free-plan writes returned 1 × 201 and 7 × 401 instead of the
contracted atomic 3 × 201 and 5 × 402.

## Accessibility, mobile, keyboard, and motion

- When a proof is reachable, independent axe WCAG A/AA runs found zero serious
  or critical issues in dark mode on desktop and 390 px. The repository's
  light/dark axe suite also passes locally.
- `lang=en`, one `h1`, one `main`, header/footer landmarks, labels, alt text,
  skip link, route focus, and live announcements are present.
- Keyboard status/rating controls, save action, and visible apricot focus rings
  pass locally. Interactive wrappers provide at least 44 px targets.
- The 390 px landing has no horizontal overflow, including at 200% text.
- Reduced motion caps animations and transitions at 0.01 ms and disables
  smooth scrolling.
- The live accessibility test failures are availability failures while waiting
  for a proof control after a 401, not axe violations.

## Privacy, security, routing, and identity

- A fresh landing → demo → proof → reply recording contacted only
  `https://service-proof-loop.sociobot.in`. It set no cookies. Demo access was
  stored only in `sessionStorage['demo:workspace']`; `localStorage` stayed
  empty. Intermittent same-origin 401/404 responses were observed.
- Root and API responses include HSTS, restrictive CSP, `nosniff`, frame
  denial, strict-origin referrer policy, and a restrictive permissions policy.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, proof SPA routes, robots,
  sitemap, icons, and social image return 200. Unknown routes return a styled
  HTTP 404. Internal links resolve; checkout returns 303 to Dodo; the Param
  Factory link returns 200.
- `/health` returns the exact candidate SHA. Live JS, CSS, and hero image
  SHA-256 hashes match local `dist/` byte for byte.
- Hashed JS/CSS return `public, max-age=31536000, immutable`; the hero image
  uses a one-day cache.
- No third-party fonts, scripts, analytics, raw Azure/OpenAI keys, or runtime AI
  calls were found. No additional AI feature is implied by this operational
  loop.
- The product has no sign-in, so the Entra authority check is not applicable.
  It is not a PWA and makes no offline-reload claim. It is not a library or CLI.

## Performance

The exact build produces 31,751 B JavaScript (10,144 B gzip), 15,437 B CSS
(4,414 B gzip), no font files, and an 18,322 B hero. Fresh Lighthouse 12.8.2
mobile results are in
[lighthouse-live.json](qa-artifacts/verification8/lighthouse-live.json):

- Performance 100, Accessibility 100, Best Practices 100, SEO 100
- FCP 1.20 s, LCP 1.35 s, TBT 88 ms, CLS 0
- Total transfer 68,256 B

## Required release action

Deploy this candidate only through the checked-in
`./scripts/deploy-container.sh` path, then require all of the following before
release:

1. Azure Files is mounted at `/data`; `maxReplicas` is 1; exactly one replica
   is running.
2. `EXPECTED_SHA=6fde7c3f605a34058d7eb13d5fe96a6feeb9d311 npm run test:live`
   passes, including 400/400 authenticated reads and 20/20 proofs.
3. The 45- and 130-request bursts enforce one 40-request allowance and return
   `429` with `Retry-After: 1` beyond it.
4. The full live Playwright suite passes 42/42 on desktop and 390 px.
