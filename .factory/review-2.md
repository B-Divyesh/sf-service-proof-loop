# Service Proof Loop — adversarial first-read review 2

- Reviewed: 2026-09-02 UTC
- Live URL: <https://service-proof-loop.sociobot.in>
- Reviewed source: `0beb24927af62656b665105b99669539a21741ff`
- Live build: `5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3`

## Verdict

**FAIL — 2 findings: 1 blocking and 1 minor.**

The cold first screen, demo isolation, product flow, direct claim regressions,
routing, metadata, accessibility smoke checks, and live continuity probe pass.
The required clean-clone claim commands do not pass: each browser-backed claim
stops at the same failing deployment-document test before Playwright starts.

## Findings

### Blocking

#### F-2-1 — Required browser claim commands fail in a clean clone

- Exact location: `tests/release-docs.test.mjs`, test “commercial variance is
  explicitly accepted without rewriting the researched brief.”
- Reproduction: in a clean clone of `0beb249`, run any listed browser claim
  command, for example `npm test -- --grep @claim:demo-sandbox`.
- Observed failure: `AssertionError: The input did not match the regular
  expression /Formal commercial scope decision/` against `.factory/handoff.md`.
  The current handoff also omits the required summary of the researched
  `$59 per business each month plus technician seats` scope and delivered `$59
  one-time business license for one workspace` scope.
- Impact: all twelve manifest entries whose exact command is `npm test --
  --grep @claim:...` fail before their listed claim test runs. A verifier cannot
  accept the manifest, even though a supplementary direct Playwright run showed
  the live behaviors themselves passing.
- Concrete fix: restore the required commercial-scope summary to the handoff,
  including a heading or sentence containing “Formal commercial scope decision,”
  a link to `.factory/scope-decision.json`, both exact pricing scopes, and why
  the accepted variance exists. Then run `npm test` and each manifest command
  from a new clone.

### Minor

#### F-2-2 — The deployment instruction exceeds the plain-language sentence cap

- Exact location: README, Deployment section: “Run `npm run test:live` after
  deployment to check the live topology, writer count, durable storage, build
  identity, 20 fresh demos with 20 reads each, matching proofs, and 45- and
  130-request rate bursts.”
- Count: 31 words; the hard cap is 22.
- Why this matters: this is the instruction a deployer needs at the end of a
  release. The list makes the next action harder to scan on a phone or in a
  terminal handoff.
- Concrete rewrite: “Run `npm run test:live` after deployment. It checks
  topology, durable storage, build identity, demo reads, matching proofs, and
  rate limits.”

## Cold first read

No prior page context or scroll was used. Fresh Chromium contexts were opened
at 390 × 844 and 1440 × 900.

| View | What it does, in my words | For whom | First click | Result |
| --- | --- | --- | --- | --- |
| 390 px | Sends completed-visit proof, collects a client reply and extras, then carries approved extras into the next visit. | Recurring service teams. | “Try it with sample data.” | Pass |
| Desktop | Same. The ceramic trays visibly reinforce proof moving to a next-visit task. | Recurring service teams. | “Try it with sample data.” | Pass |

The exact first-screen text that supplied those answers was “Send proof. Plan
the next visit.”, “For recurring service teams that need client feedback and
approved extras without asking clients to install an app.”, and “Try it with
sample data” with “Loads a sample visit. Nothing is saved.” No console or page
errors occurred in either context.

## Copy audit

Counts treat hyphenated compounds, prices, paths, and version strings as one
word. Commands are not sentences. Navigation labels, headings, and controls
were also checked for plain result-naming language; none needs a separate
finding. The one over-cap README sentence is F-2-2.

### Landing sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Send proof. | 2 | Pass |
| Plan the next visit. | 4 | Pass |
| For recurring service teams that need client feedback and approved extras without asking clients to install an app. | 17 | Pass |
| Loads a sample visit. | 4 | Pass |
| Nothing is saved. | 3 | Pass; demo scope is stated by the banner and claim. |
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
| No dispatch, payroll, or worker tracking. | 6 | Pass; stated non-goal from the brief. |
| Do not enter home-entry codes or payment card details. | 10 | Pass |
| No public review campaigns. | 4 | Pass; stated non-goal from the brief. |
| After three free visits, one $59 license covers one business workspace. | 11 | Pass |
| Sociobot billing starts checkout. | 4 | Pass |
| Dodo hosts the payment page. | 6 | Pass |
| Send visit proof and plan the next visit. | 8 | Pass |
| Original product art was generated for this service. | 8 | Pass |

