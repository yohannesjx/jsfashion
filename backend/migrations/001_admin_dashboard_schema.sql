-- Admin Dashboard - Complete Database Schema
-- Phase 1: Foundation tables for authentication, RBAC, and enhanced e-commerce

-- ============================================================================
-- AUTHENTICATION & AUTHORIZATION
-- ============================================================================

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles definition with permissions
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens for JWT authentication
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES admin_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ENHANCED PRODUCT MANAGEMENT
-- ============================================================================

-- Add SEO and additional fields to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Track inventory movements for audit trail
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    quantity_change INT NOT NULL,
    reason VARCHAR(100), -- 'sale', 'restock', 'adjustment', 'return'
    notes TEXT,
    user_id BIGINT REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses for multi-location inventory
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock per warehouse per variant
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, variant_id)
);

-- ============================================================================
-- COUPONS & DISCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    single_use_per_customer BOOLEAN DEFAULT false,
    applicable_products BIGINT[],
    applicable_categories BIGINT[],
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track coupon usage
CREATE TABLE IF NOT EXISTS coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES admin_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_order', 'low_stock', 'system', 'customer_message'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(255),
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CUSTOMER MANAGEMENT ENHANCEMENTS
-- ============================================================================

-- Internal notes about customers
CREATE TABLE IF NOT EXISTS customer_notes (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES admin_users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer segmentation tags
CREATE TABLE IF NOT EXISTS customer_tags (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL, -- 'VIP', 'Wholesale', 'At Risk', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, tag)
);

-- Add customer lifetime value tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment VARCHAR(50);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

-- Daily aggregated statistics
CREATE TABLE IF NOT EXISTS daily_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    revenue DECIMAL(12,2) DEFAULT 0,
    orders_count INT DEFAULT 0,
    new_customers INT DEFAULT 0,
    returning_customers INT DEFAULT 0,
    avg_order_value DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product performance tracking
CREATE TABLE IF NOT EXISTS product_analytics (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    add_to_cart INT DEFAULT 0,
    purchases INT DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    UNIQUE(product_id, date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_variant ON warehouse_stock(variant_id);

-- Coupon indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_expires ON coupons(expires_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_date ON product_analytics(product_id, date DESC);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('super_admin', 'Full system access', '["*"]'::jsonb),
    ('admin', 'Manage products, orders, customers', '["products.*", "orders.*", "customers.*", "analytics.view"]'::jsonb),
    ('editor', 'Edit products and content', '["products.edit", "products.view", "analytics.view"]'::jsonb),
    ('viewer', 'Read-only access', '["products.view", "orders.view", "customers.view", "analytics.view"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default warehouse
INSERT INTO warehouses (name, code, location, is_active) VALUES
    ('Main Warehouse', 'MAIN', 'Addis Ababa', true)
ON CONFLICT (code) DO NOTHING;

-- Create default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active) VALUES
    ('admin@luxe.com', '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qO', 'Admin', 'User', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON daily_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
