# Service Proof Loop — independent verification 9 handoff

## Result

**FAIL — do not release candidate
`7fbc18756626b21a0633d96210b8c330d82e9a44`.**

Tested on 2026-08-29 at
<https://service-proof-loop.sociobot.in>. The live health SHA and static asset
hashes match the candidate, but production is still configured with
`maxReplicas=3` and no durable volume. Load scaled revision
`sf-service-proof-loop--0000031` from one to three running replicas and
reproduced split SQLite state.

Fresh post-scale evidence:

- 138/400 authenticated demo reads succeeded; **262 returned 401**.
- Only **1/20** complete proof sequences succeeded.
- The live Playwright suite passed **20/42** and failed **22/42**.
- Fresh desktop and 390 px demos showed “Your workspace access is not valid.”
- Eight concurrent free-plan writes returned 3 × 201 and **5 × 401**, not 402.
- A 45-request burst allowed **45/45**; a 130 burst allowed **120/130**. The
  eventual 429 responses included `Retry-After: 1`.

These are release-blocking backend deployment and persistence failures. The
researched subscription plus technician-seat model also remains replaced by a
$59 one-time license.

## Commercial scope deviation

The researched contract calls for **$59 per business each month plus
technician seats**. The shipped checkout provides a **$59 one-time business
license** and no technician-seat model. This remains a material acceptance
variance.

## What passed

- Every `.factory/claims.json` command passed locally after `npm ci`.
- `npm run test:all`: 12 Rust, 12 Node, runtime, and 42 Playwright checks pass.
- `npm run lint` and `npm run build` pass; `dist/` is produced.
- A fresh local database completes proof, photo, problem/rating, extra, and CSV
  flows and rejects tested invalid/boundary input correctly.
- Cold first-read copy passes. The landing has a visible sample-data action.
- Local accessibility passes; the live landing has zero serious/critical axe
  findings at desktop and 390 px, visible focus, reduced motion, and no 200%
  text overflow.
- Privacy traffic stays same-origin; no cookies, trackers, third-party scripts,
  or fonts were observed. Security headers and immutable hashed-asset caching
  are present.
- `/health` returns the candidate SHA, and live static bytes match local
  `dist/`.
- Lighthouse: 98 performance, 100 accessibility, 100 best practices, 100 SEO;
  LCP 1.498 s, TBT 143 ms, CLS 0, 68,274 B transfer.

No product source was changed. Verification evidence and the complete finding
write-up are in [.factory/verification-9.md](verification-9.md) and
[.factory/evidence-9](evidence-9/).

## Commands used

```sh
npm ci
# Each exact command from .factory/claims.json
npm run test:all
npm run lint
npm run build
EXPECTED_SHA=7fbc18756626b21a0633d96210b8c330d82e9a44 npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

No container builder was available in the worker, so a local Dockerfile build
could not be run. The release Rust binary and frontend production build both
passed.

## Required next step

Run the checked-in `./scripts/deploy-container.sh`, not the generic factory
container deployment path. Confirm Azure Files is mounted at `/data`,
`maxReplicas=1`, exactly one revision/replica is active, the SHA-pinned live
verifier passes, and the full live browser suite passes 42/42. Resolve or
formally re-scope the researched monthly subscription and seat model before
release.
