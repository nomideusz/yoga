# syntax=docker/dockerfile:1
# Temps build for the standalone yoga app. This file is synced from asini's apps/yoga to the
# ROOT of nomideusz/yoga, where workspace packages are vendored as ./packages file: deps.
# Vercel (prod, szkolyjogi.pl) ignores this Dockerfile; Temps uses it. ADAPTER=node selects
# @sveltejs/adapter-node. No secrets at build — Turso/Maps/Resend are runtime $env/dynamic.
FROM node:22-slim
# CI=true: skip pnpm's interactive build-approval (matches Vercel/Actions; esbuild's binary ships via
# its @esbuild/<platform> dep, so the skipped build script is a no-op). minimumReleaseAge=0: don't
# re-police the already-vetted lockfile so a freshly-published transitive dep can't flake the deploy.
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH" CI=true
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0 \
 && ADAPTER=node pnpm build \
 && pnpm prune --prod
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "build/index.js"]
