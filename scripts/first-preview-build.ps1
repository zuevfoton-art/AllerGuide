# First EAS preview build (Windows PowerShell)
# Run from repo root: .\scripts\first-preview-build.ps1
# Optional: .\scripts\first-preview-build.ps1 -Platform android

param(
    [ValidateSet("android", "ios", "all")]
    [string]$Platform = "android"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root "apps\mobile")

Write-Host "=== AllerGuide — first EAS preview build ($Platform) ===" -ForegroundColor Cyan

# 1. Expo login
$whoami = pnpm exec eas whoami 2>$null
if (-not $whoami) {
    Write-Host "Not logged in to Expo. Opening login..." -ForegroundColor Yellow
    pnpm exec eas login
}

# 2. Link project (replace placeholder projectId)
$appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
$projectId = $appJson.expo.extra.eas.projectId
if ($projectId -eq "00000000-0000-0000-0000-000000000000") {
    Write-Host "Linking Expo project (eas init)..." -ForegroundColor Yellow
    pnpm exec eas init
    Write-Host "Commit the updated app.json projectId before sharing builds." -ForegroundColor Green
}

# 3. Build
switch ($Platform) {
    "android" { pnpm build:preview:android }
    "ios"     { pnpm build:preview:ios }
    "all"     { pnpm build:preview }
}

Write-Host ""
Write-Host "Build queued. Track progress:" -ForegroundColor Green
Write-Host "  https://expo.dev/accounts/[your-account]/projects/allerguide/builds"
Write-Host ""
Write-Host "After install, run: docs\qa-checklist.md" -ForegroundColor Cyan
