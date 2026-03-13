@echo off
setlocal

REM Run from repo root regardless of current directory.
cd /d "%~dp0.."

REM Fully interactive dev preview with HMR + auto-open browser.
npm.cmd run sandbox
