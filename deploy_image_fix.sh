#!/bin/bash
# CRITICAL IMAGE FIX DEPLOYMENT SCRIPT
# This script fixes the image upload issues once and for all

set -e  # Exit on error

echo "=========================================="
echo "JSFASHION IMAGE FIX DEPLOYMENT"
echo "=========================================="
echo ""

# Step 1: Pull latest code
echo "Step 1: Pulling latest code..."
cd /opt/jsfashion
git pull origin main
echo "✓ Code updated"
echo ""

# Step 2: Run database migration to fix existing image URLs
echo "Step 2: Running database migration..."
echo "This will update all existing image URLs to use full API domain"

# Copy migration file to postgres container and execute
docker cp backend/sql/migrations/009_fix_image_urls.sql jsfashion_postgres:/tmp/009_fix_image_urls.sql
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U jsfashion -d jsfashion -f /tmp/009_fix_image_urls.sql

echo "✓ Database migration completed"
echo ""

# Step 3: Recreate backend container with new volume
echo "Step 3: Recreating backend container..."
echo "This adds persistent storage for uploads"
docker-compose -f docker-compose.prod.yml up -d --force-recreate backend
echo "✓ Backend container recreated with uploads volume"
echo ""

# Step 4: Wait for backend to be healthy
echo "Step 4: Waiting for backend to be ready..."
sleep 10
echo "✓ Backend should be ready"
echo ""

# Step 5: Verify uploads directory
echo "Step 5: Verifying uploads directory..."
docker-compose -f docker-compose.prod.yml exec backend ls -la /app/uploads || echo "Creating uploads directory..."
docker-compose -f docker-compose.prod.yml exec backend mkdir -p /app/uploads
docker-compose -f docker-compose.prod.yml exec backend chmod 755 /app/uploads
echo "✓ Uploads directory verified"
echo ""

echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "1. ✓ Uploads now persist across container restarts (Docker volume)"
echo "2. ✓ All existing image URLs updated to full API URLs"
echo "3. ✓ New uploads will use full API URLs"
echo "4. ✓ API_BASE_URL environment variable set"
echo ""
echo "Images should now work consistently!"
echo "=========================================="
