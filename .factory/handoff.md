# Service Proof Loop — review 2 handoff

## Result

**FAIL** at reviewed source `0beb24927af62656b665105b99669539a21741ff` on
2026-09-02 UTC. No product code was changed.

## What was done

- Reviewed the live product cold at 390 px and desktop.
- Verified the one-click demo, reset, separate demo storage, real-storage
  sentinel, same-origin requests, client reply, next-visit CSV, private proof
  headers, routing, metadata, links, 404, and visual identity.
- Ran all 19 manifest commands from a fresh clone after `npm ci`.
- Ran supplementary direct live browser claim checks: 24 desktop/mobile checks
  passed. The five Rust claim commands, runtime command, production build, and
  live continuity command passed.

## Known gaps

- The exact `npm test -- --grep @claim:...` manifest commands fail before
  Playwright. `tests/release-docs.test.mjs` requires wording that the existing
  handoff no longer contains about the accepted commercial scope variance.
  This is blocking finding F-2-1 in `.factory/review-2.md`.
- One README deployment instruction is 31 words. This is minor finding F-2-2.

## Recheck

Read `.factory/review-2.md`, restore the missing accepted-scope handoff
summary, then run:

```sh
npm ci
npm test
cargo test --all-targets
npm run build
npm run test:live
```
