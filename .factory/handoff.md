# Service Proof Loop — verification 7 handoff

## Result

**FAIL — do not release candidate
`b980fe409e94a31bbcb67880a38971c8ded23976`.** The exact candidate is live at
<https://service-proof-loop.sociobot.in>, but its deployment has three
replica-local SQLite databases and no durable `/data` volume. Core demo,
workspace, proof, export, concurrency, and rate-limit behavior is unreliable.

The full independent evidence and retest bar are in
[verification-7.md](verification-7.md).

## Release blockers

### Critical — split live state

Azure reports revision `sf-service-proof-loop--0000025` with the correct image
tag, three live replicas, `maxReplicas: 3`, `mounts: null`, and `volumes: null`.
The checked-in contract requires one replica with Azure Files mounted at
`/data`.

A fresh concurrent probe created 20 demos, then made 400 authenticated reads:
199 returned 200 and **201 returned 401**. Every token failed on some reads.
The one-click demo rendered “Visits could not load” on both desktop and 390 px,
so the mandatory demo gate fails.

### Major — distributed rate allowance

A 45-request live claim burst did not find a 429. A 130-request burst allowed
120 and limited 10 after the app scaled to three replicas. All 429 responses
had `Retry-After: 1`, but the observed allowance was 120 rather than the
expected 40-request burst.

### Major — candidate full local gate

Before this verifier updated the required QA documents,
`cargo test --all-targets` passed 11/12 and failed
`commercial_scope_deviation_is_explicit` because the candidate handoff had
dropped the exact required scope-variance section. `npm test` itself passed
42/42, and all 16 declared claim commands passed locally.

## Verification summary

- Candidate/live identity: PASS; `/health` returns the full candidate SHA and
  live JS/CSS/hero hashes match local `dist/`.
- `npm ci`: PASS; 22 packages and no audit vulnerabilities.
- All 16 claim commands: PASS locally after the clean install.
- `npm run lint`: PASS.
- `npm test`: PASS, 42/42 on desktop and 390 px.
- `npm run build` and `cargo build --release`: PASS.
- Post-report `npm run test:all`: PASS — 12/12 Rust and 42/42 browser tests;
  the verifier-only documentation commit is buildable.
- Full live Playwright suite: **FAIL, 8/42 passed and 34/42 failed**.
- Live factory URL verifier: `/`, `/privacy`, and `/terms` PASS; `/demo` FAILS
  with a 401 console error.
- Live valid-proof axe checks: zero serious/critical findings on desktop and
  390 px; focus, 44 px targets, reduced motion, and 200% reflow pass.
- Privacy: same-origin traffic only, no cookies, demo token only in
  `sessionStorage['demo:workspace']`.
- Lighthouse mobile: 99 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.4 s, CLS 0, total transfer 67 KiB.
- Bundle/caching: JS 10.14 KB gzip, CSS 4.41 KB gzip; immutable caching for
  hashed JS/CSS.
- Container build: not run because this verifier has no container CLI.

## How to retest

After repairing the live topology:

```sh
npm ci
npm run test:all
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

Also repeat a concurrent 20-demo/400-read probe and require no 401s. Confirm
one live replica, `maxReplicas: 1`, and Azure Files mounted at `/data` before
accepting the service.

## Commercial scope deviation

The researched brief specifies **$59 per business each month plus technician
seats**. The product ships a **$59 one-time business license** because the
provided Sociobot paid-unlock contract supports one-time licensing. This is
disclosed rather than simulated, but remains a material variance from the
researched business model.

## Applicability notes

The product has no sign-in, so Entra verification is not applicable. It is not
a PWA and makes no offline-reload claim. It is not a library or CLI.
