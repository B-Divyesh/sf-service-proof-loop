# Service Proof Loop — polish 2 handoff

## Formal commercial scope decision

The accepted commercial decision is recorded in
[.factory/scope-decision.json](.factory/scope-decision.json). Research keeps
the opportunity at **$59 per business each month plus technician seats**. This
container delivers a **$59 one-time business license for one workspace**.
The variance is accepted because the required Sociobot paid-unlock contract
supports a one-time license, not recurring technician-seat billing. The brief
remains unchanged for a future subscription-capable billing work order.

## Result

Polish 2 repairs F-2-1 and F-2-2 from `.factory/review-2.md`. Commit
`7d8db70fc6a42e550e89e9b1373980b63b664b21` is deployed as revision
`sf-service-proof-loop--0000050`.

## Evidence

- A clean clone at `7d8db70` ran `npm ci`, `npm test` (46 browser checks),
  `cargo test --all-targets`, `npm run lint`, `npm run build`, and
  `npm audit --omit=dev --audit-level=high` successfully.
- All 19 exact commands in `.factory/claims.json` passed individually from
  that clean clone. This includes each `npm test -- --grep @claim:...` command.
- `EXPECTED_SHA=7d8db70fc6a42e550e89e9b1373980b63b664b21 npm run test:live`
  passed after deployment: one active revision and replica, Azure Files at
  `/data`, 400/400 concurrent demo reads, 20/20 proofs, and 45/130 rate
  bursts with 429 responses.
- A cold live browser run passed all 46 desktop/mobile checks. The four core
  routes passed `/opt/fleet/lib/verify-url.sh` with no console errors, one
  title, `lang=en`, one `h1`, one `main`, and no missing image alt text.
- Live Lighthouse mobile scores are 100 performance, 100 accessibility, 100
  best practices, and 100 SEO. See `.factory/evidence-polish-2/` and
  `.factory/polish-2.md`.

## Run and verify

```sh
npm ci
npm test
cargo test --all-targets
npm run build
```

Run `EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live` after deployment.
The service starts with only `PORT`; persistent SQLite state uses `/data`.

## Known gaps

None at handoff. The application does not provide dispatch, payroll, payments,
public-review solicitation, or worker tracking.
