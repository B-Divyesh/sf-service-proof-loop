# Service Proof Loop — adversarial first-read review 3

- Reviewed: 2026-09-02 UTC
- Live URL: <https://service-proof-loop.sociobot.in>
- Reviewed source: `162723a92fba9a6cd1f3e2177fd7da58eef71092`
- Live build: `a857121cbae59a0d6f636b2da4ec18223240fb39`
- Product-source difference: none; commits after the live build contain QA
  documents and evidence only.

## Verdict

**PASS — zero findings, no untested claims.**

The cold first screen, one-click demo, isolated storage, complete sample flow,
all 19 claim commands, prior-finding regressions, route structure, metadata,
links, keyboard behavior, and live accessibility scans pass. No blocking or
minor finding remains, so there are no `F-3-k` identifiers to issue.

## Cold first read

Fresh Chromium contexts were opened at 390 × 844 and 1440 × 900. Nothing was
scrolled before these answers were recorded.

| View | What it does, in my words | For whom | What I would click first | Result |
| --- | --- | --- | --- | --- |
| 390 px | Sends proof of a completed visit, gathers client feedback, and moves approved extras to the next visit. | Teams that provide recurring services. | **Try it with sample data**. | Pass |
| Desktop | The same job is clear, and the linked ceramic trays reinforce the handoff to the next visit. | Teams that provide recurring services. | **Try it with sample data**. | Pass |

The exact visible copy supplying those answers is “Send proof. Plan the next
visit.”, “For recurring service teams that need client feedback and approved
extras without asking clients to install an app.”, and “Try it with sample
data.” The adjacent text says what the action does and the first screen also
shows the required privacy, account, expiry, and price facts.

Evidence: `evidence-review-3/first-read-mobile.png`,
`evidence-review-3/first-read-desktop.png`, and
`evidence-review-3/live-audit.json`.

## Copy audit

Counts treat hyphenated compounds, prices, paths, commands, and URLs as one
word. Display fragments are audited separately from sentences. No sentence is
over 22 words. No banned marketing word, unexplained product jargon,
inconsistent product term, metaphor heading, mood heading, or non-result
button was found.

### Live landing-page sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Send proof. | 2 | Pass |
| Plan the next visit. | 4 | Pass |
| For recurring service teams that need client feedback and approved extras without asking clients to install an app. | 17 | Pass |
| Loads a sample visit. | 4 | Pass |
| Nothing is saved. | 3 | Pass; the action and demo banner scope this to demo mode. |
| Proof links expire after 14 days. | 6 | Pass |
| Clients open links without an account. | 6 | Pass |
| Three visits free. | 3 | Pass |
| $59 once for one workspace. | 6 | Pass |
| An approved extra appears on the next visit. | 8 | Pass |
| Crews record the visit. | 4 | Pass |
| Clients review the proof. | 4 | Pass |
| The office exports approved extras without typing them again. | 9 | Pass |
| The technician checks the work, adds photos with consent, and sends one private link. | 14 | Pass |
| The client accepts the work or reports a problem. | 9 | Pass |
| They can rate it and choose extras. | 7 | Pass |
| Export the next date, client, location, extra, detail, and price as CSV. | 12 | Pass |
| It stores visit proof, client replies, and approved extras. | 9 | Pass |
| No dispatch, payroll, or worker tracking. | 6 | Pass; this is an explicit product boundary. |
| Do not enter home-entry codes or payment card details. | 10 | Pass |
| No public review campaigns. | 4 | Pass; this is an explicit product boundary. |
| After three free visits, one $59 license covers one business workspace. | 11 | Pass |
| Sociobot billing starts checkout. | 4 | Pass |
| Dodo hosts the payment page. | 6 | Pass |
| Send visit proof and plan the next visit. | 8 | Pass |
| Original product art was generated for this service. | 8 | Pass; provenance is recorded in `.factory/design.md`. |

### Landing headings, controls, and data fragments

| Copy | Words | Type | Result |
| --- | ---: | --- | --- |
| Skip to main content | 4 | Link | Pass |
| Service Proof Loop | 3 | Wordmark | Pass |
| Demo / Workspace / Price / Privacy | 1 each | Navigation | Pass |
| After-visit proof for recurring services | 5 | Section label | Pass |
| Try it with sample data | 6 | Primary action | Pass; names the result. |
| The product | 2 | Section label | Pass |
| See proof and next-visit extras | 5 | Heading | Pass |
| Maya’s visit at Willow Street | 5 | Preview heading | Pass |
| How it works | 3 | Section label | Pass |
| How proof reaches the next visit | 6 | Heading | Pass |
| Record the visit | 3 | Heading | Pass |
| Collect one clear reply | 4 | Heading | Pass |
| Add approved extras to the next visit | 7 | Heading | Pass |
| Clear boundaries | 2 | Section label | Pass |
| What this service handles | 4 | Heading | Pass |
| What it handles | 3 | Heading | Pass |
| What it leaves alone | 4 | Heading | Pass |
| Business license | 2 | Section label | Pass |
| Keep creating proof links | 4 | Heading | Pass |
| Buy the business license at Sociobot checkout | 7 | Action | Pass; names the result and destination. |
| Have a license? | 3 | Form label | Pass |
| Verify license | 2 | Button | Pass; names the result. |
| Privacy / Terms | 1 each | Links | Pass |
| Built by Param Factory (external site) | 6 | Link | Pass; identifies the external destination. |

