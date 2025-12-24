#!/bin/bash
# Script to update all product variant SKUs with UNIQUE sequential 6-digit numbers
# Direct PostgreSQL connection (no Docker required)

echo "🔄 Updating all product variant SKUs with sequential numbers..."
echo ""

# You may need to adjust these connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-jsfashion}"
DB_USER="${DB_USER:-postgres}"

# Run the SQL update directly
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Show current count
SELECT COUNT(*) as total_variants FROM product_variants;

-- Update all variants with sequential 6-digit SKUs (guaranteed unique)
-- Starts from 100000 and increments
UPDATE product_variants
SET sku = LPAD((100000 + ROW_NUMBER() OVER (ORDER BY product_id, id))::TEXT, 6, '0')
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

-- Verify uniqueness
SELECT 
    CASE 
        WHEN COUNT(DISTINCT sku) = COUNT(*) 
        THEN '✅ All SKUs are unique'
        ELSE '❌ WARNING: Duplicate SKUs found!'
    END as uniqueness_check
FROM product_variants;

EOF

echo ""
echo "✅ SKU update complete with guaranteed unique codes!"
