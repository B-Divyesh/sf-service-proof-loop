# Service Proof Loop — repair 14 handoff

## Result

**PASS.** The release blocker from independent verification 15 is repaired.
The implementation repair is commit `04de0ff89b383c8d581b106e5803a7a7f9b1fe8b`.
It was pushed to `main` and deployed first as revision
`sf-service-proof-loop--0000048` with image
`sociobotregistry.azurecr.io/sf-service-proof-loop:04de0ff89b38`.

The repository keeps the original `web-with-backend` artifact and container
deployment class. The final deployment transaction is rerun from the commit
containing this handoff, so `/health` must equal `git rev-parse HEAD` before the
work order closes.

## Verifier failure reproduced first

The exact verifier scenario was added before the service changed:

```sh
cargo test --test api claim_one_valid_license_applies_to_only_one_business_workspace -- --exact --nocapture
```

One recorded valid-license response was used with two fresh business
workspaces. Each workspace accepted three free visits. The first licensed
fourth visit returned 201. The second workspace incorrectly returned 201 too;
the regression expected 402 and failed with `left: 201, right: 402`.

Evidence: `.factory/evidence-repair-14/paid-multi-workspace-reproduction.log`.

## Root cause and repair

The backend verified a supplied license for every over-limit request but did
not record which workspace first used it. Any workspace presenting the same
valid token could therefore pass the three-visit boundary.

Repair details:

- migration `0002_license_bindings.sql` adds one durable binding per license;
- only the SHA-256 license hash is stored, never the raw token;
- a valid license is atomically claimed by its first paid workspace;
- later paid visits in that workspace continue to return 201;
- the same license in another workspace returns 402 with a specific correction;
- simultaneous claims from two workspaces produce exactly one 201 and one 402;
- the landing page, workspace notice, terms, privacy page, README, copy audit,
  and claims registry now state `$59 once for one business workspace`;
- all “unlimited” wording was removed rather than making an unbounded claim;
- every one of the 19 registered claims now has exactly one tagged regression.

## Formal commercial scope decision

The accepted commercial variance remains unchanged: the researched brief says
`$59 per business each month plus technician seats`, while
`.factory/scope-decision.json` accepts a **$59 one-time business license for one
workspace** for this delivery.

## Exact regression coverage

`claim_one_valid_license_applies_to_only_one_business_workspace` asserts all of
the following with a recorded valid verifier response:

- two workspaces each receive exactly three free visits;
- workspace one receives a paid fourth visit;
- workspace two receives 402 for the same license;
- four more paid visits succeed in the recorded workspace;
- the raw license is absent from SQLite and its SHA-256 value is present;
- two simultaneous workspaces racing for a fresh license yield one 201, one
  402, and one database binding.

The existing free-plan regression still sends eight simultaneous writes and
requires exactly three 201 responses and five 402 responses. The pricing-copy
regression rejects `unlimited` in current frontend and README source, requires
the one-workspace wording, and requires each claim ID to have one tagged test.

Evidence:

- `.factory/evidence-repair-14/paid-multi-workspace-regression.log`
- `.factory/evidence-repair-14/cargo-test.log`
- `.factory/evidence-repair-14/npm-test.log`

## Local verification

Run from a clean dependency install on 2026-09-01 UTC:

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages; 0 vulnerabilities |
| `cargo test --all-targets` | PASS — 13/13 integration tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — formatting and Clippy with warnings denied |
| `npm run test:deployment` | PASS — 28/28 |
| `npm run test:runtime` | PASS — release build and empty-environment port 8080 startup |
| `npm test` | PASS — 46/46 across desktop Chromium and 390 px mobile |
| `npm run test:a11y` | PASS — 4/4 desktop/mobile Axe and interaction checks |
| every local command in `.factory/claims.json` | PASS — 18/18; live claim checked after deployment |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities |
| `npm run build` | PASS — `dist/` produced |

Production output is 33.63 kB JavaScript (10.57 kB gzip), 15.44 kB CSS
(4.41 kB gzip), and an 18.32 kB hero image. The local mobile Lighthouse run
scored performance 100, accessibility 100, best practices 100, and SEO 100.
It measured FCP 1.1 s, LCP 1.3 s, 10 ms total blocking time, CLS 0, and 70 KiB
transferred.

`verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`. Each route had a
route-specific title, `lang="en"`, one H1, a main landmark, image alternatives,
and no console or page errors. Screenshots at desktop and 390 px were inspected
without clipping or horizontal overflow.

The browser suite covers keyboard-only proof replies, visible focus, arrow-key
ratings, 44 px touch targets, 200% text reflow, reduced motion, dark treatment,
offline recovery copy, the designed 404, same-origin demo traffic, no tracking,
private/no-store proof policy, CSP, and no console errors. This is not a PWA,
library, or CLI, so service-worker update and package-consumer checks do not
apply.

## Deployment and live verification

The factory deployment script built the scoped image, drained the old SQLite
writer, preserved the existing `sf-service-proof-loop-data` Azure Files mount
at `/data`, and returned to one active revision and one replica.

The deployed repair was checked with:

```sh
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
EXPECTED_SHA=<deployed-commit> npm run test:live
EXPECTED_SHA=<deployed-commit> npm run test:live:persistence
```

Observed results for the implementation deployment:

- live Playwright: 46/46 across desktop and 390 px mobile;
- health: `status: ok` and build SHA
  `04de0ff89b383c8d581b106e5803a7a7f9b1fe8b`;
- topology: one active revision, one replica, min/max 1, durable `/data` mount;
- continuity: 20 demos, 400/400 simultaneous workspace reads, 20/20 proofs;
- free limit: eight simultaneous writes produced exactly three 201 and five
  402 responses;
- rate limits: 45 requests produced 40 allowed and 5 limited; 130 requests
  produced 40 allowed and 90 limited, with `Retry-After` on every 429;
- semantic validation: past dates and blank checklist labels both returned 400;
- replica restart: workspace, visit, and proof all persisted, and the service
  returned to one replica;
- response policy: CSP with `frame-ancestors 'none'`, HSTS, nosniff, frame
  denial, strict-origin referrer policy, and denied camera/microphone/location;
- `verify-url.sh`: PASS on landing, demo, privacy, and terms with no browser
  errors;
- live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; FCP 1.2 s, LCP 1.2 s, 10 ms blocking time, CLS 0, 68 KiB.

The public Sociobot registry and $59 checkout redirect were verified without
making a purchase. No production license token was read or used. Valid-license
multi-workspace behavior is covered deterministically by the recorded local
verifier fixture, as required by the claims sandbox.

## Evidence and commands

Evidence is under `.factory/evidence-repair-14/`, including the failing
reproduction, passing regression, full local and live test logs, response
headers, route verification reports and screenshots, Lighthouse JSON, topology,
continuity, and persistence output.

To recheck:

```sh
npm ci
npm run test:all
npm run lint
npm audit --audit-level=moderate
npm run build
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live:persistence
```

## Known gaps and next steps

No release-blocking gaps remain. A real paid token was intentionally not used
in automated verification. The public registry, price, and hosted checkout are
live-tested; valid and invalid verdict behavior, hashing, sequential reuse,
cross-workspace rejection, and concurrent claims use deterministic fixtures.

The product has no essential AI step in its proof-to-next-visit job. No AI
feature was added. The product still excludes dispatch, payments, payroll,
public-review campaigns, and worker tracking as required by the brief.
