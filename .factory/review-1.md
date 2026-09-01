# Service Proof Loop — first-read review 1

- Reviewed: 2026-09-01
- Live URL: <https://service-proof-loop.sociobot.in>
- Live build: `b44500bb3ad3664d8a785bb76bc7a8dda138e607`

## Verdict

**FAIL — 15 findings: 2 blocking and 13 minor.**

The first screen, demo, core workflow, accessibility checks, and all listed
claim commands pass. The release still fails because private proof responses
can be indexed or cached, and the billing-party copy does not match what the
claim test observes. Thirteen copy, metadata, and claim-list issues also remain.

## Findings

### Blocking

#### F-1-1 — Private proof pages lack indexing and cache controls

- Exact location: a live demo proof at `/proof/<access-token>?demo=1`.
- Observed HTML: its canonical URL is
  `https://service-proof-loop.sociobot.in/proof/<access-token>`; there is no
  `meta[name=robots]`.
- Observed response: neither the proof page nor `/api/proof/<access-token>`
  sends `X-Robots-Tag` or `Cache-Control`. The API response contains the client
  name, location label, technician note, checklist, image URLs, and extras.
- Conflicting product text: “Private proof link” and “This link should show
  only your visit.”
- Why this matters: the bearer token is copied into canonical metadata, and a
  browser or intermediary may retain the proof response. A client cannot rely
  on the word “private” without explicit controls for this sensitive route.
- Concrete fix: omit the canonical element on proof routes; send
  `X-Robots-Tag: noindex, nofollow, noarchive` for `/proof/*`; send
  `Cache-Control: private, no-store` for proof HTML and API responses; add a
  claim and test that confirm those headers and the absence of a token-bearing
  canonical URL.

#### F-1-2 — Checkout ownership and refund claims do not match the tested path

- Exact landing copy: “Buy the business license at Sociobot checkout.”
  “Sociobot is the merchant of record. Refunds are handled there.”
- Exact privacy copy: “Sociobot hosts checkout. Dodo handles payment card
  details on that checkout page.”
- Exact claim: `paid-license` says “Sociobot-hosted checkout.”
- Observed result: the claim test accepts a `303` from the Sociobot API to
  `https://checkout.dodopayments.com/...`; it does not confirm the merchant of
  record or who processes refunds.
- Why this matters: the visitor receives conflicting information about who
  hosts payment, contracts for the purchase, and handles a refund. The passing
  test does not establish the words in the claim.
- Concrete fix: confirm the commercial parties, then use one exact disclosure
  everywhere. If the observed flow is the intended one, use “Buy through
  Sociobot billing” and “Sociobot starts checkout; Dodo hosts the payment
  page.” Remove the merchant/refund statements unless they are supported by a
  linked policy and an appropriate contract check. Update `paid-license` so
  its wording and assertions match the disclosure.

### Minor

#### F-1-3 — Deep routes reuse the landing social metadata

- Exact location: `/demo`, `/app`, `/privacy`, and `/terms`.
- Observed result: each route sets a correct document title and canonical URL,
  but all retain `og:title` “Service Proof Loop — Send proof after each visit”
  and the landing description. Twitter title and description are also static.
- Why this matters: shared deep links describe the landing page instead of the
  page the visitor will open.
- Concrete fix: update Open Graph and Twitter title, description, and URL in
  `setMeta`; add route assertions for both rendered DOM and server-visible
  metadata.

#### F-1-4 — “See the full loop on one screen” is a metaphor heading

- Exact location: landing product-preview `h2`.
- Why this matters: “loop” does not name the proof, client reply, or next-visit
  result when the heading is read by itself.
- Concrete rewrite: **“See proof and next-visit extras.”**

#### F-1-5 — “Close the visit before work gets lost” is a mood heading

- Exact location: landing how-it-works `h2`.
- Why this matters: it suggests a risk but does not name the section's process.
- Concrete rewrite: **“How proof reaches the next visit.”**

#### F-1-6 — “Carry work forward” does not name the result

