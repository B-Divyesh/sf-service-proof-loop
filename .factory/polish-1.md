# Service Proof Loop — polish 1 evidence

## Finding map

| Finding | Change | Evidence |
| --- | --- | --- |
| F-1-1 | Proof HTML and `/api/proof/*` send noindex and private no-store controls; proof HTML has no canonical. | `@claim:proof-page-privacy`; live header check recorded below. |
| F-1-2 | Replaced merchant/refund assertions with the observed disclosure: Sociobot billing starts checkout and Dodo hosts the payment page. | `@claim:paid-license`; Dodo 303 assertion. |
| F-1-3 | Server and browser now set route-specific Open Graph, Twitter, title, description, URL, and canonical metadata. | `each route has matching server and rendered social metadata`. |
| F-1-4 | Rewrote preview heading to “See proof and next-visit extras.” | `copy-audit.md`; landing browser test. |
| F-1-5 | Rewrote process heading to “How proof reaches the next visit.” | `copy-audit.md`; landing browser test. |
| F-1-6 | Rewrote the third step to name approved extras and the next visit. | `copy-audit.md`; landing browser test. |
| F-1-7 | Replaced “ready-to-use” with the exact CSV columns. | `@claim:next-visit-export`; `copy-audit.md`. |
| F-1-8 | Rewrote the boundaries heading to “What this service handles.” | `copy-audit.md`; landing browser test. |
| F-1-9 | Replaced subjective boundary copy with stored data facts. | `copy-audit.md`; landing browser test. |
| F-1-10 | Rewrote pricing heading to “Get unlimited proof links.” | `copy-audit.md`; landing browser test. |
| F-1-11 | Standardized client and extra across hero, workspace, and add-extra controls. | `@claim:configurable-extras`; `copy-audit.md`. |
| F-1-12 | Changed the apparent restriction to an explicit instruction not to enter home-entry codes or payment card details. | `copy-audit.md`; landing browser test. |
| F-1-13 | Rewrote the two README sentences in plain language. | README review; `npm test`. |
| F-1-14 | Removed the unlisted non-root runtime statement from README. | README review; `claims.json` audit. |
| F-1-15 | Added the exact `deployment-continuity` claim and `npm run test:live` command. | `claims.json`; live command recorded below. |

## Local evidence

- Fresh clone `/tmp/service-proof-loop-clean.JGcwZx` at
  `0076082a591501a5aa35cdf3084ceedb7847f666`: every non-live command listed in
  `claims.json` passed individually after `npm ci`.
- `npm test` passed (26 deployment/runtime checks and 46 desktop/mobile browser
  tests); `cargo test --all-targets`, `npm run lint`, and `npm run build` pass.

## Live evidence

- Live application build:
  <https://service-proof-loop.sociobot.in/health> returned the exact SHA
  `0076082a591501a5aa35cdf3084ceedb7847f666`.
- `npm run test:live` passed: one active revision and replica, Azure Files at
  `/data`, 400/400 concurrent demo reads, 20/20 proof reads, and 45/130 rate
  bursts with 429 responses.
- Cold URL checks passed with no console errors and one heading/main landmark:
  [landing desktop](evidence-polish-1/landing/screenshot-desktop.png),
  [landing mobile](evidence-polish-1/landing/screenshot-mobile.png),
  [demo mobile](evidence-polish-1/demo/screenshot-mobile.png),
  [privacy desktop](evidence-polish-1/privacy/screenshot-desktop.png), and
  [terms desktop](evidence-polish-1/terms/screenshot-desktop.png).
- The live proof check at a fresh, isolated demo proof URL returned
  `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: private,
  no-store` for both HTML and API, with no canonical in HTML. Screenshot:
  [proof mobile](evidence-polish-1/proof/proof-mobile.png).
- Live `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`. Live
  Playwright ran the proof-privacy, route-metadata, and Axe tests: 8/8 passed
  across desktop and mobile.
