-- Create views to map old Vendure schema to new expected schema
-- This allows the Go code to work with the old data without changes

-- First, rename the old tables
ALTER TABLE products RENAME TO products_old;
ALTER TABLE variants RENAME TO product_variants_old;

-- Create view for products with correct column names
CREATE VIEW products AS
SELECT 
    id::text::uuid as id,  -- Convert bigint to UUID (this will fail, need different approach)
    title as name,
    description,
    0.00::decimal(10,2) as base_price,  -- Will get from variants
    ''::varchar(100) as category,
    thumbnail as image_url,
    active as is_active,
    created_at,
    updated_at
FROM products_old;

-- This won't work because we can't cast bigint to UUID
-- Need a different approach
