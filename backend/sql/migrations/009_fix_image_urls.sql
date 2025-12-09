-- Fix existing image URLs to use full API URL
-- This ensures all images are accessible from the correct domain

-- Update product image URLs
UPDATE products 
SET image_url = CONCAT('https://api.jsfashion.et', image_url)
WHERE image_url LIKE '/uploads/%';

-- Update variant image URLs
UPDATE product_variants 
SET image_url = CONCAT('https://api.jsfashion.et', image_url)
WHERE image_url LIKE '/uploads/%';
