#!/bin/bash

echo "🚀 Deploying Inventory Management Updates to Server..."
echo ""

# Pull latest changes from git
echo "📥 Step 1: Pulling latest changes from git..."
git pull origin main

# Navigate to backend
cd backend

# Build the backend
echo "🔨 Step 2: Building backend..."
go build -o bin/api ./cmd/api

# Restart the backend service (adjust this based on your server setup)
echo "🔄 Step 3: Restarting backend service..."
# If using systemd:
# sudo systemctl restart jsfashion-api

# If using PM2:
# pm2 restart jsfashion-api

# If running directly, you'll need to kill the old process and start new one:
# pkill -f "bin/api"
# nohup ./bin/api &

# Navigate to frontend
cd ../frontend

# Install dependencies (if needed)
echo "📦 Step 4: Installing frontend dependencies..."
npm install

# Build frontend
echo "🔨 Step 5: Building frontend..."
npm run build

# Restart frontend service (adjust based on your setup)
echo "🔄 Step 6: Restarting frontend service..."
# If using PM2:
# pm2 restart jsfashion-frontend

# If using systemd:
# sudo systemctl restart jsfashion-frontend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Manual steps you may need to do on the server:"
echo "   1. Pull the latest code: git pull origin main"
echo "   2. Build backend: cd backend && go build -o bin/api ./cmd/api"
echo "   3. Restart backend service (systemd/PM2/manual)"
echo "   4. Build frontend: cd frontend && npm run build"
echo "   5. Restart frontend service (systemd/PM2/manual)"
echo ""
echo "🔍 Test the inventory page at: http://your-server/admin/inventory"
