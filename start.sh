#!/bin/bash

################################################################################
# CONSTELLATION CONSOLIDATOR - START SCRIPT
# Simple one-command startup for the entire platform
################################################################################

set -e

echo "================================================================"
echo "  CONSTELLATION CONSOLIDATOR"
echo "  AI-Powered Financial Consolidation Platform"
echo "================================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker is not running."
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✓ Docker is installed and running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ docker-compose is available"
echo ""

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# OpenAI API Key (optional - required for AI features)
OPENAI_API_KEY=

# Add your OpenAI API key above if you want to use AI-powered features
# Example: OPENAI_API_KEY=sk-your-api-key-here
EOF
    echo "✓ .env file created (edit it to add your OpenAI API key)"
else
    echo "✓ .env file exists"
fi

echo ""
echo "Starting services..."
echo ""

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Start all services
echo "Building and starting containers (this may take a few minutes on first run)..."
docker-compose up -d --build

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check if PostgreSQL is healthy
echo -n "Checking PostgreSQL..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        echo " ✓"
        break
    fi
    if [ $i -eq 30 ]; then
        echo " ✗ (timeout)"
        echo "Warning: PostgreSQL may not be ready"
    fi
    sleep 1
done

# Initialize database if not already done
echo -n "Initializing database..."
if docker-compose exec -T backend python init_db.py &> /dev/null; then
    echo " ✓"
else
    echo " (already initialized or error occurred)"
fi

echo ""
echo "================================================================"
echo "  ✓ CONSTELLATION CONSOLIDATOR IS RUNNING!"
echo "================================================================"
echo ""
echo "Access your application:"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "================================================================"
echo ""
echo "Useful commands:"
echo ""
echo "  View logs:          docker-compose logs -f"
echo "  Stop services:      docker-compose down"
echo "  Restart services:   docker-compose restart"
echo "  View status:        docker-compose ps"
echo ""
echo "Database tables created:"
docker-compose exec -T backend python -c "from app.core.database import engine, Base; from app.models.user import User; from app.models.consolidation import *; print('  -', '\n  - '.join([table.name for table in Base.metadata.sorted_tables]))" 2>/dev/null || echo "  (run init_db.py to create tables)"
echo ""
echo "================================================================"