- Exact location: third step heading.
- Why this matters: the visitor must read the following sentence to learn that
  approved extras are added to the next visit.
- Concrete rewrite: **“Add approved extras to the next visit.”**

#### F-1-7 — “ready-to-use CSV” is an unsupported marketing adjective

- Exact location: third step, “Export them as a ready-to-use CSV.”
- Why this matters: “ready-to-use” does not identify the columns or compatible
  destination and has no claim test.
- Concrete rewrite: **“Export the next date, client, location, extra, detail,
  and price as CSV.”**

#### F-1-8 — “field system” is unexplained jargon

- Exact location: boundaries `h2`, “Proof only, not another field system.”
- Why this matters: the design document itself says to avoid “field system,”
  and the heading does not name the section out of context.
- Concrete rewrite: **“What this service handles.”**

#### F-1-9 — “small and clear” is subjective and adds no usable fact

- Exact location: boundaries paragraph, “This service keeps the after-visit
  exchange small and clear.”
- Why this matters: neither adjective tells a visitor what is stored or sent.
- Concrete rewrite: **“It stores visit proof, client replies, and approved
  extras.”**

#### F-1-10 — “Keep every recurring visit in the loop” is a metaphor heading

- Exact location: pricing `h2`.
- Why this matters: it does not identify the paid result when read alone.
- Concrete rewrite: **“Get unlimited proof links.”**

#### F-1-11 — The product uses three terms for the same client-facing concept

- Exact locations: hero sentence says “customer app”; the rest of the product
  says “client.” The hero art says “One client choice,” while the workspace
  uses “extras,” “Client choices,” and “Add client choice.”
- Why this matters: the visitor must decide whether a customer, client,
  choice, and extra are different concepts.
- Concrete rewrites: “without asking clients to install an app”; “An approved
  extra appears on the next visit”; “Manage extras”; “These extras appear on
  every client proof page”; “Add extra.”

#### F-1-12 — “No home-entry codes or payment cards” reads as an enforced limit

- Exact location: landing, under “What it leaves alone.”
- Observed code: visit notes and client comments accept arbitrary text; the
  privacy page separately tells people not to enter these details.
- Why this matters: a visitor may infer that the service prevents those values
  from being stored when it does not.
- Concrete rewrite: **“Do not enter home-entry codes or payment card details.”**
  Alternatively, enforce the restriction and add a claim test.

#### F-1-13 — Two README sentences use avoidable internal jargon

- Exact copy: “The suite covers ... keyboard-ready semantics, and serious axe
  issues.”
- Proposed rewrite: **“The suite checks offline messages, keyboard navigation,
  page structure, and serious accessibility issues.”**
- Exact copy: “the supplied Sociobot paid-unlock contract does not support
  that billing shape.”
- Proposed rewrite: **“The current Sociobot billing API supports one-time
  purchases, not monthly per-seat billing.”**

#### F-1-14 — The non-root container statement is an unlisted claim

- Exact README copy: “It runs as a non-root user and serves the API and
  frontend from one container.”
- Why this matters: `claims.json` has no entry that starts the built container
  and confirms its runtime user. `zero-config-runtime` starts the local binary,
  not the container.
- Concrete fix: add `non-root-container` with a container runtime test that
  confirms a non-zero UID, or remove the statement.

#### F-1-15 — Deployment reliability statements are absent from `claims.json`

- Exact README copy: “The configured deployment command applies the image,
  durable mount, single-revision mode, and replica ceiling in one update.” “It
  then verifies the live topology, active writer count, durable storage, and
  build identity.” “The deploy transaction also creates 20 fresh demos and
  launches 20 workspace reads for each demo at once.” “All 400 reads and each
  matching proof must succeed.” “It also verifies the 45- and 130-request rate
  bursts.”
- Why this matters: these are observable reliability promises with tests, but
  they are not listed as claims, so the claims manifest is incomplete.
