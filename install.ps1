<#
.SYNOPSIS
  Install OpenCode Session Manager on Windows
.DESCRIPTION
  Downloads the tool, sets up auto-start via Task Scheduler, and adds to PATH.
#>

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Jiayixiao20/opencode-session-manager"
$InstallDir = "$env:USERPROFILE\.opencode-session-manager"
$BinDir = "$env:USERPROFILE\.local\bin"

Write-Host "OpenCode Session Manager Installer" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
  exit 1
}
Write-Host "✓ Node.js $($node --version)" -ForegroundColor Green

# Check/install sqlite3
if (-not (Get-Command "sqlite3" -ErrorAction SilentlyContinue)) {
  # Install via npm if available
  $npmSqlite = Get-Command "sqlite3" -ErrorAction SilentlyContinue
  if (-not $npmSqlite) {
    try {
      npm install -g better-sqlite3 2>$null
      Write-Host "✓ sqlite3 installed via npm" -ForegroundColor Green
    } catch {
      Write-Host "sqlite3 not found and npm install failed." -ForegroundColor Yellow
      Write-Host "Install manually: winget install sqlite" -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "✓ sqlite3 found" -ForegroundColor Green
}

# Remove old
if (Test-Path $InstallDir) {
  Write-Host "Removing old installation..."
  Remove-Item -Recurse -Force $InstallDir
}

# Download
Write-Host "Downloading from GitHub..."
try {
  git clone --depth 1 "$($Repo).git" $InstallDir 2>&1 | Out-Null
  Write-Host "✓ Cloned via git" -ForegroundColor Green
} catch {
  Write-Host "Git not found, using curl..." -ForegroundColor Yellow
  $zipUrl = "$Repo/archive/main.zip"
  $zipPath = "$env:TEMP\opencode-sessions.zip"
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\opencode-sessions-tmp" -Force
  $extracted = Get-ChildItem "$env:TEMP\opencode-sessions-tmp" | Select-Object -First 1
  Move-Item "$($extracted.FullName)\*" $InstallDir -Force
  Remove-Item -Recurse -Force "$env:TEMP\opencode-sessions-tmp", $zipPath
  Write-Host "✓ Downloaded and extracted" -ForegroundColor Green
}

# Create bin directory
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

# Create batch wrapper
$batContent = @"
@echo off
node "$InstallDir\src\index.js" %*
"@
$batPath = "$BinDir\opencode-sessions.cmd"
Set-Content -Path $batPath -Value $batContent -Encoding ASCII
Write-Host "✓ Created $batPath" -ForegroundColor Green

# Add to PATH for current user if not present
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$currentPath;$BinDir", "User")
  $env:Path = "$env:Path;$BinDir"
  Write-Host "✓ Added to PATH" -ForegroundColor Green
}

# Install Task Scheduler auto-start
$taskName = "OpenCodeSessionManager"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute "node" -Argument "$InstallDir\src\index.js serve" -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "✓ Task Scheduler auto-start installed (runs at logon)" -ForegroundColor Green

Write-Host ""
Write-Host "✓ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  opencode-sessions                             # Generate sessions.html"
Write-Host "  opencode-sessions serve                        # Open interactive web UI"
Write-Host "  opencode-sessions delete <session-id>          # Delete a session"
Write-Host "  opencode-sessions delete --min-messages 1      # Delete low-value sessions"
Write-Host "  opencode-sessions delete --older-than 30       # Delete sessions older than 30 days"
Write-Host ""
Write-Host "Auto-start service:" -ForegroundColor Cyan
Write-Host "  Start manually:  Start-Job { opencode-sessions serve }"
Write-Host "  Task Scheduler:  schtasks /run /tn OpenCodeSessionManager"
Write-Host "  Disable:         schtasks /change /tn OpenCodeSessionManager /disable"
Write-Host ""
Write-Host "Environment variables:" -ForegroundColor Cyan
Write-Host "  OPENCODE_DB               Custom database path"
Write-Host "  OPENCODE_SESSIONS_OUTPUT  Custom output path"
