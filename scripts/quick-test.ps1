# Quick API Test Script
# Tests the three main acceptance criteria from spec.md

Write-Host "🧪 Testing Tanda API - Spec Acceptance Criteria" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 2
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running!" -ForegroundColor Red
    Write-Host "   Start it with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Running acceptance tests..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Create a user
Write-Host "1️⃣  Creating a user..." -ForegroundColor Cyan
try {
    $userBody = @{
        email = "alice@example.com"
        name = "Alice"
    } | ConvertTo-Json

    $user = Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
        -Method POST `
        -ContentType "application/json" `
        -Body $userBody

    Write-Host "   ✅ User created: $($user.email)" -ForegroundColor Green
    $userId = $user.id
} catch {
    Write-Host "   ❌ Failed to create user" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Create a tanda
Write-Host ""
Write-Host "2️⃣  Creating a tanda..." -ForegroundColor Cyan
try {
    $tandaBody = @{
        name = "Tanda Enero"
        organizerId = $userId
        contributionAmount = 1000
    } | ConvertTo-Json

    $tanda = Invoke-RestMethod -Uri "http://localhost:3000/api/tandas" `
        -Method POST `
        -ContentType "application/json" `
        -Body $tandaBody

    Write-Host "   ✅ Tanda created: $($tanda.name)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to create tanda" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: List tandas
Write-Host ""
Write-Host "3️⃣  Listing tandas..." -ForegroundColor Cyan
try {
    $tandas = Invoke-RestMethod -Uri "http://localhost:3000/api/tandas?userId=$userId"
    
    Write-Host "   ✅ Found $($tandas.Count) tanda(s)" -ForegroundColor Green
    if ($tandas.Count -gt 0) {
        Write-Host "   First tanda: $($tandas[0].name)" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Failed to list tandas" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ ALL ACCEPTANCE TESTS PASSED!" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Yellow
Write-Host "  • User: alice@example.com (ID: $userId)" -ForegroundColor White
Write-Host "  • Tanda: Tanda Enero" -ForegroundColor White
Write-Host ""