- Concrete fix: add one deployment-continuity claim with `npm run test:live`
  and its exact sandbox, or rewrite this section as instructions that explain
  what the command checks without presenting the results as product promises.

## Cold first read

No scrolling or prior context was used.

| View | What it does, in my words | For whom | First click | Result |
| --- | --- | --- | --- | --- |
| 390 × 844 | Sends completed-visit proof, collects client feedback and extras, and puts approved extras on the next visit. | Recurring service teams. | “Try it with sample data.” | Clear; pass. |
| 1440 × 900 | Same answer. The ceramic-tray art also shows one item moving from proof to the next visit. | Recurring service teams. | “Try it with sample data.” | Clear; pass. |

The exact first-screen copy that answered the questions was “Send proof. Plan
the next visit,” “For recurring service teams...,” and “Try it with sample
data.” Mobile showed all three facts and part of the original hero art before
the fold. Desktop showed the complete hero composition.

Evidence: `evidence-review-1/first-read-mobile.png`,
`evidence-review-1/first-read-desktop.png`, and
`evidence-review-1/live-audit.json`.

## Copy audit

Counts treat hyphenated terms, prices, paths, and version strings as one word.
Repeated text is listed once with its occurrence noted. Code blocks are
commands, not sentences, and are excluded. No sentence exceeds 22 words. No
banned marketing word appears. Flags point to the findings above.

### Live landing page

| Text | Words | Result |
| --- | ---: | --- |
| Skip to main content | 4 | Pass |
| Service Proof Loop (header and footer) | 3 | Pass |
| Demo | 1 | Pass |
| Workspace | 1 | Pass |
| Price | 1 | Pass |
| Privacy (header, pricing, footer) | 1 | Pass |
| After-visit proof for recurring services | 5 | Pass |
| Send proof. | 2 | Pass |
| Plan the next visit. | 4 | Pass |
| For recurring service teams that need client feedback and approved extras without another customer app. | 14 | Flag: F-1-11 |
| Try it with sample data | 6 | Pass |
| Loads a sample visit. | 4 | Pass |
| Nothing is saved. | 3 | Pass; scoped by the demo banner and sandbox test |
| Proof links expire after 14 days. | 6 | Pass |
| Clients open links without an account. | 6 | Pass |
| Three visits free. | 3 | Pass |
| $59 once for unlimited visits. | 5 | Pass |
| One client choice moves into the next visit. | 8 | Flag: F-1-11 |
| The product | 2 | Pass |
| See the full loop on one screen | 7 | Flag: F-1-4 |
| Crews record the visit. | 4 | Pass |
| Clients review the proof. | 4 | Pass |
| The office exports approved extras without typing them again. | 9 | Pass |
| Northstar Home Care | 3 | Pass |
| Waiting for client | 3 | Pass |
| Willow Street · Today · Elena | 4 | Pass |
| Lake Avenue · Yesterday · Sam | 4 | Pass |
| Visit complete | 2 | Pass |
| Maya’s visit at Willow Street | 5 | Pass |
| Four checks · Two photos · Next visit Sep 11 | 8 | Pass |
| Kitchen surfaces and sink | 4 | Pass |
| Two bathrooms | 2 | Pass |
| Floors vacuumed and mopped | 4 | Pass |
| Next visit | 2 | Pass |
| Inside refrigerator · Client approved · $28 | 6 | Pass |
| How it works | 3 | Pass |
| Close the visit before work gets lost | 7 | Flag: F-1-5 |
| Record the visit | 3 | Pass |
| The technician checks the work, adds photos with consent, and sends one private link. | 14 | Pass |
| Collect one clear reply | 4 | Pass |
| The client accepts the work or reports a problem. | 9 | Pass |
| They can rate it and choose extras. | 7 | Pass |
| Carry work forward | 3 | Flag: F-1-6 |
| Approved extras appear beside the next date. | 7 | Pass |
| Export them as a ready-to-use CSV. | 7 | Flag: F-1-7 |
| Clear boundaries | 2 | Pass |
| Proof only, not another field system | 6 | Flag: F-1-8 |
| This service keeps the after-visit exchange small and clear. | 9 | Flag: F-1-9 |
| What it handles | 3 | Pass |
| Visit checklists and consented photos | 5 | Pass |
| Client acceptance, problems, and ratings | 5 | Pass |
| Approved extras for the next visit | 6 | Pass |
| What it leaves alone | 4 | Pass |
| No dispatch, payroll, or worker tracking | 6 | Pass |
| No home-entry codes or payment cards | 6 | Flag: F-1-12 |
| No public review campaigns | 4 | Pass |
| Business license | 2 | Pass |
| Keep every recurring visit in the loop | 7 | Flag: F-1-10 |
| Add unlimited client proof links after three free visits. | 9 | Pass |
| One business workspace | 3 | Pass |
| Configurable client extras | 3 | Pass |
| Next-visit CSV exports | 3 | Pass |
| $59 one-time purchase | 3 | Pass |
| Buy the business license at Sociobot checkout | 7 | Flag: F-1-2 |
| Have a license? | 3 | Pass |
| Verify license | 2 | Pass |
| Sociobot is the merchant of record. | 6 | Flag: F-1-2 |
| Refunds are handled there. | 4 | Flag: F-1-2 |
| Privacy · Terms | 2 | Pass |
| Send visit proof and plan the next visit. | 8 | Pass |
| Original product art was generated for this service. | 8 | Pass |
| Terms | 1 | Pass |
| Built by Param Factory (external site) | 6 | Pass |
| Version 1.0.0 · Build 2026.08 | 4 | Pass |

