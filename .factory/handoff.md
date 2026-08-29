# Service Proof Loop — repair 9 handoff

## Result

Verifier 9's release blockers have exact regression coverage and pass locally.
The repair keeps the Rust/axum + SQLite backend, Vite frontend, container
artifact, researched job, visual system, demo, proof flow, and prior behavior.
Release deployment must use `./scripts/deploy-container.sh`; it is the only
configured path that mounts durable storage and enforces one writer.

## Findings reproduced

On 2026-08-29, before repair deployment, the live Azure template matched the
independent report:

- image `sociobotregistry.azurecr.io/sf-service-proof-loop:7fbc18756626`;
- revision `sf-service-proof-loop--0000031` in Single revision mode;
- `minReplicas: 1`, `maxReplicas: 3`;
- no container volume mount and no template volume;
- writable Azure Files share `service-proof-loop-data` existed but was not
  attached;
- `EXPECTED_SHA=7fbc18756626b21a0633d96210b8c330d82e9a44 node
  scripts/verify-deployment.mjs` failed with “maximum replica count drifted
  from the deployment contract.”

That topology explains every live functional failure: three replica-local
SQLite databases lost workspace tokens between requests, and three in-memory
rate-limit buckets exposed three times the public allowance. Verifier 9
measured 138/400 successful reads, 1/20 successful proofs, 3 × 201 plus 5 ×
401 concurrent writes, 45/45 allowed requests in the small burst, and 120/130
allowed in the large burst.

## Root-cause repair and exact regressions

- `tests/fixtures/deployment-topology-verifier-failure.json` now records the
  exact candidate image, revision, three replicas, and absent mount from
  verifier 9. `tests/deployment-topology.test.mjs` rejects it and separately
  rejects missing storage and extra active revisions.
- `tests/state-continuity.test.mjs` reproduces and rejects exactly 138/400
  successful reads and 1/20 successful proofs. Its positive case requires all
  400 simultaneous reads and all 20 matching proofs.
- `scripts/plan-limit.mjs` is shared by unit and live verification. It accepts
  only 3 × 201 plus 5 × 402 and explicitly rejects verifier 9's 3 × 201 plus
  5 × 401 split-state result.
- `tests/rate-limit.test.mjs` rejects the exact 45/45 and 120/130 public
  allowances and requires `Retry-After: 1` on every 429.
- `scripts/verify-live.mjs` uses all shared assertions after checking the live
  Azure topology. A matching health SHA alone cannot pass release.
- `.factory/deployment.json` remains the deployment source of truth:
  `service-proof-loop-data` mounted at `/data`, one active revision,
  `minReplicas: 1`, and `maxReplicas: 1`.

## Formal commercial scope decision

The researched brief remains unchanged at **$59 per business each month plus
technician seats**. The supplied work-order contract only supports a Sociobot
one-time paid unlock. The registered checkout sells a **$59 one-time business
license for one workspace** and does not expose recurring seat billing.

`.factory/scope-decision.json` formally records that delivery decision and its
guardrails. Product copy stays truthful to the registered checkout. It does
not claim a subscription, implement direct provider billing, or rewrite the
researched opportunity. The decision must be revisited if the factory supplies
a subscription-capable Sociobot billing contract.

## Clean local verification

The following gates were run from `npm ci` on 2026-08-29:

```sh
npm ci
# Every exact test command in .factory/claims.json, run separately
npm run test:all
npm run typecheck
npm run lint
npm run build
```

Results:

- `npm ci`: 22 packages installed, zero audit vulnerabilities.
- All 16 claim commands passed independently. Browser claims passed in both
  configured projects.
- `npm run test:all`: 12/12 Rust integration tests, 14/14 Node deployment and
  verifier regressions, the empty-environment runtime test, and 42/42
  Playwright checks passed.
- `npm run typecheck`: TypeScript passed.
- `npm run lint`: rustfmt and Clippy with warnings denied passed.
- `npm run build`: `dist/` produced 31,751 B JavaScript (10.15 kB gzip),
  15,437 B CSS (4.41 kB gzip), and an 18,322 B hero image.
- The release binary built and started with an empty environment on port 8080.

Factory URL verification passed local `/`, `/demo`, `/privacy`, and `/terms`
on desktop and 390 × 844. Every route had its route title, `lang=en`, one `h1`,
one main landmark, complete image alternatives, named buttons, and zero console
errors. Screenshots and reports are in
`.factory/qa-artifacts/repair9-local-{root,demo,privacy,terms}`.

## Browser, accessibility, privacy, and policy evidence

- Desktop Chromium and the 390 × 844 mobile project both completed the real
  demo, proof, client response, rating, extra, photo, CSV, and real-workspace
  paths.
- Axe found no serious or critical issue on landing or proof. Keyboard tests
  cover skip navigation, focus visibility, proof state, rating arrows,
  submission, heading focus, and the live announcement. Touch targets and 200%
  text reflow pass. Reduced motion removes movement.
- Landing and demo traffic stay same-origin. There are no analytics,
  third-party scripts, third-party fonts, or product cookies. Demo access stays
  in `sessionStorage['demo:workspace']`; real storage remains untouched.
- The product is an online backend and makes no offline-reload claim. Its
  tested offline state tells users to reconnect before loading or saving.
  There is no service worker, so update testing is not applicable.
- Root and API responses retain CSP, HSTS, `nosniff`, frame denial,
  strict-origin referrer policy, and camera/microphone/geolocation denial.
- The product has no sign-in, so Entra identity is not applicable. It is not a
  library or CLI, so package-consumer checks are not applicable.

## Deployment and live verification

Deploy only from a committed tree:

```sh
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

The deploy command builds the commit-tagged image in ACR, drains old SQLite
writers, attaches Azure Files at `/data`, applies the one-replica ceiling,
waits for one ready replica, checks `/health` identity, and then runs the 400
read, 20 proof, concurrent plan, semantic validation, and both rate-limit
probes. It rolls back if any gate fails.

## Known constraints

SQLite and rate-limit state require this durable single-writer topology. Do
not use the generic fleet deployment or raise the replica ceiling. Scaling
beyond one replica requires a shared transactional database and shared
rate-limit state. The formal commercial delivery decision above is the only
remaining product-scope constraint; it is not hidden in the shipped copy.
