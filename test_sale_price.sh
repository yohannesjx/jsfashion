#!/bin/bash
# Test if sale_price is being saved to database

echo "🔍 Checking if sale_price column exists and has data..."
echo ""

# Check on your server with the correct container name
CONTAINER_NAME="jsfashion-postgres-1"  # Adjust this based on docker ps output

# Check if sale_price column exists
echo "1. Checking if sale_price column exists in prices table:"
docker exec -i $CONTAINER_NAME psql -U jsfashion -d jsfashion -c "\d prices"

echo ""
echo "2. Checking current sale_price values:"
docker exec -i $CONTAINER_NAME psql -U jsfashion -d jsfashion -c "SELECT COUNT(*) as total_prices, COUNT(sale_price) as prices_with_sale FROM prices;"

echo ""
echo "3. Sample of prices with sale_price:"
docker exec -i $CONTAINER_NAME psql -U jsfashion -d jsfashion -c "SELECT variant_id::text, amount, sale_price FROM prices WHERE sale_price IS NOT NULL LIMIT 10;"

echo ""
echo "4. All prices (first 10):"
docker exec -i $CONTAINER_NAME psql -U jsfashion -d jsfashion -c "SELECT variant_id::text, amount, sale_price FROM prices LIMIT 10;"
