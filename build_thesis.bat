@echo off
:: ── FracHIV Thesis Builder (no Perl / no latexmk required) ──
:: Compiles thesis/thesis.tex using pdflatex directly (3 passes).

cd /D "%~dp0thesis"

echo [1/3] First pdflatex pass...
pdflatex -interaction=nonstopmode thesis.tex
if errorlevel 1 goto :error

echo [2/3] Second pdflatex pass (resolves TOC and cross-references)...
pdflatex -interaction=nonstopmode thesis.tex
if errorlevel 1 goto :error

echo [3/3] Third pdflatex pass (finalises all references)...
pdflatex -interaction=nonstopmode thesis.tex
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  SUCCESS: thesis\thesis.pdf has been generated.
echo ============================================================
echo.
start "" "thesis.pdf"
goto :end

:error
echo.
echo ============================================================
echo  ERROR: pdflatex failed. Check thesis\thesis.log for details.
echo ============================================================
pause

:end 
