# Service Proof Loop — repair 5 handoff

## Result

**PASS — release blockers from verifier commit `c011fb939aae7680dd33c49a93901b4f3b915c84` are repaired.**

The repair preserves the accepted product workflow and the durable,
single-writer container topology from candidate
`b2fc763480bffbe801f1d759646e7573fa10d39f`.

## Repairs

1. Proof status and rating controls now scroll their visible labels into the
   viewport when keyboard focus enters them. The focused radio itself and its
   designed outline are both visible on desktop and 390 px mobile.
2. A saved client reply now moves focus to the new confirmation `<h1>` and
   writes “Your reply is saved” to the page announcer.
3. `.factory/claims.json` now covers consented photo upload, saved problem and
   rating replies, and zero-configuration port-8080 startup. Each new claim has
   one exact tagged regression.
4. Pricing, legal-contact, and proof-report links now provide at least a 44 px
   target in both dimensions.
5. Vite now builds a dedicated `404.html` entry that boots the same product
   shell. Direct unknown requests retain HTTP 404 while showing the standard
   header, navigation, visual system, footer, and return action.
6. Hashed JavaScript and CSS remain immutable-cacheable after the second HTML
   entry changed Vite's shared asset name.
7. Browser tests use an isolated forwarded IP per test, preventing the test
   suite itself from consuming another test's intentional 40-request bucket.
8. Adding a client extra now renders the created server response immediately
   instead of waiting for a redundant Azure Files read. The live desktop and
   mobile suite covers this path under concurrent use.

## Exact regression coverage

- `@claim:photo-upload`: rejects four files and a file over 1 MB, then saves
  and displays three named consented PNGs on the client proof.
- `@claim:problem-rating`: saves a problem, rating 2, and comment, then checks
  the exact problem state and accessible rating in the workspace.
- `@claim:zero-config-runtime`: starts the release binary with an empty
  environment and checks `/health` and `/` on port 8080.
- The accessibility regression checks the focused radio and visible label
  bounds against the viewport on both projects. It then submits with Enter and
  checks the active confirmation heading and live-region text.
- The touch regression measures all five formerly undersized inline targets at
  390 px. The route regression checks a direct 404 response, shared shell, and
  painted background.
- The backend cache regression covers both the previous `index-*` asset name
  and Vite's shared `main-*` CSS asset.
- The configurable-extras regression aborts any redundant post-save list read
  and proves the saved server response appears without one.

## Local verification

Run from `/work/repo`:

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm run lint
cargo test --all-targets
npm test
npm run test:claims
npm run test:a11y
npm run build
cargo build --release
```

Results:

- Clean install: 22 packages; zero audit vulnerabilities.
- TypeScript, rustfmt, and Clippy with warnings denied: pass.
- Backend unit/integration suite: 12/12 pass.
- Deployment topology suite: 4/4 pass.
- Empty-environment release runtime: 1/1 pass on default port 8080.
- Playwright: 42/42 pass across desktop Chromium and 390 × 844 mobile.
- Browser claim run: 22/22 pass. All 16 manifest commands were also run
  separately and passed; every claim tag occurs exactly once in the sources.
- Axe, dark treatment, keyboard, focus bounds, touch targets, reduced motion,
  and 200% reflow: 4/4 pass.
- Factory `verify-url.sh`: `/`, `/demo`, `/privacy`, and `/terms` pass with one
  `<h1>`, `lang=en`, a main landmark, complete image alternatives, named
  buttons, and zero console errors.
- Production build: 31,750 B JavaScript (10.15 KB gzip), 15,437 B CSS
  (4.41 KB gzip), and 18,322 B hero WebP. `dist/` includes the processed 404
  entry. Initial assets remain below every stated budget.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.1 s, LCP 1.4 s, TBT 70 ms, CLS 0, total 69 KiB.
- A 100-request local health burst returned 100 × 200 in 128 ms. The API rate
  regression still proves 429 plus `Retry-After: 1` beyond the allowed burst.

Manual focus evidence:

- Desktop 1440 × 900: focused radio top/bottom 423/445 px; visible label
  top/bottom 420/480 px.
- Mobile 390 × 844: focused radio top/bottom 404/426 px; visible label
  top/bottom 401/461 px.
- After keyboard submission in both viewports, `document.activeElement` is the
  saved-state `<h1>` and `#announcer` contains “Your reply is saved”.
- A direct unknown URL returns 404 with visible header and footer.

Evidence is in `.factory/qa-artifacts/repair5-*` and
`.factory/qa-artifacts/lighthouse-local-repair5.json`.

## Privacy, offline, and response policy

- The claim suite records same-origin traffic for the landing and demo flows.
  There are no analytics, third-party scripts, third-party fonts, cookies, or
  landing-page local storage.
- Demo state remains isolated in `sessionStorage['demo:workspace']`; real
  workspace state is not read or written while the demo banner is shown.
- This online service does not register a service worker or claim offline
  reload/update behavior. Its reconnect message remains covered by both
  browser projects.
- Local responses include CSP, HSTS, `nosniff`, frame denial, strict-origin
  referrer policy, and a restrictive permissions policy. Hashed JS/CSS use
  one-year immutable caching.

## Deployment and live verification

The checked-in `./scripts/deploy-container.sh` builds the commit containing
this handoff, drains the old SQLite writer, deploys one active revision with
one replica and the Azure Files mount at `/data`, and checks build identity.
After deployment, `EXPECTED_SHA=$(git rev-parse HEAD) npm run test:live` and
the full browser suite against `https://service-proof-loop.sociobot.in` verify
the exact live commit, topology, 30 fresh demo/workspace/proof sequences,
concurrent plan enforcement, validation recovery, rate limiting, routes,
privacy, accessibility, desktop, and mobile behavior.

## Commercial scope deviation

The brief specifies `$59 per business each month plus technician seats`. The
available paid-unlock contract supports a `$59 one-time business license` and
has no subscription or seat API. This repair preserves the already disclosed
one-time model, uses Sociobot-hosted checkout, and does not add direct billing.

## Known gaps and next steps

- Subscription and technician-seat billing remain blocked on a compatible
  Sociobot billing contract. Do not simulate that model in this repository.
- No service-worker update path is applicable because the product is an online
  `web-with-backend` service and makes no offline-use claim.
