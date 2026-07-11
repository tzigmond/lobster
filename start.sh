#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting LOBSTER..."

# FastAPI server (spawns the C++ engine as a subprocess)
"$SCRIPT_DIR/server/.venv/bin/uvicorn" server.main:app \
    --app-dir "$SCRIPT_DIR" \
    --host 0.0.0.0 \
    --port 8000 &
SERVER_PID=$!

# React dev server
cd "$SCRIPT_DIR/web" && npm run dev &
WEB_PID=$!

echo ""
echo "  API  →  http://localhost:8000"
echo "  Web  →  http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $SERVER_PID $WEB_PID 2>/dev/null" EXIT INT TERM
wait
