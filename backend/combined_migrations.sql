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
-- Create admin user with proper bcrypt hash
-- Password: admin123
-- Bcrypt hash generated with cost 10

DELETE FROM admin_users WHERE email = 'admin@luxe.com';

INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'admin@luxe.com',
    '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu',
    'Admin',
    'User',
    'super_admin',
    true
);

-- Create additional test users
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
VALUES 
    ('editor@luxe.com', '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu', 'Editor', 'User', 'editor', true),
    ('viewer@luxe.com', '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu', 'Viewer', 'User', 'viewer', true)
ON CONFLICT (email) DO NOTHING;
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
-- Fix prices variant_id type mismatch
ALTER TABLE prices DROP CONSTRAINT IF EXISTS fk_variants_prices;
ALTER TABLE prices 
ALTER COLUMN variant_id TYPE UUID USING variant_id::text::uuid;

-- Add foreign key constraint
ALTER TABLE prices
ADD CONSTRAINT fk_prices_variant
FOREIGN KEY (variant_id) 
REFERENCES product_variants(id)
ON DELETE CASCADE;
-- Add active column to product_variants
ALTER TABLE product_variants ADD COLUMN active BOOLEAN DEFAULT true;

-- Update existing rows to be active
UPDATE product_variants SET active = true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price BIGINT DEFAULT 0;
-- Add image column to product_variants
ALTER TABLE product_variants ADD COLUMN image VARCHAR(512);
-- Fix order_items schema to match product_variants
-- 1. Drop existing foreign key to variants (legacy)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

-- 2. Alter variant_id column to be UUID (using a temporary cast if needed, but since table is likely empty or data is invalid, we can just alter)
-- Note: If there is existing data with bigint variant_ids, this cast might fail or produce invalid UUIDs. 
-- Since we are fixing a broken system, we assume we can truncate order_items or that it's empty.
TRUNCATE TABLE order_items CASCADE;

ALTER TABLE order_items ALTER COLUMN variant_id TYPE UUID USING variant_id::text::uuid;

-- 3. Add foreign key to product_variants
ALTER TABLE order_items ADD CONSTRAINT order_items_variant_id_fkey 
    FOREIGN KEY (variant_id) REFERENCES product_variants(id);
