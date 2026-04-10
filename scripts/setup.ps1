# Critical Setup Initialization Script
# Run this FIRST before starting development

Write-Host "🔧 Tanda API - Critical Setup Initialization" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will set up your development environment." -ForegroundColor White
Write-Host ""

$setupComplete = $true

# Step 1: Check Node.js
Write-Host "1️⃣  Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Install from: https://nodejs.org/" -ForegroundColor Yellow
    $setupComplete = $false
}

# Step 2: Check npm
Write-Host ""
Write-Host "2️⃣  Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm not found!" -ForegroundColor Red
    $setupComplete = $false
}

# Step 3: Install dependencies
Write-Host ""
Write-Host "3️⃣  Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "   📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
        $setupComplete = $false
    }
} else {
    Write-Host "   ✅ Dependencies already installed" -ForegroundColor Green
}

# Step 4: Create .env file
Write-Host ""
Write-Host "4️⃣  Setting up environment file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "   ✅ .env file created from template" -ForegroundColor Green
    Write-Host "   ⚠️  IMPORTANT: Edit .env and update JWT_SECRET!" -ForegroundColor Yellow
    Write-Host "      Generate a secure secret with:" -ForegroundColor White
    Write-Host "      node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))""" -ForegroundColor Gray
} else {
    Write-Host "   ✅ .env file already exists" -ForegroundColor Green
}

# Step 5: Check .env configuration
Write-Host ""
Write-Host "5️⃣  Validating .env configuration..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw

$requiredVars = @("PORT", "DATABASE_PATH", "JWT_SECRET")
$missingVars = @()

foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=") {
        $missingVars += $var
    }
}

if ($missingVars.Count -eq 0) {
    Write-Host "   ✅ All required environment variables present" -ForegroundColor Green
} else {
    Write-Host "   ❌ Missing environment variables: $($missingVars -join ', ')" -ForegroundColor Red
    $setupComplete = $false
}

# Check if JWT_SECRET is still default
if ($envContent -match "JWT_SECRET=(your-secret-here|change-me)") {
    Write-Host "   ⚠️  JWT_SECRET is still default value!" -ForegroundColor Yellow
    Write-Host "      Please update it for security" -ForegroundColor Yellow
}

# Step 6: Create data directory
Write-Host ""
Write-Host "6️⃣  Creating data directory..." -ForegroundColor Yellow
if (!(Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
    Write-Host "   ✅ data/ directory created" -ForegroundColor Green
} else {
    Write-Host "   ✅ data/ directory already exists" -ForegroundColor Green
}

# Step 7: Verify TypeScript configuration
Write-Host ""
Write-Host "7️⃣  Checking TypeScript configuration..." -ForegroundColor Yellow
if (Test-Path "tsconfig.json") {
    Write-Host "   ✅ tsconfig.json found" -ForegroundColor Green
} else {
    Write-Host "   ❌ tsconfig.json missing!" -ForegroundColor Red
    $setupComplete = $false
}

# Step 8: Run type check
Write-Host ""
Write-Host "8️⃣  Running TypeScript type check..." -ForegroundColor Yellow
npm run typecheck 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ No TypeScript errors" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  TypeScript errors found (run 'npm run typecheck' for details)" -ForegroundColor Yellow
}

# Step 9: Verify .gitignore
Write-Host ""
Write-Host "9️⃣  Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    $requiredIgnores = @("node_modules", ".env", "*.db", "dist")
    $missingIgnores = @()
    
    foreach ($ignore in $requiredIgnores) {
        if ($gitignore -notmatch [regex]::Escape($ignore)) {
            $missingIgnores += $ignore
        }
    }
    
    if ($missingIgnores.Count -eq 0) {
        Write-Host "   ✅ .gitignore properly configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .gitignore missing: $($missingIgnores -join ', ')" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ .gitignore not found!" -ForegroundColor Red
    $setupComplete = $false
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($setupComplete) {
    Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review and update .env file (especially JWT_SECRET)" -ForegroundColor White
    Write-Host "  2. Start development: npm run dev" -ForegroundColor White
    Write-Host "  3. Run tests: npm test" -ForegroundColor White
    Write-Host "  4. Read: DEVELOPMENT_WORKFLOW.md" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick commands:" -ForegroundColor Yellow
    Write-Host "  ./scripts/dev.ps1        # Start developing" -ForegroundColor White
    Write-Host "  ./scripts/test-all.ps1   # Run all checks" -ForegroundColor White
    Write-Host "  ./scripts/quick-test.ps1 # Test API" -ForegroundColor White
} else {
    Write-Host "❌ SETUP INCOMPLETE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
