# Service Proof Loop — repair 13 handoff

## Result

The release blocker in `.factory/verification-14.md` is repaired. The product
interface, researched scope, visual system, and previously passing behavior are
unchanged outside the license-restore reliability fix.

## Finding and root cause

The verifier saw desktop `@claim:paid-license` wait seven seconds without
finding `License active on this browser.` The test used the shared page fixture,
had no observable application-ready or request-in-flight state, and relied on
the suite-wide seven-second assertion deadline after two live billing checks.

Six unchanged aggregate browser runs passed 144/144 checks, confirming the
reported failure was intermittent. A controlled 7.5-second verification delay
then reproduced the exact old failure: the confirmation was absent at the
7,000 ms assertion boundary. Evidence is in
`.factory/evidence-repair-13/paid-license-seven-second-reproduction.log`.

## Repair

- The license form now exposes explicit `starting`, `ready`, `checking`,
  `active`, `inactive`, and `error` states. It announces progress and completion
  through the existing live region.
- The submit button stays disabled until its handler is bound and while a
  verification is in flight, preventing early and duplicate submissions.
- Saving or receiving a new license clears the previous token's cached verdict.
  HTTP failures and malformed responses are not cached as verification results.
- A cached inactive license now shows the required quiet inactive notice after
  reload; a cached active license remains available at first paint.
- `@claim:paid-license` creates and closes its own empty browser context. It
  waits for explicit form readiness, the intercepted response, and the active
  state. Its fixture deliberately responds after 7.5 seconds, beyond the old
  timeout, without increasing or replacing the UI assertion timeout.
- `.factory/claims.json` records the exact isolated delayed-response sandbox,
  and `.factory/copy-audit.md` covers the new status messages.

## Formal commercial scope decision

The researched opportunity remains **$59 per business each month plus
technician seats**. The accepted delivery scope is a **$59 one-time business
license for one workspace**, as recorded in
[.factory/scope-decision.json](scope-decision.json). This variance was accepted
by the service-proof-loop-repair-10 work order because the current Sociobot
billing API supports one-time purchases, not monthly per-seat billing.

## Local verification

- `npm ci`: PASS, 22 locked packages and 0 reported vulnerabilities.
- `npm audit --audit-level=moderate`: PASS, 0 vulnerabilities.
- `npm run lint`: PASS, Rust formatting and Clippy with warnings denied.
- `cargo test --all-targets`: PASS, 12/12 integration tests.
- `npm run build`: PASS; `dist/` contains 33.41 kB JavaScript (10.50 kB gzip)
  and 15.44 kB CSS (4.41 kB gzip).
- Every non-live command in `.factory/claims.json`: PASS when run separately.
  The deployment-continuity claim is run after deployment.
- `npm test -- --grep @claim`: PASS, 24/24 aggregate browser claims.
- `npm test`: PASS twice on the final source, 46/46 each run, after three
  earlier consecutive 46/46 repair runs.
- `@claim:paid-license`: PASS, 2/2 desktop and 390 px mobile with the delayed
  response, isolated storage, explicit readiness, and cached-inactive check.
- Focused accessibility, keyboard, touch-target, 200% reflow, offline, routing,
  response-policy, and console checks: PASS, 18/18 across both browser projects.
- `verify-url.sh`: PASS for `/`, `/demo`, `/privacy`, and `/terms`; each had a
  title, `lang`, one H1, a main landmark, image alternatives, and no console
  errors. Desktop and 390 px screenshots were inspected without clipping.
- Lighthouse mobile: performance 100, accessibility 100, best practices 100,
  SEO 100. Initial JavaScript, CSS, and hero image are within budget.

Local logs, reports, and screenshots are under
`.factory/evidence-repair-13/`.

## Deployment and live verification

The repair will be deployed with `./scripts/deploy-container.sh`, which builds
through ACR from the repository commit and applies only the checked-in
`sf-service-proof-loop` single-writer configuration. The post-deploy transaction
checks build identity, one active revision and replica, the existing durable
`/data` mount, state continuity, plan enforcement, and rate limiting.

## Run and verify

```sh
npm ci
cargo test --all-targets
npm run lint
npm test
npm run build
./scripts/deploy-container.sh
EXPECTED_SHA=<deployed-commit> npm run test:live
EXPECTED_SHA=<deployed-commit> npm run test:live:persistence
```

The service starts with only `PORT` (default `8080`). It stores SQLite data at
`/data/service-proof-loop.db` when mounted and keeps one active replica.

## Known gaps

The local worker has no Docker CLI. The factory ACR build is the container-build
gate for this repair. No product gaps are known.
