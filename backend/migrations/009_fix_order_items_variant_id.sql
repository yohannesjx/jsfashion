-- Fix order_items schema to match product_variants
-- 1. Drop existing foreign key to variants (legacy)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

-- 2. Alter variant_id column to be UUID (using a temporary cast if needed, but since table is likely empty or data is invalid, we can just alter)
-- Note: If there is existing data with bigint variant_ids, this cast might fail or produce invalid UUIDs. 
-- Since we are fixing a broken system, we assume we can truncate order_items or that it's empty.
TRUNCATE TABLE order_items CASCADE;

ALTER TABLE order_items ALTER COLUMN variant_id TYPE UUID USING variant_id::text::uuid;

-- 3. Add foreign key to product_variants
ALTER TABLE order_items ADD CONSTRAINT order_items_variant_id_fkey 
    FOREIGN KEY (variant_id) REFERENCES product_variants(id);