All landing buttons name a result or destination. The demo, workspace, price,
privacy, terms, and factory links have a visible link treatment.

### README

| Text | Words | Result |
| --- | ---: | --- |
| Service Proof Loop | 3 | Pass |
| Send visit proof and carry approved extras into the next recurring visit. | 12 | Pass |
| Service Proof Loop is for cleaning and maintenance businesses with repeat clients. | 12 | Pass |
| A technician records a checklist, note, and consented photos. | 9 | Pass |
| The client opens a private link without an account. | 9 | Pass, subject to F-1-1 |
| Their reply and selected extras appear beside the next visit and in a CSV export. | 15 | Pass |
| The product does not handle dispatch, payments, payroll, public reviews, or worker tracking. | 13 | Pass |
| Try the sample | 3 | Pass |
| Open `/demo`, or visit the deployed `/demo` URL. | 8 | Pass |
| The demo creates an isolated 24-hour workspace. | 7 | Pass |
| Choose Reset demo to start with new sample data. | 9 | Pass |
| See `.factory/demo.md` for the exact sandbox behavior. | 7 | Pass |
| Run locally | 2 | Pass |
| You need Node.js 22+, current stable Rust, and SQLite development libraries. | 11 | Pass |
| Open `http://localhost:8080`. | 2 | Pass |
| The service starts without configuration variables and listens on port 8080 by default. | 13 | Pass |
| For frontend development, run the API on port 8080. | 9 | Pass |
| Then run `npm run dev` in a second terminal and open `http://localhost:5173`. | 12 | Pass |
| Test and verify | 3 | Pass |
| `npm test` starts the built service and runs Chromium at desktop and 390 px. | 14 | Pass |
| The suite covers the demo sandbox, client reply, extra configuration, CSV contents, offline messaging, keyboard-ready semantics, and serious axe issues. | 20 | Flag: F-1-13 |
| Every product claim and its command is listed in `.factory/claims.json`. | 10 | Flag: F-1-14 and F-1-15 show exceptions |
| Configuration | 1 | Pass |
| `PORT`: HTTP port. Defaults to `8080`. | 6 | Pass |
| `DATABASE_URL`: SQLite URL. Defaults to `/data/service-proof-loop.db`. | 6 | Pass |
| `BILLING_BASE_URL`: license verifier URL. Defaults to the Sociobot product endpoint. | 10 | Pass |
| `STATIC_DIR`: built frontend directory. Defaults to `dist`. | 7 | Pass |
| `BUILD_SHA`: embedded during the container build and returned by `/health`. | 10 | Pass |
| No signing secret is required. | 5 | Pass; covered by zero-config runtime |
| Workspace and production proof access use random tokens stored as SHA-256 hashes. | 12 | Pass |
| Demo proof tokens are also retained inside the isolated, 24-hour demo workspace so the sample link can be reopened. | 19 | Pass |
| Proof links expire after 14 days. | 6 | Pass |
| Every API route except `/health` has a forwarded-IP rate limit. | 10 | Pass |
| Billing | 1 | Pass |
| The free plan accepts three completed visits. | 7 | Pass |
| A $59 one-time business license adds unlimited visits. | 8 | Pass |
| Checkout and license verification use the Sociobot billing API. | 9 | Pass, subject to F-1-2 |
| The server enforces the limit even when its browser controls are bypassed. | 12 | Pass |
| This delivery model is formally recorded in `.factory/scope-decision.json`. | 8 | Pass |
| The researched monthly-plus-seat model remains unchanged in the opportunity brief; the supplied Sociobot paid-unlock contract does not support that billing shape. | 21 | Flag: F-1-13 |
| Deployment | 1 | Pass |
| The multi-stage Dockerfile builds the Vite frontend and Rust service. | 10 | Pass |
| It runs as a non-root user and serves the API and frontend from one container. | 15 | Flag: F-1-14 |
| The factory supplies `BUILD_SHA`; it may deploy with only `PORT`. | 10 | Pass |
| The checked-in `.factory/deployment.json` sets `data_dir` to `/data`, fixes the service at one replica, and mounts the `sf-service-proof-loop-data` Azure Files share there. | 21 | Pass; source-backed |
| The configured deployment command applies the image, durable mount, single-revision mode, and replica ceiling in one update. | 17 | Flag: F-1-15 |
| It then verifies the live topology, active writer count, durable storage, and build identity. | 14 | Flag: F-1-15 |
| The deploy transaction also creates 20 fresh demos and launches 20 workspace reads for each demo at once. | 18 | Flag: F-1-15 |
| All 400 reads and each matching proof must succeed. | 9 | Flag: F-1-15 |
| It also verifies the 45- and 130-request rate bursts. | 9 | Flag: F-1-15 |
| Do not raise the replica count without moving SQLite and rate-limit state to shared services. | 15 | Pass |
| Privacy and license | 3 | Pass |
| The product includes `/privacy` and `/terms`. | 6 | Pass |
| It does not load third-party fonts, scripts, or analytics. | 9 | Pass |
| Generated art provenance is recorded in `.factory/design.md`. | 7 | Pass |
| The source is available under the MIT License. | 8 | Pass |

