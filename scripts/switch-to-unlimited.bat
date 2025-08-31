@echo off
REM Switch to unlimited Anthropic Sonnet/Haiku configuration
REM Usage: scripts\switch-to-unlimited.bat

echo 🚀 Switching to Unlimited Anthropic Configuration...

REM Backup existing .env.local if it exists
if exist .env.local (
    copy .env.local .env.local.backup >nul
    echo 📋 Backed up existing .env.local to .env.local.backup
)

REM Copy unlimited configuration
copy .env.unlimited .env.local >nul
echo ✅ Copied unlimited configuration to .env.local

echo.
echo 📝 Please update your ANTHROPIC_API_KEY in .env.local
echo.
echo 🎯 Configuration Summary:
echo   • PRIMARY: Claude 3.5 Haiku (95%% of tasks)
echo   • SECONDARY: Claude 3.5 Sonnet (complex reasoning only)
echo   • Smart routing threshold: 4+ (more conservative)
echo   • Agent-specific routing: Enabled
echo   • Prompt caching: Enabled
echo   • Batch processing: Enabled
echo.
echo 🏁 Ready to use unlimited Sonnet/Haiku!
echo    Run: npm run dev
pause