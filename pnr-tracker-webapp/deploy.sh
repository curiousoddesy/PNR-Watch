#!/bin/bash

# Production Deployment Script

set -e

echo "🚀 Starting PNR Tracker deployment..."

# Check if required environment variables are set
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$JWT_ACCESS_SECRET" ]; then
    echo "❌ Error: JWT_ACCESS_SECRET environment variable is required"
    exit 1
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo "❌ Error: JWT_REFRESH_SECRET environment variable is required"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend npm run migrate:up

# Verify deployment
echo "✅ Verifying deployment..."
curl -f http://localhost/health || exit 1

echo "🎉 Deployment completed successfully!"
echo "📊 Access the application at: http://localhost"
echo "🔧 Monitor logs with: docker-compose logs -f"
