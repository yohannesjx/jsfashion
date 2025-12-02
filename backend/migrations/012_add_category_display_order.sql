-- Add display_order to categories for custom ordering
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Set initial display_order based on created_at
UPDATE categories SET display_order = (
    SELECT COUNT(*) FROM categories c2 WHERE c2.created_at <= categories.created_at
);
