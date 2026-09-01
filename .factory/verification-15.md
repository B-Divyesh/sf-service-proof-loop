# Independent product QA verification 15 — Service Proof Loop

**Result: FAIL**

Verified on 2026-09-01 UTC against candidate
`ea98c831e15ee00755776623cf461102eeac7302` at
<https://service-proof-loop.sociobot.in>. Product source was not changed during
this verification.

## Release decision

The candidate is not approved because the paid scope shown to visitors is not
fully represented by `.factory/claims.json`, and one part is not enforced by
the service:

- The landing page and README promise “unlimited” proof links or visits. The
  `plan-limit` claim confirms only that a valid license permits a fourth visit.
  No declared claim checks the absolute “unlimited” wording.
- The price block and accepted commercial decision say “One business
  workspace.” No declared claim checks that boundary. In a clean local runtime
  with a recorded valid-license response, the same license permitted a fourth
  visit in two separate workspaces. Both workspaces returned
  `201, 201, 201, 201`.

This is a high-severity claims and paid-scope finding. Every declared claim
command passed after the clean dependency install, but the claims registry is
not complete for the paid copy.

## Candidate and first read

- Clean checkout: `git status --short` was empty before evidence files were
  created.
- Local commit: `ea98c831e15ee00755776623cf461102eeac7302`.
- Live `/health`: `status: ok`, build SHA
  `ea98c831e15ee00755776623cf461102eeac7302`.
- Live image:
  `sociobotregistry.azurecr.io/sf-service-proof-loop:ea98c831e15e`.
- The local and live hashed JavaScript and CSS files had identical SHA-256
  values.

A cold desktop and 390 px mobile visit returned 200. The first screen says
“Send proof. Plan the next visit.” It names recurring service teams and gives
“Try it with sample data” as the first action. The adjacent text says it loads
a sample visit and does not save real work. One click opened the Willow Street
sample with the persistent demo banner, Reset demo, and Start for real.

This passes the required first-read and one-click-demo check. Screenshots are
under `.factory/evidence-verification-15/home/` and
`.factory/evidence-verification-15/demo/`.

## Required claims gate

`.factory/claims.json` exists with 18 entries. The first command was attempted
before packages were installed and could not start because `tsc` was absent.
After the required `npm ci`, that command and every other listed command were
run exactly as declared and passed.

| Claim | Result | Observed evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Reset produced a new demo workspace; real storage remained empty; desktop and mobile passed. |
| `no-account` | PASS | A fresh browser context opened a proof without workspace storage; desktop and mobile passed. |
| `proof-expiry` | PASS | The Rust claim test changed expiry to the past and received 410. |
| `next-visit-export` | PASS | A selected extra appeared in the downloaded CSV; desktop and mobile passed. |
| `same-origin-demo` | PASS | The demo request log contained only the product origin; desktop and mobile passed. |
| `configurable-extras` | PASS | A new extra appeared on the client proof; desktop and mobile passed. |
| `paid-license` | PASS | The public product entry was $59, checkout returned a Dodo URL, and delayed license restore completed; desktop and mobile passed. |
| `rate-limit` | PASS | A 45-request local check produced 429 with `Retry-After`; desktop and mobile passed. |
| `plan-limit` | PASS | Three free visits were created, the fourth returned 402, a recorded valid license permitted another visit, and concurrent free writes created exactly three visits. |
| `demo-expiry` | PASS | The demo TTL was no more than 24 hours and expired access was rejected. |
| `no-tracking` | PASS | Landing and demo resource logs contained no third-party origin; desktop and mobile passed. |
| `access-token-hashing` | PASS | Raw production access tokens were absent from SQLite and their SHA-256 values were present. |
| `privacy-data-flow` | PASS | Visit details reached proof; the reply and selected extra returned to the workspace and CSV. |
| `photo-upload` | PASS | Three consented images were saved and shown; four images and an image over 1 MB produced the stated correction. |
| `problem-rating` | PASS | A problem with rating 2 was saved and returned to the workspace. |
| `zero-config-runtime` | PASS | The release binary started with an empty environment and served health and landing content on port 8080. |
| `proof-page-privacy` | PASS | Proof HTML and API responses sent private no-store and noindex controls. |
| `deployment-continuity` | PASS | The live topology, 20 demos, 400 concurrent reads, proof continuity, plan boundary, validation, and rate allowances passed. |

The aggregate `npm test -- --grep @claim` behavior is also covered by the full
browser run: all declared browser claims passed in both configured projects.
The earlier paid-license timing failure reported in verification 14 did not
recur in the individual claim command, the full local suite, or the full live
suite.

## Local quality checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 locked packages; 0 reported vulnerabilities. |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities. |
| `cargo test --all-targets` | PASS — 12/12 integration tests. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS — Rust formatting and Clippy with warnings denied. |
| `npm run test:deployment` | PASS — 26/26 checks. |
| `npm run test:runtime` | PASS — release build and empty-environment startup. |
| `npm test` | PASS — 46/46 browser checks across desktop and 390 px mobile. |
| `npm run build` | PASS — `dist/` produced. |

