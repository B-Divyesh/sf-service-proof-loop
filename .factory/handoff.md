# Service Proof Loop — repair 4 handoff

## Result

Every release blocker in independent report commit
`f1ee5b0baed6f4257fc0dd1f38e57eb21ded9670` is repaired. The live service is
back on the checked-in durable single-writer topology, and the exact demo,
workspace, and proof sequence that intermittently returned 401 now passes on
30 fresh workspaces.

## Root cause and repair

The product deployment command already requested one mounted SQLite writer.
After that command ran, the factory's generic container deployment replaced the
template with `min=1`, `max=3`, no volumes, and no `/data` mount. Azure could
then route related requests to independent ephemeral databases.

- `.factory/deployment.json` now names `./scripts/deploy-container.sh` as the
  work-order deployment command.
- `scripts/verify-deployment.mjs` compares live Azure state with the checked-in
  contract. It requires one active revision, one total writer, min/max `1/1`,
  the expected image SHA, and the `service-proof-loop-data` Azure Files volume
  mounted at `/data`.
- `npm run test:live` runs that topology check before HTTP checks. A healthy
  endpoint can no longer hide an unsafe deployment.
- The deployment command drains old writers before creating a revision. After
  cutover, it deactivates stale revisions and waits for all stale replicas to
  stop. Its rollback path also deactivates the failed new revision before it
  reactivates the previous ready revision.
- The live probe now runs 30 independent `POST /api/demo` → authenticated
  `GET /api/visits` → `GET /api/proof/:token` sequences using fresh
  connections and clients.
- Fixture regressions reproduce the verifier's exact `max=3`, two-replica,
  missing-volume snapshot. Separate tests reject a missing mount and a second
  active revision even when the template says `max=1`.

No product copy, user flow, researched brief, visual system, storage format, or
previously passing behavior changed.

## Local verification

- `npm ci`: 22 packages installed; `npm audit --audit-level=high`: zero
  vulnerabilities.
- `npm run typecheck`: passed.
- `npm run lint`: rustfmt and Clippy passed with warnings denied.
- `cargo test --all-targets`: 12/12 passed. This includes durable restart,
  token hashing, proof/demo expiry, atomic plan limits, semantic validation,
  forwarded-IP limiting, response policy, and deployment-contract coverage.
- `npm run test:deployment`: 4/4 passed, including the exact verification-4
  topology fixture.
- `npm run build`: passed. Output is 31,407 B JS (10.06 KB gzip), 15,292 B CSS
  (4.38 KB gzip), and an 18,322 B hero image.
- `cargo build --release`: passed.
- `npm test`: 36/36 Chromium tests passed across desktop and 390 × 844 mobile.
- `npm run test:claims`: 18/18 browser claim executions passed. The four Rust
  claim commands are included in the backend suite, so all 13 manifest claims
  passed exactly as declared.
- `npm run test:a11y`: 4/4 passed. Axe found no serious or critical issue on
  landing or proof in light/dark treatments. Keyboard radio operation, visible
  focus, 44 px targets, reduced motion, and 200% reflow also passed.
- The release binary started with an otherwise empty environment and only
  `PORT=4181`; `/health`, `/`, and `/privacy` returned 200.
- Desktop and 390 px demo screenshots were inspected after waiting for sample
  data. The workbench layout, controls, and content reflow correctly.
- A local Docker daemon was not installed. ACR run `ch11a` built the same
  multi-stage Dockerfile from a `.git`-free upload and pushed digest
  `sha256:f7cefeb1a517bd16abeb91b475ea6504471d32a5bc1d56d6dfb864f86427081b`.
  This is the applicable package/container build proof. Package consumer tests
  do not apply to this web-with-backend artifact.

## Live verification

- Before repair, the new topology check reproduced `min=1`, `max=3`, no
  volumes, and no mount on revision `sf-service-proof-loop--0000016`.
- Repair build `505dee5623a0478170a46530db623a9a1c59503e` was built by ACR and
  served from mounted revision `sf-service-proof-loop--0000017` for the full
  public functional run.
- Azure then reported `Single` mode, min/max `1/1`, one active revision, one
  live replica, and `service-proof-loop-data` mounted at `/data` as
  `AzureFile`.
- `EXPECTED_SHA=505dee5… npm run test:live` passed. All 30 fresh demo,
  workspace, and proof sequences returned `200/200/200`. Eight simultaneous
  free-plan writes returned exactly 3 × 201 and 5 × 402. Invalid past dates and
  blank checklist labels returned 400. A 130-request burst returned 40 normal
  responses and 90 × 429; every 429 included `Retry-After`.
- `PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test` passed
  36/36 on desktop and 390 px mobile. This covers the one-click demo, proof
  reply, extras, CSV, real visit creation, keyboard, accessibility, privacy,
  offline recovery copy, response headers, routes, claims, and console errors.
- Factory `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`: each
  returned 200 with `lang=en`, one `h1`, a main landmark, complete image
  alternatives, named buttons, and no console errors.
- Lighthouse 12.8.2 scored 100 Performance, 100 Accessibility, 100 Best
  Practices, and 100 SEO. FCP was 1.21 s, LCP 1.28 s, TBT 0 ms, and CLS 0.
- Live browser request capture remained same-origin, set no cookies, and loaded
  no analytics, third-party scripts, or third-party fonts. Demo state remains
  in `sessionStorage`; real local storage remained empty.
- The final committed source is redeployed with the same checked-in command.
  Final acceptance requires `EXPECTED_SHA=$(git rev-parse HEAD) npm run
  test:live`, which checks build identity and Azure topology before the 30
  public sequences.

## Run and verify

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
npm run test:a11y
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test
```

## Known gaps

### Commercial scope deviation

- The researched brief calls for `$59 per business each month plus technician
  seats`. The supplied Sociobot paid-unlock contract supports a `$59 one-time
  business license` and has no subscription or seat API. The shipped offer
  remains the closest honest implementation until that billing contract grows.

### Offline scope

- This online product is not a PWA. It provides and tests a reconnect message;
  service-worker install, update, and offline reload do not apply.
