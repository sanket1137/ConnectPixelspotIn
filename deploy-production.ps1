#!/usr/bin/env pwsh
# ==========================================
# Production Deployment Script for PixelSpot
# ==========================================
# This script automates the deployment process
# Usage: .\deploy-production.ps1

param(
    [switch]$SkipBuild,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 PixelSpot Production Deployment" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER = "root@5.223.70.55"
$SSH_KEY = "pixelssh"
$REMOTE_PATH = "/var/www/pixelspot"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Step 1: Build Application
if (-not $SkipBuild) {
    Write-Host "📦 Building application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping build (using existing dist/)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Backup current deployment
if (-not $SkipBackup) {
    Write-Host "💾 Creating backup..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $SERVER "cd $REMOTE_PATH && tar -czf backups/dist_backup_$TIMESTAMP.tar.gz dist/ && ls -lh backups/dist_backup_$TIMESTAMP.tar.gz"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Backup failed, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Backup created" -ForegroundColor Green
    }
    Write-Host ""
}

# Step 3: Upload files
Write-Host "📤 Uploading files to production..." -ForegroundColor Yellow

# Upload server bundle
Write-Host "  → Uploading server (dist/index.js)..." -ForegroundColor Gray
scp -i $SSH_KEY dist/index.js "${SERVER}:${REMOTE_PATH}/dist/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload server bundle!" -ForegroundColor Red
    exit 1
}

# Upload client files
Write-Host "  → Uploading client files (dist/public/)..." -ForegroundColor Gray
scp -i $SSH_KEY -r dist/public/* "${SERVER}:${REMOTE_PATH}/dist/public/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload client files!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Fix permissions
Write-Host "🔒 Fixing file permissions..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "chown -R www-data:www-data $REMOTE_PATH/dist/public; chmod -R 755 $REMOTE_PATH/dist/public"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set permissions!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Permissions set correctly" -ForegroundColor Green
Write-Host ""

# Step 5: Clean up old assets
Write-Host "🧹 Cleaning up old asset files..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "find $REMOTE_PATH/dist/public/assets -name 'index-*.js' -o -name 'index-*.css' | sort | head -n -2 | xargs -r rm -f"
Write-Host "✅ Old assets cleaned up" -ForegroundColor Green
Write-Host ""

# Step 6: Restart PM2
Write-Host "🔄 Restarting application..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "cd $REMOTE_PATH; pm2 restart pixelspot"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to restart PM2!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Application restarted" -ForegroundColor Green
Write-Host ""

# Step 7: Wait and check health
Write-Host "🏥 Checking application health..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$healthCheck = ssh -i $SSH_KEY $SERVER "curl -s localhost:5000/api/health"
if ($healthCheck -match '"status":"ok"') {
    Write-Host "✅ Health check passed: $healthCheck" -ForegroundColor Green
} else {
    Write-Host "⚠️  Health check response: $healthCheck" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Verify public endpoint
Write-Host "🌐 Verifying public endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://connect.pixelspot.in/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Public endpoint is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Public endpoint check failed: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 9: Show PM2 status
Write-Host "📊 PM2 Status:" -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "pm2 list"
Write-Host ""

# Step 10: Show recent logs
Write-Host "📋 Recent logs (last 10 lines):" -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "pm2 logs --lines 10 --nostream"
Write-Host ""

# Success!
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Application URL: https://connect.pixelspot.in" -ForegroundColor Cyan
Write-Host "📅 Deployment time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ""

# Optional: Open browser
$openBrowser = Read-Host "Open application in browser? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "https://connect.pixelspot.in"
}
