-- Fix all UUID foreign key mismatches

DROP TABLE IF EXISTS coupon_usage CASCADE;

-- Recreate with correct UUID types for customer_id and order_id
CREATE TABLE coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_customer ON coupon_usage(customer_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);
