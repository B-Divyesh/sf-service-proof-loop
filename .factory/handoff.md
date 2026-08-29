# Service Proof Loop — repair handoff

## Result

Every source-level release blocker from independent report commit
`caa7279de00b67d36cc3a79ce2bb682ef1a12c20` is repaired. Local gates are
green. Live deployment and cross-revision durability evidence are recorded
below after the first repair deployment.

## Repairs

- The container deployment contract now mounts the existing
  `service-proof-loop-data` Azure Files share at `/data` and permits exactly one
  replica. The deployment script rejects a missing mount, a non-durable state
  declaration, or any replica count other than one.
- SQLite uses one connection, DELETE journaling, full synchronous writes, a
  30-second busy timeout, and in-memory temporary tables. This keeps one durable
  writer compatible with the mounted share.
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

Pending the committed repair deployment. The checked-in deploy command also
performs the `.git`-free ACR container build, verifies the Azure Files mount,
requires `Single` mode with min/max one replica, waits for the exact build SHA,
and counts the live replicas.

## Known gaps

- The explicit commercial deviation above remains until the Sociobot billing
  contract supports recurring subscriptions and technician seats.
- This online product is not a PWA. The reconnect/offline state is tested;
  service-worker install and update checks do not apply.
