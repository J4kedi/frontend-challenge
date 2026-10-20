#!/usr/bin/env bash
# Regenerates the Linux visual baselines inside the official Playwright image,
# so they match CI byte for byte on any host OS. node_modules lives in an
# anonymous volume: the host's (Windows/macOS) binaries are never touched.
set -euo pipefail
IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"
ROOT="$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)"

MSYS_NO_PATHCONV=1 docker run --rm --ipc=host \
  -v "$ROOT":/work -v /work/node_modules -w /work \
  "$IMAGE" bash -lc "corepack enable >/dev/null && CI=1 pnpm install --frozen-lockfile && pnpm exec playwright test --grep @visual ${*:---update-snapshots}"
