@echo off
:: --- Dr. Aris Academic Tutor: Automatic Setup ---
title Dr. Aris Setup Utility
color 0b

echo =====================================================
echo    DR. ARIS ACADEMIC TUTOR - LOCAL CONFIGURATION
echo =====================================================
echo.

:: 1. SET ENVIRONMENT VARIABLE
echo [STEP 1/3] Authorizing Vercel connection...
:: This allows your browser to talk to your local Ollama server
setx OLLAMA_ORIGINS "*"
echo SUCCESS: Security rules updated.
echo.

:: 2. DOWNLOAD MODELS
echo [STEP 2/3] Downloading AI Models (This may take a few minutes)...
echo Pulling Llama 3.2 (Strict Mode)...
ollama pull llama3.2
echo.
echo Pulling Llama 3 (Fluid Mode)...
ollama pull llama3
echo.

:: 3. FINAL INSTRUCTIONS
echo [STEP 3/3] Finalizing...
echo =====================================================
echo              SETUP SUCCESSFULLY COMPLETED!
echo =====================================================
echo.
echo IMPORTANT: You MUST restart your computer now. 
echo Windows needs a reboot to activate the security changes.
echo.
echo After restarting, open: 
echo https://academic-tutor-iotj.vercel.app
echo.
pause