-- Add sale_price column to prices table for discounted pricing
ALTER TABLE prices ADD COLUMN IF NOT EXISTS sale_price BIGINT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN prices.sale_price IS 'Discounted price in Birr. NULL means no sale/discount active.';
