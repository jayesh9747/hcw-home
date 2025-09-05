# Development Environment Setup Script for Windows PowerShell
# Run this script to set up your development environment

Write-Host "🚀 Setting up HCW-Home Development Environment..." -ForegroundColor Green

# Create .env file from development template if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from development template..." -ForegroundColor Yellow
    Copy-Item ".env.development" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "ℹ️ .env file already exists" -ForegroundColor Blue
}

# Check if PostgreSQL is running
Write-Host "🗄️ Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️ PostgreSQL service is not running. Please start PostgreSQL." -ForegroundColor Red
        Write-Host "💡 Start PostgreSQL service from Services.msc or run 'net start postgresql-x64-XX'" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️ PostgreSQL not found. Please install PostgreSQL." -ForegroundColor Red
}

# Check if Redis is available (optional for development)
Write-Host "🔴 Checking Redis availability (optional for development)..." -ForegroundColor Yellow
try {
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Write-Host "✅ Redis is running (will be used for clustering features)" -ForegroundColor Green
        Write-Host "💡 To test without Redis, leave REDIS_URL empty in .env" -ForegroundColor Cyan
    } else {
        Write-Host "ℹ️ Redis is not running (this is fine for development)" -ForegroundColor Blue
        Write-Host "💡 Single-server mode will be used automatically" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ℹ️ Redis not installed (this is fine for development)" -ForegroundColor Blue
    Write-Host "💡 Single-server mode will be used automatically" -ForegroundColor Cyan
}

# Install dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
npm install

# Run Prisma migrations
Write-Host "🔄 Setting up database schema..." -ForegroundColor Yellow
npx prisma migrate dev --name init

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Create uploads directory if it doesn't exist
if (-not (Test-Path "uploads")) {
    Write-Host "📁 Creating uploads directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "uploads\logos" -Force | Out-Null
    Write-Host "✅ Uploads directory created" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with your database credentials"
Write-Host "2. Start the development server: npm run start:dev"
Write-Host "3. Visit http://localhost:3000/api/v1/health to check if everything is working"
Write-Host ""
Write-Host "💡 Development Tips:" -ForegroundColor Cyan
Write-Host "- Redis is optional for development (single-server mode)"
Write-Host "- MediaSoup will use 2 workers for development (vs 4 for production)"
Write-Host "- Swagger UI available at http://localhost:3000/api/v1/docs"
Write-Host "- Health monitoring at http://localhost:3000/api/v1/mediasoup/health"
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Magenta
Write-Host "- If port 3000 is busy: Change PORT in .env file"
Write-Host "- Database issues: Check DATABASE_URL in .env file"
Write-Host "- MediaSoup issues: Check MEDIASOUP_ANNOUNCED_IP (should be 127.0.0.1 for local)"
Write-Host ""