The production output contains 33.41 kB JavaScript (10.50 kB gzip), 15.44 kB
CSS (4.41 kB gzip), and an 18.32 kB hero image. These are below the product
budgets. The verifier container does not include Docker, so a separate local
container build was not available. The release Rust binary, zero-configuration
runtime, deployed build SHA, image tag, and live asset hashes were confirmed.

## End-to-end and recovery checks

The full local and live Playwright runs each passed 46/46 checks. They confirmed
the normal path from sample visit to client proof, reply or problem, rating,
extra selection, and next-visit CSV.

Boundary and invalid-input results included:

- three photos saved successfully;
- four photos showed “Use up to three photos under 1 MB each.”;
- a 1,000,001-byte image showed the same correction;
- a past next-visit date returned 400;
- a blank checklist label returned 400;
- eight simultaneous free-plan writes produced three 201 and five 402
  responses;
- an invalid proof token showed “This proof link is not valid.” and a Return
  home action;
- a recorded 503 while preparing the sample showed a clear error and “Try the
  demo again”; the retry loaded the Willow Street sample.

The link crawl checked landing, demo, privacy, terms, proof, and the designed
404 page. Product routes returned 200, the product checkout returned the
expected 303 to Dodo, `sociobot.in` returned 200, and mail links were explicit.
The 404 page's skip link remains an in-page fragment on the current 404
document; its Return home action returned 200.

## Privacy, accessibility, and browser behavior

An independent Playwright request log covered landing, demo creation, proof
reading, a saved comment, and a selected extra. It recorded 11 requests, one
origin (`https://service-proof-loop.sociobot.in`), and no third-party origin.
No analytics, external scripts, or external fonts loaded.

Proof reads and replies returned:

- `Cache-Control: private, no-store`;
- `X-Robots-Tag: noindex, nofollow, noarchive`.

The live response policy included CSP with `frame-ancestors 'none'`, HSTS,
`X-Content-Type-Options: nosniff`, strict-origin referrer policy, frame denial,
and a camera/microphone/geolocation-denying Permissions-Policy. Hashed JS and
CSS returned `public, max-age=31536000, immutable`.

`verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`: each returned
200 with a title, `lang="en"`, one H1, a main landmark, image alternatives, and
no console or page errors. Full-page screenshots at desktop and 390 px were
inspected with no clipping or horizontal overflow.

The live Axe checks reported no serious or critical findings in light or dark
treatments. Keyboard-only use reached the sample action, client view, accept
control, rating controls, and save action. Each focused control showed a 3 px
apricot outline. Arrow-key rating selection worked, and completion moved focus
to the saved heading and updated the polite announcer. Touch-target and 200%
text-reflow checks passed. Reduced-motion emulation changed 160 ms transitions
to 0.01 ms and changed smooth scrolling to `auto`.

Lighthouse 13.4.1 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.2 s |
| LCP | 1.4 s |
| Total blocking time | 100 ms |
| CLS | 0 |
| Total transfer | 68 KiB |

The full report is
`.factory/evidence-verification-15/lighthouse-mobile.json`.

## Backend and deployment checks

`npm run test:live` confirmed:

- revision `sf-service-proof-loop--0000047`;
- one active revision and one replica, with min/max both 1;
- Azure Files storage `sf-service-proof-loop-data` mounted at `/data`;
- candidate build SHA and matching image tag;
- 20 demo workspaces, 400/400 concurrent workspace reads, and 20/20 proof
  reads;
- exactly three successful free-plan writes from eight simultaneous requests;
- product API allowance of 40 per forwarded client: 40 allowed and 5 limited
  from 45 requests, then 40 allowed and 90 limited from 130 requests;
- `Retry-After: 1` on every product API 429 response.

The product-specific Sociobot license-verification URL was checked separately
with 45 invalid sample tokens. It returned 30 normal responses and 15 responses
with status 429; every 429 included `Retry-After: 4`.

`npm run test:live:persistence` changed the product replica from
`sf-service-proof-loop--0000047-5c8558f744-jt96l` to
`sf-service-proof-loop--0000047-74cb58bff9-vzmzq`. Health recovered with the
candidate SHA, and the same workspace, visit, and proof remained readable. The
service returned to one active revision and one replica.

This product has no sign-in requirement and is not a PWA, library, or CLI, so
the Entra, service-worker, consumer-package, and CLI-specific checks do not
apply. The deterministic proof-to-next-visit job already includes export; no
essential AI-assisted step was identified for this scope.

## Defects by severity

- Critical: none.
- High: **Paid scope is unlisted and not enforced as stated.** “Unlimited” is
  absent from the claims registry and its test evidence. “One business
  workspace” is also absent, and one recorded valid license permitted fourth
  visits in two distinct workspaces. Align the paid copy, claims registry,
  observable tests, and service rule before release.
- Moderate: none.
- Low: none.

## Retest

After correcting the paid scope, confirm that every paid statement has one
declared observable claim test. Then rerun:

```sh
npm ci
npm run test:all
npm run lint
npm audit --audit-level=moderate
npm run build
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
EXPECTED_SHA=<candidate-sha> npm run test:live
EXPECTED_SHA=<candidate-sha> npm run test:live:persistence
```
