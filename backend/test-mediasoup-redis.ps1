# MediaSoup Redis Configuration Test Script
# Run this script to verify your MediaSoup and Redis setup

param(
    [switch]$Production = $false,
    [switch]$Verbose = $false
)

$env:NODE_ENV = if ($Production) { "production" } else { "development" }

Write-Host "🧪 Testing MediaSoup Redis Configuration..." -ForegroundColor Green
Write-Host "Environment: $($env:NODE_ENV)" -ForegroundColor Cyan
Write-Host ""

# Function to test API endpoint
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description
    )
    
    try {
        Write-Host "Testing $Description..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
        Write-Host "✅ $Description - OK" -ForegroundColor Green
        
        if ($Verbose) {
            Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        
        return $true
    } catch {
        Write-Host "❌ $Description - FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test Redis connection
function Test-RedisConnection {
    Write-Host "🔴 Testing Redis Connection..." -ForegroundColor Yellow
    
    # Check if Redis process is running
    try {
        $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
        if ($redisProcess) {
            Write-Host "✅ Redis process is running (PID: $($redisProcess.Id))" -ForegroundColor Green
            return $true
        } else {
            if ($env:NODE_ENV -eq "development") {
                Write-Host "ℹ️ Redis not running - Development mode allows single-server operation" -ForegroundColor Cyan
                return $true
            } else {
                Write-Host "❌ Redis not running - Required for production environment" -ForegroundColor Red
                return $false
            }
        }
    } catch {
        Write-Host "⚠️ Could not check Redis process status" -ForegroundColor Yellow
        return $false
    }
}

# Function to test database connection
function Test-DatabaseConnection {
    Write-Host "🗄️ Testing Database Connection..." -ForegroundColor Yellow
    
    try {
        # Test if we can connect to the database via Prisma
        $prismaStatus = npx prisma db pull --force 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database connection failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Database connection test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Start the backend server in background for testing
Write-Host "🚀 Starting backend server for testing..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start:dev" -PassThru -WindowStyle Hidden

# Wait for server to start
Write-Host "⏳ Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$baseUrl = "http://localhost:3000/api/v1"

try {
    # Test basic health endpoint
    $healthOk = Test-Endpoint "$baseUrl/health" "General Health Check"
    
    # Test MediaSoup specific health
    $mediasoupHealthOk = Test-Endpoint "$baseUrl/mediasoup/health" "MediaSoup Health Check"
    
    # Test detailed MediaSoup diagnostics
    $detailedHealthOk = Test-Endpoint "$baseUrl/mediasoup/health/detailed" "MediaSoup Detailed Diagnostics"
    
    # Test Redis connection
    $redisOk = Test-RedisConnection
    
    # Test database connection
    $dbOk = Test-DatabaseConnection
    
    Write-Host ""
    Write-Host "📊 Test Results Summary:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host "General Health: $(if($healthOk){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($healthOk){'Green'}else{'Red'})
    Write-Host "MediaSoup Health: $(if($mediasoupHealthOk){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($mediasoupHealthOk){'Green'}else{'Red'})
    Write-Host "Detailed Diagnostics: $(if($detailedHealthOk){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($detailedHealthOk){'Green'}else{'Red'})
    Write-Host "Redis Connection: $(if($redisOk){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($redisOk){'Green'}else{'Red'})
    Write-Host "Database Connection: $(if($dbOk){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($dbOk){'Green'}else{'Red'})
    
    $overallStatus = $healthOk -and $mediasoupHealthOk -and $detailedHealthOk -and $redisOk -and $dbOk
    
    Write-Host ""
    if ($overallStatus) {
        Write-Host "🎉 All tests passed! Your MediaSoup Redis setup is working correctly." -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Useful URLs:" -ForegroundColor Cyan
        Write-Host "- API Health: http://localhost:3000/api/v1/health" -ForegroundColor White
        Write-Host "- MediaSoup Health: http://localhost:3000/api/v1/mediasoup/health" -ForegroundColor White
        Write-Host "- API Documentation: http://localhost:3000/api/v1/docs" -ForegroundColor White
        Write-Host "- Detailed Diagnostics: http://localhost:3000/api/v1/mediasoup/health/detailed" -ForegroundColor White
    } else {
        Write-Host "⚠️ Some tests failed. Please check the configuration and try again." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔧 Troubleshooting Tips:" -ForegroundColor Cyan
        if (-not $redisOk -and $env:NODE_ENV -eq "production") {
            Write-Host "- Install and start Redis for production environment" -ForegroundColor White
        }
        if (-not $dbOk) {
            Write-Host "- Check DATABASE_URL in your .env file" -ForegroundColor White
            Write-Host "- Ensure PostgreSQL is running and accessible" -ForegroundColor White
        }
        if (-not $healthOk) {
            Write-Host "- Check if port 3000 is available" -ForegroundColor White
            Write-Host "- Verify all environment variables are set correctly" -ForegroundColor White
        }
    }

} finally {
    # Clean up - stop the test server
    Write-Host ""
    Write-Host "🧹 Cleaning up test server..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Test server stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not stop test server (may have already stopped)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🏁 Test completed!" -ForegroundColor Green
