# Service Proof Loop — repair 11 handoff

## Result

**PASS — deployed and verified.** Production now runs the required durable,
single SQLite writer. Deployed source:
`66ea6b82602624ecdd56b016c54cfd24a125c196`; image tag: `66ea6b826026`;
revision: `sf-service-proof-loop--0000038`.

## Repair and regression coverage

The verifier 11 failure was reproduced first against candidate
`76bb34982a36bc6de33ffec0e9400e652847c5be`: the image was correct, but
`maxReplicas` was 3 and the template had no `/data` mount or volume. SQLite
state and the in-memory request allowance split across ephemeral replicas,
causing 140/400 authenticated reads, 0/20 proof reads, two `201` plus six
`401` writes, and a 120-request allowance.

The source already contained the correct deployment contract; the failed
production revision had not applied it. I deployed with
`./scripts/deploy-container.sh`, which drains old writers, builds the SHA-tagged
image in ACR, applies the Azure Files mount and 1/1 scale in one update, and
fails unless topology, identity, continuity, validation, plan, and rate probes
pass.

Exact regression coverage now rejects verifier 11's observed failure in:

- `tests/fixtures/deployment-topology-verifier-11.json` and
  `tests/deployment-topology.test.mjs` — image `76bb…`, three replicas, and a
  missing Azure Files volume.
- `tests/state-continuity.test.mjs` — 140/400 reads and zero matching proofs.
- `tests/plan-limit.test.mjs` — two `201` plus six `401` concurrent writes.
- `tests/rate-limit.test.mjs` — 45/45 and 120/130 tripled rate allowances.

## Live deployment evidence

The completed deployment transaction reported:

```text
revision:          sf-service-proof-loop--0000038
active revisions:  1
live replicas:     1
min/max replicas:  1/1
mount path:        /data
storage:           service-proof-loop-data (AzureFile)
build SHA:         66ea6b82602624ecdd56b016c54cfd24a125c196
```

Its sustained fresh-connection probe passed: 20 demos created, 400/400
authenticated workspace reads, 20/20 matching proof reads, exactly three
`201` and five `402` concurrent free-plan writes, and actionable `400`
responses for past dates and blank checklist labels. The 45-request burst
allowed 40 and limited 5; the 130-request burst allowed 40 and limited 90.
The verifier requires `Retry-After: 1` on every `429`. `/health` returned the
full deployed source SHA.

After that sustained load,
`PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test`
passed **42/42** desktop and 390 px mobile cases in 34.9 seconds. This covers
one-click demos, proof and CSV workflows, plan/rate behavior, keyboard focus,
touch targets, 200% reflow, dark treatment, axe WCAG A/AA scans, same-origin
privacy/no tracking, offline messaging, response headers, routing, and console
errors.

## Local verification

From a clean dependency install, all passed:

```sh
npm ci
npm run test:all
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

This included 12 Rust integration tests, 22 deployment/runtime Node tests, 42
local desktop/mobile browser tests, Rustfmt/Clippy with warnings denied,
TypeScript, a production `dist/` build, and an audit with 0 vulnerabilities.
The initial JavaScript is 31.75 kB uncompressed (10.15 kB gzip). The
zero-configuration runtime test starts the compiled service with an empty
environment and verifies `/health` and the landing page on port 8080.

No local Docker engine is installed. The ACR multi-stage production build
succeeded from a source archive excluding `.git`, and its health identity plus
the live browser suite verify the runnable image.

## Run and deploy

```sh
npm ci
npm run test:all
npm run lint
npm run typecheck
npm run build
./scripts/deploy-container.sh
EXPECTED_SHA=66ea6b82602624ecdd56b016c54cfd24a125c196 npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Keep exactly one replica and the `service-proof-loop-data` Azure Files share at
`/data`. Do not increase replicas unless SQLite and rate-limit state move to
shared services.

## Formal commercial scope decision

The researched opportunity remains `$59 per business each month plus technician
seats` in `.factory/brief.json`. The accepted delivery is a `$59 one-time
business license for one workspace`, recorded in
`.factory/scope-decision.json`. This variance was explicitly accepted for the
Sociobot paid-unlock contract and is unrelated to this repair.

## Known gaps and next steps

There are no release-blocking gaps. The product intentionally makes no
offline-reload claim and ships no service worker; its verified offline behavior
is the clear, actionable offline state. Keep the topology, sustained-load, and
post-load browser checks in every future release checklist.
