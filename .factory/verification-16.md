# Service Proof Loop — independent verification 16

## Result

**FAIL** for candidate `04de0ff89b383c8d581b106e5803a7a7f9b1fe8b` at
<https://service-proof-loop.sociobot.in> on 2026-09-01 UTC.

The candidate works locally and the live product works end to end. The release
is blocked because the public service does not identify itself as the candidate:
health and the container image identify `5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3`.
The candidate-pinned live check fails before its functional probes.

No product code was changed during verification.

## Release blocker

### High — live build identity does not match the candidate

Fresh evidence:

- Candidate under test: `04de0ff89b383c8d581b106e5803a7a7f9b1fe8b`.
- `GET /health`: `{"build_sha":"5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3","status":"ok"}`.
- Active image: `sociobotregistry.azurecr.io/sf-service-proof-loop:5253b51abfc5`.
- `EXPECTED_SHA=04de0ff89b383c8d581b106e5803a7a7f9b1fe8b npm run test:live`
  failed with `container image identity does not match EXPECTED_SHA`.

`5253b51` is the direct child of `04de0ff`. The intervening commit changes only
`.factory` evidence and handoff files. The candidate and live frontend bundle
both have SHA-256
`1ad43a1278fd92807a427a45ed3a17f54e379e9841a34e5ba24e93570da61c18`.
This strongly supports behavioral equivalence, but it does not satisfy exact
candidate build identity.

## Mandatory gates

### Claims-first gate

`.factory/claims.json` exists. Every one of its 19 exact commands was run from
the detached candidate after `npm ci`; all passed:

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `no-account` | PASS |
| `proof-expiry` | PASS |
| `next-visit-export` | PASS |
| `same-origin-demo` | PASS |
| `configurable-extras` | PASS |
| `paid-license` | PASS |
| `rate-limit` | PASS |
| `plan-limit` | PASS |
| `license-workspace-boundary` | PASS |
| `demo-expiry` | PASS |
| `no-tracking` | PASS |
| `access-token-hashing` | PASS |
| `privacy-data-flow` | PASS |
| `photo-upload` | PASS |
| `problem-rating` | PASS |
| `zero-config-runtime` | PASS |
| `proof-page-privacy` | PASS |
| `deployment-continuity` | PASS when run exactly as listed, without `EXPECTED_SHA` |

The deployment-continuity command does not require a candidate SHA. Running it
with the candidate SHA exposes the release blocker above.

### Cold first-read and one-click demo

PASS.

- What it does: “Send proof. Plan the next visit.”
- For whom: recurring service teams collecting client feedback and approved
  extras without requiring a client app.
- First click: “Try it with sample data,” followed by “Loads a sample visit.
  Nothing is saved.”
- One click opens `/demo` with the Willow Street sample.
- The demo shows “Demo — sample data, nothing is saved,” **Reset demo**, and
  **Start for real**.

The first screen is plain, specific, and complete at desktop and 390 px.

## Local candidate checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, 0 vulnerabilities |
| Every exact claim command | PASS — 19/19 |
| `cargo test --all-targets` | PASS — 13/13 integration tests |
| `npm run typecheck` | PASS |
| `npm run test:deployment` | PASS — 28/28 |
| `npm run test:runtime` | PASS — release build and empty-environment startup |
| `npm run lint` | PASS — Rust format and Clippy with warnings denied |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities |
| `npm run build` | PASS — `dist/` produced |
| `npm test`, first run | FAIL — 45/46; see flaky test below |
| `npm test`, immediate exact rerun | PASS — 46/46 across desktop and 390 px |

The first aggregate run intermittently failed the desktop accessibility test at
`tests/e2e/product.spec.ts:358`: `boundingBox()` returned null for a visible
demo-banner control. Its failure screenshot shows both controls rendered, the
mobile copy passed in that run, and the exact full rerun passed 46/46. This is a
low-severity test synchronization defect, not an observed product failure.

Production output:

- JavaScript: 33,629 bytes (10.57 kB gzip in Vite output).
- CSS: 15,437 bytes (4.41 kB gzip).
- Hero WebP: 18,322 bytes.
- Total Lighthouse transfer: 69 KiB.

The container has no Docker or Podman executable. The exact Vite production
build, Rust release build, empty-environment runtime, checked-in Dockerfile, and
live container were verified; a fresh local Docker build could not be run.

## End-to-end behavior and recovery

The full live Playwright suite passed 46/46. Independent browser checks also
completed the sample loop: open sample workspace, open proof without an
account, accept the visit, choose “Inside refrigerator,” save the reply, return
to the workspace, and download the next-visit CSV. The CSV contained the header
and chosen extra.

Boundary and invalid cases:

