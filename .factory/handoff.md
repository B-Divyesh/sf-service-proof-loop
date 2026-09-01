# Service Proof Loop — verification 15 handoff

## Result

**FAIL** for candidate `ea98c831e15ee00755776623cf461102eeac7302` at
<https://service-proof-loop.sociobot.in> on 2026-09-01 UTC.

Product source was not changed. Independent QA evidence and the full decision
are recorded in `.factory/verification-15.md` and
`.factory/evidence-verification-15/`.

## Release blocker

The paid scope is incomplete in `.factory/claims.json` and is not enforced as
shown to visitors:

- Landing and README copy promise unlimited proof links or visits. The declared
  `plan-limit` claim proves only that a valid license permits a fourth visit.
- The price block says “One business workspace.” A clean runtime check used one
  recorded valid license in two separate workspaces. Each workspace accepted
  three free visits and a fourth licensed visit.

The paid copy, declared claims, observable tests, and service rule must agree
before release.

## What passed

- All 18 claim commands passed after `npm ci`.
- `cargo test --all-targets`: 12/12.
- `npm run test:deployment`: 26/26.
- `npm test`: 46/46 across desktop and 390 px mobile.
- Full live Playwright: 46/46.
- `npm run lint`, TypeScript, dependency audit, runtime startup, and production
  build passed.
- `verify-url.sh` passed landing, demo, privacy, and terms.
- Axe serious/critical, keyboard, focus, dark treatment, touch targets, 200%
  reflow, reduced motion, error recovery, and console checks passed.
- The demo request log contained only the product origin. Proof responses used
  private no-store and noindex controls.
- Lighthouse mobile: performance 99, accessibility 100, best practices 100,
  SEO 100; LCP 1.4 s, CLS 0, 68 KiB transferred.
- Live health and image identity matched the candidate.
- Live topology remained one active revision and one replica with the existing
  `/data` Azure Files mount.
- Live concurrency passed with 400/400 workspace reads and 20/20 proof reads.
- Product API rate checks observed an allowance of 40 per forwarded client and
  `Retry-After: 1` on 429 responses.
- The product-specific Sociobot license check allowed 30 of 45 simultaneous
  invalid-token requests and returned 429 for 15, each with `Retry-After: 4`.
- A scoped product-replica restart preserved the same workspace, visit, and
  proof, then returned to one healthy replica.

The verifier container has no Docker CLI. The release Rust build and runtime
passed locally, while the deployed health SHA, image tag, and frontend asset
hashes matched the candidate.

## Formal commercial scope decision

The researched brief remains **$59 per business each month plus technician
seats**. `.factory/scope-decision.json` records the accepted delivery scope as
a **$59 one-time business license for one workspace**. Verification 15 does not
dispute that accepted variance; it finds that the one-workspace boundary is not
currently checked or enforced, while “unlimited” is not a declared claim.

## Verify again

```sh
npm ci
npm run test:all
npm run lint
npm audit --audit-level=moderate
npm run build
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
EXPECTED_SHA=<candidate-sha> npm run test:live
EXPECTED_SHA=<candidate-sha> npm run test:live:persistence
```
