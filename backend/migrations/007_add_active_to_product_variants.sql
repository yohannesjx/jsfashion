-- Add active column to product_variants
ALTER TABLE product_variants ADD COLUMN active BOOLEAN DEFAULT true;

-- Update existing rows to be active
UPDATE product_variants SET active = true;
