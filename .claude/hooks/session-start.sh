#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install backend dependencies (includes better-sqlite3 native addon, supertest, docx)
if [ ! -d "node_modules" ] || [ ! -d "node_modules/better-sqlite3" ]; then
  echo "Installing backend dependencies..."
  npm install --silent 2>&1
fi

# Install frontend dependencies (includes jest, testing-library, vite)
if [ ! -d "frontend/node_modules" ] || [ ! -d "frontend/node_modules/jest" ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install --silent 2>&1)
fi

echo "Dependencies ready."