Reviewed labels and headings: “After-visit proof for recurring services,”
“See proof and next-visit extras,” “How proof reaches the next visit,” “Add
approved extras to the next visit,” “What this service handles,” and “Keep
creating proof links” all name their section or outcome. Buttons use result
verbs: “Try it with sample data,” “Buy the business license,” and “Verify
license.” No banned marketing adjective, unexplained product term, or
non-result button was found.

### README sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Send visit proof and carry approved extras into the next recurring visit. | 12 | Pass |
| Service Proof Loop is for cleaning and maintenance businesses with repeat clients. | 12 | Pass |
| A technician records a checklist, note, and consented photos. | 9 | Pass |
| The client opens a private link without an account. | 9 | Pass |
| Their reply and selected extras appear beside the next visit and in a CSV export. | 15 | Pass |
| The product does not handle dispatch, payments, payroll, public reviews, or worker tracking. | 13 | Pass |
| Open `/demo`, or visit the deployed URL after deployment. | 9 | Pass |
| The demo creates an isolated 24-hour workspace. | 7 | Pass |
| Choose Reset demo to start with new sample data. | 9 | Pass |
| See `.factory/demo.md` for the exact sandbox behavior. | 7 | Pass |
| You need Node.js 22+, current stable Rust, and SQLite development libraries. | 11 | Pass |
| The service starts without configuration variables and listens on port 8080 by default. | 13 | Pass |
| For frontend development, run the API on port 8080. | 9 | Pass |
| Then run `npm run dev` in a second terminal and open `http://localhost:5173`. | 12 | Pass |
| `npm test` starts the built service and runs Chromium at desktop and 390 px. | 14 | Pass, but currently fails at F-2-1. |
| The suite checks offline messages, keyboard navigation, page structure, and serious accessibility issues. | 12 | Pass |
| Every product claim and its command is listed in `.factory/claims.json`. | 10 | Pass; the entries exist. |
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
| The researched monthly-plus-seat model remains unchanged in the opportunity brief; the current Sociobot billing API supports one-time purchases, not monthly per-seat billing. | 21 | Pass |
| The multi-stage Dockerfile builds the Vite frontend and Rust service. | 10 | Pass |
| The factory supplies `BUILD_SHA`; it may deploy with only `PORT`. | 10 | Pass |
| The checked-in `.factory/deployment.json` sets `data_dir` to `/data`, fixes the service at one replica, and mounts the `sf-service-proof-loop-data` Azure Files share there. | 21 | Pass |
| Run the deployment command to apply the image, durable mount, single-revision mode, and replica ceiling. | 15 | Pass |
| Run `npm run test:live` after deployment to check the live topology, writer count, durable storage, build identity, 20 fresh demos with 20 reads each, matching proofs, and 45- and 130-request rate bursts. | 31 | Flag F-2-2 |
| Do not raise the replica count without moving SQLite and rate-limit state to shared services. | 15 | Pass |
| The product includes `/privacy` and `/terms`. | 6 | Pass |
| It does not load third-party fonts, scripts, or analytics. | 9 | Pass |
| Generated art provenance is recorded in `.factory/design.md`. | 7 | Pass |
| The source is available under the MIT License. | 8 | Pass |

Configuration keys, headings, shell commands, URLs, and link labels are
fragments rather than sentences. They were checked and are concrete and
consistent with the terminology table: visit, proof, client, extra, next
visit, next-visit CSV, and workspace.

## Demo and privacy boundary

- One landing click opened `/demo`; the first settled screen already showed
  Northstar Home Care, Maya Chen, Willow Street, technician Elena, the private
  proof action, and next-visit work.
- The persistent banner read “Demo — sample data, nothing is saved” and
  exposed both Reset demo and Start for real.
- With a seeded `real:workspace` sentinel, entering and resetting the demo
  left that real-storage value byte-for-byte unchanged. Reset changed the
  `sessionStorage` `demo:workspace` token and workspace ID.
- The cold landing-to-demo request log contained only
  `https://service-proof-loop.sociobot.in`. Direct desktop and mobile
  `@claim:same-origin-demo` and `@claim:no-tracking` regressions passed.
- The direct sample flow chose “Inside refrigerator,” saved the reply, showed
  the item beside the next visit, and exported it in the CSV. The direct
  browser claim run passed 24/24 tests across desktop and 390 px.

## Claims audit

All 19 commands below ran from a fresh clone after `npm ci`. “Direct check” is
supplementary evidence only; it does not replace the manifest command.

