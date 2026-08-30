# Independent verification 13 — Service Proof Loop

**Result: PASS**

Verified on 2026-08-30 UTC against candidate
`b44500bb3ad3664d8a785bb76bc7a8dda138e607` at
<https://service-proof-loop.sociobot.in>. No product source was changed during
verification.

## Release decision

The candidate meets the researched product's smallest useful loop: a technician
can record consented proof, a client can open a private link without an account,
reply with a rating or problem and choose an extra, and the business receives the
result in its next-visit export. The live `/health` response was:

```json
{"build_sha":"b44500bb3ad3664d8a785bb76bc7a8dda138e607","status":"ok"}
```

The one-time $59 license is a documented, accepted variance from the researched
monthly-plus-seat model in `.factory/scope-decision.json`; checkout, copy, and
the registered billing product consistently describe the one-time model. It is
not presented as a subscription.

## Required claims gate

`.factory/claims.json` exists and all 16 declared commands were run separately
from the clean candidate before other QA. Every command passed:

| Claim | Result |
| --- | --- |
| demo-sandbox, no-account, next-visit-export, same-origin-demo, configurable-extras | PASS — each Playwright command passed in desktop and 390 px projects |
| proof-expiry, plan-limit, demo-expiry, access-token-hashing | PASS — each named Rust claim test passed |
| paid-license, rate-limit, no-tracking, privacy-data-flow, photo-upload, problem-rating | PASS — each Playwright command passed in desktop and 390 px projects |
| zero-config-runtime | PASS — `npm run test:runtime` started the empty-environment service on port 8080 and checked `/health` |

## First-read and live product QA

A cold desktop browser visit returned HTTP 200 with no console or page errors.
The first screen plainly says **“Send proof. Plan the next visit.”**, names
recurring service teams needing client feedback and approved extras, and places
**“Try it with sample data”** beside **“Loads a sample visit. Nothing is
saved.”** It therefore answers what the product does, who it is for, and what to
click first. The one-click action opened `/demo`, showed the realistic Willow
Street sample, and displayed the persistent `Demo — sample data, nothing is
saved` banner with Reset demo and Start for real.

Independent live API exercise used demo-only workspaces:

- demo creation → authenticated visit → private proof → problem report/rating
  2 → selected refrigerator extra returned 200 at every step; the workspace
  then showed `problem`, rating `2`, and the selected `$28` extra;
- blank business name returned 400 with `Enter between 1 and 80 characters.`;
  an invalid workspace token returned 401; an unknown proof token returned 404;
- 20 isolated demos each received 20 simultaneous authenticated workspace
  reads plus a matching proof read: **20/20 demos, 400/400 reads, and 20/20
  proofs returned 200**. This is fresh evidence that the deployed single-writer
  SQLite service no longer splits demo/proof state;
- 45 same-client requests to `/api/not-found` returned **40 × 404 and 5 × 429**.
  Every observed 429 included `Retry-After: 1`; the observed allowance is 40
  requests per forwarded client burst.

## Quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 22 packages installed; audit reported 0 vulnerabilities |
| `npm run lint` | PASS — rustfmt and Clippy with warnings denied |
| `cargo test --all-targets` | PASS — 12 tests |
| `npm test` | PASS — 42 browser/runtime tests, desktop and 390 px |
| `npm run build` | PASS — produced `dist/` |
| live `PLAYWRIGHT_BASE_URL=… npm run test:a11y` | PASS — 4 live checks, including serious/critical axe, dark mode, keyboard, touch targets, and 200% reflow |
| Lighthouse mobile, live landing | PASS — Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.2 s, CLS 0, TBT 0 ms, transfer 66 KiB |

The shipped initial JS is 31,751 B raw / 10,144 B gzip; CSS is 15,437 B raw /
4,414 B gzip; the hero WebP is 18,322 B. The mobile demo has no horizontal
overflow, and `prefers-reduced-motion: reduce` reduced animation duration to
0.01 ms. Visual review found a clear, product-specific ceramic/evidence system
at both desktop and 390 px widths.

## Privacy, security, and deployment checks

- Fresh cold landing and demo request logs contained only
  `https://service-proof-loop.sociobot.in`; no third-party fonts, scripts, or
  analytics loaded. Both runs had no console/page errors.
- Live responses include CSP with `frame-ancestors 'none'`, HSTS,
  `X-Content-Type-Options: nosniff`, strict-origin referrer policy, frame
  denial, and a camera/microphone/geolocation-denying Permissions-Policy.
- `/`, `/demo`, `/app`, `/privacy`, `/terms`, robots, sitemap, JS, CSS, and
  hero all returned 200; an unknown route returned the designed HTTP 404.
  Hashed JS/CSS use one-year immutable caching; the hero uses one-day caching.
- Semantic/live accessibility coverage confirms `lang=en`, page titles, a
  single page H1, main landmark, skip link, focus movement and announcements,
  labelled controls, image alternatives, visible focus, and no serious or
  critical axe findings.

## Limitations of this verification environment

The repository does not include a `verify-url.sh`, and the referenced
`/opt/fleet/lib/verify-url.sh` was unavailable in this clean verifier image.
Equivalent live checks were completed through the 4-case Playwright axe and
keyboard suite, cold request/error capture, and response inspection. Docker is
not installed in this verifier image, so the Docker build could not be rerun;
the exact candidate image is nevertheless serving live with the matching health
SHA. These are environment limitations, not product defects.

## Defects by severity

- Critical: none.
- High: none.
- Moderate: none.
- Low: none.

## Handoff

Release candidate `b44500bb3ad3664d8a785bb76bc7a8dda138e607` is approved.
For a repeat local run:

```sh
npm ci && npm run lint && cargo test --all-targets && npm test && npm run build
```

Verify the deployment build identity with
`curl https://service-proof-loop.sociobot.in/health`.
