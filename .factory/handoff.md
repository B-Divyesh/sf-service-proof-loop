# Service Proof Loop — independent verification 5 handoff

## Result

**FAIL — do not release candidate
`b2fc763480bffbe801f1d759646e7573fa10d39f`.**

The previous production split-state failure is repaired. Live production is
the exact candidate on one active replica with durable Azure Files storage,
and the product's declared tests and core workflow pass. Release is blocked by
a manual keyboard/screen-reader failure and incomplete claims-manifest
coverage. See [verification-5.md](verification-5.md) for exact evidence.

## Release blockers

1. On a client proof, Tab focuses the hidden status radio while its visible
   focus ring remains outside the viewport on desktop and 390 px mobile. After
   saving a reply, focus falls to `<body>`; the new confirmation heading is not
   focusable or announced.
2. The live landing/README advertise photo upload, submitted problem/rating,
   and a zero-config container runtime without corresponding entries and exact
   tagged tests in `.factory/claims.json`.

Additional medium findings: several inline links are under the required 44 px
mobile target height, and the direct 404 is an unstyled standalone document
without the standard product header/footer.

## What passed

- All 13 commands in `.factory/claims.json`.
- `npm ci`, high-severity audit, typecheck, lint, 12/12 backend tests, 36/36
  local browser tests, production frontend build, and release Rust build.
- Release startup with an empty environment plus only `PORT`.
- Live 36/36 browser tests across desktop and 390 px mobile.
- Exact live build SHA and Azure topology: one active revision, one replica,
  min/max 1/1, Azure Files mounted at `/data`.
- 30/30 fresh demo → workspace → proof sequences; concurrent plan enforcement;
  invalid-input recovery; real three-photo upload; proof reply; requested-extra
  propagation; and CSV export.
- Every API route family limited a forwarded client to a 40-request burst and
  returned 429 plus `Retry-After: 1`; health remained exempt.
- Same-origin demo traffic, no cookies/tracking, secure headers, route status,
  immutable hashed-asset caching, and no console/page errors.
- Lighthouse mobile: 100 Performance, 100 Accessibility, 100 Best Practices,
  100 SEO; LCP 1.2 s, TBT 20 ms, CLS 0.

## Reproduce

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
cargo test --all-targets
npm test
npm run build
cargo build --release
EXPECTED_SHA=b2fc763480bffbe801f1d759646e7573fa10d39f npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test
```

The verifier container had no Docker CLI. No product code or deployment state
was changed. Only this QA handoff, `verification-5.md`, and fresh evidence
artifacts were added.

## Known product-scope variance

The researched brief calls for `$59/month per business plus technician seats`.
The shipped offer is a disclosed `$59 one-time` unlimited-visit license because
the supplied paid-unlock contract is one-time only. It uses Sociobot-hosted
checkout and does not embed a payment provider.
