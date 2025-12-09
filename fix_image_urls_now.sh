#!/bin/bash
# Quick fix for image URLs - run this on the production server

echo "Fixing image URLs in database..."

# Run SQL directly
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U jsfashion -d jsfashion << 'EOF'
-- Update products table
UPDATE products 
SET image_url = 'https://api.jsfashion.et' || image_url
WHERE image_url LIKE '/uploads/%';

-- Update product_variants table  
UPDATE product_variants 
SET image_url = 'https://api.jsfashion.et' || image_url
WHERE image_url LIKE '/uploads/%';

-- Show results
SELECT COUNT(*) as products_updated FROM products WHERE image_url LIKE 'https://api.jsfashion.et/uploads/%';
SELECT COUNT(*) as variants_updated FROM product_variants WHERE image_url LIKE 'https://api.jsfashion.et/uploads/%';
EOF

echo "Done! Image URLs have been updated."
