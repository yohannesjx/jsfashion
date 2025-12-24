#!/bin/bash
# Check and fix variant prices that were incorrectly updated

echo "🔍 Checking variant prices in database..."
echo ""

# Replace with your actual container name
CONTAINER="jsfashion_postgres"

echo "1. Current prices for all variants:"
docker exec -i $CONTAINER psql -U jsfashion -d jsfashion << 'EOF'
SELECT 
    pv.id::text as variant_id,
    pv.sku,
    CONCAT_WS(' / ', pv.size, pv.color) as variant,
    p.title as product,
    pr.amount as regular_price,
    pr.sale_price
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
LEFT JOIN prices pr ON pr.variant_id = pv.id
ORDER BY p.title, pv.id
LIMIT 20;
EOF

echo ""
echo "2. Products with base_price vs variant prices:"
docker exec -i $CONTAINER psql -U jsfashion -d jsfashion << 'EOF'
SELECT 
    p.title,
    p.base_price as product_base_price,
    COUNT(pv.id) as variant_count,
    AVG(pr.amount) as avg_variant_price,
    MAX(pr.amount) as max_variant_price,
    MIN(pr.amount) as min_variant_price
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN prices pr ON pr.variant_id = pv.id
GROUP BY p.id, p.title, p.base_price
HAVING COUNT(pv.id) > 0
ORDER BY p.title
LIMIT 10;
EOF

echo ""
echo "📝 To reset a variant's price to match product base_price:"
echo "docker exec -i $CONTAINER psql -U jsfashion -d jsfashion -c \"UPDATE prices SET amount = (SELECT base_price FROM products WHERE id = (SELECT product_id FROM product_variants WHERE id = prices.variant_id)) WHERE variant_id = 'VARIANT_ID'::uuid;\""
