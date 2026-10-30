#!/usr/bin/env bash
# Serve THIS checkout at http://127.0.0.1:<port>/elearnea-preview/ (the same path as GitHub Pages) for the QA scripts.
# Usage: qa/tools/serve.sh [port=8780]   Prints the server PID on stdout; stop it with: kill <pid>
set -euo pipefail
PORT=${1:-8780}; ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; D=$(mktemp -d); ln -s "$ROOT" "$D/elearnea-preview"
( cd "$D" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 >"$D/server.log" 2>&1 ) & PID=$!
sleep 0.7; echo "$PID"; echo "serving $ROOT at http://127.0.0.1:$PORT/elearnea-preview/ (pid $PID, log $D/server.log)" >&2
