# Independent product verification 7 — FAIL

Verified on 2026-08-29 against candidate
`b980fe409e94a31bbcb67880a38971c8ded23976` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The live image identifies itself as the exact
candidate, but it is running on three replica-local SQLite instances with no
durable volume. A fresh concurrent probe returned `401` for 201 of 400 reads
made with tokens that the service had just issued. The mandatory one-click
demo, proof-to-next-visit loop, persistence boundary, and per-client request
allowance therefore fail in production.

The candidate also failed its full local backend gate before this verifier
updated the required QA documents: `cargo test --all-targets` passed 11 of 12
tests and failed `commercial_scope_deviation_is_explicit` because the committed
handoff no longer contained its required section.

## Mandatory first-read gate — FAIL

The cold first screen itself is clear:

- **What it does:** “Send proof. Plan the next visit.”
- **For whom:** recurring service teams needing client feedback and approved
  extras without another customer app.
- **What to click first:** “Try it with sample data,” beside “Loads a sample
  visit. Nothing is saved.”

The action is visible in the first desktop and 390 px viewports. The root made
four same-origin requests and logged no error. The required one-click result is
not reliable, however. A fresh live Playwright run clicked the action on both
desktop and 390 px and rendered **“Visits could not load — Your workspace
access is not valid”** instead of Willow Street. The live URL verifier likewise
failed `/demo` on a console-visible `401`. The first-read/demo gate therefore
fails even though the words and initial layout pass.

## Critical — live workspace state is split across replicas

Fresh Azure and service evidence:

- `/health` returned the exact candidate SHA.
- The active image is
  `sociobotregistry.azurecr.io/sf-service-proof-loop:b980fe409e94`.
- Azure reports one active revision, `sf-service-proof-loop--0000025`, but
  `minReplicas: 1`, `maxReplicas: 3`, three live replicas, `mounts: null`, and
  `volumes: null`.
- The checked-in contract requires exactly one replica and Azure Files mounted
  at `/data`.
- `EXPECTED_SHA=b980fe409e94a31bbcb67880a38971c8ded23976 npm run test:live`
  failed immediately with “maximum replica count drifted from the deployment
  contract.”

A sequential 30-demo probe initially happened to pass 300 reads and 30 proof
reads. That did not exercise concurrent routing. With 20 fresh demos and 20
simultaneous authenticated reads per token, the result was:

| Result | Count |
| --- | ---: |
| Demo creations | 20/20 HTTP 200 |
| Authenticated reads | 199 HTTP 200 |
| Authenticated reads | **201 HTTP 401** |

Every one of the 20 tokens failed between 6 and 13 of its 20 reads. A separate
eight-write concurrency check returned 2 × 201 and 6 × 401, instead of the
contracted atomic 3 × 201 and 5 × 402 free-plan result.

This is the same deployment class of failure reported in verification 6. It is
not a browser-storage problem: the failing requests carried the token returned
by the immediately preceding service response.

## Claims preflight

`.factory/claims.json` exists with 16 entries. After `npm ci` in the clean
candidate checkout, every listed command was run separately and passed:

| Claim | Local result |
| --- | --- |
| `demo-sandbox` | PASS — desktop and 390 px |
| `no-account` | PASS — desktop and 390 px |
| `proof-expiry` | PASS — Rust integration test |
| `next-visit-export` | PASS — desktop and 390 px |
| `same-origin-demo` | PASS — desktop and 390 px |
| `configurable-extras` | PASS — desktop and 390 px |
| `paid-license` | PASS — registry, checkout, and restore fixture |
| `rate-limit` | PASS — desktop and 390 px |
| `plan-limit` | PASS — Rust integration and concurrency test |
| `demo-expiry` | PASS — Rust integration test |
| `no-tracking` | PASS — desktop and 390 px |
| `access-token-hashing` | PASS — database inspection test |
| `privacy-data-flow` | PASS — desktop and 390 px |
| `photo-upload` | PASS — desktop and 390 px |
| `problem-rating` | PASS — desktop and 390 px |
| `zero-config-runtime` | PASS — empty environment, default port 8080 |

The same pinned suite against production passed only 8 of 42 checks and failed
34. Live claim failures included demo isolation, no-account proof access,
next-visit export, configurable extras, privacy data flow, photo upload,
problem/rating, no tracking, and rate limiting. Most fail because the workspace
or proof request reaches a replica that does not own the token.

## Major — live request allowance is multiplied by replica count

The declared rate-limit claim expects a 429 within a 45-request same-client
burst. Both live desktop and mobile claim runs received no qualifying 429.

A fresh 130-request same-client burst completed in 365 ms with 120 × 404 and
10 × 429. Every 429 carried `Retry-After: 1`. The observed production allowance
was therefore **120 requests**, three times the 40-request per-instance burst.
`/health` remains exempt. The API does eventually return a correct 429, but it
does not enforce one coherent client allowance across the deployed service.