| Claim | Manifest command | Result | Direct check |
| --- | --- | --- | --- |
| `demo-sandbox` | `npm test -- --grep @claim:demo-sandbox` | Fail: F-2-1 | Pass |
| `no-account` | `npm test -- --grep @claim:no-account` | Fail: F-2-1 | Pass |
| `proof-expiry` | Rust command | Pass | — |
| `next-visit-export` | `npm test -- --grep @claim:next-visit-export` | Fail: F-2-1 | Pass |
| `same-origin-demo` | `npm test -- --grep @claim:same-origin-demo` | Fail: F-2-1 | Pass |
| `configurable-extras` | `npm test -- --grep @claim:configurable-extras` | Fail: F-2-1 | Pass |
| `paid-license` | `npm test -- --grep @claim:paid-license` | Fail: F-2-1 | Pass |
| `rate-limit` | `npm test -- --grep @claim:rate-limit` | Fail: F-2-1 | Pass |
| `plan-limit` | Rust command | Pass | — |
| `license-workspace-boundary` | Rust command | Pass | — |
| `demo-expiry` | Rust command | Pass | — |
| `no-tracking` | `npm test -- --grep @claim:no-tracking` | Fail: F-2-1 | Pass |
| `access-token-hashing` | Rust command | Pass | — |
| `privacy-data-flow` | `npm test -- --grep @claim:privacy-data-flow` | Fail: F-2-1 | Pass |
| `photo-upload` | `npm test -- --grep @claim:photo-upload` | Fail: F-2-1 | Pass |
| `problem-rating` | `npm test -- --grep @claim:problem-rating` | Fail: F-2-1 | Pass |
| `zero-config-runtime` | `npm run test:runtime` | Pass | — |
| `proof-page-privacy` | `npm test -- --grep @claim:proof-page-privacy` | Fail: F-2-1 | Pass |
| `deployment-continuity` | `npm run test:live` | Pass | 400/400 demo reads; 20/20 proofs |

No unlisted visitor-facing claim was found on the landing page or README. The
deployment sentence behind F-2-2 is covered by `deployment-continuity`.

## Earlier findings

Every item in `review-1.md` and `polish-1.md` was checked in both current code
and the live build.

| Earlier ID | Current result |
| --- | --- |
| F-1-1 | Fixed: proof HTML and API use `noindex, nofollow, noarchive`, `private, no-store`, and no proof canonical. Direct regression passed. |
| F-1-2 | Fixed: landing, privacy, and terms say Sociobot billing starts checkout and Dodo hosts the payment page. Direct regression passed. |
| F-1-3 | Fixed: `/demo`, `/app`, `/privacy`, and `/terms` have matching route-specific rendered and server metadata. |
| F-1-4 through F-1-10 | Fixed: current section headings and CSV wording are plain and result-specific. |
| F-1-11 | Fixed: client and extra are used consistently in hero, workspace, and controls. |
| F-1-12 | Fixed: the landing instructs people not to enter access codes or card data; it no longer describes an unenforced restriction. |
| F-1-13 | Fixed: the two README wording issues were rewritten. |
| F-1-14 | Fixed: the unlisted non-root-container statement is absent. |
| F-1-15 | Fixed: `deployment-continuity` exists with the live verifier command. |

F-2-1 is a later regression in the handoff content, not a recurrence of an
earlier finding ID.

## Structure and product fit

- `/`, `/demo`, `/app`, `/privacy`, and `/terms` returned 200; an unknown URL
  returned a designed 404 with a Return home link and 404 status.
- Checked routes have route-specific titles, descriptions, canonicals, Open
  Graph/Twitter metadata, favicon, Apple touch icon, `lang=en`, one `h1`, and
  a main landmark. `robots.txt` and `sitemap.xml` list the public routes.
- Header, skip link, footer, Privacy, and Terms are consistent. Internal
  landing links returned 200. Deep-route navigation, back navigation, and
  focus behavior passed the direct browser suite.
- The live CSP, HSTS, nosniff, and referrer-policy headers are present. No
  console errors appeared on the primary routes.
- The pale ceramic trays, cobalt rules, apricot state accents, asymmetric
  workbench, and serif display face match `.factory/design.md` and are distinct
  from a generic SaaS template.
- The brief does not imply an extra AI, import, export, or sync feature that
  is missing. The existing next-visit CSV export is the useful handoff; an AI
  step would be decorative rather than necessary for this job.

## What would make this perfect

Restore the missing commercial-scope handoff disclosure so every exact claim
command passes from a clean clone, and split the long deployment sentence.
After that, rerun the full manifest and this review checklist from fresh
browser contexts.
