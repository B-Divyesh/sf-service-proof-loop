# Service Proof Loop — independent verification 10 handoff

## Result

**FAIL — do not release candidate
`f85577356b7108ad203b5e802c1180b8b497b914`.**

Tested on 2026-08-29–30 at
<https://service-proof-loop.sociobot.in>. The repository was clean at the
candidate SHA before QA. Product code was not modified.

## Release blockers

Production serves the exact candidate image and static bytes, but its deployed
topology violates `.factory/deployment.json`:

- `maxReplicas` is 3, not 1;
- no `/data` volume mount exists;
- no template volume exists;
- load scaled the revision to three independent SQLite writers.

Fresh impact measurements:

- 196/400 authenticated workspace reads succeeded; 204 returned 401;
- 6/20 proof reads succeeded;
- concurrent free-plan writes returned 3×201 + 5×401 instead of 5×402;
- live Playwright passed 36/42;
- fresh desktop and 390 px demos showed “Visits could not load”;
- one forwarded client received 120/130 non-429 responses before the three
  replica-local limiters returned 10×429 with `Retry-After: 1`.

The researched subscription plus technician-seat model also remains replaced
by a documented $59 one-time license. Copy is honest and the work-order billing
contract explains the constraint, but this remains a variance from the
researched acceptance contract.

## What passed

- First-read copy passes: what it does, for whom, and the sample action are
  clear above the fold on desktop and mobile.
- `npm ci`: 22 packages, zero vulnerabilities.
- All 16 exact claim commands pass after clean dependency installation.
- `npm run test:all`: 12 Rust tests, 14 Node tests, runtime, and 42 local
  desktop/mobile Playwright checks pass.
- `npm run lint`, TypeScript, production build, and npm audit pass.
- Independent local normal, boundary, recovery, tenant-isolation, plan-limit,
  and restart-persistence checks pass.
- Local axe/light/dark/keyboard/touch/reflow checks pass. The live landing has
  no serious/critical axe findings.
- Privacy, headers, routes, caching, bundle budgets, and build identity pass.
- Lighthouse JSON: 100/100/100/100; LCP 1.402 s, TBT 86.5 ms, CLS 0.

Docker execution was unavailable because no container engine is installed.
The product is not a PWA, library, or CLI and has no sign-in, so those checks
are not applicable.

## Reproduce

```sh
npm ci
npm run test:all
npm run lint
npm run build
EXPECTED_SHA=f85577356b7108ad203b5e802c1180b8b497b914 npm run test:live
PLAYWRIGHT_BASE_URL=https://service-proof-loop.sociobot.in npx playwright test
```

The local commands pass. The SHA-pinned live command fails on the replica
ceiling before functional probes; live Playwright reproduces split state.

Full evidence is in [`.factory/verification-10.md`](verification-10.md) and
`.factory/evidence-10/`.

## Next steps

Deploy only with `./scripts/deploy-container.sh`; require the mounted Azure
Files share, one active replica, 400/400 reads, 20/20 proofs, atomic plan-limit
statuses, coherent 40-request rate limiting, and 42/42 live browser checks
before another release decision.
