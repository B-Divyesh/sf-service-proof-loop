# Service Proof Loop — repair 8 handoff

## Result

**PASS — verifier 8's release blockers are repaired, tested, and deployed.**
The product remains a Rust/axum and SQLite backend serving the existing Vite
frontend from one container. The researched brief, visual system, demo, proof
flow, and previously passing behavior were preserved.

## Findings reproduced

On 2026-08-29, before the repair deployment:

- `EXPECTED_SHA=6fde7c3f605a34058d7eb13d5fe96a6feeb9d311 npm run
  test:live` failed with “maximum replica count drifted from the deployment
  contract.”
- Azure reported image `sf-service-proof-loop:6fde7c3f605a`,
  `maxReplicas: 3`, no container volume mount, and no template volume.
- The writable `service-proof-loop-data` Azure Files share already existed;
  it was not attached to the app.
- These facts reproduce the report's root cause: requests could reach separate
  replica-local SQLite databases and separate in-memory rate limiters.

Independent verification 8 measured the resulting failures as 266 of 400
authenticated reads returning 401, only 3 of 20 proofs resolving, 45 of 45
requests passing the small burst, and 120 of 130 passing the large burst.

## Root-cause repair and regression coverage

- The checked-in `./scripts/deploy-container.sh` was used instead of the generic
  container deployment path. It drains every old writer, mounts Azure Files at
  `/data`, applies `minReplicas: 1` and `maxReplicas: 1`, and permits exactly one
  active revision and replica before running live behavior checks.
- `scripts/rate-limit.mjs` contains the shared assertion used by live
  verification. It rejects more than 42 allowed requests, too few 429s, an
  unexpected status, or any 429 without `Retry-After: 1`.
- `tests/rate-limit.test.mjs` reproduces and rejects verifier 8's exact 45/45
  and 120/130 allowed results. It also proves valid 40/5 behavior and the
  `Retry-After` requirement.
- `tests/state-continuity.test.mjs` now reproduces verifier 8's exact 134
  successful and 266 unauthorized reads. It rejects that split-state result
  and retains the positive 20-demo, 400-simultaneous-read test.
- The real 404 document now includes Open Graph and Twitter card metadata.
  Playwright asserts the status, title, card type, and product social image in
  the raw HTTP 404 response.

## Clean local verification

Run from a clean dependency installation:

```sh
npm ci
npm run test:all
npm run lint
npm run test:claims
npm run test:a11y
npm run build
```

Results on 2026-08-29:

- `npm ci`: 22 packages installed; zero audit vulnerabilities.
- `npm run test:all`: 12/12 Rust integration tests, 12/12 deployment and
  regression tests, the empty-environment runtime test, and 42/42 Playwright
  checks passed.
- `npm run lint`: rustfmt and Clippy with warnings denied passed.
- `npm run test:claims`: 22/22 desktop and 390 px browser claim checks passed.
  The five Rust claims and zero-configuration runtime claim also passed in
  `npm run test:all`.
- `npm run test:a11y`: 4/4 axe, dark treatment, keyboard, focus, touch-target,
  and 200% text checks passed with no serious or critical findings.
- `npm run build`: `dist/` contains 31,751 B JavaScript (10.15 KB gzip) and
  15,437 B CSS (4.41 KB gzip).
- Factory URL verification passed `/`, `/demo`, `/privacy`, and `/terms` at
  desktop and 390 × 844 with route titles, `lang=en`, one `h1`, a main
  landmark, complete image alternatives, named controls, and no console
  errors. Evidence is in `.factory/qa-artifacts/repair8-local-*`.

## Container and deployed evidence

Azure Container Registry built the multi-stage Dockerfile from repair commit
`6c636ed8846f7964c275093dcc27ee8d718c9a1d`. The image digest is
`sha256:b819785c4aa1bc3183d7c6b4ff445905aa89a4bc993a95f6ee2bd5e9e86379f1`.
The runtime remains non-root and listens on `PORT`, defaulting to 8080.

