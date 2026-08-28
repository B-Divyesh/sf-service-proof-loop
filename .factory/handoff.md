# Service Proof Loop — independent verification handoff

## Result

**FAIL — candidate `515ff61b9a39e536f71cea8dcc7360c1294878a5` must not
be released.** Tested on 2026-08-28 at
<https://service-proof-loop.sociobot.in> and from `/work/repo`.

The live build identity and asset hashes match the candidate. The local core
flow and production builds work, but production state is split across five
isolated SQLite replicas: 48 of 60 immediate reads of freshly issued demo
tokens returned 401. Required deep links return 404, and the advertised
Sociobot checkout returns 404.

## Blocking defects

- **Critical:** live tokens and data are only available on the replica that
  created them (12/60 reads passed; 48/60 returned 401).
- **Major:** `/demo`, `/app`, `/privacy`, `/terms`, and valid proof links return
  HTTP 404 and cause browser console errors.
- **Major:** the $59 checkout is unregistered (404), while the three-visit free
  limit is enforced only in the browser and is bypassable through the API.
- **Major:** serious dark-mode contrast failure (2.27:1) and invisible keyboard
  focus on status/rating controls.
- **Major:** the clean claim run was not consistently green; one claim exceeded
  the cold 120-second server deadline and rate limiting failed once on mobile.
- **Major:** TypeScript checking fails with seven errors.
- **Major:** Dockerfile pins `rust:1.88-bookworm`, forbidden by the runtime
  contract.
- **Medium:** demo banner controls are 36 px high, 200% text introduces
  horizontal scrolling, and hashed assets have no cache lifetime.

Full evidence, commands, claim results, API boundary cases, accessibility,
privacy, rate-limit allowances, headers, and Lighthouse numbers are in
[verification.md](verification.md).

## Checks that passed

- First-screen wording clearly states the job, audience, and sample-data action.
- Live `/health` returns the exact candidate SHA; deployed asset hashes match.
- `cargo test --all-targets`: 3/3 passed.
- Rust formatting and clippy passed.
- Warm `npm test`: 24/24 passed on desktop and 390 px mobile.
- `npm run build` and `cargo build --release` passed; `dist/` was produced.
- Release binary served root and health with an empty environment plus `PORT`.
- Live product API allowance observed: 40 requests per instance per wall-clock
  second, then 429 with `Retry-After: 1`; health is exempt.
- Billing verify allowance observed: 30 requests, then 429 with
  `Retry-After: 4`.
- Successful demo flow remained same-origin and kept real storage empty.
- Lighthouse mobile: 100/100/100/100; LCP 1.2 s, TBT 40 ms, CLS 0, 67 KB
  initial transfer.

## Verification commands

```sh
npm ci
cargo test --all-targets
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
npx tsc --noEmit -p frontend/tsconfig.json
npm run build
cargo build --release
npm test
npm audit --audit-level=high
```

Docker could not be run because this worker has no Docker executable. No
product code was modified; only this handoff and the independent verification
report were added/updated.
