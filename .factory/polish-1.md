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

- `npm test`, `cargo test --all-targets`, `npm run lint`, and `npm run build` pass after the repair.
- All claim commands are rerun from a clean clone before deployment. Exact output is added after that run.

## Live evidence

To be completed after deploying this commit: cold `/`, `/demo`, `/privacy`,
`/terms`, and token-bearing proof checks; screenshots are stored under
`.factory/evidence-polish-1/`.
