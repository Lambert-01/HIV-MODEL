@echo off
setlocal

REM Build thesis/thesis.tex from the project root.
REM Run this file by double-clicking it or from PowerShell with:
REM   .\run_thesis.bat

set "ROOT=%~dp0"
set "THESIS_DIR=%ROOT%thesis"
set "TEX_FILE=thesis.tex"
set "PDF_FILE=thesis.pdf"

if not exist "%THESIS_DIR%\%TEX_FILE%" (
  echo ERROR: Cannot find "%THESIS_DIR%\%TEX_FILE%".
  pause
  exit /b 1
)

where pdflatex >nul 2>nul
if errorlevel 1 (
  echo ERROR: pdflatex was not found. Check that TinyTeX or MiKTeX is installed and added to PATH.
  pause
  exit /b 1
)

pushd "%THESIS_DIR%"

echo.
echo Building %TEX_FILE%...
echo.

echo [1/3] Running pdflatex...
pdflatex -interaction=nonstopmode "%TEX_FILE%"
if errorlevel 1 goto :build_failed

echo [2/3] Resolving references...
pdflatex -interaction=nonstopmode "%TEX_FILE%"
if errorlevel 1 goto :build_failed

echo [3/3] Final pass...
pdflatex -interaction=nonstopmode "%TEX_FILE%"
if errorlevel 1 goto :build_failed

echo.
echo ============================================================
echo SUCCESS: "%THESIS_DIR%\%PDF_FILE%" has been generated.
echo ============================================================
echo.

start "" "%PDF_FILE%"
popd
exit /b 0

:build_failed
echo.
echo ============================================================
echo ERROR: Build failed. Check "%THESIS_DIR%\thesis.log".
echo ============================================================
echo.
popd
pause
exit /b 1

