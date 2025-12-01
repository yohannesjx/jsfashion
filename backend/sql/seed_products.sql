-- Seed Categories
INSERT INTO categories (name, slug, active) VALUES
('Ready to Wear', 'ready-to-wear', true),
('Accessories', 'accessories', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Products
INSERT INTO products (title, slug, description, base_price, active, featured) VALUES
('Oversized Cotton T-Shirt', 'oversized-cotton-t-shirt', 'Heavyweight cotton t-shirt with a boxy fit.', 1200.00, true, true),
('Pleated Wide Leg Trousers', 'pleated-wide-leg-trousers', 'High-waisted trousers with deep pleats.', 3500.00, true, true),
('Leather Crossbody Bag', 'leather-crossbody-bag', 'Minimalist leather bag with adjustable strap.', 4500.00, true, true),
('Silver Chain Necklace', 'silver-chain-necklace', 'Sterling silver chain with unique links.', 1800.00, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Product Variants (UUID)
-- T-Shirt
INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment)
SELECT id, 'TSHIRT-BLK-M', 'M', 'Black', 50, 0 FROM products WHERE slug = 'oversized-cotton-t-shirt'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment)
SELECT id, 'TSHIRT-WHT-M', 'M', 'White', 50, 0 FROM products WHERE slug = 'oversized-cotton-t-shirt'
ON CONFLICT (sku) DO NOTHING;

-- Trousers
INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment)
SELECT id, 'TROUSER-BLK-32', '32', 'Black', 30, 0 FROM products WHERE slug = 'pleated-wide-leg-trousers'
ON CONFLICT (sku) DO NOTHING;

-- Bag
INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment)
SELECT id, 'BAG-BLK-OS', 'OS', 'Black', 20, 0 FROM products WHERE slug = 'leather-crossbody-bag'
ON CONFLICT (sku) DO NOTHING;

-- Necklace
INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment)
SELECT id, 'NECK-SLV-OS', 'OS', 'Silver', 15, 0 FROM products WHERE slug = 'silver-chain-necklace'
ON CONFLICT (sku) DO NOTHING;

-- Seed Prices (linking to product_variants)
-- We use a DO block or just simple inserts. Since we don't have unique constraint on variant_id in prices, we might duplicate if we are not careful.
-- But for now, let's just insert.
INSERT INTO prices (variant_id, amount, currency)
SELECT id, 1200, 'ETB' FROM product_variants WHERE sku = 'TSHIRT-BLK-M' AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);

INSERT INTO prices (variant_id, amount, currency)
SELECT id, 1200, 'ETB' FROM product_variants WHERE sku = 'TSHIRT-WHT-M' AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);

INSERT INTO prices (variant_id, amount, currency)
SELECT id, 3500, 'ETB' FROM product_variants WHERE sku = 'TROUSER-BLK-32' AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);

INSERT INTO prices (variant_id, amount, currency)
SELECT id, 4500, 'ETB' FROM product_variants WHERE sku = 'BAG-BLK-OS' AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);

INSERT INTO prices (variant_id, amount, currency)
SELECT id, 1800, 'ETB' FROM product_variants WHERE sku = 'NECK-SLV-OS' AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);

-- Link Products to Categories
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p, categories c WHERE p.slug = 'oversized-cotton-t-shirt' AND c.slug = 'ready-to-wear'
ON CONFLICT (product_id, category_id) DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p, categories c WHERE p.slug = 'pleated-wide-leg-trousers' AND c.slug = 'ready-to-wear'
ON CONFLICT (product_id, category_id) DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p, categories c WHERE p.slug = 'leather-crossbody-bag' AND c.slug = 'accessories'
ON CONFLICT (product_id, category_id) DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p, categories c WHERE p.slug = 'silver-chain-necklace' AND c.slug = 'accessories'
ON CONFLICT (product_id, category_id) DO NOTHING;