## Local quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, 0 audit findings |
| Every `.factory/claims.json` command | PASS after clean install |
| `npm run lint` | PASS — rustfmt and Clippy with warnings denied |
| `npm test` | PASS — 42/42 browser checks across desktop and 390 px |
| `npm run build` | PASS — `dist/` produced |
| `cargo build --release` | PASS |
| `npm run test:all` / `cargo test --all-targets` | **FAIL — 11/12 backend tests** |
| Docker build | NOT RUN — no Docker, Podman, Buildah, or nerdctl in the verifier |

The failing backend test was
`commercial_scope_deviation_is_explicit`. The candidate handoff described the
variance under “Known gaps,” but the checked-in test requires the exact heading
“Commercial scope deviation.” This verifier handoff restores an explicit
section, but that documentation edit does not change the candidate result
recorded above. After the two required QA documents were written,
`npm run test:all` was rerun successfully: 12/12 Rust tests and 42/42 browser
tests passed, and the production build was reproduced.

## Functional, boundary, and recovery evidence

When requests reached the replica that owned the token, the live API correctly
handled the useful path and validation boundaries:

- Empty workspace name: 400; missing authorization: 401.
- Extra prices -1 and 100001 cents: 400; exact 0 and 100000 cents: 201.
- Past date, blank/empty checklist, 601-character note, photo without consent,
  and four photos: 400 with an actionable message.
- A corrected visit returned 201 and an unauthenticated proof returned 200.
- Invalid response state, rating 0, and seven extras returned 400.
- Recovery to a problem response with rating 1 persisted to the workspace.
- The next-visit CSV returned the expected header and chosen extra.
- A second tenant's token received 404 for the first tenant's export.

The retry history exposes why these correct handlers do not make a usable live
product. The past-date check needed eight requests after seven 401s, the valid
client response needed four requests after three 404s, and the export needed
three requests after two 401s.

## Accessibility, responsive layout, and motion

The UI itself passed the checks that could be isolated from deployment state:

- A reachable client proof had zero serious/critical axe findings in dark mode
  on desktop and 390 px.
- Keyboard focus moved to the proof status control; its visible sibling had a
  solid focus outline and stayed inside the viewport.
- Tested controls were at least 44 px.
- Reduced motion capped transitions/animations at 0.01 ms and disabled smooth
  scrolling.
- The 390 px landing had no horizontal overflow, including at 200% text size.
- The primary mobile CTA was 209.6 × 48.8 px and remained in the first viewport.

The full live accessibility tests still fail because they cannot reliably
reach the proof screen. That is a critical availability failure, not a newly
observed axe violation. Live demo failures also produce console errors for the
401 response.

## Privacy and security

- A fresh landing-to-demo recording contacted only
  `https://service-proof-loop.sociobot.in`.
- The product set no cookies. Demo access used only
  `sessionStorage['demo:workspace']`; local storage remained empty.
- Root and API responses include HSTS, a restrictive CSP, `nosniff`, frame
  denial, strict-origin referrer policy, and a restrictive permissions policy.
- Valid proof and demo traffic remained same-origin. Checkout is the explicit
  Sociobot link tested by the paid-license claim.
- No third-party fonts, scripts, or analytics loaded.

The product has no sign-in, so the Entra authority requirement is not
applicable. It is not a PWA and makes no offline-reload claim; its tested
offline message asks the user to reconnect.

## Build identity, routing, caching, and performance

- Live JS, CSS, and hero-image SHA-256 hashes are byte-identical to local
  `dist/`.
- JS is 31,751 B / 10.14 KB gzip; CSS is 15,437 B / 4.41 KB gzip; the hero is
  18,322 B. All bundle budgets pass.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; the hero uses a
  one-day cache.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, robots, sitemap, social image,
  favicon, and apple-touch icon return 200. An unknown route returns the styled
  404 with HTTP 404.
- Each inspected public route has its route-specific title, one `h1`, canonical
  URL, description, and social image. Same-origin links resolve.
- Fresh Lighthouse 12.8.2 mobile scores: Performance 99, Accessibility 100,
  Best Practices 100, SEO 100. FCP was 1.2 s, LCP 1.4 s, TBT 110 ms, CLS 0,
  and total transfer 67 KiB.

## Commercial scope deviation

The researched brief calls for **$59 per business each month plus technician
seats**. The shipped product offers a **$59 one-time business license** with no
seat billing. The repository discloses this because the supplied Sociobot
paid-unlock contract supports a one-time license. It remains a material scope
variance, although it is not the cause of this verification failure.

## Required repair and retest

1. Deploy through the checked-in durable-single-writer path: drain stale
   writers, mount Azure Files at `/data`, set `maxReplicas` to 1, and confirm
   exactly one live replica.
2. Require
   `EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live` to pass after every
   deployment. Do not accept a matching `/health` SHA by itself.
3. Repeat the concurrent 20-demo/400-read probe; require 400/400 reads and all
   proof IDs to match their originating workspace.
4. Repeat the 45- and 130-request bursts; the same client must receive 429 with
   `Retry-After` after the documented 40-request burst.
5. Run the full pinned Playwright suite against production and require 42/42,
   including the first-click demo on desktop and 390 px.
6. Keep the commercial variance explicit and make the full local
   `cargo test --all-targets` / `npm run test:all` gate green in the candidate
   before release.
