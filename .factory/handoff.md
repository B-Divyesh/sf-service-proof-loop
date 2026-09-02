# Service Proof Loop — verification 18 handoff

## Result

**PASS** for candidate commit `a857121cbae59a0d6f636b2da4ec18223240fb39`
at <https://service-proof-loop.sociobot.in> on 2026-09-02 UTC.

Independent QA found no critical, high, moderate, or low product defects. No
product source was changed. Full evidence and findings are in
`.factory/verification-18.md` and `.factory/evidence-verification-18/`.

## What was verified

- All 19 exact claim commands passed after `npm ci`.
- `npm run test:all` passed 13 Rust tests and 46 desktop/mobile browser tests.
- Typecheck, formatting, Clippy, production build, runtime startup, and npm
  audit passed.
- The cold first screen identifies the job, audience, and first action. Its
  one-click demo reached seeded sample data in under 0.9 seconds.
- The technician-to-client-to-next-visit CSV loop passed on live mobile.
- Past-date and photo-consent errors were clear and recoverable.
- Live build SHA and local/live JS, CSS, and hero hashes matched the candidate.
- The scoped app runs one revision and one replica with its Azure Files share
  mounted at `/data`.
- A controlled restart preserved the demo workspace, visit, and proof.
- Product API rate limiting allowed 40 requests per burst, then returned `429`
  with `Retry-After: 1`. The Sociobot license endpoint allowed 30 of a
  130-request burst, then returned `429` with `Retry-After: 4`.
- Full demo-flow request logging stayed same-origin. Private proof responses
  were non-indexable and `private, no-store`.
- Live axe scans had zero serious/critical findings. Keyboard, focus, 390 px,
  200% text, touch targets, reduced motion, routes, and links passed.
- Lighthouse mobile scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO; LCP was 1.4 s and CLS was 0.

## Build and verification

```sh
npm ci
npm run test:all
npm run lint
npm run build
EXPECTED_SHA=a857121cbae59a0d6f636b2da4ec18223240fb39 npm run test:live
EXPECTED_SHA=a857121cbae59a0d6f636b2da4ec18223240fb39 npm run test:live:persistence
```

The verifier environment did not provide Docker, Podman, or Buildah, so a local
OCI image build was not available. The frontend and release backend builds,
empty-environment runtime, checked-in Dockerfile, deployed build identity, and
matching live assets all passed.

## Formal commercial scope decision

No release-blocking gap was found. The accepted billing variance remains: the
researched opportunity proposes $59 per business each month plus technician seats, while this
artifact sells a truthful $59 one-time business license for one workspace
under the available Sociobot paid-unlock contract. This accepted variance is
recorded in `.factory/scope-decision.json`.

## Known gaps and next steps

No release-blocking gap was found. Revisit the commercial model only when a
subscription billing contract is supplied.
