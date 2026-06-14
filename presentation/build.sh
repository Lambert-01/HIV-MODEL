#!/usr/bin/env bash
# Build FracHIV_SITA_Presentation.pdf (Beamer)
# Run from the presentation/ directory:  bash build.sh

set -e
cd "$(dirname "$0")"

TEX="FracHIV_SITA_Presentation.tex"
BASE="${TEX%.tex}"

echo "==> Pass 1/2: pdflatex $TEX"
pdflatex -interaction=nonstopmode -halt-on-error "$TEX"

echo "==> Pass 2/2: pdflatex $TEX  (resolve references)"
pdflatex -interaction=nonstopmode -halt-on-error "$TEX"

echo ""
echo "==> Done: ${BASE}.pdf"

# Optional: open PDF automatically
if command -v open &>/dev/null; then
    open "${BASE}.pdf"
fi
