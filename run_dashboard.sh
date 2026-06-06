#!/usr/bin/env bash
set -euo pipefail

# Start the Flask dashboard on macOS/Linux.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$ROOT/.venv311/bin/python"

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "ERROR: Cannot find $VENV_PYTHON."
  echo "Create the environment and install dependencies first:"
  echo "  /usr/local/bin/python3.11 -m venv .venv311"
  echo "  .venv311/bin/python -m pip install -r requirements.txt"
  exit 1
fi

cd "$ROOT"

PORT="${PORT:-5000}"
echo "Starting FracHIV-SITA Lab dashboard..."
echo "Open http://127.0.0.1:$PORT/dashboard"
echo

exec "$VENV_PYTHON" app.py