- Three photos were accepted; four photos were rejected with a correction.
- A file over 1 MB was rejected with the same correction.
- Eight concurrent free-plan writes returned exactly three `201` and five
  `402` responses.
- A past next-visit date and blank checklist label each returned `400`.
- A blank workspace name was blocked in the browser, focused the field, and
  returned “Please fill out this field”; direct blank input returned `400` and
  “Enter between 1 and 80 characters.”
- An invalid proof token showed “This proof link is not valid” and a Return
  home action.
- A mocked first demo request returned `503`; the page showed the server error
  and **Try the demo again**. The retry loaded the sample on its second request.
- Offline and designed 404 states passed in the live suite.

## Privacy, security, accessibility, and links

The independent Playwright log covered landing, demo creation, proof loading,
reply saving, workspace reload, and CSV export. All 26 observed requests used
only `https://service-proof-loop.sociobot.in`; all returned `200`. There were no
console errors or page errors. No analytics, external script, or external font
loaded.

The root response sent CSP, HSTS, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, frame denial, and a
camera/microphone/geolocation-denying Permissions-Policy. Proof HTML and proof
API responses sent both:

- `Cache-Control: private, no-store`
- `X-Robots-Tag: noindex, nofollow, noarchive`

Hashed JS and CSS sent `public, max-age=31536000, immutable`. Product images
sent a one-day public cache policy.

The required `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`.
Each had a route-specific title, `lang="en"`, one H1, a main landmark, image
alternatives, and no console/page errors. Screenshots were inspected at desktop
and 390 px with no clipping.

Fresh Axe checks found no serious or critical issues in light or dark
treatments. Keyboard focus reached the proof acceptance control and showed a
3 px solid apricot outline. After saving, focus moved to “Your reply is saved”
and the polite announcer repeated it. At 390 px, normal and 200% text each had
`scrollWidth === clientWidth === 390`. Reduced-motion emulation changed the
button transition to `0.01 ms` and scrolling to `auto`.

The link crawl covered landing, demo, proof, privacy, terms, and the designed
404. Product links returned their intended `200`; checkout returned the
expected `303` to Dodo; `sociobot.in` returned `200`; mail links were explicit.
The 404 skip fragment correctly remains on the 404 document.

## Performance

Fresh Lighthouse 13.4.1 mobile results:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.3 s |
| LCP | 1.4 s |
| Total blocking time | 80 ms |
| CLS | 0 |
| Transfer | 69 KiB |

## Backend and deployment

`npm run test:live` without a pinned SHA passed and reported:

- revision `sf-service-proof-loop--0000049`;
- one active revision and one replica; min/max replicas both 1;
- `sf-service-proof-loop-data` mounted as Azure Files at `/data`;
- 20 demo workspaces, 400/400 simultaneous workspace reads, and 20/20 proof
  reads;
- exactly three successful writes from eight concurrent free-plan requests;
- validation responses `400` for a past date and blank checklist label;
- product API allowance 40: a 45-request burst produced 40 allowed and 5
  limited; a 130-request burst produced 40 allowed and 90 limited;
- every product API `429` included `Retry-After: 1`.

A fresh 45-request burst against the product-specific Sociobot license verify
endpoint returned 30 normal invalid-license responses and 15 `429` responses.
Every `429` included `Retry-After: 4`.

The product-scoped persistence test restarted only revision
`sf-service-proof-loop--0000049`. The replica changed from
`...-5d77687967-mp9hl` to `...-65f9d75f77-947ss`; health recovered, the same
workspace and visit remained readable, and its proof remained valid. The app
returned to one healthy replica.

This product requires no sign-in and is not a PWA, library, or CLI, so Entra,
service-worker, package-consumer, and CLI checks do not apply. Its deterministic
proof-to-next-visit flow already includes export; no essential AI-assisted step
is missing.

## Defects by severity

- **Critical:** none.
- **High:** deployed health and image identity are `5253b51`, not candidate
  `04de0ff`; the candidate-pinned live check fails.
- **Moderate:** none.
- **Low:** one clean aggregate run hit a race in the desktop accessibility test
  because it dereferenced a transient null bounding box. The exact rerun passed
  46/46.

## Evidence

- `.factory/evidence-verification-16/live-browser-audit.json`
- `.factory/evidence-verification-16/lighthouse-mobile.json`
- `.factory/evidence-verification-16/{home,demo,privacy,terms}/`
- `.factory/evidence-verification-16/mobile-200-percent.png`

## Required retest

Deploy an image that reports and is tagged with the exact accepted candidate,
then run:

```sh
EXPECTED_SHA=04de0ff89b383c8d581b106e5803a7a7f9b1fe8b npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```
