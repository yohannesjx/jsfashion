-- Add payment_screenshot column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_screenshot TEXT;
