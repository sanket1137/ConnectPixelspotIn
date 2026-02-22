#!/usr/bin/env pwsh
# ==========================================
# Server Diagnostics Script
# ==========================================
# Diagnoses why connect.pixelspot.in is unreachable

$ErrorActionPreference = "Continue"
$SERVER = "root@188.245.231.251"
$SSH_KEY = "pixelssh"

Write-Host "Diagnosing server: connect.pixelspot.in" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Test SSH Connection
Write-Host "1. Testing SSH connection to server..." -ForegroundColor Yellow
$sshTest = ssh -i $SSH_KEY -o ConnectTimeout=10 $SERVER "echo SSH_OK"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS: SSH Connection OK" -ForegroundColor Green
    $serverReachable = $true
} else {
    Write-Host "   FAILED: SSH Connection" -ForegroundColor Red
    Write-Host "   Server is completely unreachable!" -ForegroundColor Red
    Write-Host "" 
    Write-Host "   POSSIBLE CAUSES:" -ForegroundColor Yellow
    Write-Host "   - Server is powered off" -ForegroundColor Gray
    Write-Host "   - Network/ISP issue" -ForegroundColor Gray
    Write-Host "   - IP address changed" -ForegroundColor Gray
    Write-Host "   - Firewall blocking SSH" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   ACTION: Contact your hosting provider" -ForegroundColor Yellow
    $serverReachable = $false
}
Write-Host ""

if (-not $serverReachable) {
    Write-Host "Cannot proceed - server is unreachable" -ForegroundColor Red
    exit 1
}

# Step 2: Check PM2 Status
Write-Host "2. Checking PM2 application status..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "pm2 list"
Write-Host ""

# Step 3: Check Nginx Status
Write-Host "3. Checking Nginx status..." -ForegroundColor Yellow
$nginxStatus = ssh -i $SSH_KEY $SERVER "systemctl is-active nginx"

if ($nginxStatus -eq "active") {
    Write-Host "   SUCCESS: Nginx is running" -ForegroundColor Green
} else {
    Write-Host "   FAILED: Nginx status is $nginxStatus" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check if app is responding on localhost
Write-Host "4. Testing Node.js app on localhost:5000..." -ForegroundColor Yellow
$localHealthCheck = ssh -i $SSH_KEY $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/health"

if ($localHealthCheck -eq "200") {
    Write-Host "   SUCCESS: App is responding" -ForegroundColor Green
} else {
    Write-Host "   FAILED: App not responding (code: $localHealthCheck)" -ForegroundColor Red
}
Write-Host ""

# Step 5: Check open ports
Write-Host "5. Checking open ports..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "ss -tuln | grep -E ':80|:443|:5000'"
Write-Host ""

# Step 6: Recent application logs
Write-Host "6. Recent application logs (last 15 lines)..." -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Gray
ssh -i $SSH_KEY $SERVER "pm2 logs pixelspot --lines 15 --nostream --err"
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""

# Summary and Auto-fix
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "DIAGNOSIS SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Common fixes:" -ForegroundColor Yellow
Write-Host "1. Restart application: ssh -i $SSH_KEY $SERVER 'cd /var/www/pixelspot; pm2 restart pixelspot'" -ForegroundColor White
Write-Host "2. Restart Nginx: ssh -i $SSH_KEY $SERVER 'systemctl restart nginx'" -ForegroundColor White
Write-Host "3. Redeploy: .\deploy-production.ps1" -ForegroundColor White
Write-Host ""

$autoFix = Read-Host "Would you like to attempt automatic fixes? (y/n)"
if ($autoFix -eq "y" -or $autoFix -eq "Y") {
    Write-Host ""
    Write-Host "Attempting automatic fixes..." -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "> Restarting PM2 application..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $SERVER 'cd /var/www/pixelspot; pm2 restart pixelspot'
    Start-Sleep -Seconds 3
    
    Write-Host "> Restarting Nginx..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $SERVER "systemctl restart nginx"
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "Services restarted. Testing..." -ForegroundColor Green
    Start-Sleep -Seconds 5
    
    Write-Host "> Testing public endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "https://connect.pixelspot.in/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS! Site is now accessible" -ForegroundColor Green
        }
    } catch {
        Write-Host "Still not accessible: $_" -ForegroundColor Red
        Write-Host "Try manual investigation or redeployment" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Diagnostics complete" -ForegroundColor Cyan
