-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL DEFAULT 'Luxe Fashion',
    store_email VARCHAR(255),
    store_phone VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'ETB',
    hero_banner_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings row
INSERT INTO store_settings (store_name, currency)
VALUES ('Luxe Fashion', 'ETB')
ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at
CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
