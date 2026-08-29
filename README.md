# Service Proof Loop

Send visit proof and carry approved extras into the next recurring visit.

Service Proof Loop is for cleaning and maintenance businesses with repeat
clients. A technician records a checklist, note, and consented photos. The
client opens a private link without an account. Their reply and selected extras
appear beside the next visit and in a CSV export.

The product does not handle dispatch, payments, payroll, public reviews, or
worker tracking.

## Try the sample

Open `/demo`, or visit
<https://service-proof-loop.sociobot.in/demo> after deployment. The demo creates
an isolated 24-hour workspace. Choose **Reset demo** to start with new sample
data. See [.factory/demo.md](.factory/demo.md) for the exact sandbox behavior.

## Run locally

You need Node.js 22+, current stable Rust, and SQLite development libraries.

```sh
npm ci
npm run build
DATABASE_URL='sqlite:service-proof-loop.db?mode=rwc' STATIC_DIR=dist cargo run
```

Open <http://localhost:8080>. The container needs no environment variables and
listens on port 8080 by default.

For frontend development, run the API on port 8080. Then run `npm run dev` in a
second terminal and open <http://localhost:5173>.

## Test and verify

```sh
cargo test --all-targets
npm run typecheck
npm run lint
npm test
npm run build
docker build --build-arg BUILD_SHA=local -t service-proof-loop .
docker run --rm -p 8080:8080 service-proof-loop
```

`npm test` starts the built service and runs Chromium at desktop and 390 px.
The suite covers the demo sandbox, client reply, extra configuration, CSV
contents, offline messaging, keyboard-ready semantics, and serious axe issues.
Every product claim and its command is listed in
[.factory/claims.json](.factory/claims.json).

## Configuration

- `PORT`: HTTP port. Defaults to `8080`.
- `DATABASE_URL`: SQLite URL. Defaults to `/data/service-proof-loop.db`.
- `BILLING_BASE_URL`: license verifier URL. Defaults to the Sociobot product endpoint.
- `STATIC_DIR`: built frontend directory. Defaults to `dist`.
- `BUILD_SHA`: embedded during the container build and returned by `/health`.

No signing secret is required. Workspace and production proof access use random
tokens stored as SHA-256 hashes. Demo proof tokens are also retained inside the isolated,
24-hour demo workspace so the sample link can be reopened. Proof links expire
after 14 days. Every API route except `/health` has a forwarded-IP rate limit.

## Billing

The free plan accepts three completed visits. A $59 one-time business license
adds unlimited visits. Checkout and license verification use the Sociobot billing
API. The server enforces the limit even when its browser controls are bypassed.

## Deployment

The multi-stage [Dockerfile](Dockerfile) builds the Vite frontend and Rust
service. It runs as a non-root user and serves the API and frontend from one
container. The factory supplies `BUILD_SHA`; it may deploy with only `PORT`.
The checked-in [.factory/deployment.json](.factory/deployment.json) fixes the
service at one replica and mounts the `service-proof-loop-data` Azure Files
share at `/data`. The deployment script applies the image, durable mount,
single-revision mode, and replica ceiling in one update. It then verifies the
live topology and build identity. Do not raise the replica count without moving
SQLite and rate-limit state to shared services.

```sh
./scripts/deploy-container.sh
```

## Privacy and license

The product includes `/privacy` and `/terms`. It does not load third-party
fonts, scripts, or analytics. Generated art provenance is recorded in
[.factory/design.md](.factory/design.md).

The source is available under the [MIT License](LICENSE).
