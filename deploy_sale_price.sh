#!/bin/bash
# Complete deployment script for sale price feature

echo "🚀 Deploying Sale Price Feature..."
echo ""

# Step 1: Add sale_price column to database
echo "1️⃣ Adding sale_price column to database..."
docker exec -i jsfashion_postgres psql -U jsfashion -d jsfashion << 'EOF'
-- Add sale_price column if it doesn't exist
ALTER TABLE prices ADD COLUMN IF NOT EXISTS sale_price BIGINT DEFAULT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prices' 
ORDER BY ordinal_position;
EOF

echo ""
echo "✅ Database migration complete!"
echo ""

# Step 2: Pull latest code
echo "2️⃣ Pulling latest code..."
git pull origin main

echo ""

# Step 3: Rebuild backend (to include sale_price in API responses)
echo "3️⃣ Rebuilding backend..."
docker-compose -f docker-compose.prod.yml build backend

echo ""

# Step 4: Rebuild frontend
echo "4️⃣ Rebuilding frontend..."
docker-compose -f docker-compose.prod.yml build frontend

echo ""

# Step 5: Restart services
echo "5️⃣ Restarting services..."
docker-compose -f docker-compose.prod.yml up -d backend frontend

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""

# Step 6: Verify
echo "6️⃣ Verifying deployment..."
echo ""
echo "Backend status:"
docker-compose -f docker-compose.prod.yml ps backend

echo ""
echo "Frontend status:"
docker-compose -f docker-compose.prod.yml ps frontend

echo ""
echo "Database schema:"
docker exec -i jsfashion_postgres psql -U jsfashion -d jsfashion -c "\d prices"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Try setting a sale price on a product"
echo "3. Refresh the page - sale price should persist"
