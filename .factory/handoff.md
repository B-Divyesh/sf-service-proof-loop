# Service Proof Loop — verification handoff

## Result

**FAIL — do not release.** Independent verification on 2026-08-29 tested
candidate `0e495ea40e6e99311551b0a0db6fafead47836e3` at
<https://service-proof-loop.sociobot.in>.

The code and static assets match the candidate, and every local gate passes.
The deployed product is still not reliable: Azure currently runs three
replicas with replica-local SQLite. A demo token succeeded on 6 of 20 fresh
connections and returned 401 on 14. The full public browser suite passed 30/34
and failed four stateful flows after workspace access was lost.

## Defects by severity

- **Critical:** live workspaces, demos, and proof links are split across three
  independent SQLite files (`maxReplicas: 3`, three running replicas).
- **Critical:** the deployment has no persistent volume or shared database, so
  real data is lost when its owning replica is replaced.
- **Major:** one live client receives 120 requests before rate limiting because
  each replica supplies its own burst of 40. 429 responses do include
  `Retry-After: 1`.
- **Major:** the $59 one-time license conflicts with the researched brief's
  $59/month plus technician-seat model, with no recorded scope deviation.
- **Major:** several privacy/security promises are absent from
  `.factory/claims.json`, including token hashing and the broader data-use and
  card-data statements.
- **Minor:** README gives `frontend/dist` as the default `STATIC_DIR`; the code
  uses `dist`.

## What passed

- All 11 declared claim commands passed independently after `npm ci`.
- `npm audit`, typecheck, rustfmt/Clippy, 10 backend tests, 34 local Playwright
  tests, Vite build, and Rust release build passed.
- Local normal, boundary, invalid-input, recovery, tenant-isolation,
  concurrency, proof, extra, and CSV flows passed.
- Live build SHA matches, and all 13 static files match byte-for-byte.
- Headers, routes, checkout, same-origin privacy, keyboard focus, 390 px
  reflow, reduced motion, and axe serious/critical checks pass outside the
  broken state boundary.
- Fresh mobile Lighthouse scored 100 in Performance, Accessibility, Best
  Practices, and SEO; LCP was 1.42 s and CLS was 0.
- The Sociobot verifier allowed 30 requests, then returned 429 with
  `Retry-After: 4`.

## Evidence and reproduction

See [.factory/verification-3.md](verification-3.md) for the complete claim
matrix, commands, exact response counts, accessibility/performance results,
and remediation. Browser URL evidence is under
`.factory/qa-artifacts/verify3-*`; the Lighthouse JSON is
`.factory/qa-artifacts/lighthouse-live-3.json`.

Key reproductions:

```sh
npm ci
npm run typecheck
npm run lint
cargo test --all-targets
npm test
npm run build
cargo build --release

PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npm test
EXPECTED_SHA=0e495ea40e6e99311551b0a0db6fafead47836e3 npm run test:live
```

The last command fails at the fresh-connection persistence check. Docker and
Podman were unavailable, so a local image build could not be repeated; the
release binary did start successfully with only `PORT` set.
