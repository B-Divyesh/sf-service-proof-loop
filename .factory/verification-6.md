# Independent product verification 6 — FAIL

Verified on 2026-08-29 against candidate `1c5998b420f7a0f262eca7916dafdbd346f356a8` and <https://service-proof-loop.sociobot.in>.

## Verdict

**FAIL — do not release.** The local candidate is healthy, but the live service does not reliably retain and read a just-created demo workspace. This breaks the mandatory one-click demo and the core proof-to-next-visit workflow. `/health` reports the exact candidate SHA, so build identity alone is not sufficient evidence of a correct deployment.

## Mandatory first-read gate — PASS

A cold desktop and 390 px load plainly answered all required questions:

- **What it does:** “Send proof. Plan the next visit.”
- **For whom:** “recurring service teams that need client feedback and approved extras without another customer app.”
- **What to click first:** “Try it with sample data” followed by “Loads a sample visit. Nothing is saved.”

The first screen has the visible one-click sample action. Before the later deployment-state failure appeared, it opened the isolated demo banner and sample visit. The wording, first-read layout, and sample entry point therefore pass; the currently broken demo execution does not.

## Release-blocking findings

### Critical — live demo/workspace state is split between backend requests

Fresh live evidence at 16:55 UTC:

1. A clean browser loaded `/demo`. `POST /api/demo` returned `200` with a newly generated workspace ID and access token.
2. Its immediate authenticated `GET /api/visits` returned `401 {"error":"Your workspace access is not valid."}`.
3. The UI rendered **“Visits could not load”** and offered only recovery; it never showed Willow Street or the usable demo workspace.
4. Three further independent fresh browser contexts repeated the same `POST /api/demo` `200` then `GET /api/visits` `401` sequence.
5. A direct probe with one newly created token made ten sequential `GET /api/visits` calls: **4 × 200** (the expected seeded Willow Street visit) and **6 × 401** (invalid workspace access). The token and request headers were identical for every read.

This is not a browser-storage issue: the failing request used the token returned by the immediately preceding API response. It is consistent with requests being routed to non-shared SQLite state (for example, multiple live writers/revisions or a missing durable mount). The product cannot meet its primary job while this occurs, and it also creates a tenant-isolation/persistence boundary concern.

Required remediation: verify and repair the actual deployed topology and durable shared data path, drain any stale writer/revision, then prove a single demo token survives repeated reads while traffic is load-balanced. Re-run the full live flow only after that repair.

## Claims preflight — all pass locally

`.factory/claims.json` exists and contains 16 entries. From the clean candidate checkout, every listed command was run separately before broader QA and passed:

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS — desktop and 390 px |
| `no-account` | PASS — desktop and 390 px |
| `proof-expiry` | PASS — 1 Rust integration test |
| `next-visit-export` | PASS — desktop and 390 px |
| `same-origin-demo` | PASS — desktop and 390 px |
| `configurable-extras` | PASS — desktop and 390 px |
| `paid-license` | PASS — desktop and 390 px |
| `rate-limit` | PASS — desktop and 390 px |
| `plan-limit` | PASS — 1 Rust integration test |
| `demo-expiry` | PASS — 1 Rust integration test |
| `no-tracking` | PASS — desktop and 390 px |
| `access-token-hashing` | PASS — 1 Rust integration test |
| `privacy-data-flow` | PASS — desktop and 390 px |
| `photo-upload` | PASS — desktop and 390 px |
| `problem-rating` | PASS — desktop and 390 px |
| `zero-config-runtime` | PASS — empty-environment port-8080 runtime |

## Local quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, 0 reported vulnerabilities |
| `cargo test --all-targets` | PASS — 12/12 |
| `npm run typecheck` | PASS (also run by `npm test`) |
| `npm run lint` | PASS — rustfmt plus Clippy with warnings denied |
| `npm test` | PASS — 42/42 Playwright checks across desktop and 390 px |
| `npm run build` | PASS — `dist/` produced |
| `cargo build --release` | PASS (run by the declared runtime test) |
| Docker production build | NOT RUN — Docker CLI is unavailable in this verifier container |

The built initial JavaScript is 31,751 B / 10.15 KB gzip and CSS is 15,437 B / 4.41 KB gzip, below the stated static budget.

## Live checks that passed before the persistence failure

- `/health` returned `{"build_sha":"1c5998b420f7a0f262eca7916dafdbd346f356a8","status":"ok"}`.
- Root headers include HSTS, `nosniff`, strict-origin referrer policy, frame denial, restrictive CSP, and permissions policy. Hashed JS is `Cache-Control: public, max-age=31536000, immutable`.
- A full demo/proof attempt that landed on a healthy backend returned only same-origin requests and no console/page errors; problem state/rating reached the workspace and the next-visit CSV header was `next_visit,client,location,extra,detail,price`.
- A clean live photo recovery flow rejected four photos with “Use up to three photos under 1 MB each.” and then created a proof containing three named photo alternatives. Blank workspace input returned actionable `400` with “Enter between 1 and 80 characters.”
- Browser axe checks found no serious or critical violations on landing, proof, or dark/reduced-motion proof. Keyboard focus had a visible solid outline. The factory `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms` for title, `lang=en`, exactly one `h1`, main landmark, image alternatives, named controls, and zero console errors.
- Live rate-limit probe: 45 same-client requests to `/api/not-found` produced **40 × 404 and 5 × 429**, each 429 with `Retry-After: 1`. Observed allowance: **40-request burst per forwarded client**. `/health` remains exempt.
- All crawled same-origin links returned 200 except the intentionally unknown `/not-a-page`, which correctly returned 404. The product is not a PWA and makes no offline-reload claim; it has no sign-in, so Entra verification is not applicable.
- Lighthouse emitted 100/100 category values (performance, accessibility, best practices, SEO), LCP 1.20 s, CLS 0, and 68,274 B transfer. The runner then reported `TARGET_CRASHED` while collecting its full-page screenshot artifact; treat the displayed score set as diagnostic evidence, not a clean Lighthouse process exit.

## Scope variance

The researched brief specifies a $59/month business subscription plus technician seats. The product consistently exposes a $59 one-time unlimited-visit license. The existing handoff plainly documents that the supplied Sociobot paid-unlock contract only supports this model. This is a disclosed product-market variance, not the reason for this verification failure.

## Retest bar

Do not rely only on `/health` or a matching SHA. After deployment repair, from fresh contexts create at least 30 demos and immediately perform authenticated workspace reads; all must return 200 and their own workspace's seeded visit. Then repeat the proof reply, extra, CSV, persistence, and rate-limit checks against the repaired live deployment.
