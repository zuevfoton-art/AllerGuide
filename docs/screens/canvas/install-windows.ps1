# Install A-Claro screen mockup canvases into Cursor Desktop managed canvases/
#
# WHY: Cursor only loads *.canvas.tsx from:
#   %USERPROFILE%\.cursor\projects\<project-slug>\canvases\
# Cloud Agents cannot host the Canvas UI (you see "failed to load").
# Run this on Windows AFTER opening the AllerGuide repo in Cursor Desktop (local).
#
# Usage (from repo root, PowerShell):
#   powershell -ExecutionPolicy Bypass -File docs/screens/canvas/install-windows.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$SourceDir = Join-Path $RepoRoot "docs\screens\canvas"
$ProjectsRoot = Join-Path $env:USERPROFILE ".cursor\projects"

if (-not (Test-Path $SourceDir)) {
  throw "Source not found: $SourceDir"
}
if (-not (Test-Path $ProjectsRoot)) {
  New-Item -ItemType Directory -Path $ProjectsRoot | Out-Null
}

function Get-ProjectSlug([string]$Path) {
  $slug = [regex]::Replace($Path, "[^a-zA-Z0-9]", "-")
  $slug = [regex]::Replace($slug, "-+", "-")
  return $slug.Trim("-")
}

# Prefer slug for the opened repo path; also install into newest project dirs as fallback.
$candidates = New-Object System.Collections.Generic.List[string]
$repoSlug = Get-ProjectSlug $RepoRoot.Path
$candidates.Add((Join-Path $ProjectsRoot $repoSlug)) | Out-Null

Get-ChildItem $ProjectsRoot -Directory -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 8 |
  ForEach-Object { $candidates.Add($_.FullName) | Out-Null }

$installed = @()
foreach ($projectDir in ($candidates | Select-Object -Unique)) {
  $canvasesDir = Join-Path $projectDir "canvases"
  New-Item -ItemType Directory -Force -Path $canvasesDir | Out-Null
  Copy-Item -Force (Join-Path $SourceDir "*.canvas.tsx") $canvasesDir
  $installed += $canvasesDir
  Write-Host "Installed -> $canvasesDir"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. In Cursor Desktop open the AllerGuide folder LOCALY (not Cloud Agent)."
Write-Host "2. Start a local Agent chat."
Write-Host "3. Open: $($installed[0])\smoke.canvas.tsx"
Write-Host "4. If smoke shows 'Canvas OK', open a-claro-mockups.canvas.tsx"
Write-Host ""
Write-Host "Repo root used: $($RepoRoot.Path)"
Write-Host "Slug: $repoSlug"
