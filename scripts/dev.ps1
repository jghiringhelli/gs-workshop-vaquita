# Quick Development Start Script
# Run this to start developing

Write-Host "🚀 Starting Tanda API Development Environment" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "   ✅ .env created" -ForegroundColor Green
    Write-Host "   ⚠️  Please edit .env and set JWT_SECRET!" -ForegroundColor Yellow
    Write-Host ""
}

# Check if node_modules exists
if (!(Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Run type check
Write-Host "🔍 Running type check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Type check passed" -ForegroundColor Green
Write-Host ""

# Start the development server
Write-Host "🎯 Starting development server..." -ForegroundColor Green
Write-Host "   Server will start on http://localhost:3000" -ForegroundColor White
Write-Host "   Press Ctrl+C to stop" -ForegroundColor White
Write-Host ""

npm run dev
