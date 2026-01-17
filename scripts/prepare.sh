#!/bin/bash
set -Eeuo pipefail

# 使用脚本所在目录作为项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "${PROJECT_ROOT}"

echo "Installing dependencies in ${PROJECT_ROOT}..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
