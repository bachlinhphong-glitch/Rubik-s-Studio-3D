@echo off
title Rubik's Studio 3D
echo Starting Rubik's Studio 3D local server...
start http://localhost:8000
python -m http.server 8000
pause
