#!/bin/bash

# Deploy backend with category filtering support

echo "🚀 Deploying backend with category filtering..."

cd backend

# Build the backend
echo "📦 Building backend..."
go build -o bin/api cmd/api/main.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# You need to:
# 1. SSH into your server
# 2. Stop the running backend
# 3. Upload the new binary
# 4. Start the backend again

echo ""
echo "📋 Next steps:"
echo "1. SSH into your server"
echo "2. Stop the backend: sudo systemctl stop jsfashion-backend (or docker-compose down)"
echo "3. Upload new code: git pull origin main"
echo "4. Rebuild: docker-compose -f docker-compose.prod.yml up -d --build backend"
echo ""
echo "Or if using systemd:"
echo "1. SSH into server"
echo "2. cd /path/to/backend"
echo "3. git pull origin main"
echo "4. go build -o bin/api cmd/api/main.go"
echo "5. sudo systemctl restart jsfashion-backend"
