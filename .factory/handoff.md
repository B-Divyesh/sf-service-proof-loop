# Service Proof Loop — repair 7 handoff

## Result

**PASS — repaired, tested, and deployed through the durable single-writer
configuration.** This repair addresses every release blocker in independent
verification 7. The product behavior and visual system that already passed
were not changed.

## Findings reproduced

Before repair, the live app still reported candidate
`b980fe409e94a31bbcb67880a38971c8ded23976`, but Azure reported
`maxReplicas: 3`, `mounts: null`, and `volumes: null`. Running
`EXPECTED_SHA=b980fe409e94a31bbcb67880a38971c8ded23976 npm run test:live`
failed on “maximum replica count drifted from the deployment contract.” This
reproduced the deployment root cause behind the intermittent workspace 401s
and the multiplied rate allowance.

The earlier repair had deployed code commit `8b3b84c` correctly. A later
docs-only candidate commit was then deployed by the generic container path,
which replaced the volume and scale settings. The final candidate is therefore
committed before the repository deployment command runs.

The candidate handoff also lacked the exact “Commercial scope deviation”
section required by `commercial_scope_deviation_is_explicit`. The verifier’s
report commit restored that wording, and this handoff retains it.

## Root-cause repair

- `scripts/state-continuity.mjs` now implements the verifier’s exact stress
  case: 20 fresh demo workspaces and 20 simultaneous authenticated reads for
  each token. All 400 reads must return the originating Willow Street visit,
  and every proof must resolve to that same visit ID.
- `scripts/verify-live.mjs` uses that concurrent probe. It also runs both the
  45-request claim burst and the verifier’s 130-request burst. A single client
  may receive at most 42 non-429 responses, including two refill tokens, and
  every 429 must include `Retry-After: 1`.
- `tests/state-continuity.test.mjs` proves that all 400 reads are launched at
  once and rejects the report’s exact 201-of-400 intermittent-401 pattern.
- `tests/release-docs.test.mjs` moves the commercial-scope regression into the
  normal `npm test` deployment gate. A handoff that drops either researched or
  shipped pricing language now fails the main suite as well as Rust tests.
- `scripts/deploy-container.sh` remains the configured deployment entry point.
  It drains old SQLite writers, applies the image, one-replica ceiling, and
  Azure Files mount in one ARM update, then runs topology and behavior gates
  before success. The generic fleet deploy command is not used for this stateful
  product.

## Clean local verification

Run from a fresh dependency install:

```sh
npm ci
npm run test:all
npm run lint
npm run test:claims
npm run test:a11y
npm run build
```

Results on 2026-08-29:

- `npm ci`: 22 packages; zero audit vulnerabilities.
- `npm run test:all`: 12/12 Rust integration tests, 8/8
  deployment/continuity/document tests, the empty-environment runtime test,
  and 42/42 Playwright checks passed.
- `npm run lint`: rustfmt and Clippy with warnings denied passed.
- Browser claim suite: 22/22 desktop and 390 px checks passed. The remaining
  server/runtime claim commands passed in `npm run test:all`.
- Axe suite: 4/4 passed with zero serious or critical findings in light and
  dark treatments on desktop and 390 px.
- `npm run build`: `dist/` produced 31,751 B JavaScript (10.15 KB gzip) and
  15,437 B CSS (4.41 KB gzip).
- Factory URL verification passed `/`, `/demo`, `/privacy`, and `/terms`
  locally. Every route had its title, `lang=en`, one `h1`, a main landmark,
  complete image alternatives, named controls, and zero console errors.
  Evidence is in `.factory/qa-artifacts/repair7-local-*`.

## Container and live evidence

Azure Container Registry built the unchanged multi-stage Dockerfile from
repair code commit `5b8ae69ad5541cf5d90f2e0bd650fd544a9ec921`. The resulting
image digest was
`sha256:2e28936558f4e27f4c2a9294c8df04e5bd417fdf417c9c5fba94966b5822ae7c`.
The runtime remains non-root and listens on `PORT`, defaulting to 8080.

The checked-in deployment command produced one active healthy revision with
one live replica, `minReplicas: 1`, `maxReplicas: 1`, and Azure Files storage
`service-proof-loop-data` mounted at `/data`. Its required live gate reported:

- 20/20 demo creations;
- 400/400 simultaneous authenticated reads with their seeded visit;
- 20/20 proofs matched to their originating visit IDs;
- exactly 3 × 201 and 5 × 402 from eight simultaneous free-plan writes;
- past dates and blank checklist labels rejected with 400;
- 45-request burst: 40 allowed and 5 limited;
- 130-request burst: 40 allowed and 90 limited;
- every limited response included `Retry-After: 1`.

After the handoff commit is pushed, `./scripts/deploy-container.sh` is run once
more so `/health` identifies the exact final source commit, not the earlier
code-only commit. The deploy command itself runs
`EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live` before returning.

The complete pinned Playwright suite passed 42/42 against production on both
desktop Chromium and the 390 × 844 project. This covers the one-click demo,
proof and next-visit loop, photos, problem/rating response, configurable
extras, paid-license fixture, keyboard use, mobile layout, 200% text reflow,
privacy requests, offline state, response policy, routing, and console errors.

Live factory URL verification passed `/`, `/demo`, `/privacy`, and `/terms`
with zero console errors. Evidence is in
`.factory/qa-artifacts/repair7-live-*`. Local and live JS/CSS SHA-256 hashes
matched. Hashed assets return `public, max-age=31536000, immutable`.

Lighthouse 12.8.2 mobile results are stored in
`.factory/qa-artifacts/lighthouse-live-repair7.json`:

- Performance 100, Accessibility 100, Best Practices 100, SEO 100;
- FCP 1.23 s, LCP 1.38 s, TBT 3 ms, CLS 0;
- total transfer 68,279 B.

## Accessibility, privacy, offline, and identity

- The tested pages have route-specific titles, `lang=en`, one `h1`, landmarks,
  labels, image alternatives, visible focus, 44 px controls, reduced-motion
  behavior, dark-mode contrast, and keyboard-operable proof controls.
- Landing and demo traffic remain same-origin. The app sets no cookies and
  loads no analytics, third-party scripts, or third-party fonts. Demo access
  stays in `sessionStorage['demo:workspace']`; real workspace storage remains
  untouched in demo mode.
- CSP, HSTS, `nosniff`, frame denial, strict-origin referrer policy, and a
  restrictive permissions policy are present on live responses.
- This is an online backend service, not a PWA, and makes no offline-reload or
  update claim. Its tested offline state tells the user to reconnect before
  loading or saving proof.
- The product has no sign-in, so Entra identity verification is not applicable.
  It is not a package, library, or CLI, so a consumer-install test is not
  applicable.

## Deploy and verify

```sh
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Do not use the generic fleet container deploy command. It replaces the
stateful app template with three replica-local filesystems. Future releases
must use the `deploy_command` in `.factory/deployment.json`.

## Commercial scope deviation

The researched brief specifies **$59 per business each month plus technician
seats**. The product ships a **$59 one-time business license** because the
provided Sociobot paid-unlock contract supports one-time licensing. This is a
material scope variance. It remains explicit rather than simulating unsupported
subscription or seat billing.

## Known gaps and next step

No release-blocking product defect remains. The commercial model above is the
known scope variance. Moving beyond one replica requires migrating both SQLite
state and rate-limit state to shared services; until then the checked-in
single-writer topology is mandatory.
