CREATE TABLE product_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    size VARCHAR(50),
    color VARCHAR(50),
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
