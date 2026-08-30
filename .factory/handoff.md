# Service Proof Loop — repair 12 handoff

## Result

**PASS — repaired, deployed, and verified.** Production runs one durable SQLite
writer with `deploy.data_dir=/data`. The live build identity matches the final
repository HEAD.

## Finding reproduced first

Before any repair, the required SHA-pinned command was run against candidate
`0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80`:

```sh
EXPECTED_SHA=0e02b1e9c27c7f171545bc4c6549dc9d8b2d9e80 npm run test:live
```

It failed before functional probes with “maximum replica count drifted from
the deployment contract.” The scoped `sf-service-proof-loop` evidence matched
verification 12 exactly: image `0e02b1e9c27c`, revision `0000039`, min/max
replicas `1/3`, three live replicas, and null mounts and volumes.

This split SQLite state and the in-memory limiter. The verifier observed only
136/400 authenticated reads, 6/20 proof reads, 3 × `201` plus 5 × `401`
concurrent writes, and a 120-request allowance.

## Root-cause repair and regression coverage

- `.factory/deployment.json` now states `data_dir: /data` in addition to the
  `/data` storage mount and 1/1 replica contract.
- `scripts/deploy-container.sh` refuses any data directory other than `/data`,
  drains old writers, applies the mount and one-replica ceiling atomically,
  and verifies topology and behavior before completing.
- The topology update no longer reads shared environment-storage
  configuration. It patches only the `sf-service-proof-loop` app while
  referring to the pre-provisioned storage alias from the work order.
- `tests/fixtures/deployment-topology-verifier-12.json` records the exact failed
  image, revision, scale, mount, volume, and replica count.
- Deployment, continuity, plan-limit, and rate-limit tests reject the exact
  verifier-12 results. The focused deployment suite passes 26/26.
- `npm run test:live:persistence` creates isolated sample state, restarts only
  the active `sf-service-proof-loop` revision, waits for its replacement
  replica, and proves the workspace, visit, and proof remain readable.

## Live deployment evidence

The work-order deployment uses `deploy.data_dir=/data`. At handoff, the
SHA-pinned topology check reports:

```text
active revisions:  1
live replicas:     1
min/max replicas:  1/1
mount path:        /data
storage type:      AzureFile
storage alias:     service-proof-loop-data
build identity:    exact final HEAD
```

The sustained live verifier passes 20/20 demo creates, 400/400 authenticated
workspace reads, 20/20 matching proof reads, exactly 3 × `201` and 5 × `402`
concurrent free-plan writes, semantic validation, and both rate bursts. The
45-request burst permits 40 and limits 5; the 130-request burst permits 40 and
limits 90. Every `429` includes `Retry-After: 1`.

The live restart check observes one replacement replica and then reads the
same persisted workspace, visit, and proof. A second topology check still
reports one active revision, one live replica, and `/data` Azure Files.

After sustained load and restart, the live Playwright suite passes 42/42 on
desktop and 390 px mobile. It covers the real and demo flows, keyboard focus,
touch targets, 200% reflow, dark mode, axe WCAG A/AA scans, same-origin privacy,
offline messaging, response headers, route status, and console errors.

## Clean local verification

All 16 exact commands from `.factory/claims.json` pass independently. The
complete clean run also passes:

```sh
npm ci
npm run test:all
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

This covers 12 Rust integration tests, 26 deployment/runtime Node tests, 42
browser tests across desktop and 390 px mobile, Rustfmt, Clippy with warnings
denied, TypeScript, the production build, and an audit with 0 vulnerabilities.
The Rust suite includes restart persistence. `/opt/fleet/lib/verify-url.sh`
passes `/`, `/demo`, `/privacy`, and `/terms` with one `h1`, `lang=en`, a main
landmark, complete image alternatives, labelled buttons, and no console errors.

The build produces `dist/`. Initial JavaScript is 31.75 kB raw / 10.15 kB gzip;
CSS is 15.44 kB raw / 4.41 kB gzip. There is no package/consumer surface. No
Docker-compatible engine is installed locally; the SHA-tagged ACR build and
live health check prove the production container builds and starts.

## Run and verify

```sh
npm ci
npm run test:all
npm run lint
npm run typecheck
npm run build
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live:persistence
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Keep `deploy.data_dir=/data`, one active revision, and exactly one replica. Do
not increase replicas unless SQLite and rate-limit state move to shared
services.

## Formal commercial scope decision

The researched opportunity remains `$59 per business each month plus technician
seats` in `.factory/brief.json`. The accepted delivery is a `$59 one-time
business license for one workspace`, recorded in
`.factory/scope-decision.json`. This variance was explicitly accepted for the
Sociobot paid-unlock contract and is unrelated to this repair.

## Known gaps

There are no release-blocking gaps. The product intentionally makes no
offline-reload claim and ships no service worker; its tested offline behavior
is a clear recovery state. It has no runtime AI feature because the core job
does not need one.
