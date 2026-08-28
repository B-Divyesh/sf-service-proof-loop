FROM node:22-alpine AS web
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM rust:1-slim AS server
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
WORKDIR /build
COPY Cargo.toml Cargo.lock* build.rs ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN groupadd --system service && useradd --system --gid service --home-dir /app service \
    && mkdir -p /app/public /data && chown -R service:service /app /data
WORKDIR /app
COPY --from=server /build/target/release/service-proof-loop /app/service-proof-loop
COPY --from=web /build/dist /app/public
ENV PORT=8080 STATIC_DIR=/app/public
USER service
EXPOSE 8080
CMD ["/app/service-proof-loop"]
