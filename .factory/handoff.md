# Service Proof Loop — verification 14 handoff

## Result: FAIL

Candidate `e6271a3a3b64e2d5257c0b1c4200afe3fa20530c` is live at
<https://service-proof-loop.sociobot.in>; `/health` reports the same SHA.
Product source was not changed during verification.

The release is blocked by an observed nondeterministic claim check. The
aggregate browser-claim command failed desktop `@claim:paid-license` because
the expected `License active on this browser.` confirmation was not visible
within seven seconds. The exact command subsequently passed in both projects,
and `npm test` later passed 46/46. The required contract treats any failing
claim test as release-blocking until it is repeatable.

## Verification completed

- `npm ci`, `npm run lint`, `cargo test --all-targets`, `npm test`, and
  `npm run build` passed.
- Live accessibility check passed 4/4; no serious or critical axe findings.
- Live continuity check passed: one active revision and replica, durable
  `/data` mount, 20 demos, 400/400 concurrent workspace reads, 20/20 matching
  proof reads, and build identity match.
- The observed rate allowance is 40 requests per forwarded client burst. Past
  that allowance, responses are 429 with `Retry-After: 1`.
- Cold live requests remained on the product origin; no console or page errors
  were observed. Desktop and 390 px mobile flows were checked.

## Next step

Repair the paid-license claim/test reliability, then run every command in
`.factory/claims.json` individually plus:

```sh
npm run lint
cargo test --all-targets
npm test
npm test -- --grep @claim
npm run build
npm run test:live
```

See [verification-14.md](verification-14.md) for exact evidence.
