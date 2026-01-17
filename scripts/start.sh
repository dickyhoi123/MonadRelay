#!/bin/bash
set -Eeuo pipefail

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

# 使用脚本所在目录作为项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

start_service() {
    cd "${PROJECT_ROOT}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    npx next start --port ${DEPLOY_RUN_PORT}
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
