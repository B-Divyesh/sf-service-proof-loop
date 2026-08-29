# Service Proof Loop — repair 6 handoff

## Result

**PASS — deployed and verified.** Repair commit
`8b3b84ca5c2c4d1ad18a6f30b8b75d6b77e4f850` is live at
<https://service-proof-loop.sociobot.in>. `/health` returns that exact source
SHA.

## Root cause and repair

Verification 6 correctly found that the candidate image had been deployed with
the factory's generic, replica-local topology: a maximum of three replicas and
no Azure Files volume. SQLite state could therefore split between requests.
The report's direct topology evidence reproduced before this deployment:
`maxReplicas: 3`, `mounts: null`, and `volumes: null`.

The checked-in deployment contract already requires one durable writer. This
repair makes that contract operationally release-blocking:

1. `scripts/deploy-container.sh` still drains writers, mounts
   `service-proof-loop-data` at `/data`, requires one active revision and a
   one-replica ceiling, and now runs the full live state-continuity probe before
   declaring success. Its rollback trap restores the prior ready revision if a
   topology or continuity check fails.
2. `scripts/verify-live.mjs` now creates 30 fresh demos. Each token receives
   10 independent authenticated workspace reads and a proof read. Every read
   must return its own seeded Willow Street visit and the proof must resolve to
   that same visit ID.
3. `scripts/state-continuity.mjs` centralizes that contract. Its exact unit
   regression rejects the verifier's mixed `200`/`401` pattern. It is included
   in the normal `npm test` deployment gate.
4. README deployment instructions now describe the durable topology and the
   no-401 live gate.

The accepted proof, client reply, extra, CSV, privacy, and paid-license
behaviors were not changed.

## Exact regression coverage

- `tests/state-continuity.test.mjs` accepts 30 healthy repeated-read sequences
  and rejects the verifier's seventh-demo, fourth-read `401` state loss.
- `npm run test:live` checks Azure topology before product requests and fails
  if the image, mount, volume type, active revision count, or replica count
  diverges from `.factory/deployment.json`.
- The post-deploy live probe additionally checks all 30 × 10 workspace reads,
  matched proof IDs, atomic free-plan enforcement, semantic validation, and a
  130-request rate-limit burst.

## Verification

Clean local verification from this checkout:

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
cargo test --all-targets
npm test
npm run test:claims
npm run test:a11y
npm run build
cargo build --release
```

Results:

- `npm ci`: 22 packages; audit reports zero vulnerabilities.
- TypeScript, rustfmt, and Clippy with warnings denied: pass.
- Backend suite: 12/12 pass. Deployment/continuity suite: 6/6 pass.
- `npm test`: 42/42 Playwright checks across desktop Chromium and 390 × 844
  mobile; the empty-environment, default-port runtime claim passes.
- All browser claim tags and axe checks pass; the claim suite checks the demo,
  no-account proof, export, extras, paid-license registry/checkout, plan
  behavior, photo consent, privacy flow, rate limit, and no-tracking behavior.
- Production build: JavaScript 31,751 B (10.15 KB gzip), CSS 15,437 B
  (4.41 KB gzip). `dist/` includes the dedicated 404 shell.
- Docker CLI is not installed in this worker, but Azure Container Registry
  completed the exact multi-stage Docker build successfully from this commit.
- Local factory URL verification passed `/`, `/demo`, `/privacy`, and `/terms`:
  each has a title, `lang=en`, one `h1`, a main landmark, complete image
  alternatives, named controls, and no console errors. Evidence is under
  `.factory/qa-artifacts/repair6-verify-*`.

Live verification after deployment:

- Azure revision `sf-service-proof-loop--0000024` is the only active, healthy
  revision and has exactly one replica. It uses image
  `sociobotregistry.azurecr.io/sf-service-proof-loop:8b3b84ca5c2c`, has
  `minReplicas: 1` and `maxReplicas: 1`, and mounts Azure Files storage
  `service-proof-loop-data` at `/data`.
- `EXPECTED_SHA=8b3b84ca5c2c4d1ad18a6f30b8b75d6b77e4f850 npm run test:live`
  passed: 30 demo creations, 300 repeated authenticated reads, and 30 proof
  reads all returned 200 with their original Willow Street visit IDs. The same
  run returned 3 × 201 and 5 × 402 for eight concurrent free-plan writes,
  rejected invalid date and checklist input with 400, and returned 40 allowed
  plus 90 `429 Retry-After` responses in the 130-request rate burst.
- The pinned local Playwright 1.58.2 suite passed against the live URL on both
  desktop and 390 px mobile, including keyboard focus, dark mode, 200% reflow,
  same-origin privacy, offline messaging, response policy, direct routes, and
  axe scans.
- Live factory URL verification passed `/`, `/demo`, `/privacy`, and `/terms`
  with zero console errors. Evidence is in
  `.factory/qa-artifacts/repair6-live-*`.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.2 s, LCP 1.4 s, TBT 60 ms, CLS 0, total
  transfer 67 KiB. Raw evidence:
  `.factory/qa-artifacts/lighthouse-live-repair6.json`.

## Privacy, offline, and response policy

- Demo data stays in its `sessionStorage['demo:workspace']` namespace; normal
  workspace storage is not read or written during demo use.
- Browser request recording confirms landing and demo flows make only
  same-origin product requests. There are no analytics, third-party scripts,
  third-party fonts, or product cookies.
- This is an online backend service. It deliberately has no service worker or
  offline-reload claim; its tested offline state tells the user to reconnect
  before loading or saving proof.
- Live CSP, HSTS, `nosniff`, frame denial, strict-origin referrer policy,
  permissions policy, and immutable caching for hashed JS/CSS are present.

## Deploy and retest

```sh
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in ./node_modules/.bin/playwright test
```

## Known gaps

The researched brief calls for $59/month plus technician seats. The supplied
Sociobot paid-unlock contract supports a $59 one-time business license, not
subscription or seat billing. The product continues to disclose that variance
plainly and does not simulate unsupported billing. No offline-update path is
applicable because this online service makes no offline-use claim.
