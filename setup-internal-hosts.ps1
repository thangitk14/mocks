# PowerShell Script để setup Split DNS bằng cách cấu hình file hosts
# Domain sẽ trỏ về Private IP (0.0.0.0) cho mạng nội bộ

param(
    [string]$Domain = "fw.thangvnnc.io.vn",
    [string]$PrivateIP = "0.0.0.0"
)

$ErrorActionPreference = "Stop"

$HostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$BackupFile = "$HostsFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "=== Split DNS Hosts Configuration ===" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Backup existing hosts file
if (Test-Path $HostsFile) {
    Write-Host "Backing up existing hosts file..." -ForegroundColor Yellow
    Copy-Item $HostsFile $BackupFile
    Write-Host "✓ Backup created: $BackupFile" -ForegroundColor Green
} else {
    Write-Host "Hosts file not found, will create new one" -ForegroundColor Yellow
}

# Read current hosts file
$hostsContent = Get-Content $HostsFile -ErrorAction SilentlyContinue

# Check if domain already exists
$domainExists = $hostsContent | Where-Object { $_ -match $Domain }

if ($domainExists) {
    Write-Host "Domain $Domain already exists in hosts file" -ForegroundColor Yellow
    $response = Read-Host "Do you want to update it? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        # Remove existing entries for this domain
        $hostsContent = $hostsContent | Where-Object { $_ -notmatch $Domain }
        Write-Host "✓ Removed existing entry" -ForegroundColor Green
    } else {
        Write-Host "Skipping..." -ForegroundColor Yellow
        exit 0
    }
}

# Add Split DNS section if it doesn't exist
$hasSplitDNSSection = $hostsContent | Where-Object { $_ -match "# Split DNS" }
if (-not $hasSplitDNSSection) {
    $hostsContent += ""
    $hostsContent += "# Split DNS - Internal Network"
    $hostsContent += "# Domain trỏ về Private IP ($PrivateIP) cho mạng nội bộ"
}

# Add new entry
Write-Host "Adding Split DNS entry: $PrivateIP -> $Domain" -ForegroundColor Yellow
$hostsContent += "$PrivateIP    $Domain"

# Write back to hosts file
$hostsContent | Set-Content $HostsFile -Encoding ASCII

Write-Host "✓ Entry added successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Current hosts file entries for $Domain :"
Get-Content $HostsFile | Select-String $Domain
Write-Host ""
Write-Host "Note: You may need to flush DNS cache for changes to take effect:" -ForegroundColor Yellow
Write-Host "  Run: ipconfig /flushdns" -ForegroundColor Yellow
Write-Host ""

