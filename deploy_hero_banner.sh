#!/bin/bash

# Production Server Commands - Run these on your server
# Copy and paste these commands one by one

echo "🚀 Deploying Hero Banner Feature to Production"
echo "================================================"

# 1. Check if services are running
echo -e "\n1️⃣ Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# 2. Start all services if not running
echo -e "\n2️⃣ Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# 3. Wait for database to be ready
echo -e "\n3️⃣ Waiting for database to be ready..."
sleep 5

# 4. Run the migration
echo -e "\n4️⃣ Running store_settings migration..."
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U jsfashion -d jsfashion < backend/sql/migrations/010_add_store_settings.sql

# 5. Verify the migration
echo -e "\n5️⃣ Verifying migration..."
docker-compose -f docker-compose.prod.yml exec postgres psql -U jsfashion -d jsfashion -c "SELECT * FROM store_settings;"

# 6. Restart backend to ensure it picks up changes
echo -e "\n6️⃣ Restarting backend..."
docker-compose -f docker-compose.prod.yml restart backend

# 7. Check final status
echo -e "\n7️⃣ Final service status:"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n✅ Deployment Complete!"
echo "================================================"
echo "You can now:"
echo "1. Go to https://jsfashion.et/admin/settings"
echo "2. Upload a hero banner image"
echo "3. Save and view it on https://jsfashion.et"
