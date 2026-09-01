# Independent verification 14 — Service Proof Loop

**Result: FAIL**

Verified on 2026-09-01 UTC against candidate
`e6271a3a3b64e2d5257c0b1c4200afe3fa20530c` at
<https://service-proof-loop.sociobot.in>. Product source was not changed during
this verification.

## Release decision

The release is not approved because a declared claim test was observed to fail
in the aggregate browser-claim run. The exact same claim then passed when run
on its own, and the full suite passed later. This is still a release-blocking
test reliability finding: claim verification must be repeatable.

The live build identity does match the candidate:

```json
{"build_sha":"e6271a3a3b64e2d5257c0b1c4200afe3fa20530c","status":"ok"}
```

## Required claims gate

`.factory/claims.json` is present with 18 entries. Each listed command was
started individually after `npm ci`; the initial pre-install invocation stopped
at the expected missing local `tsc` executable and was repeated after the
locked dependencies were installed.

The claim-specific Rust tests pass as part of `cargo test --all-targets`; the
individual `@claim:paid-license` command passed in both desktop and mobile
projects. The non-listed aggregate check below, which runs all browser claims,
did not have a stable result:

```text
npm test -- --grep @claim
1 failed, 23 passed (42.2s)
[chromium] @claim:paid-license
expected: "License active on this browser."
actual: no matching visible element within 7 seconds
```

The immediate exact retry passed (2/2 projects), and the later full `npm test`
run passed (46/46). That does not clear the observed claim-test failure.

## First read and product flow

A cold live visit returned 200 with title `Service Proof Loop — Send proof after
each visit`, one H1, and no console or page errors. The first screen says
“Send proof. Plan the next visit.” It identifies recurring service teams as the
audience and places `Try it with sample data` beside “Loads a sample visit.
Nothing is saved.” The one-click demo loaded the Willow Street sample and the
persistent demo banner with Reset demo and Start for real controls.

Independent live checks confirmed that a client can accept a completed visit,
select the refrigerator extra, add a comment, save the reply, and see the
extra on the next visit. Normal and recovery paths returned these results:

- blank workspace name: 400, `Enter between 1 and 80 characters.`;
- valid workspace creation: 201 with an access token;
- invalid workspace token: 401, `Your workspace access is not valid.`;
- invalid past date and blank checklist label: 400 in the live verification.

## Quality and deployment checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages, 0 reported vulnerabilities |
| `npm run lint` | PASS — format check and Clippy warnings-denied |
| `cargo test --all-targets` | PASS — 12 integration tests |
| `npm test` | PASS — 46 browser, runtime, and deployment checks |
| `npm run build` | PASS — `dist/` produced |
| live `PLAYWRIGHT_BASE_URL=… npx playwright test --grep @a11y` | PASS — 4/4, including axe serious/critical checks, keyboard focus, dark treatment, touch targets, and 200% reflow |
| live `npm run test:live` | PASS — build identity, durable single writer, 20 demos, 400 concurrent workspace reads, 20 matching proof reads, plan boundary, validation, and rate checks |

The production frontend output is 32.48 kB JavaScript (10.27 kB gzip) and
15.44 kB CSS (4.41 kB gzip). At 390 px the live demo had no horizontal
overflow. With reduced motion enabled, observed animation and transition
durations were `0.01ms`. Docker was unavailable in this verification image, so
the container build was not rerun; the live container reports the exact tested
build SHA.

## Privacy, headers, rate allowance, and caching

Cold landing and demo browser request logs contained only
`https://service-proof-loop.sociobot.in`; no external fonts, scripts, or
analytics were requested. Browser console and page-error logs were empty.

Live responses include CSP with `frame-ancestors 'none'`, HSTS,
`X-Content-Type-Options: nosniff`, strict-origin referrer policy, frame denial,
and a camera/microphone/geolocation-denying Permissions-Policy. Hashed JS and
CSS have one-year immutable caching; the hero image has one-day caching.

The live continuity check observed a per-forwarded-client burst allowance of
40 requests. A 45-request burst returned 40 allowed and 5 limited responses;
a 130-request burst returned 40 allowed and 90 limited responses. The check
asserted `Retry-After: 1` on each 429 response.

## Defects by severity

- Critical: none.
- High: **Claim-test reliability.** The aggregate `@claim` run failed the
  desktop `paid-license` claim because the restored-license confirmation did
  not appear within seven seconds. An exact retry and the full suite passed,
  which establishes a nondeterministic result rather than a confirmed steady
  product-flow failure. Make this claim test and its license-restore flow
  repeatable, then rerun every command in `.factory/claims.json`.
- Moderate: none.
- Low: container-build verification could not run because Docker is absent in
  this verification environment; the live build identity did match the
  candidate.

## Retest instructions

```sh
npm ci
npm run lint
cargo test --all-targets
npm test
npm test -- --grep @claim
npm run build
npm run test:live
```
