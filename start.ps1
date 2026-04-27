# TradeLens — start backend + frontend
# Run with: .\start.ps1

$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend= Join-Path $root "frontend"

Write-Host "Stopping any existing python / node processes..." -ForegroundColor Yellow
Get-Process -Name python, node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# ── Backend (auto-restarts on crash) ────────────────────────────────────────
$backendScript = @"
Set-Location '$backend'
while (`$true) {
    Write-Host '[Backend] Starting...' -ForegroundColor Cyan
    & '.\venv\Scripts\python.exe' -m uvicorn app.main:app --port 8000
    Write-Host '[Backend] Crashed or stopped. Restarting in 2s...' -ForegroundColor Red
    Start-Sleep -Seconds 2
}
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript `
    -WindowStyle Normal

Start-Sleep -Seconds 1

# ── Frontend ─────────────────────────────────────────────────────────────────
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$frontend'; npm run dev" `
    -WindowStyle Normal

Write-Host ""
Write-Host "  TradeLens is starting!" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Close the two new windows to stop the servers." -ForegroundColor Gray
