@echo off
title Local File Sharing Server
echo Starting the Local File Sharing Server...
echo.
REM Navigate to the directory where your server.js file is located
cd /d "%~dp0"

REM Run the server with Node.js
node server.js

REM Pause to keep the terminal open in case of errors
pause