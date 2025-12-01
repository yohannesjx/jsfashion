-- Fix prices variant_id type mismatch
ALTER TABLE prices DROP CONSTRAINT IF EXISTS fk_variants_prices;
ALTER TABLE prices 
ALTER COLUMN variant_id TYPE UUID USING variant_id::text::uuid;

-- Add foreign key constraint
ALTER TABLE prices
ADD CONSTRAINT fk_prices_variant
FOREIGN KEY (variant_id) 
REFERENCES product_variants(id)
ON DELETE CASCADE;