## Demo and storage boundary

- One click from the landing page opened `/demo`.
- The first demo screen already showed Northstar Home Care, Maya Chen, Willow
  Street, Elena, a completed date, proof link controls, and next-visit state.
- The persistent banner read “Demo — sample data, nothing is saved” and showed
  Reset demo and Start for real.
- Reset changed the demo workspace ID and access token.
- A seeded `real:workspace` local-storage value remained byte-for-byte unchanged
  through demo entry and reset.
- The request log contained only
  `https://service-proof-loop.sociobot.in` during the landing-to-demo flow.
- The backend and migrations scope visits and extras by workspace ID and mark
  demo workspaces with `is_demo` plus a 24-hour expiry.

The demo requirement passes. Evidence is in
`evidence-review-1/demo-mobile.png` and `live-audit.json`.

## Claims audit

Each command was run separately from a clean clone at commit
`0cef681301e12f29386c1d1f394f1f3b479b8c7e`. Browser claim commands ran both
desktop and 390 px projects.

| Claim ID | Listed command result |
| --- | --- |
| `demo-sandbox` | Pass, 2 browser projects |
| `no-account` | Pass, 2 browser projects |
| `proof-expiry` | Pass, 1 Rust test |
| `next-visit-export` | Pass, 2 browser projects |
| `same-origin-demo` | Pass, 2 browser projects |
| `configurable-extras` | Pass, 2 browser projects |
| `paid-license` | Pass mechanically; wording/test mismatch is F-1-2 |
| `rate-limit` | Pass, 2 browser projects |
| `plan-limit` | Pass, 1 Rust test |
| `demo-expiry` | Pass, 1 Rust test |
| `no-tracking` | Pass, 2 browser projects |
| `access-token-hashing` | Pass, 1 Rust test |
| `privacy-data-flow` | Pass, 2 browser projects |
| `photo-upload` | Pass, 2 browser projects |
| `problem-rating` | Pass, 2 browser projects |
| `zero-config-runtime` | Pass, 1 Node runtime test |

