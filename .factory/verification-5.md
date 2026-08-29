# Independent product verification 5 — FAIL

Verified 2026-08-29 against candidate
`b2fc763480bffbe801f1d759646e7573fa10d39f` and
<https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The previous deployment-only split-state failure is
fixed: production serves the exact candidate from one mounted SQLite writer,
and 30 fresh demo → workspace → proof sequences all passed. The core product,
all 13 declared claim commands, local gates, live browser suite, privacy
checks, rate limiting, and performance budgets are green.

The candidate still fails the acceptance contract for two independent reasons:

1. Keyboard focus moves to off-screen proof controls and is lost after the
   client saves a reply. The visible focus/async-result requirement is not met
   on the core client action.
2. `.factory/claims.json` does not list every testable claim made on the live
   landing page and in README. The attached claims contract says an unlisted
   claim fails verification even when an ad hoc check happens to pass.

## Mandatory first-read gate — PASS

A cold load at 1440 × 900 and 390 × 844 answered all three questions in the
first viewport:

- **What it does:** “Send proof. Plan the next visit.”
- **For whom:** recurring service teams that need client feedback and approved
  extras without another customer app.
- **What to click first:** “Try it with sample data,” followed by “Loads a
  sample visit. Nothing is saved.”

The one-click action opened `/demo`, displayed the persistent demo banner, and
loaded the seeded Willow Street visit. Cold landing traffic consisted only of
same-origin HTML, hashed JS/CSS, and the self-hosted hero image. There were no
console or page errors.

Evidence:

- `qa-artifacts/verify5-live-first-read-desktop.png`
- `qa-artifacts/verify5-live-first-read-mobile.png`

## Release-blocking findings

### High — keyboard focus is off-screen and the saved result is not announced

On a fresh live demo proof, the route correctly focuses “Review your completed
visit.” Pressing Tab once focuses the visually hidden “Accept the work” radio,
and CSS applies a 3 px focus outline to its visible sibling. The sibling is not
in the viewport, however:

| Viewport | Visible radio bounds after Tab | Viewport | Result |
| --- | --- | --- | --- |
| 1440 × 900 | top 1683 px, bottom 1743 px | 900 px high | off-screen |
| 390 × 844 | top 1624 px, bottom 1684 px | 844 px high | off-screen |

The mobile browser had scrolled to `scrollY=621`, but the focused control was
still about 780 px below the viewport. A keyboard user therefore gets no
visible indication of focus for the status and rating controls. The screenshot
`qa-artifacts/verify5-live-keyboard-focus-mobile.png` captures the viewport
immediately after that first Tab: it shows the proof image and no focus ring.

The controls remain operable if the user continues without visible feedback:
ArrowRight selected “Report a problem,” ArrowLeft selected rating 4, Tab
reached the comment and extras, Space selected an extra, and Enter submitted.
After submission, focus became `<body>` and the replacement “Your reply is
saved” `<h1>` had no `tabindex`. The new page also recreates an empty announcer,
so the successful asynchronous result is not focused or announced. This
violates the attached keyboard, visible-focus, and screen-reader smoke-test
requirements on the product's primary client workflow. Axe does not detect
this runtime focus-position defect.

### High — advertised testable behavior is absent from the claim manifest

The 13 listed claim entries and tests all pass, but the required landing/README
cross-check found material claims with no `.factory/claims.json` entry and no
exactly tagged `@claim:<id>` test:

- Landing: “The technician checks the work, adds photos with consent, and sends
  one private link.” There is no photo-upload claim. The stock “technician can
  record a visit” test does not attach a photo.
- Landing: “The client accepts the work or reports a problem. They can rate it
  and choose extras.” No claim test asserts a submitted problem and rating are
  saved and returned.
- README: “The container needs no environment variables and listens on port
  8080 by default.” This runtime claim is not represented in the manifest.

Independent QA verified each behavior manually, so these are claim-governance
failures rather than evidence that the features are broken. The claims contract
nonetheless makes any unlisted claim release-blocking.

## Other findings

### Medium — several mobile touch targets are shorter than 44 px

At 390 px, computed live bounds were:

- pricing “Privacy”: 43 × 15 px;
- pricing “Terms”: 35.7 × 15 px;
- privacy email: 143.4 × 17 px;
- terms email: 146.1 × 17 px;
- proof “Report a link sent in error”: 288.5 × 35.3 px.

All primary buttons, navigation links, demo controls, status choices, and
rating choices meet the size requirement. The inline links above do not meet
the attached 44 px touch-target baseline.

### Medium — a direct 404 response drops the product skeleton and visual system

`GET /not-a-real-route` correctly returns 404 and a working “Return home” link,
but the served 333-byte page has no stylesheet, header, navigation, or footer.
This does not satisfy the required designed 404 or consistent route skeleton.
Evidence: `qa-artifacts/verify5-live-404-mobile.png`.

### Contract variance — commercial model

The researched brief asks for `$59/month per business plus technician seats`.
The live product sells a `$59 one-time` unlimited-visit license and has no seat
model. This is disclosed consistently and uses the required Sociobot checkout.
The repository explains that the supplied paid-unlock contract supports a
one-time license only. It remains a product-market scope variance, not a hidden
billing behavior.

## Claims preflight

