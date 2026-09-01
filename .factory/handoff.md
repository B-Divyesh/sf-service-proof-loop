# Service Proof Loop — polish 1 handoff

## Result

Review 1 is repaired and deployed. Application build
`0076082a591501a5aa35cdf3084ceedb7847f666` is live at
<https://service-proof-loop.sociobot.in>.

## What changed

- Private proof HTML and proof API responses send `X-Robots-Tag: noindex,
  nofollow, noarchive` and `Cache-Control: private, no-store`. Proof pages do
  not contain a canonical URL.
- Stable routes now render route-specific title, description, Open Graph,
  Twitter, canonical, and Open Graph URL metadata before JavaScript runs.
- Rewrote every review-targeted landing and README line, standardized client
  and extra terminology, and clarified that Sociobot billing starts checkout
  while Dodo hosts the payment page.
- Added testable proof-privacy and deployment-continuity claims. Updated the
  catalog description and copy audit.

## Formal commercial scope decision

The researched opportunity remains **$59 per business each month plus
technician seats**. The accepted delivery scope is a **$59 one-time business
license for one workspace**, as recorded in
[.factory/scope-decision.json](scope-decision.json). This variance is accepted
by the service-proof-loop-repair-10 work order because the current Sociobot
billing API supports one-time purchases, not monthly per-seat billing.

## Verification

- Fresh clone at `0076082a591501a5aa35cdf3084ceedb7847f666`: every non-live
  command in `.factory/claims.json` passed individually after `npm ci`.
- Local: `npm test`, `cargo test --all-targets`, `npm run lint`, and `npm run
  build` passed. The browser suite has 46 tests across desktop and 390 px.
- Live: `npm run test:live` passed with one active revision and replica, the
  `/data` Azure Files mount, 400/400 concurrent demo reads, 20/20 proof reads,
  and rate limiting at 45 and 130 requests.
- Live: `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms` without
  console errors. Live Playwright metadata, proof-privacy, and Axe checks
  passed 8/8 across desktop and mobile.

See [.factory/polish-1.md](polish-1.md) and
`.factory/evidence-polish-1/` for finding-by-finding evidence and screenshots.

## Run and deploy

```sh
npm ci
npm test
./scripts/deploy-container.sh
EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live
```

The service starts with only `PORT` (default `8080`). It stores SQLite data at
`/data/service-proof-loop.db` when mounted and keeps one active replica.

## Known gaps

None.
