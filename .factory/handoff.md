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

Polish 2 repairs F-2-1 and F-2-2 from `.factory/review-2.md`. The evidence,
live build SHA, and deployment result are recorded in `.factory/polish-2.md`.

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
