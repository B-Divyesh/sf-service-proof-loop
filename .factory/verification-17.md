# Service Proof Loop — independent verification 17

## Result

**PASS** for candidate commit `5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3` at <https://service-proof-loop.sociobot.in> on 2026-09-02 UTC.

No product source was modified during this verification. Testing used a fresh detached clone at the candidate commit. The report and handoff are the only repository changes.

## Deployed build identity

The live deployment identifies itself as the requested candidate.

| Check | Observed result |
| --- | --- |
| `GET /health` | `200` and `{"build_sha":"5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3","status":"ok"}` |
| Pinned live verification | `EXPECTED_SHA=5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3 npm run test:live` passed |
| Active image | `sociobotregistry.azurecr.io/sf-service-proof-loop:5253b51abfc5` |
| Local/live JS SHA-256 | both `1ad43a1278fd92807a427a45ed3a17f54e379e9841a34e5ba24e93570da61c18` |
| Local/live CSS SHA-256 | both `66ce0eecf6c2a09cdd994ea365930d830fe00bd5530f37770a1525131f517a89` |
| Local/live hero SHA-256 | both `ae4634f842108fa6e6fb72b5302216bd96fefae27523a8b77c5477e284f6f955` |

The pinned live check observed revision `sf-service-proof-loop--0000049`, one active revision, one replica, min/max replica settings of one, and the scoped Azure Files mount `sf-service-proof-loop-data` at `/data`.

## Claims-first gate

`.factory/claims.json` was present in the clean clone. It contains 20 claim entries represented by 19 distinct exact test commands. All 19 commands exited zero before the broader QA pass.

| Claim IDs | Result |
| --- | --- |
| demo-sandbox; no-account; proof-expiry; next-visit-export; same-origin-demo | PASS |
| configurable-extras; paid-license; rate-limit; plan-limit; license-workspace-boundary | PASS |
| demo-expiry; no-tracking; access-token-hashing; privacy-data-flow; photo-upload | PASS |
| problem-rating; zero-config-runtime; proof-page-privacy; deployment-continuity | PASS |

The deployment-continuity claim created 20 isolated demos and observed 400/400 concurrent workspace reads and 20/20 matching proof reads. Its concurrent free-plan probe returned exactly three `201` responses and five `402` responses. Its semantic-invalid inputs returned `400` for a past next-visit date and a blank checklist label.

## First-read and demo checks

Cold loading the live landing page returned `200`, title `Service Proof Loop — Send proof after each visit`, `lang="en"`, one H1, and one main landmark. The first screen states:

- What it does: “Send proof. Plan the next visit.”
- Who it is for: recurring service teams needing client feedback and approved extras without requiring a client app.
- First action: “Try it with sample data”; adjacent copy says that a sample visit loads and nothing is saved.

One click opened `/demo`. The live demo displayed the persistent “Demo — sample data, nothing is saved” banner, sample data, Reset demo, and Start for real. The first-read requirement therefore passed.

## Local quality checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages installed; audit reported 0 vulnerabilities |
| `cargo test --all-targets` | PASS — 13 integration tests passed |
| `npm run typecheck` | PASS (also run by `npm test`) |
| `npm run lint` | PASS — formatting and Clippy with warnings denied |
| `npm test` | PASS — 46 Playwright tests across desktop and 390 px mobile |
| `npm run test:runtime` | PASS — release build and empty-environment startup on port 8080 |
| `npm run build` | PASS — production `dist/` generated |

Production build output was 33,629 bytes of JavaScript (10.57 kB gzip), 15,437 bytes of CSS (4.41 kB gzip), and an 18,322-byte hero WebP. This is below the stated static asset budgets.

The exact local container build was not run because this verification container does not provide Docker, Podman, or Buildah. The Vite production build, Rust release build, empty-environment runtime test, checked-in multi-stage Dockerfile, and matching live container were verified.

## Functional, boundary, and recovery checks

An independent live 390 px browser flow entered the demo, opened the private proof link without an account, chose the “Inside refrigerator” extra, saved a client reply, returned to the workspace, and observed the selected extra in the next-visit state and exported CSV. The CSV contained the required header and the selected extra with price `28.00`.

The full local suite additionally passed the normal technician visit flow, configured extras, a consented photo, problem report with rating, the three free-visit boundary, invalid dates and blank checklist labels, invalid-proof recovery, mocked service-error retry, offline message, and designed 404 route. The UI suite covers browser validation and associated correction text for invalid form input.

This product has no sign-in, PWA, library, or CLI interface. Entra tenant, service-worker, and package-consumer checks are not applicable.

## Privacy, security, accessibility, and mobile checks

Fresh Playwright request logs for cold landing and demo flows observed only `https://service-proof-loop.sociobot.in` requests. No analytics, third-party scripts, or third-party fonts were observed. The landing browser checks had no console errors or page errors.

The root response supplied CSP with `frame-ancestors 'none'`, HSTS, nosniff, frame denial, strict-origin referrer policy, and a camera/microphone/geolocation Permissions-Policy. Private proof HTML and proof API responses each supplied:

- `Cache-Control: private, no-store`
- `X-Robots-Tag: noindex, nofollow, noarchive`

Hashed JavaScript and CSS supplied `Cache-Control: public, max-age=31536000, immutable`.

Axe scans of the live landing page at desktop and 390 px, plus the demo, found zero serious or critical violations. Keyboard tab navigation reached a visible `3px` solid focus outline. At 390 px the document width and scroll width were both 390 px; measured primary navigation, links, and buttons were at least 44 px high. Reduced-motion emulation reported no active CSS animations.

## Performance and rate limit checks

A final idle mobile Lighthouse 12.8.2 run reported:

| Metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| LCP | 1.25 s |
| Total blocking time | 50 ms |
| CLS | 0 |

The direct forwarded-IP rate test sent 45 simultaneous requests from one test client. It observed 40 `404` responses followed by five `429` responses, every one with `Retry-After: 1`. The pinned live verifier independently observed the same 40/5 split for 45 requests and 40/90 for 130 requests. This confirms the documented allowance of 40 requests per burst for product API traffic.

## Defects by severity

- Critical: none observed.
- High: none observed.
- Moderate: none observed.
- Low: none observed.
- Test-environment limitation: a local Docker/Podman/Buildah container build could not be performed because no compatible build tool is installed. This did not prevent verification of the component production build or the live container identity.

## Recheck commands

```sh
npm ci
cargo test --all-targets
npm run lint
npm test
npm run build
EXPECTED_SHA=5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3 npm run test:live
```
