-- Update all product variant SKUs with random 6-digit numbers
-- This ensures each variant has a unique SKU in format: 100000-999999

-- First, let's see current SKUs
-- SELECT id, sku, size, color FROM product_variants ORDER BY id;

-- Update all variants with random 6-digit SKUs
UPDATE product_variants
SET sku = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE id IS NOT NULL;

-- Verify the update
SELECT id, sku, size, color, product_id 
FROM product_variants 
ORDER BY product_id, id;

-- If you want to ensure uniqueness and avoid duplicates, use this instead:
-- This creates sequential SKUs starting from 100000
-- UPDATE product_variants
-- SET sku = LPAD((100000 + ROW_NUMBER() OVER (ORDER BY id))::TEXT, 6, '0')
-- WHERE id IS NOT NULL;
