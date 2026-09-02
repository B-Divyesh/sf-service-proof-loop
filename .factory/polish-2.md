# Service Proof Loop — polish 2 evidence

## Release

- Reviewed candidate: `0beb24927af62656b665105b99669539a21741ff`
- Repair commit: `7d8db70fc6a42e550e89e9b1373980b63b664b21`
- Live revision: `sf-service-proof-loop--0000050`
- Live URL: <https://service-proof-loop.sociobot.in>

## Finding map

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-1 | Retained proof-route `noindex, nofollow, noarchive` and `private, no-store` controls; proof HTML has no canonical. | `@claim:proof-page-privacy`; live [audit](evidence-polish-2/live-cold-audit.json) and [proof mobile](evidence-polish-2/proof-mobile.png). |
| F-1-2 | Retained one exact checkout disclosure: Sociobot billing starts checkout and Dodo hosts the payment page. | `@claim:paid-license`; live 46-check browser suite. |
| F-1-3 | Retained route-specific titles, descriptions, canonicals, Open Graph, and Twitter metadata. | Live [route audit](evidence-polish-2/live-cold-audit.json) for `/`, `/demo`, `/app`, `/privacy`, `/terms`, and 404. |
| F-1-4 | Kept the result-naming preview heading “See proof and next-visit extras.” | Live [landing desktop](evidence-polish-2/landing-desktop.png); `copy-audit.md`. |
| F-1-5 | Kept the process heading “How proof reaches the next visit.” | Live [landing desktop](evidence-polish-2/landing-desktop.png); `copy-audit.md`. |
| F-1-6 | Kept “Add approved extras to the next visit.” for the third step. | `@claim:next-visit-export`; live landing screenshot. |
| F-1-7 | Kept the exact next-visit CSV columns instead of an unsupported adjective. | `@claim:next-visit-export`; full live browser suite. |
| F-1-8 | Kept the concrete boundary heading “What this service handles.” | Live landing screenshots; `copy-audit.md`. |
| F-1-9 | Kept factual storage and non-goal copy. | `@claim:privacy-data-flow`; live landing screenshot. |
| F-1-10 | Kept pricing scope to a $59 one-time license for one workspace. | `@claim:paid-license`; live route and pricing browser check. |
| F-1-11 | Kept “client” and “extra” terminology consistent across workspace and proof. | `@claim:configurable-extras`; `copy-audit.md`. |
| F-1-12 | Kept the explicit instruction not to enter home-entry codes or card details. | Live [landing desktop](evidence-polish-2/landing-desktop.png); `copy-audit.md`. |
| F-1-13 | Kept the README’s plain-language product and run instructions. | Clean-clone `npm test`; `copy-audit.md`. |
| F-1-14 | Kept the untestable non-root runtime statement removed. | `claims.json` audit; clean-clone `npm test`. |
| F-1-15 | Kept the `deployment-continuity` claim and its real verifier command. | Post-deploy `EXPECTED_SHA=7d8db70… npm run test:live`: 400/400 reads, 20/20 proofs, rate limits. |
| F-2-1 | Restored the **Formal commercial scope decision** in `handoff.md`, linking `.factory/scope-decision.json`, both exact pricing scopes, and the accepted paid-unlock reason. | Clean-clone `node --test tests/release-docs.test.mjs`; all 19 registered claim commands passed individually. |
| F-2-2 | Split the README deployment instruction into two plain sentences. | README copy audit: “Run `npm run test:live` after deployment.” is 6 words; the follow-up sentence is 10 words. |

## Verification

- Clean clone: `npm ci`, `npm test`, `cargo test --all-targets`, `npm run lint`,
  `npm run build`, and `npm audit --omit=dev --audit-level=high` all passed.
- Clean clone claim manifest: every one of the 19 listed commands passed when
  invoked individually; this includes the 12 browser-backed commands that had
  been blocked by F-2-1.
- Live: `EXPECTED_SHA=7d8db70fc6a42e550e89e9b1373980b63b664b21 npm run test:live`
  passed after deployment with one revision/replica and durable `/data`.
- Cold live browser: all 46 desktop/mobile checks passed. The cold audit has no
  console errors, no horizontal overflow at 390 px, no third-party origins,
  and no serious or critical Axe results. See
  [audit JSON](evidence-polish-2/live-cold-audit.json),
  [landing desktop](evidence-polish-2/landing-desktop.png),
  [landing mobile](evidence-polish-2/landing-mobile.png),
  [demo mobile](evidence-polish-2/demo-mobile.png), and
  [proof mobile](evidence-polish-2/proof-mobile.png).
- `/opt/fleet/lib/verify-url.sh` passed for `/`, `/demo`, `/privacy`, and
  `/terms`; artifacts are in `evidence-polish-2/verify-*`.
- Live Lighthouse mobile: 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO in
  [lighthouse-mobile.json](evidence-polish-2/lighthouse-mobile.json).