The manifest is not complete because of F-1-14 and F-1-15. The public
checkout and refund wording is not established by its listed test (F-1-2).

## Structure, routing, and accessibility

- `/`, `/demo`, `/app`, `/privacy`, and `/terms` return 200. An unknown path
  returns a designed 404 with status 404 and a home action.
- Each checked route has `lang=en`, one `h1`, one `main`, a route-specific
  document title, a description, a canonical URL, favicon, 180 px touch icon,
  and 1200 × 630 original social image. F-1-3 covers the stale deep-route
  social text.
- `robots.txt` and `sitemap.xml` respond with 200 and list all stable routes.
  Proof-route indexing remains F-1-1.
- Every landing link returned 200 or the expected checkout 303. `mailto:`
  links were treated as explicit external actions.
- Privacy navigation focused “Privacy for visit proof.” Back navigation
  restored `/`, scroll position zero, and focus on the landing `h1`.
- The header and footer remain consistent across checked routes, including
  Privacy and Terms links.
- The ceramic-tray art, cobalt/apricot palette, asymmetry, serif display type,
  and irregular proof sheets match `.factory/design.md` and are visually
  distinct from a generic SaaS template.
- `/opt/fleet/lib/verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`
  with no console errors, one `h1`, `lang=en`, a main landmark, complete image
  alternatives, and labelled buttons.
- The complete live Playwright suite passed 42/42. This includes serious Axe
  checks, dark treatment, keyboard operation, visible focus, 44 px targets,
  200% text reflow, reduced-motion behavior, deep links, 404 behavior, and
  console checks.
- The production bundle is 31.75 kB JavaScript raw (10.15 kB gzip) and 15.44
  kB CSS raw (4.41 kB gzip).

## Earlier history

There are no earlier `.factory/review-*.md` or `.factory/polish-*.md` files.
The handoff at base commit `0cef681` recorded a repaired split-state
deployment. That repair is confirmed rather than accepted from the document:

- `node scripts/verify-deployment.mjs` reports one active revision, one live
  replica, min/max 1/1, and the `sf-service-proof-loop-data` Azure Files mount
  at `/data`.
- `npm run test:live` passed 400/400 simultaneous demo reads, 20/20 proof
  reads, exactly three successful free-plan writes, validation checks, and the
  45- and 130-request rate checks.
- The checked-in deployment contract and regression fixtures enforce the same
  single-writer topology.

The earlier deployment finding is fixed and has not regressed.

## Missed leverage

No additional AI step is expected for this job. Proof capture, client reply,
extra selection, and CSV export are deterministic and work without a model.
Adding drafting or summarisation would add cost and disclosure without solving
an implied need. Export is present; dispatch and broader sync remain explicit
non-goals. No missed-leverage finding is recorded.

## What would make this perfect

Resolve F-1-1 and F-1-2 first. Then replace the five metaphorical or vague
landing lines, use “client” and “extra” consistently, correct deep-route social
metadata, and make the claims manifest match every remaining README promise.
After those changes, rerun every listed claim command from a clean clone, the
42-test live suite, the four route checks, and a proof-response header check.
The standard for the next round is zero findings and no untested claim.
