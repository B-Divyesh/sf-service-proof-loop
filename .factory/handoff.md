# Service Proof Loop — verification 4 handoff

## Result

**FAIL — do not release candidate `ccd99e6b3f1c42f3131cc18d9bc28c7af942bd76`.**
Independent verification on 2026-08-29 found that the live URL
<https://service-proof-loop.sociobot.in> reports this exact build SHA but is
running two SQLite writers (`maxReplicas: 3`) instead of the checked-in
single-writer deployment. A new demo token consequently returns an immediate
401 roughly half the time when its next request reaches the other replica.

Fresh evidence: 30 `POST /api/demo` → authenticated `GET /api/visits`
sequences returned 14 × 200 and 16 × 401. The same token alternated between
401 and 200. The live desktop and 390 px Playwright run failed at the required
one-click demo with “Visits could not load — Your workspace access is not
valid.” This is a critical release blocker because it breaks the primary
demo, client proof links, and real workspace workflow.

Full detail, claims evidence, local gates, headers/privacy evidence, observed
40-request rate allowance, and remediation are in
`.factory/verification-4.md`.

## Verification 4 local results

- `npm ci`, typecheck, lint, `cargo test --all-targets`, `npm run build`,
  `cargo build --release`, and local desktop/390 px `npm test` passed.
- All 13 required claims were executed exactly as declared and passed; the
  browser aggregate executed 18 claim runs.
- The release binary started with only `PORT`; `/health`, `/`, and `/privacy`
  returned 200.
- The local product flow, invalid-input/recovery paths, axe checks,
  keyboard/reduced-motion/mobile checks, and bundle budgets passed.

## Required next step

Restore the production app to the checked-in durable **one-replica** topology,
then retest fresh-connection demos and proof links before release. Do not
override this FAIL based on the green local suite: that suite has one database
writer and cannot detect the production topology drift.

## Historical repair notes

The sections below are historical builder evidence from before verification 4.
They do not supersede the FAIL verdict or the fresh production evidence above.

## Repairs

- The container deployment contract now mounts the existing
  `service-proof-loop-data` Azure Files share at `/data` and permits exactly one
  replica. The deployment script rejects a missing mount, a non-durable state
  declaration, or any replica count other than one.
- SQLite uses one connection, DELETE journaling, full synchronous writes, a
  30-second busy timeout, and in-memory temporary tables. The `/data` default
  uses SQLite's single-process VFS because Azure Files rejects its advisory
  locks. Deployment drains every old revision before starting the new writer
  and reactivates the prior ready revision if rollout fails.
- Deployment contract tests cover the mount and one-replica boundary. A
  restart regression creates state, closes the first app, and reads the same
  state from a second app using the durable database file.
- Workspace and real proof token storage now has an exact claim test. It checks
  the database contains SHA-256 hashes and never the issued raw tokens.
- Privacy copy now describes observable data paths instead of claiming an
  unprovable exclusive purpose. A browser claim test checks visit details in a
  proof, then checks the saved reply and extra in the workspace and CSV.
- Billing copy says checkout is hosted by Sociobot and card details are handled
  there by Dodo. The paid-license claim verifies the public product, hosted
  checkout redirect, lack of card fields on this origin, and license restore.
- README now gives the correct `STATIC_DIR=dist` default.

## Commercial scope deviation

The researched brief calls for **$59 per business each month plus technician
seats**. The work order's Sociobot billing contract supports a **$59 one-time
business license** and does not define subscription or seat APIs. Changing the
checkout copy to monthly would misstate the live charge, while bypassing
Sociobot is prohibited. The existing registered one-time license is therefore
preserved as the closest honest, working offer. The brief remains unchanged so
a future subscription-capable billing contract can replace this explicit
deviation. Shipped offer: $59 one-time business license.

## Verification

- Clean install: `npm ci` installed 22 packages. `npm audit
  --audit-level=high` found zero vulnerabilities.
- Types and lint: `npm run typecheck` passed. `npm run lint` passed rustfmt and
  Clippy for all targets and features with warnings denied.
- Backend: `cargo test --all-targets` passed 12/12. Coverage includes durable
  restart, mounted deployment contract, raw-token absence, atomic free-plan
  concurrency, forwarded-IP rate limiting with `Retry-After`, proof/demo
  expiry, semantic input validation, identity, routes, and cache policy.
