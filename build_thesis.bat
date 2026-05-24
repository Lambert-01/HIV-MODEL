@echo off
:: ── FracHIV Thesis Builder (no Perl / no latexmk required) ──
:: Uses pdflatex directly: 3 passes to resolve TOC, refs, and bibliography.

set TEX=thesis.tex
set JOB=thesis

echo [1/3] First pdflatex pass...
pdflatex -interaction=nonstopmode -jobname=%JOB% %TEX%
if errorlevel 1 goto :error

echo [2/3] Second pdflatex pass (resolves TOC and cross-references)...
pdflatex -interaction=nonstopmode -jobname=%JOB% %TEX%
if errorlevel 1 goto :error

echo [3/3] Third pdflatex pass (finalises all references)...
pdflatex -interaction=nonstopmode -jobname=%JOB% %TEX%
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  SUCCESS: thesis.pdf has been generated.
echo ============================================================
echo.

:: Open the PDF automatically
start "" "%JOB%.pdf"
goto :end

:error
echo.
echo ============================================================
echo  ERROR: pdflatex failed. Check thesis.log for details.
echo ============================================================
echo.
pause

:end
