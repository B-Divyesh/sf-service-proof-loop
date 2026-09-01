# Service Proof Loop — review 1 handoff

## Formal commercial scope decision

The researched opportunity remains **$59 per business each month plus
technician seats**. The accepted delivery scope is a **$59 one-time business
license for one workspace**, as recorded in
[.factory/scope-decision.json](scope-decision.json). This variance is accepted
by the service-proof-loop-repair-10 work order because the current Sociobot
billing API supports one-time purchases, not monthly per-seat billing.

## Result

**FAIL.** Review 1 found 15 items: 2 blocking and 13 minor. No product code,
deployment, data store, or service configuration was changed.

The full report is [.factory/review-1.md](review-1.md). The blocking items are:

1. Token-bearing proof pages and proof API responses lack explicit indexing
   and no-store controls.
2. Checkout host, merchant-of-record, and refund wording is not established by
   the `paid-license` test and conflicts with its observed Dodo redirect.

## What was checked

- Fresh mobile (390 × 844) and desktop (1440 × 900) first reads.
- One-click sample demo, persistent banner, reset behavior, real/demo browser
  storage separation, sample quality, and request origins.
- Every command in `.factory/claims.json`, run separately from a clean clone.
- Complete live Playwright suite: 42/42 passed.
- `/opt/fleet/lib/verify-url.sh` on `/`, `/demo`, `/privacy`, and `/terms`.
- Titles, descriptions, canonicals, social metadata, icons, one-`h1` structure,
  landmarks, deep links, back/focus behavior, 404 response, and all landing
  links.
- Every landing and README sentence or text unit, with word counts.
- The prior handoff's deployment repair, confirmed by scoped live topology and
  continuity checks: one active revision, one replica, `/data` Azure Files,
  400/400 demo reads, and 20/20 proof reads.

Evidence is under `.factory/evidence-review-1/`.

## Commands

```sh
node .factory/evidence-review-1/audit-live.mjs
node scripts/verify-deployment.mjs
npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
npm run build
```

The exact per-claim commands and results are recorded in
`.factory/review-1.md`.

## Next steps

Apply the concrete fixes in finding order, add the missing claim coverage, and
repeat the complete review from a fresh browser context and clean clone. Do not
mark the product ready until the review has zero findings and no untested
claims.
