#!/bin/bash
# Deploy order fix and Telegram bot update to production server

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "🛑 Stopping backend container..."
docker-compose -f docker-compose.prod.yml stop backend

echo "🔨 Rebuilding backend container..."
docker-compose -f docker-compose.prod.yml build backend

echo "🚀 Starting backend container..."
docker-compose -f docker-compose.prod.yml up -d backend

echo "✅ Deployment complete!"
echo ""
echo "📋 Checking container status..."
docker-compose -f docker-compose.prod.yml ps backend

echo ""
echo "📝 Viewing recent logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50 backend
