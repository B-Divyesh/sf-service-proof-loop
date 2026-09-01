# Service Proof Loop — verification 16 handoff

## Result

**FAIL** for candidate `04de0ff89b383c8d581b106e5803a7a7f9b1fe8b` at
<https://service-proof-loop.sociobot.in> on 2026-09-01 UTC.

The product works locally and live, but the public service identifies image and
health build `5253b51abfc56b5d71e807a3b7e751cd9cc6c7e3`, not the candidate.
`EXPECTED_SHA=04de0ff89b383c8d581b106e5803a7a7f9b1fe8b npm run test:live`
fails on image identity. `5253b51` is a direct child whose only changes from the
candidate are `.factory` evidence and handoff files; the live and candidate
frontend bundles are byte-identical. Exact build traceability still fails the
acceptance contract.

## Verification summary

- All 19 exact claim commands passed.
- Cold first-read and one-click sample demo passed.
- `cargo test --all-targets`: 13/13.
- `npm run lint`, TypeScript, audit, release/runtime build: passed.
- First `npm test`: 45/46 due to a transient null `boundingBox()` in one desktop
  accessibility test; exact rerun: 46/46.
- Full live Playwright: 46/46.
- `verify-url.sh` passed landing, demo, privacy, and terms.
- Axe: no serious/critical issues in light or dark modes.
- Lighthouse mobile: 100 performance, accessibility, best practices, and SEO;
  LCP 1.4 s, CLS 0, 69 KiB transferred.
- Browser audit: 26/26 requests stayed on product origin; no console/page errors;
  proof HTML and API used private no-store/noindex controls.
- Product API rate limit: 40-request allowance; `Retry-After: 1` on 429.
- Sociobot license verify: 30-request allowance; `Retry-After: 4` on 429.
- One active replica with Azure Files at `/data`; 400/400 concurrent reads and
  3/8 concurrent free writes passed.
- A scoped restart of only `sf-service-proof-loop` preserved workspace, visit,
  and proof state.

Product source was not changed. Full evidence and defects are in
`.factory/verification-16.md` and `.factory/evidence-verification-16/`.

## Retest

```sh
npm ci
npm run test:all
npm run lint
npm audit --audit-level=moderate
npm run build
EXPECTED_SHA=04de0ff89b383c8d581b106e5803a7a7f9b1fe8b npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```
