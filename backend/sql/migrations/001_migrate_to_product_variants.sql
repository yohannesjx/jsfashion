-- Migration: Consolidate on product_variants (uuid)
-- This migration updates order_items and inventory_movements to use product_variants instead of variants

BEGIN;

-- Step 1: Update order_items table
-- Drop old foreign key constraint
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

-- Change variant_id column type from bigint to uuid
-- Note: This assumes existing data can be converted or table is empty
ALTER TABLE order_items 
ALTER COLUMN variant_id TYPE uuid USING NULL; -- Set to NULL since we can't convert bigint to uuid

-- Add new foreign key to product_variants
ALTER TABLE order_items 
ADD CONSTRAINT order_items_variant_id_fkey 
FOREIGN KEY (variant_id) REFERENCES product_variants(id);

-- Step 2: Update inventory_movements table
-- Drop old foreign key constraint
ALTER TABLE inventory_movements 
DROP CONSTRAINT IF EXISTS inventory_movements_variant_id_fkey;

-- Change variant_id column type
ALTER TABLE inventory_movements 
ALTER COLUMN variant_id TYPE uuid USING NULL; -- Set to NULL since we can't convert bigint to uuid

-- Add new foreign key with cascade delete
ALTER TABLE inventory_movements 
ADD CONSTRAINT inventory_movements_variant_id_fkey 
FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

COMMIT;

-- Note: Existing order_items and inventory_movements data will have NULL variant_id
-- This is acceptable if starting fresh, otherwise manual data migration needed
