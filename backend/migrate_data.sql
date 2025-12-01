-- Migration script to convert old Vendure schema to new UUID-based schema
-- This creates a mapping table and migrates data

-- Create temporary mapping tables for ID conversion
CREATE TEMP TABLE product_id_map (old_id BIGINT, new_id UUID);
CREATE TEMP TABLE variant_id_map (old_id BIGINT, new_id UUID);

-- Migrate products: Create new products table with correct schema
CREATE TABLE products_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert products with UUID mapping
INSERT INTO products_new (id, name, description, base_price, image_url, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    title,
    description,
    0.00, -- base_price from variants
    thumbnail,
    active,
    created_at,
    updated_at
FROM products
RETURNING id, name INTO product_id_map;

-- This won't work as written because we need to track old IDs
-- Let me rewrite this properly

DROP TABLE products_new;
DROP TABLE product_id_map;
DROP TABLE variant_id_map;
