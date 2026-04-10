# Test Script - Runs all quality checks
# Use this before committing

Write-Host "🧪 Running All Quality Checks" -ForegroundColor Cyan
Write-Host ""

$failed = $false

# Type Check
Write-Host "1️⃣  Type Checking..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Type check failed!" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ Type check passed" -ForegroundColor Green
}
Write-Host ""

# Run Tests
Write-Host "2️⃣  Running Tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Tests failed!" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ Tests passed" -ForegroundColor Green
}
Write-Host ""

# Acceptance Tests
Write-Host "3️⃣  Running Acceptance Tests..." -ForegroundColor Yellow
npx tsx scripts/spec-acceptance.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Acceptance tests failed!" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ Acceptance tests passed" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
if ($failed) {
    Write-Host "❌ SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host "   Please fix the issues before committing" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "   Ready to commit! 🎉" -ForegroundColor Green
    exit 0
}
