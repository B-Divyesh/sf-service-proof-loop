# Service Proof Loop — repair 10 handoff

## Status

Repair 10 is in progress. Independent verification 10 was reproduced against
candidate `f85577356b7108ad203b5e802c1180b8b497b914`; the SHA-pinned live
verifier failed because production had a three-replica ceiling and no durable
volume mount.

## Findings reproduced

The live Container App served the candidate image but reported
`maxReplicas: 3`, no container mount, and no template volume. This matched
`.factory/evidence-10/live-topology-app.json`. The report's measured impact was
196/400 successful authenticated reads, 6/20 proof reads, 3 × 201 plus 5 × 401
concurrent writes, and 120 allowed requests in a 130-request burst.

Exact report-10 fixtures now cover each result. The positive release assertions
still require one mounted writer, 400/400 authenticated reads, 20/20 matching
proofs, 3 × 201 plus 5 × 402 concurrent writes, and one 40-request rate bucket.

## Formal commercial scope decision

The researched brief remains unchanged at **$59 per business each month plus
technician seats**. The attached work-order billing contract requires the
Sociobot **$59 one-time business license for one workspace** and does not
provide a recurring technician-seat API. The repair work order therefore
explicitly accepts this product-contract variance as the closest supported
delivery. `.factory/scope-decision.json` records the acceptance and keeps the
subscription opportunity for a future billing-capable work order. The product
does not claim unsupported subscription or seat billing.

## Verification and deployment

Clean local, browser, accessibility, privacy, policy, production build, live
identity, topology, continuity, rate-limit, and deployment evidence will be
recorded here before completion. Deployment will use only the configured
`./scripts/deploy-container.sh` transaction.
