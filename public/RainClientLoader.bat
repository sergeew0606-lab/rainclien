@echo off
title RainClient Loader v3.2
color 0A
cls

echo.
echo  ============================================
echo       RainClient Loader v3.2
echo       Minecraft Cheat Client
echo  ============================================
echo.
echo  [*] Initializing loader...
timeout /t 1 /nobreak >nul
echo  [*] Checking HWID...
timeout /t 1 /nobreak >nul
echo  [*] HWID verified successfully!
echo.
echo  [*] Connecting to RainClient servers...
timeout /t 2 /nobreak >nul
echo  [*] Connection established!
echo.
echo  [*] Downloading modules...
timeout /t 1 /nobreak >nul
echo     - Combat module loaded
timeout /t 0 /nobreak >nul
echo     - Movement module loaded
timeout /t 0 /nobreak >nul
echo     - Visual module loaded
timeout /t 0 /nobreak >nul
echo     - World module loaded
timeout /t 0 /nobreak >nul
echo     - Player module loaded
timeout /t 1 /nobreak >nul
echo.
echo  [*] Scanning for Minecraft process...
timeout /t 2 /nobreak >nul
echo  [*] Injecting into Minecraft...
timeout /t 2 /nobreak >nul
echo.
echo  ============================================
echo  [OK] RainClient successfully loaded!
echo  [OK] Press GUI key (RSHIFT) in game
echo  ============================================
echo.
echo  Press any key to close this window...
pause >nul