The remaining preview strings are realistic data rather than claims or
slogans: Northstar Home Care, Willow Street, Lake Avenue, Maya, Elena,
checklist items, dates, states, counts, the refrigerator extra, and its $28
price. Terminology is consistent: **visit**, **proof**, **client**, **extra**,
**next visit**, **next-visit CSV**, and **workspace**.

### README sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Send visit proof and carry approved extras into the next recurring visit. | 12 | Pass |
| Service Proof Loop is for cleaning and maintenance businesses with repeat clients. | 12 | Pass |
| A technician records a checklist, note, and consented photos. | 9 | Pass |
| The client opens a private link without an account. | 9 | Pass |
| Their reply and selected extras appear beside the next visit and in a CSV export. | 15 | Pass |
| The product does not handle dispatch, payments, payroll, public reviews, or worker tracking. | 13 | Pass |
| Open `/demo`, or visit `https://service-proof-loop.sociobot.in/demo` after deployment. | 7 | Pass |
| The demo creates an isolated 24-hour workspace. | 7 | Pass |
| Choose Reset demo to start with new sample data. | 9 | Pass |
| See `.factory/demo.md` for the exact sandbox behavior. | 7 | Pass |
| You need Node.js 22+, current stable Rust, and SQLite development libraries. | 11 | Pass |
| Open `http://localhost:8080`. | 2 | Pass |
| The service starts without configuration variables and listens on port 8080 by default. | 13 | Pass |
| For frontend development, run the API on port 8080. | 9 | Pass |
| Then run `npm run dev` in a second terminal and open `http://localhost:5173`. | 12 | Pass |
| `npm test` starts the built service and runs Chromium at desktop and 390 px. | 14 | Pass |
| The suite checks offline messages, keyboard navigation, page structure, and serious accessibility issues. | 12 | Pass |
| Every product claim and its command is listed in `.factory/claims.json`. | 10 | Pass |
| `PORT`: HTTP port. | 3 | Pass |
| Defaults to `8080`. | 3 | Pass |
| `DATABASE_URL`: SQLite URL. | 3 | Pass |
| Defaults to `/data/service-proof-loop.db`. | 3 | Pass |
| `BILLING_BASE_URL`: license verifier URL. | 4 | Pass |
| Defaults to the Sociobot product endpoint. | 6 | Pass |
| `STATIC_DIR`: built frontend directory. | 4 | Pass |
| Defaults to `dist`. | 3 | Pass |
| `BUILD_SHA`: embedded during the container build and returned by `/health`. | 10 | Pass |
| No signing secret is required. | 5 | Pass |
| Workspace and production proof access use random tokens stored as SHA-256 hashes. | 12 | Pass |
| Demo proof tokens are also retained inside the isolated, 24-hour demo workspace so the sample link can be reopened. | 19 | Pass |
| Proof links expire after 14 days. | 6 | Pass |
| Every API route except `/health` has a forwarded-IP rate limit. | 10 | Pass |
| The free plan accepts three completed visits. | 7 | Pass |
| A $59 one-time business license adds more visits to one business workspace. | 12 | Pass |
| Checkout and license verification use the Sociobot billing API. | 9 | Pass |
| The server records only a hash of each valid license and rejects that license in every other workspace. | 17 | Pass |
| It enforces both boundaries even when browser controls are bypassed. | 10 | Pass |
| This delivery model is formally recorded in `.factory/scope-decision.json`. | 8 | Pass |
| The researched monthly-plus-seat model remains unchanged in the opportunity brief; the current Sociobot billing API supports one-time purchases, not monthly per-seat billing. | 22 | Pass; at the cap. |
| The multi-stage Dockerfile builds the Vite frontend and Rust service. | 10 | Pass |
| The factory supplies `BUILD_SHA`; it may deploy with only `PORT`. | 10 | Pass |
| The checked-in `.factory/deployment.json` sets `data_dir` to `/data`, fixes the service at one replica, and mounts the `sf-service-proof-loop-data` Azure Files share there. | 21 | Pass |
| Run the deployment command to apply the image, durable mount, single-revision mode, and replica ceiling. | 15 | Pass |
| Run `npm run test:live` after deployment. | 6 | Pass |
| It checks topology, durable storage, build identity, demo reads, matching proofs, and rate limits. | 14 | Pass |
| Do not raise the replica count without moving SQLite and rate-limit state to shared services. | 15 | Pass |
| The product includes `/privacy` and `/terms`. | 6 | Pass |
| It does not load third-party fonts, scripts, or analytics. | 9 | Pass |
| Generated art provenance is recorded in `.factory/design.md`. | 7 | Pass |
| The source is available under the MIT License. | 8 | Pass |

