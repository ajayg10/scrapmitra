# ============================================================
# ScrapMitra / KabadiPlus — One-Command Deploy Script
# Usage: .\deploy.ps1
#        .\deploy.ps1 -SkipBuild   (skip npm build, just deploy)
# ============================================================
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ScrapMitra Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
if (-not $SkipBuild) {
    Write-Host "[1/2] Building frontend..." -ForegroundColor Yellow
    Set-Location "$ScriptDir\frontend"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete!" -ForegroundColor Green
    Set-Location $ScriptDir
} else {
    Write-Host "[1/2] Skipping build (-SkipBuild flag set)" -ForegroundColor DarkGray
}

# Step 2: Deploy to Amplify
Write-Host ""
Write-Host "[2/2] Deploying to AWS Amplify..." -ForegroundColor Yellow
python "$ScriptDir\scripts\deploy_amplify.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Amplify deploy failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  URL: https://main.dr84g0oee4lb8.amplifyapp.com" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
