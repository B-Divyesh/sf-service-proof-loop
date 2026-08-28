# Service Proof Loop — independent QA handoff

## Result

**FAIL — do not release.** Independent verification was performed on
2026-08-28 against candidate
`5b6e3d4e86fef70c1c80427dd722393d931a9fd4` and
<https://service-proof-loop.sociobot.in>.

The full report is in [verification-2.md](verification-2.md).

## Release blockers

- The active Azure revision has three replicas despite the repository handoff
  saying it must remain at one. Each replica has a different SQLite database.
  Fresh demo tokens returned 200 on some connections and 401 on others; four
  of four cold browser demos failed immediately.
- The three-visit free limit is raceable. Eight simultaneous requests created
  eight visits locally and four live; sequential requests correctly stop the
  fourth with 402.
- Rate limiting is per replica. One client received 120 unblocked responses
  across fresh connections before 429, rather than the documented burst of 40.
- The API accepts a past next-visit date and an all-whitespace checklist item.

## What passed

- All 11 exact commands in `.factory/claims.json` passed after `npm ci`.
- `cargo test --all-targets` passed 8/8; `npm test` passed 32/32 across desktop
  and 390 px Chromium.
- TypeScript, rustfmt, Clippy, Vite production build, optimized Rust build, and
  npm audit all passed.
- The release binary starts with only `PORT`; Docker was unavailable locally.
- Live `/health` reports the tested SHA, and all 13 live static files are
  byte-identical to candidate `dist/`.
- Checkout is registered at $59 and returns 303 to hosted Dodo checkout.
- Axe found no serious/critical issues on the pages that could be reached;
  focus, reduced motion, 200% reflow, privacy requests, headers, and bundle
  budgets pass.
- Lighthouse mobile scores are 100/100/100/100; LCP is 1.20 s and CLS is 0.

## Reproduce

```sh
npm ci
cargo test --all-targets
npm run lint
npm run typecheck
npm run build
cargo build --release
npm test
```

Key raw outputs and screenshots are under `.factory/qa-artifacts/`.

## Next steps

1. Force the deployed app to exactly one replica, or migrate SQLite state and
   rate-limit state to shared services.
2. Make plan enforcement transactional and add a concurrent claim test.
3. Reject past next dates and blank checklist labels.
4. Re-run independent live QA, including fresh TLS connections and the first
   click from an empty browser context.