README headings are literal and contextual: Service Proof Loop, Try the
sample, Run locally, Test and verify, Configuration, Billing, Deployment, and
Privacy and license. Code blocks are commands rather than sentences. No README
copy needs a rewrite.

## Demo and sandbox behavior

- The landing action reaches `/demo` in one click.
- Its first settled screen already shows Northstar Home Care, Maya Chen,
  Willow Street, technician Elena, completion state, a private proof action,
  and next-visit status.
- The persistent banner says “Demo — sample data, nothing is saved” and
  includes **Reset demo** and **Start for real**.
- Reset changes both the demo workspace ID and access token.
- A seeded `real:workspace` value remains byte-for-byte unchanged through
  entry, use, and reset.
- Demo entry, proof use, client reply, workspace return, and export make only
  same-origin requests.
- On live mobile, selecting “Inside refrigerator” and saving a reply places
  the $28 item beside the next visit. The CSV contains the expected header and
  the Maya Chen / Willow Street row.
- **Start for real** removes `demo:workspace`, preserves the real-storage
  sentinel, opens `/app`, and shows “Create your business workspace.”
- Code scopes every demo to a separate SQLite workspace with `is_demo`, a
  random access token, and a 24-hour expiry. Expired demo access is rejected.

Evidence: `evidence-review-3/live-audit.json`,
`evidence-review-3/live-flow.json`, and
`evidence-review-3/demo-mobile.png`.

## Claims audit

Every command was run exactly as listed from a fresh clone at
`162723a92fba9a6cd1f3e2177fd7da58eef71092` after `npm ci`.

