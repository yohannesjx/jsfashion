#!/bin/bash
# Script to update all product variant SKUs with random 6-digit numbers

echo "🔄 Updating all product variant SKUs..."
echo ""

# Run the SQL update via Docker
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres -d jsfashion << 'EOF'

-- Show current count
SELECT COUNT(*) as total_variants FROM product_variants;

-- Update all variants with random 6-digit SKUs
UPDATE product_variants
SET sku = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE id IS NOT NULL;

-- Show updated SKUs
SELECT 
    pv.id::text as variant_id,
    pv.sku,
    CONCAT_WS(' / ', pv.size, pv.color) as variant_name,
    p.title as product_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
ORDER BY p.title, pv.id;

EOF

echo ""
echo "✅ SKU update complete!"
echo ""
echo "Note: If you see duplicate SKUs (unlikely but possible with random),"
echo "run the script again or use the sequential version in update_skus.sql"
