-- Add cart_enabled column to store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS cart_enabled BOOLEAN DEFAULT true;

-- Update existing row to have cart enabled by default
UPDATE store_settings SET cart_enabled = true WHERE cart_enabled IS NULL;