The initial worktree was clean and exactly at the candidate SHA. `npm ci`
installed 22 packages with zero audit vulnerabilities. Every command in
`.factory/claims.json` was then run separately before broader QA:

| Claim | Declared command | Result |
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

## Local build and test evidence

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 22 packages, 0 vulnerabilities |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; rustfmt + Clippy with warnings denied |
| `cargo test --all-targets` | PASS; 12/12 backend tests |
| `npm test` | PASS; 36/36 desktop and 390 px browser tests |
| `npm run build` | PASS; `dist/` produced |
| `cargo build --release` | PASS |
| release binary with only `PORT=4181` | PASS; `/health`, `/`, `/privacy` returned 200 |

The production frontend is 31,407 B JS (10.06 KB gzip), 15,292 B CSS
(4.38 KB gzip), and an 18,322 B hero WebP. No fonts are downloaded. A Docker
CLI is not installed in the verifier container, so a second local image build
was unavailable; the exact-SHA live image and Azure topology were verified.

## Independent functional and recovery evidence

The live mobile workflow passed: create an isolated demo, open the no-account
client proof, report a problem, select rating 2 and “Inside refrigerator,” save,
return to the workspace, and export the CSV. The workspace showed the problem
and extra, and the CSV contained the required header, extra, and `28.00` price.

The upload path was exercised independently. Four photos produced “Use up to
three photos under 1 MB each.” Replacing them with three valid PNG files
created a proof; all three loaded with non-empty `Proof photo: …` alt text.
Evidence: `qa-artifacts/verify5-live-upload-mobile.png`.

Fresh live API probes also confirmed:

- no workspace token → 401;
- short proof token → 404;
- past date, empty checklist, missing photo consent, four photos, and an
  external photo URL → actionable 400;
- $0 and $1,000 extras → 201; -$0.01 and $1,000.01 → 400;
- ratings 0/6, unknown response status, and seven extras → 400;
- exact maximum client/location/technician/checklist/note lengths with three
  images → 201;
- a valid reply immediately after the rejected requests → 200.

## Live identity, topology, concurrency, and rate limiting

`EXPECTED_SHA=b2fc763480bffbe801f1d759646e7573fa10d39f npm run
test:live` passed with:

- `/health` returning the full candidate SHA;
- revision `sf-service-proof-loop--0000018`;
- one active revision and one live replica;
- min/max replicas `1/1`;
- `service-proof-loop-data` mounted as Azure Files at `/data`;
- 30/30 fresh demo → workspace → proof sequences returning `200/200/200`;
- eight concurrent free writes returning exactly 3 × 201 and 5 × 402;
- past-date and blank-checklist writes returning 400;
- a fresh 130-request burst returning 40 ordinary responses and 90 × 429.

An additional per-route burst sent 45 requests from a distinct forwarded IP to
each API route family: demo, workspaces, visits GET/POST, CSV export, extras
GET/POST, proof GET/respond, and the API fallback. Every family admitted 40 and
returned 5 × 429, all with `Retry-After: 1`. Fifty `/health` requests returned
50 × 200. The observed allowance is **40 requests per client burst**.

## Privacy, security, routes, and performance

- The independent full demo/proof/export capture made 15 requests, all to
  `https://service-proof-loop.sociobot.in`; there were no failures, HTTP errors,
  cookies, console errors, or page errors.
- Demo access used only `sessionStorage['demo:workspace']`; real local storage
  stayed empty. Reduced-motion computed to `scroll-behavior: auto` and
  `0.01ms` transitions.
- Live `/`, `/demo`, `/app`, `/privacy`, `/terms`, robots, sitemap, and proof
  links returned 200. An unknown route returned 404. All crawled internal links
  were live; Sociobot returned 200 and checkout returned the expected 303 to
  hosted Dodo checkout.
- Responses include CSP, HSTS, `nosniff`, frame denial, strict-origin referrer
  policy, and restrictive permissions policy. Hashed JS/CSS use one-year
  immutable caching; the hero uses a one-day cache.
- Axe found no serious/critical issue on the live proof and workspace in the
  independent flow, and the full live test suite's light/dark checks also
  passed. The manual focus defect above remains outside axe's detection.
- Fresh Lighthouse 12.8.2 mobile scores were Performance 100,
  Accessibility 100, Best Practices 100, SEO 100. FCP was 1.1 s, LCP 1.2 s,
  TBT 20 ms, CLS 0, and total transfer was 67,769 B. Evidence:
  `qa-artifacts/lighthouse-live-5.json`.
- The product does not register a service worker and does not claim to be a
  PWA, so service-worker update/offline-reload testing does not apply. It does
  show a tested reconnect message. No sign-in is required, so Entra tenant
  verification does not apply. Library/CLI consumer tests do not apply.

## Required repair and retest

1. Keep proof status/rating focus inside the viewport when tabbed to on both
   desktop and mobile. Re-test the actual focused element's bounding box, not
   only its CSS outline.
2. After saving a proof reply, make the new confirmation heading focusable and
   focus it, or announce the result through a persistent live region. Verify
   active focus and a screen-reader announcement.
3. Add manifest entries and exact tagged tests for the advertised upload,
   problem/rating, and zero-config runtime claims, or remove/rephrase those
   claims.
4. Enlarge the listed inline touch targets to at least 44 px without harming
   text flow.
5. Serve the 404 in the product's visual system with the standard header and
   footer while retaining a real 404 status.