| Claim | Listed command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm test -- --grep @claim:demo-sandbox` | Pass; desktop and mobile |
| `no-account` | `npm test -- --grep @claim:no-account` | Pass; desktop and mobile |
| `proof-expiry` | `cargo test claim_proof_expiry_rejects_an_expired_proof` | Pass |
| `next-visit-export` | `npm test -- --grep @claim:next-visit-export` | Pass; desktop and mobile |
| `same-origin-demo` | `npm test -- --grep @claim:same-origin-demo` | Pass; desktop and mobile |
| `configurable-extras` | `npm test -- --grep @claim:configurable-extras` | Pass; desktop and mobile |
| `paid-license` | `npm test -- --grep @claim:paid-license` | Pass; registry price, Dodo redirect, and restore flow |
| `rate-limit` | `npm test -- --grep @claim:rate-limit` | Pass; desktop and mobile |
| `plan-limit` | `cargo test claim_plan_limit_is_server_enforced_and_a_valid_license_allows_more` | Pass |
| `license-workspace-boundary` | `cargo test --test api claim_one_valid_license_applies_to_only_one_business_workspace -- --exact` | Pass |
| `demo-expiry` | `cargo test claim_demo_expiry_is_24_hours_and_expired_access_is_rejected` | Pass |
| `no-tracking` | `npm test -- --grep @claim:no-tracking` | Pass; desktop and mobile |
| `access-token-hashing` | `cargo test claim_access_tokens_are_stored_only_as_hashes` | Pass |
| `privacy-data-flow` | `npm test -- --grep @claim:privacy-data-flow` | Pass; desktop and mobile |
| `photo-upload` | `npm test -- --grep @claim:photo-upload` | Pass; desktop and mobile |
| `problem-rating` | `npm test -- --grep @claim:problem-rating` | Pass; desktop and mobile |
| `zero-config-runtime` | `npm run test:runtime` | Pass |
| `proof-page-privacy` | `npm test -- --grep @claim:proof-page-privacy` | Pass; desktop and mobile |
| `deployment-continuity` | `npm run test:live` | Pass; 400/400 demo reads, 20/20 proofs, plan boundary, and rate bursts |

Each claim ID occurs in exactly one tagged regression. The landing page and
README were cross-checked sentence by sentence against the manifest. No
unlisted visitor-facing behavioral claim or untested quantitative claim was
found. Full command tails are in
`evidence-review-3/claim-results.log`.

The clean-clone aggregate gate also passes: 13 Rust tests, 28 deployment and
documentation tests, the runtime test, and 46 desktop/mobile browser tests.
`npm run lint` and a final production build pass; `dist/` is produced.

## Earlier findings rechecked

Each item was checked against both current code and the live site.

| Earlier finding | Current verification | Result |
| --- | --- | --- |
| `F-1-1` | Proof HTML and API send `noindex, nofollow, noarchive` and `private, no-store`; proof HTML has no canonical. | Fixed |
| `F-1-2` | Landing, Privacy, and Terms consistently say Sociobot billing starts checkout and Dodo hosts payment; the public endpoint redirects to Dodo. | Fixed |
| `F-1-3` | `/demo`, `/app`, `/privacy`, and `/terms` have route-specific server and rendered title, description, canonical, Open Graph, and Twitter values. | Fixed |
| `F-1-4` | Preview heading is “See proof and next-visit extras.” | Fixed |
| `F-1-5` | Process heading is “How proof reaches the next visit.” | Fixed |
| `F-1-6` | Step heading is “Add approved extras to the next visit.” | Fixed |
| `F-1-7` | CSV copy names the exact exported columns. | Fixed |
| `F-1-8` | Boundary heading is “What this service handles.” | Fixed |
| `F-1-9` | Boundary sentence names the stored data. | Fixed |
| `F-1-10` | Price heading is “Keep creating proof links,” and scope is one workspace. | Fixed |
| `F-1-11` | Client and extra terminology is consistent in landing, workspace, proof, and controls. | Fixed |
| `F-1-12` | Copy instructs users not to enter home-entry codes or card details; it does not claim enforcement. | Fixed |
| `F-1-13` | README uses the prior plain-language accessibility and billing rewrites. | Fixed |
| `F-1-14` | The unlisted non-root-container statement remains absent. | Fixed |
| `F-1-15` | `deployment-continuity` remains listed, uniquely tagged, and its live command passes. | Fixed |
| `F-2-1` | The handoff retains the formal commercial decision and all 19 exact clean-clone commands pass. | Fixed |
| `F-2-2` | The 31-word deployment instruction remains split into 6- and 14-word sentences. | Fixed |

The two polish reports introduce no additional findings. Their asserted fixes
match the live page, current source, and fresh test results above.

## Structure, routing, links, and accessibility

- `/`, `/demo`, `/app`, `/privacy`, and `/terms` return 200. A new unknown URL
  returns a styled 404, status 404, one `h1`, the shared header/footer, and a
  working **Return home** action.
- Every checked route has `lang=en`, one `h1`, one `main`, an ordered heading
  outline, a route-specific title and description, canonical metadata where
  appropriate, matching Open Graph/Twitter metadata, favicon, and Apple icon.
- The root title is 48 characters and the description is 99 characters. The
  social image is 1200 × 630 and the Apple icon is 180 × 180.
- `robots.txt` and `sitemap.xml` are live and list all public routes.
- A crawl across links discovered on all stable routes found no dead link.
  Internal destinations return 200; checkout returns the expected 303 to
  Dodo; the two contact links are explicit `mailto:` actions.
- History navigation focuses the new route's `h1`. Back restores `/`, focuses
  the landing `h1`, and restores the recorded scroll position.
- Security headers include CSP, HSTS, nosniff, referrer policy, frame denial,
  and a restrictive permissions policy. No checked route emitted a console or
  page error.
- `/opt/fleet/lib/verify-url.sh` passes the landing, demo, Privacy, and Terms
  routes. The local accessibility suite passes four desktop/mobile tests.
- Fresh live Axe scans of landing, demo, proof, Privacy, and Terms in both
  light and dark modes report zero WCAG A/AA violations. Keyboard focus,
  44-pixel targets, 200% text reflow, and reduced-motion handling also pass.
- The built JavaScript is 33,629 bytes raw and 10,551 bytes gzip, below the
  first-load limit.

The pale ceramic trays, cobalt linework, apricot token, asymmetric layout,
serif display type, irregular proof sheets, and restrained transfer motion
match `.factory/design.md`. The identity is recognisable and is not a generic
centered-hero or feature-card SaaS template.

Evidence: `evidence-review-3/live-audit.json`,
`evidence-review-3/live-axe.json`, and the four `verify-*` directories.

## Missed leverage

No missing obvious feature was found. The brief's core loop is complete:
technician proof, client acceptance/problem/rating, configurable extras, and a
next-visit CSV export. Dispatch, payments, payroll, public-review solicitation,
and worker tracking are explicit non-goals. An AI step would add cost and data
disclosure without improving this deterministic handoff, so none is expected.

## What would make this perfect

Nothing remains to change in the reviewed scope. Preserve the one-click demo,
plain terminology, exact claim registry, private proof headers, and
single-writer SQLite deployment checks in future changes.
