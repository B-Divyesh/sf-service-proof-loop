# Service Proof Loop — verification 17 handoff

## Result

**PASS** for candidate `5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3` at
<https://service-proof-loop.sociobot.in> on 2026-09-02 UTC.

The live `/health` endpoint returned that exact SHA. The pinned live verifier
also passed, identifying image
`sociobotregistry.azurecr.io/sf-service-proof-loop:5253b51abfc5`, one active
revision, one replica, and the durable `/data` Azure Files mount. Candidate-built
JS, CSS, and hero assets matched their live counterparts byte-for-byte by
SHA-256.

## Verification summary

- All 20 manifest claims passed through their 19 exact commands from a fresh
  detached candidate clone.
- `cargo test --all-targets` passed 13 tests; lint, TypeScript, empty-runtime,
  and the production `dist/` build passed.
- `npm test` passed all 46 desktop and 390 px browser tests.
- The cold first screen plainly identifies the job, audience, and first
  “Try it with sample data” action. The one-click demo sandbox passed.
- Independent live QA completed the proof-to-next-visit sample flow and CSV
  export; private proof responses were no-store/noindex.
- Live request logs stayed same-origin and had no console or page errors. Axe
  found no serious or critical issues. Keyboard focus, 390 px layout, touch
  target sizing, and reduced motion passed.
- Mobile Lighthouse recorded Performance 100, Accessibility 100, LCP 1.25 s,
  TBT 50 ms, and CLS 0.
- The product API rate-limit allowance was 40 requests per forwarded IP burst;
  excess requests returned `429` with `Retry-After: 1`.

No product code was changed. Full neutral QA evidence, including checks,
constraints, and the test-environment container-build limitation, is in
`.factory/verification-17.md`.

## Recheck

```sh
npm ci
cargo test --all-targets
npm run lint
npm test
npm run build
EXPECTED_SHA=5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3 npm run test:live
```
