-- Fix foreign key type mismatches
-- Customers table uses UUID, so we need to match that

-- Drop the failed tables
DROP TABLE IF EXISTS customer_notes CASCADE;
DROP TABLE IF EXISTS customer_tags CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;

-- Recreate with correct UUID type for customer_id
CREATE TABLE coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_notes (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES admin_users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_tags (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, tag)
);

-- Recreate indexes
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_customer_tags_customer ON customer_tags(customer_id);