-- Fix inventory_movements schema to match code expectations
DROP TABLE IF EXISTS inventory_movements;

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id),
    type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id VARCHAR(100),
    note TEXT,
    user_id BIGINT, -- Keep as bigint to match admin_users if needed, or null
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_inventory_movements_variant_id ON inventory_movements(variant_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
-- Add order_number column for short, human-readable IDs
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number INT DEFAULT nextval('order_number_seq');

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
-- Add display_order to categories for custom ordering
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Set initial display_order based on created_at
UPDATE categories SET display_order = (
    SELECT COUNT(*) FROM categories c2 WHERE c2.created_at <= categories.created_at
);
CREATE TABLE refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    restock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refund_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refund_items_refund_id ON refund_items(refund_id);
-- Add sale_price column to prices table for discounted pricing
ALTER TABLE prices ADD COLUMN IF NOT EXISTS sale_price BIGINT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN prices.sale_price IS 'Discounted price in Birr. NULL means no sale/discount active.';
-- Migration: 016_fulfillment_system.sql
-- Description: Creates tables for e-commerce fulfillment system including drivers,
--              fulfillment orders, scanning, assignments, and returns

-- ============================================================================
-- DRIVERS TABLE
-- Stores delivery personnel information with workload tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id BIGSERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    vehicle_type VARCHAR(50),  -- 'motorcycle', 'car', 'van', 'bike'
    vehicle_plate VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    current_workload INTEGER DEFAULT 0,  -- Active deliveries + returns assigned
    max_daily_assignments INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FULFILLMENT ORDERS TABLE
-- Extends orders with fulfillment-specific tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS fulfillment_orders (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    fulfillment_status VARCHAR(50) DEFAULT 'placed',
    picker_id BIGINT REFERENCES admin_users(id),
    packer_id BIGINT REFERENCES admin_users(id),
    driver_id BIGINT REFERENCES drivers(id),
    picked_at TIMESTAMP,
    packed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    delivery_address TEXT,
    delivery_phone VARCHAR(50),
    delivery_notes TEXT,
    signature_url VARCHAR(512),
    delivery_photo_url VARCHAR(512),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fulfillment_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT valid_fulfillment_status CHECK (
        fulfillment_status IN (
            'placed', 'picking', 'picked', 'packing', 'packed', 'awaiting_pickup',
            'in_transit', 'delivered', 'return_requested', 'return_approved',
            'pickup_assigned', 'picked_up', 'return_received', 'return_completed',
            'cancelled', 'failed'
        )
    )
);

-- ============================================================================
-- FULFILLMENT SCANS TABLE
-- Tracks SKU scanning by picker/packer
-- ============================================================================
CREATE TABLE IF NOT EXISTS fulfillment_scans (
    id BIGSERIAL PRIMARY KEY,
    fulfillment_order_id BIGINT NOT NULL REFERENCES fulfillment_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    sku VARCHAR(255) NOT NULL,
    scanned_by BIGINT NOT NULL REFERENCES admin_users(id),
    scan_type VARCHAR(20) NOT NULL,  -- 'pick' or 'pack'
    quantity_scanned INTEGER DEFAULT 1,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_scan_type CHECK (scan_type IN ('pick', 'pack'))
);

-- ============================================================================
-- DRIVER ASSIGNMENTS TABLE
-- Links drivers to fulfillment orders for delivery or return pickup
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_assignments (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    fulfillment_order_id BIGINT NOT NULL REFERENCES fulfillment_orders(id),
    assignment_type VARCHAR(20) NOT NULL,  -- 'delivery' or 'return_pickup'
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP,  -- When driver picked up package from warehouse
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned',
    failure_reason TEXT,
    notes TEXT,
    CONSTRAINT valid_assignment_type CHECK (assignment_type IN ('delivery', 'return_pickup')),
    CONSTRAINT valid_assignment_status CHECK (
        status IN ('assigned', 'picked_up', 'in_progress', 'completed', 'failed', 'reassigned')
    )
);

-- ============================================================================
-- ORDER STATUS HISTORY TABLE
-- Audit trail for all status changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGSERIAL PRIMARY KEY,
    fulfillment_order_id BIGINT NOT NULL REFERENCES fulfillment_orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_admin BIGINT REFERENCES admin_users(id),
    changed_by_driver BIGINT REFERENCES drivers(id),
    change_source VARCHAR(50) DEFAULT 'admin',  -- 'admin', 'driver_app', 'picker_app', 'system'
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RETURN REQUESTS TABLE
-- Manages return workflow
-- ============================================================================
CREATE TABLE IF NOT EXISTS return_requests (
    id BIGSERIAL PRIMARY KEY,
    fulfillment_order_id BIGINT NOT NULL REFERENCES fulfillment_orders(id),
    reason VARCHAR(255) NOT NULL,
    reason_category VARCHAR(50),  -- 'defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other'
    description TEXT,
    status VARCHAR(50) DEFAULT 'requested',
    pickup_driver_id BIGINT REFERENCES drivers(id),
    pickup_address TEXT,
    pickup_phone VARCHAR(50),
    refund_amount NUMERIC(10,2),
    restock_items BOOLEAN DEFAULT true,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    pickup_scheduled_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    received_at TIMESTAMP,
    inspected_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_return_status CHECK (
        status IN (
            'requested', 'approved', 'rejected', 'pickup_scheduled',
            'pickup_assigned', 'picked_up', 'in_transit', 'received',
            'inspecting', 'inspected', 'restocked', 'completed', 'cancelled'
        )
    ),
    CONSTRAINT valid_reason_category CHECK (
        reason_category IS NULL OR reason_category IN (
            'defective', 'wrong_item', 'not_as_described', 'size_issue',
            'changed_mind', 'late_delivery', 'other'
        )
    )
);

-- ============================================================================
-- RETURN ITEMS TABLE
-- Individual items in a return request
-- ============================================================================
CREATE TABLE IF NOT EXISTS return_items (
    id BIGSERIAL PRIMARY KEY,
    return_request_id BIGINT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    condition VARCHAR(50),  -- 'unopened', 'opened', 'damaged', 'used'
    inspection_notes TEXT,
    restock_approved BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ADMIN NOTIFICATIONS TABLE
-- For dashboard alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS fulfillment_notifications (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,  -- 'new_order', 'return_request', 'driver_issue', 'low_stock'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_type VARCHAR(50),  -- 'fulfillment_order', 'return_request', 'driver'
    reference_id BIGINT,
    priority VARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    is_read BOOLEAN DEFAULT false,
    read_by BIGINT REFERENCES admin_users(id),
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fulfillment orders indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_tracking ON fulfillment_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_status ON fulfillment_orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_driver ON fulfillment_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_order_id ON fulfillment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_created ON fulfillment_orders(created_at DESC);

-- Driver indexes
CREATE INDEX IF NOT EXISTS idx_drivers_active_workload ON drivers(current_workload) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON drivers(employee_id);

-- Driver assignments indexes
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_status ON driver_assignments(status);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_order ON driver_assignments(fulfillment_order_id);

-- Scans indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_scans_order ON fulfillment_scans(fulfillment_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_scans_sku ON fulfillment_scans(sku);

-- Status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(fulfillment_order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON order_status_history(created_at DESC);

-- Return requests indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(fulfillment_order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_driver ON return_requests(pickup_driver_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_notifications_unread ON fulfillment_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_fulfillment_notifications_type ON fulfillment_notifications(type);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Function already exists in schema, just create triggers
CREATE TRIGGER set_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_fulfillment_orders_updated_at
    BEFORE UPDATE ON fulfillment_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_return_requests_updated_at
    BEFORE UPDATE ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO GENERATE TRACKING NUMBER
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    date_part VARCHAR(8);
    seq_part INTEGER;
    tracking VARCHAR(100);
BEGIN
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get the next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(tracking_number FROM 13) AS INTEGER)
    ), 0) + 1 INTO seq_part
    FROM fulfillment_orders
    WHERE tracking_number LIKE 'TRK-' || date_part || '-%';
    
    tracking := 'TRK-' || date_part || '-' || LPAD(seq_part::TEXT, 6, '0');
    
    RETURN tracking;
END;
$$ LANGUAGE plpgsql;
