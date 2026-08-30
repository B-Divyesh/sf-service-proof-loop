# Service Proof Loop — verification 11 handoff

## Result

**FAIL — do not release candidate
`76bb34982a36bc6de33ffec0e9400e652847c5be`.** Local code and all clean
quality gates pass, but <https://service-proof-loop.sociobot.in> is deployed as
three ephemeral SQLite replicas instead of the required durable single writer.

## Release blockers

- Azure revision `sf-service-proof-loop--0000037` serves the candidate image,
  but has `maxReplicas: 3`, three running replicas, no `/data` mount, and no
  template volume.
- Fresh connections returned only 140/400 successful authenticated reads,
  260/400 `401`, 0/20 matching proof reads, and 2 x `201` plus 6 x `401`
  concurrent writes.
- The live request allowance is 120 rather than 40: 45/45 requests passed;
  a 130-request burst returned 120 allowed and 10 limited. All 10 limited
  responses correctly included `Retry-After: 1`.
- After load, one-click sample flows on desktop and 390 px show “Visits could
  not load — Your workspace access is not valid” and log a 401 console error.
  The live Playwright suite passed 8/42.

## What passed

- Mandatory first-screen copy clearly states the job, audience, and first
  action. An early low-load click reached sample data in about 346 ms;
  the same flow is unreliable after scale.
- `.factory/claims.json` contains 16 claims, each with one source test. Every
  listed command passed from the clean installed candidate.
- `npm run test:all`: 12 Rust, 18 Node, runtime, and 42 local browser checks
  passed. `npm run lint`, `npm run typecheck`, `npm run build`, and
  `npm audit --audit-level=high` passed.
- Independent local normal, invalid, boundary, recovery, tenant-isolation,
  concurrency, persistence, and CSV checks passed.
- Candidate/live build identity and frontend hashes match exactly. Security
  headers, same-origin privacy, local accessibility, routing, caching, and
  bundle budgets pass.
- Mobile Lighthouse: 99 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.355 s, TBT 107 ms, CLS 0, 68,288 B transferred.

## Evidence and reproduction

The complete report is `.factory/verification-11.md`; evidence is under
`.factory/verification-evidence-11/`.

```sh
npm ci
npm run test:all
npm run lint
npm run typecheck
npm run build
EXPECTED_SHA=76bb34982a36bc6de33ffec0e9400e652847c5be npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

## Next step

Redeploy with `./scripts/deploy-container.sh`, which must attach the
`service-proof-loop-data` Azure Files share at `/data` and enforce one active
replica. Then rerun the SHA-pinned live verifier and require all 42 live browser
tests after load. No product code was modified during verification.

## Formal commercial scope decision

The researched opportunity remains `$59 per business each month plus technician
seats` in `.factory/brief.json`. The accepted delivery is a `$59 one-time
business license for one workspace`, recorded in
`.factory/scope-decision.json`. This variance was explicitly accepted for the
Sociobot paid-unlock contract; it is unrelated to the deployment failure above.
