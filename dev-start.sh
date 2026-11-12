#!/bin/bash

# TUS Development Environment Startup Script

set -e

echo "🚀 Starting TUS Development Environment..."

# Check if .env file exists
if [ ! -f "api/.env" ]; then
    echo "⚠️  Warning: api/.env file not found!"
    echo "📝 Creating api/.env from template..."
    cat > api/.env << EOF
# Database
DATABASE_URL=postgresql://tus:tus_password@localhost:5432/tus_db

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development
ADMIN_URL=http://localhost:3001

# OCR Service
OCR_API_URL=http://localhost:8000
OCR_API_KEY=

# AI Service (Optional)
AI_API_URL=
AI_API_KEY=
EOF
    echo "✅ Created api/.env file"
fi

# Start Docker services (only postgres, redis, ocr)
echo "🐳 Starting Docker services (postgres, redis, ocr)..."
docker-compose up -d postgres redis ocr

echo "⏳ Waiting for services to be ready..."
sleep 5

# Run Prisma migrations
echo "📦 Running database migrations..."
cd api
npm install --silent
npx prisma generate
npx prisma migrate deploy
cd ..

echo ""
echo "✅ Docker services are running!"
echo ""
echo "📊 Docker Services:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo "   - OCR Service: http://localhost:8000"
echo ""
echo "🚀 Now start your development servers manually:"
echo ""
echo "   Terminal 1 - API:"
echo "   cd api && npm run start:dev"
echo ""
echo "   Terminal 2 - Admin Panel:"
echo "   cd admin && npm run dev"
echo ""
echo "📝 View Docker logs: docker-compose logs -f"
echo "🛑 Stop Docker services: docker-compose down"
echo ""
