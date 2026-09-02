# Service Proof Loop — adversarial review 3 handoff

## Result

**PASS** on 2026-09-02 UTC with zero blocking or minor findings.

The review covered source commit
`162723a92fba9a6cd1f3e2177fd7da58eef71092` and live build
`a857121cbae59a0d6f636b2da4ec18223240fb39`. Their product source is
identical; later commits contain QA documentation and evidence only. Product
code was not modified.

The complete report is `.factory/review-3.md`. Reproducible browser, claim,
flow, accessibility, and route evidence is in
`.factory/evidence-review-3/`.

## What was verified

- Fresh 390 px and desktop first screens state the job, audience, and first
  action without scrolling.
- The one-click demo immediately shows realistic visit data. Reset changes its
  workspace and token without changing real storage.
- A live client reply and extra returned to the workspace and exported in the
  next-visit CSV. Leaving demo removed its session key.
- Every one of the 19 exact `.factory/claims.json` commands passed from a clean
  clone after `npm ci`.
- The aggregate gate passed 13 Rust tests, 28 deployment/documentation tests,
  the runtime check, and 46 desktop/mobile browser tests. Lint and build pass.
- Every finding from reviews 1 and 2 remains fixed in live behavior and code.
- All stable routes, metadata, links, 404 behavior, back navigation, route
  focus, privacy headers, and same-origin demo requests passed.
- Live Axe scans found zero WCAG A/AA violations on five routes in light and
  dark modes. The four-route URL verifier reported no console errors or basic
  accessibility failures.
- The landing and README sentence audit found no over-cap sentence, banned
  marketing word, vague heading, inconsistent term, or weak action label.

## How to reproduce

```sh
npm ci
npm run test:all
npm run lint
npm run build
npm run test:a11y
npm run test:live
```

The review additionally runs every command in `.factory/claims.json`
individually from a fresh clone and opens the deployed service in fresh
Playwright contexts.

## Formal commercial scope decision

The accepted variance remains recorded in `.factory/scope-decision.json`.
Research proposes **$59 per business each month plus technician seats**. The
available Sociobot paid-unlock contract supports the delivered **$59 one-time
business license for one workspace**, not recurring technician-seat billing.
The product and checkout describe the delivered terms accurately.

## Known gaps and next steps

No product gap remains in the reviewed scope. Re-run the claim manifest and
adversarial checklist after future product or deployment changes.
