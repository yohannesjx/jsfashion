-- Add hero text fields to store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS hero_title VARCHAR(255) DEFAULT 'FUTURE\nCLASSICS',
ADD COLUMN IF NOT EXISTS hero_subtitle VARCHAR(255);

-- Update existing row with default values
UPDATE store_settings 
SET hero_title = 'FUTURE\nCLASSICS'
WHERE hero_title IS NULL;
