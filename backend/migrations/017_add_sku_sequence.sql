-- Create sequence for 10-digit SKUs starting from 1000000001
CREATE SEQUENCE IF NOT EXISTS product_variant_sku_seq
    START WITH 1000000001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Alter table to use sequence by default (optional, but good for new inserts if not handled by app)
-- ALTER TABLE product_variants ALTER COLUMN sku SET DEFAULT cast(nextval('product_variant_sku_seq') as text);
