# Database Setup Script for Student Results Migration (PowerShell)
# Run this script to set up and migrate the database

Write-Host "=== Student Results Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created from template" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Please edit .env file and set your DATABASE_URL:" -ForegroundColor Cyan
    Write-Host "   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/exam_db"
    Write-Host ""
    Write-Host "After setting up DATABASE_URL, run this script again."
    exit 1
}

# Load environment variables from .env file
$envFile = Get-Content ".env" | Where-Object { $_ -match "^[^#].*=.*" }
foreach ($line in $envFile) {
    $key, $value = $line.Split('=', 2)
    [System.Environment]::SetEnvironmentVariable($key, $value)
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL is not set in .env file" -ForegroundColor Red
    Write-Host "Please edit .env file and set your DATABASE_URL"
    exit 1
}

Write-Host "🔗 Database URL: $($env:DATABASE_URL.Substring(0, [Math]::Min(50, $env:DATABASE_URL.Length)))..." -ForegroundColor Cyan
Write-Host ""

# Test database connection
Write-Host "🔍 Testing database connection..." -ForegroundColor Cyan
try {
    $testScript = @"
const pool = require('./server/db/postgres');
pool.query('SELECT NOW()')
  .then(result => {
    console.log('Database connection successful!');
    console.log('Time:', result.rows[0].now);
    pool.end();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.log('');
    console.log('Please check:');
    console.log('1. PostgreSQL server is running');
    console.log('2. DATABASE_URL is correct in .env file');
    console.log('3. Database exists and user has permissions');
    process.exit(1);
  });
"@
    
    node -e "$testScript"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🚀 Running student results migration..." -ForegroundColor Cyan
        node server/migrations/run-student-results-migration.js
    }
} catch {
    Write-Host "❌ Error testing database connection: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL server is running"
    Write-Host "2. DATABASE_URL is correct in .env file"
    Write-Host "3. Database exists and user has permissions"
}
