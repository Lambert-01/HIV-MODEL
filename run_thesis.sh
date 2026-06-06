#!/usr/bin/env bash
set -euo pipefail

# Build thesis/thesis.tex from the project root on macOS/Linux.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THESIS_DIR="$ROOT/thesis"
TEX_FILE="thesis.tex"
PDF_FILE="thesis.pdf"

export PATH="/Library/TeX/texbin:$PATH"

if [[ ! -f "$THESIS_DIR/$TEX_FILE" ]]; then
  echo "ERROR: Cannot find $THESIS_DIR/$TEX_FILE."
  exit 1
fi

cd "$THESIS_DIR"

echo
echo "Building $TEX_FILE..."
echo

if command -v pdflatex >/dev/null 2>&1; then
  echo "[1/3] Running pdflatex..."
  pdflatex -interaction=nonstopmode "$TEX_FILE"

  echo "[2/3] Resolving references..."
  pdflatex -interaction=nonstopmode "$TEX_FILE"

  echo "[3/3] Final pass..."
  pdflatex -interaction=nonstopmode "$TEX_FILE"
elif command -v tectonic >/dev/null 2>&1; then
  echo "pdflatex was not found; using tectonic instead..."
  tectonic "$TEX_FILE"
else
  echo "ERROR: No LaTeX engine was found."
  echo
  echo "Option 1, no admin password usually needed:"
  echo "  brew install tectonic"
  echo
  echo "Option 2, traditional pdflatex; macOS will ask for your password:"
  echo "  brew install --cask basictex"
  echo "  eval \"\$(/usr/libexec/path_helper)\""
  exit 1
fi

echo
echo "============================================================"
echo "SUCCESS: $THESIS_DIR/$PDF_FILE has been generated."
echo "============================================================"
echo

if command -v open >/dev/null 2>&1; then
  if ! open "$PDF_FILE"; then
    echo "PDF generated, but macOS could not open it automatically."
    echo "Open it manually from: $THESIS_DIR/$PDF_FILE"
  fi
fi
