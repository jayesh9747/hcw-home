#!/bin/bash

# Development Environment Setup Script
# Run this script to set up your development environment

echo "🚀 Setting up HCW-Home Development Environment..."

# Create .env file from development template if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from development template..."
    cp .env.development .env
    echo "✅ .env file created"
else
    echo "ℹ️ .env file already exists"
fi

# Check if PostgreSQL is running
echo "🗄️ Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    if pg_isready -q; then
        echo "✅ PostgreSQL is running"
    else
        echo "⚠️ PostgreSQL is not running. Please start PostgreSQL."
        echo "💡 On Windows: Start PostgreSQL service from Services or run 'pg_ctl start'"
        echo "💡 On macOS: brew services start postgresql"
        echo "💡 On Linux: sudo systemctl start postgresql"
    fi
else
    echo "⚠️ PostgreSQL not found. Please install PostgreSQL."
fi

# Check if Redis is available (optional for development)
echo "🔴 Checking Redis availability (optional for development)..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running (will be used for clustering features)"
        echo "💡 To test without Redis, leave REDIS_URL empty in .env"
    else
        echo "ℹ️ Redis is not running (this is fine for development)"
        echo "💡 Single-server mode will be used automatically"
    fi
else
    echo "ℹ️ Redis not installed (this is fine for development)"
    echo "💡 Single-server mode will be used automatically"
fi

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

# Run Prisma migrations
echo "🔄 Setting up database schema..."
npx prisma migrate dev --name init

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p uploads/logos
    echo "✅ Uploads directory created"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with your database credentials"
echo "2. Start the development server: npm run start:dev"
echo "3. Visit http://localhost:3000/api/v1/health to check if everything is working"
echo ""
echo "💡 Development Tips:"
echo "- Redis is optional for development (single-server mode)"
echo "- MediaSoup will use 2 workers for development (vs 4 for production)"
echo "- Swagger UI available at http://localhost:3000/api/v1/docs"
echo "- Health monitoring at http://localhost:3000/api/v1/mediasoup/health"
echo ""
echo "🔧 Troubleshooting:"
echo "- If port 3000 is busy: Change PORT in .env file"
echo "- Database issues: Check DATABASE_URL in .env file"
echo "- MediaSoup issues: Check MEDIASOUP_ANNOUNCED_IP (should be 127.0.0.1 for local)"
echo ""