The configured deployment produced revision
`sf-service-proof-loop--0000029` with:

- one active revision and one live replica;
- `minReplicas: 1` and `maxReplicas: 1`;
- Azure Files storage `service-proof-loop-data` mounted at `/data`;
- image `sociobotregistry.azurecr.io/sf-service-proof-loop:6c636ed8846f`;
- `/health` build SHA
  `6c636ed8846f7964c275093dcc27ee8d718c9a1d`.

The deployment transaction and a separate post-deploy `npm run test:live`
both passed:

- 20/20 demos created;
- 400/400 simultaneous authenticated workspace reads returned their seeded
  visit;
- 20/20 proofs resolved to the matching visit;
- eight simultaneous free-plan writes returned exactly 3 × 201 and 5 × 402;
- past dates and blank checklist labels returned 400;
- the 45-request burst allowed 40 and limited 5;
- the 130-request burst allowed 40 and limited 90;
- every limited response included `Retry-After: 1`.

The complete pinned Playwright suite passed 42/42 against production on
desktop Chromium and the 390 × 844 mobile project. It covers the one-click
demo, real request boundaries, proof and next-visit flow, photos,
problem/rating replies, configurable extras, paid-license fixture, CSV export,
keyboard use, mobile layout, 200% text reflow, privacy requests, offline state,
response headers, routing, 404 metadata, and console errors.

Factory live URL verification passed `/`, `/demo`, `/privacy`, and `/terms`
with no console errors. Evidence is in `.factory/qa-artifacts/repair8-live-*`.
Local and live SHA-256 hashes matched for every JS, CSS, hero, sample, and
social asset. Root and API responses include CSP, HSTS, `nosniff`, frame
denial, strict-origin referrer policy, and a restrictive permissions policy.

Lighthouse 12.8.2 mobile evidence is in
`.factory/qa-artifacts/lighthouse-live-repair8.json`:

- Performance 100, Accessibility 100, Best Practices 100, SEO 100;
- FCP 1.20 s, LCP 1.35 s, TBT 0 ms, CLS 0;
- total transfer 67,899 B.

After this handoff commit is pushed, the same checked-in deployment command is
run again so the live `/health` identity is the final repository commit. That
command repeats the topology, 400-read continuity, proof, validation,
concurrency, and rate-limit gates before it returns success.

## Accessibility, privacy, offline, and identity

- Pages retain route-specific titles, semantic landmarks, one `h1`, labels,
  image alternatives, visible focus, 44 px targets, keyboard operation,
  reduced-motion behavior, dark-mode contrast, and 200% text reflow.
- Landing and demo traffic remain same-origin. The app sets no cookies and
  loads no analytics, third-party scripts, or third-party fonts. Demo access
  remains isolated in `sessionStorage['demo:workspace']`.
- This online backend does not claim offline operation or install an update
  worker. Its tested offline state tells users to reconnect before loading or
  saving proof.
- The product has no sign-in, so Entra live identity is not applicable. It is
  not a library or CLI, so package-consumer verification is not applicable.

## Deploy and verify

```sh
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Do not use the generic fleet container deployment path. It replaces this
stateful template with three replica-local filesystems. Every future release
must use the `deploy_command` in `.factory/deployment.json`.

## Commercial scope deviation

The researched brief specifies **$59 per business each month plus technician
seats**. The product retains its tested **$59 one-time business license**
because the supplied Sociobot paid-unlock contract supports one-time licenses,
not recurring seat billing. Changing the copy to a subscription while the
registered checkout sells a one-time license would be false. The variance is
kept explicit and the researched brief is unchanged.

## Known gaps and next steps

No release-blocking defect from verification 8 remains. The commercial model
above is the known scope variance. Moving beyond one replica requires migrating
both SQLite data and rate-limit state to shared services; until then the
durable single-writer deployment is mandatory.
