-- Add indexes for performance optimization

-- Product Categories
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Variants
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_active ON variants(active);

-- Product Images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON product_images("position");