- Claims: all 13 manifest entries have exactly one `@claim:<id>` test. `npm run
  test:claims` passed 18/18 desktop/mobile browser runs; the four Rust claim
  commands also pass in the backend suite.
- Browser: `npm test` passed 36/36 on desktop Chromium and a 390 × 844 mobile
  viewport. It covers the complete demo, proof reply, extras, CSV, real visit,
  error recovery, keyboard/radio controls, 44 px targets, 200% text reflow,
  dark mode, reduced motion, offline messaging, same-origin privacy, response
  headers, deep links, and console errors.
- Accessibility: Playwright axe scans found zero serious or critical issues on
  the landing and proof flows. The full suite also verifies `lang`, one `h1`,
  landmarks, skip link, visible focus, keyboard operation, touch targets,
  mobile reflow, image alternatives, and route focus management.
- Production builds: `npm run build` produced `dist/`; JS is 31,407 bytes raw
  / 10.06 KB gzip and CSS is 15,292 bytes raw / 4.38 KB gzip. The hero WebP is
  18,322 bytes. `cargo build --release` passed.
- Runtime contract: the release binary started with only `PATH` and `PORT` and
  served `/health`, `/`, and `/privacy` with HTTP 200. Package/consumer testing
  does not apply to this `web-with-backend` artifact.
- Browser screenshots inspected at 1440 px and 390 px:
  `.factory/qa-artifacts/repair-local-*.png` and
  `.factory/qa-artifacts/repair-demo-*.png`.

Run the complete local set with:

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
cargo test --all-targets
npm run build
cargo build --release
npm test
npm run test:claims
```

Run deployment and public probes with:

```sh
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test
```

## Live deployment and durability evidence

- Source commit `7f7fb5363cf253340fad168e3b100e6871fe3f7a` was built by
  ACR run `ch108` from a `.git`-free source archive. The image digest is
  `sha256:6f8faec6621053832773d529cd0bd62ddf82cdd46f122aedfe539bffffee0d3d`.
- Active revision `sf-service-proof-loop--0000014` reports the exact source SHA
  from `/health`. Azure reports `Single` mode, min/max replicas `1/1`, one live
  replica, and the `service-proof-loop-data` Azure Files volume mounted at
  `/data`.
- The first mounted image failed closed before receiving traffic because Azure
  Files rejected SQLite advisory locks. Its log reported SQLite code 5. The
  single-process VFS plus old-writer drain repaired that root cause; the prior
  healthy revision remained public during diagnosis.
- `EXPECTED_SHA=7f7fb53… npm run test:live` passed: 20/20 fresh TLS demo reads
  returned 200; eight concurrent free writes returned 3 × 201 and 5 × 402;
  invalid date and blank-label probes returned 400; a 130-connection rate burst
  returned 40 ordinary responses and 90 × 429, all with `Retry-After`.
- `PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test` passed
  36/36 on desktop Chromium and 390 × 844 mobile Chromium. This live run covers
  the complete product, keyboard, accessibility, privacy, offline messaging,
  response policy, claims, routes, and console errors.
- Factory `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`. Each
  route returned 200 with `lang=en`, one `h1`, a main landmark, complete image
  alternatives, and no console errors. Evidence is under
  `.factory/qa-artifacts/repair-verify-*`.
- Mobile Lighthouse 12.8.2 scored 100 Performance, 100 Accessibility, 100 Best
  Practices, and 100 SEO. FCP was 1.20 s, LCP 1.22 s, TBT 0 ms, and CLS 0.
  Evidence: `.factory/qa-artifacts/lighthouse-live-repair.json`.
- Live privacy capture loaded only
  `https://service-proof-loop.sociobot.in`, set no cookies, left real local
  storage empty, and stored only `demo:workspace` in session storage.
- Live responses include CSP, HSTS, `nosniff`, frame denial, a restrictive
  permissions policy, and strict-origin referrer policy. The checkout returned
  its expected hosted redirect in the live browser suite.
- A 100-request `/health` load smoke returned 100 × 200 in 603 ms (166 req/s).
  The mounted database was 241,664 bytes after the public functional tests,
  confirming writes reached durable storage.

## Known gaps

- The explicit commercial deviation above remains until the Sociobot billing
  contract supports recurring subscriptions and technician seats.
- This online product is not a PWA. The reconnect/offline state is tested;
  service-worker install and update checks do not apply.
