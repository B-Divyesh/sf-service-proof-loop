# Service Proof Loop — repair 10 handoff

## Result

**PASS — every independent verification 10 release blocker is repaired,
covered, and deployed.** The repair preserves the researched brief, Rust/axum
and SQLite backend, Vite frontend, container artifact, visual system, demo,
proof flow, legal routes, and all previously passing behavior.

## Findings reproduced

On 2026-08-30, the SHA-pinned live verifier reproduced the report against
candidate `f85577356b7108ad203b5e802c1180b8b497b914`. Production served that
image while the Azure template reported `maxReplicas: 3`, no `/data` mount,
and no template volume. `npm run test:live` stopped with “maximum replica count
drifted from the deployment contract.”

The independent evidence measured 196/400 authenticated workspace reads, 6/20
proof reads, 3 × 201 plus 5 × 401 concurrent writes, 45/45 allowed requests in
the small burst, and 120/130 allowed requests in the large burst. Those results
came from three ephemeral SQLite writers and three independent rate buckets.

## Root-cause repair and regressions

- `tests/fixtures/deployment-topology-verifier-10.json` records candidate
  `f85577356b71`, revision `0000034`, the three-replica ceiling, and missing
  volume. The topology test rejects it before functional probes.
- State-continuity coverage rejects the exact 196/400 reads and 6/20 proofs.
  Its positive case still requires all 400 reads and 20 matching proofs.
- Plan-limit coverage rejects the exact report-10 order of 3 × 201 and 5 × 401.
  The release assertion accepts only 3 × 201 and 5 × 402.
- Rate coverage rejects both exact report-10 bursts and requires
  `Retry-After: 1` on every 429.
- The configured deployment transaction drains previous writers, attaches
  Azure Files at `/data`, sets Single revision mode and `min/max: 1/1`, checks
  one active replica, then runs the topology and functional probes.

The clean suite also exposed a date-boundary defect at UTC midnight. A sample
visit completed 35 minutes earlier could display calendar dates 15 days apart
although its token lifetime was 14 days. Sample proof expiry is now derived
from its completion timestamp. Rust and desktop/mobile checks require exactly
14 days.

## Formal commercial scope decision

The researched brief remains unchanged at **$59 per business each month plus
technician seats**. The attached work-order billing contract requires the
Sociobot **$59 one-time business license for one workspace** and exposes no
subscription or technician-seat API. Repair work order
`service-proof-loop-repair-10` explicitly accepts that product-contract
variance as the closest supported delivery. `.factory/scope-decision.json`
records the acceptance. Product copy remains truthful and does not claim or
implement unsupported billing.

## Clean local verification

Run on 2026-08-30 from a clean `npm ci` install:

```sh
npm ci
npm audit --audit-level=high
npm run test:all
npm run typecheck
npm run lint
npm run build
# Every test command in .factory/claims.json was then run separately.
npm run test:a11y
```

Results:

- `npm ci`: 22 packages; audit: zero vulnerabilities.
- `npm run test:all`: 12/12 Rust tests, 18/18 Node deployment regressions,
  empty-environment runtime, and 42/42 Playwright checks passed.
- All 16 exact claim commands passed separately in both configured browser
  projects where applicable.
- TypeScript, rustfmt, and Clippy with warnings denied passed.
- `dist/` contains 31,751 B JavaScript (10.15 kB gzip), 15,437 B CSS
  (4.41 kB gzip), no web fonts, and an 18,322 B hero.
- `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms` locally on
  desktop and 390 × 844 with route titles, `lang=en`, one `h1`, one main,
  complete image alternatives, named controls, and zero console errors.

Local and live route evidence, including desktop/mobile screenshots, is in
`.factory/evidence-repair-10/`.

## Browser, accessibility, privacy, and policy

- Desktop and 390 px Chromium complete the sample and real workspace paths,
  client proof, keyboard reply/rating, consented photo, configurable extra,
  CSV export, license restore, legal routes, and styled 404.
- Playwright axe passed 4/4 accessibility tests in light and dark treatments.
  The suite also checks skip navigation, designed focus, keyboard operation,
  heading focus, live announcements, 44 px targets, reduced motion, and 200%
  text reflow. No serious or critical issue remains.
- Landing and demo request logs stay same-origin. There are no analytics,
  third-party scripts, third-party fonts, product cookies, or raw provider
  keys. Demo state uses its separate session namespace; real local storage
  remains untouched.
- The product makes no offline-reload claim. Its tested offline state tells the
  user to reconnect before loading or saving. There is no service worker, so
  update testing is not applicable.
- Response checks pass CSP, HSTS, `nosniff`, frame denial, strict-origin
  referrer policy, and camera/microphone/geolocation denial. Unknown routes
  return the styled HTTP 404. Hashed assets use one-year immutable caching.
- This is not a package or CLI, so consumer-install checks do not apply. It has
  no sign-in, so Entra identity does not apply. It has no runtime AI feature.

## Deployment and live evidence

Implementation commit `fb625ec74a5a9b4cb4d82c69c13b9807fec23e9b` was
built in ACR and deployed only with `./scripts/deploy-container.sh`. Image
digest:
`sha256:da6c9ab2d33d545b0df617dc1807d7f5ae018bdd451d19342b662988b3156d8f`.
Azure created revision `sf-service-proof-loop--0000035` and reported:

- one active revision and one running replica after full browser load;
- Single revision mode with `minReplicas: 1`, `maxReplicas: 1`;
- `service-proof-loop-data` mounted at `/data` as Azure Files;
- exact image `sf-service-proof-loop:fb625ec74a5a`;
- `/health` build SHA
  `fb625ec74a5a9b4cb4d82c69c13b9807fec23e9b`.

The deployment transaction and separate SHA-pinned live verifier passed:

- 20/20 demos created;
- 400/400 simultaneous authenticated reads returned their seeded workspace;
- 20/20 proof reads matched their visit;
- concurrent free writes returned 3 × 201 and 5 × 402, with no 401;
- past dates and blank checklist labels returned 400;
- a fresh 45-request burst returned 40 allowed and 5 limited in 84 ms;
- a fresh 130-request burst returned 40 allowed and 90 limited in 222 ms;
- every limited response included `Retry-After: 1`.

The full live Playwright suite passed 42/42 after those load probes.
`verify-url.sh` passed all four public routes with no console errors. Live HTML,
JS, CSS, and hero SHA-256 values matched local `dist/` byte for byte. The ACR
build exercised the multi-stage Dockerfile from a `.git`-free source archive.

Lighthouse 12.8.2 mobile evidence is
`.factory/evidence-repair-10/lighthouse-live.json`:

- Performance 100, Accessibility 100, Best Practices 100, SEO 100;
- FCP 1.202 s, LCP 1.352 s, TBT 55 ms, CLS 0;
- total transfer 68,265 B.

After this evidence commit, the same configured deployment transaction is run
again so live `/health` identifies the final repository commit. That final run
must repeat the topology, 400-read, 20-proof, plan-limit, validation, and rate
gates before returning success.

## Operating constraint

SQLite and in-memory rate limiting require this durable single-writer topology.
Do not use a generic image-only deployment or raise the replica ceiling.
Scaling beyond one replica requires a shared transactional database and shared
rate-limit state. The accepted commercial variance is documented, not hidden,
and should be revisited only with a subscription-capable Sociobot contract.
