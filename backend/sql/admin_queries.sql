-- ============================================================================
-- ADMIN AUTHENTICATION & AUTHORIZATION QUERIES
-- ============================================================================

-- name: CreateAdminUser :one
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAdminUserByEmail :one
SELECT * FROM admin_users
WHERE email = $1 LIMIT 1;

-- name: GetAdminUserByID :one
SELECT * FROM admin_users
WHERE id = $1 LIMIT 1;

-- name: UpdateAdminUserLastLogin :exec
UPDATE admin_users
SET last_login = NOW()
WHERE id = $1;

-- name: ListAdminUsers :many
SELECT * FROM admin_users
ORDER BY created_at DESC;

-- name: UpdateAdminUser :one
UPDATE admin_users
SET first_name = $2, last_name = $3, role = $4, is_active = $5
WHERE id = $1
RETURNING *;

-- name: DeleteAdminUser :exec
DELETE FROM admin_users WHERE id = $1;

-- Refresh Tokens
-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, token, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetRefreshToken :one
SELECT * FROM refresh_tokens
WHERE token = $1 AND expires_at > NOW()
LIMIT 1;

-- name: DeleteRefreshToken :exec
DELETE FROM refresh_tokens WHERE token = $1;

-- name: DeleteUserRefreshTokens :exec
DELETE FROM refresh_tokens WHERE user_id = $1;

-- Roles
-- name: ListRoles :many
SELECT * FROM roles ORDER BY name ASC;

-- name: GetRole :one
SELECT * FROM roles WHERE name = $1 LIMIT 1;

-- ============================================================================
-- COUPONS & DISCOUNTS QUERIES
-- ============================================================================

-- name: CreateCoupon :one
INSERT INTO coupons (
    code, type, value, min_order_value, max_discount, 
    usage_limit, single_use_per_customer, applicable_products, 
    applicable_categories, starts_at, expires_at, is_active, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetCouponByCode :one
SELECT * FROM coupons
WHERE code = $1 AND is_active = true
LIMIT 1;

-- name: GetCoupon :one
SELECT * FROM coupons WHERE id = $1 LIMIT 1;

-- name: ListCoupons :many
SELECT * FROM coupons
ORDER BY created_at DESC;

-- name: UpdateCoupon :one
UPDATE coupons
SET code = $2, type = $3, value = $4, min_order_value = $5,
    max_discount = $6, usage_limit = $7, single_use_per_customer = $8,
    applicable_products = $9, applicable_categories = $10,
    starts_at = $11, expires_at = $12, is_active = $13
WHERE id = $1
RETURNING *;

-- name: IncrementCouponUsage :exec
UPDATE coupons
SET usage_count = usage_count + 1
WHERE id = $1;

-- name: DeleteCoupon :exec
DELETE FROM coupons WHERE id = $1;

-- name: CreateCouponUsage :one
INSERT INTO coupon_usage (coupon_id, customer_id, order_id, discount_amount)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListCouponUsage :many
SELECT * FROM coupon_usage
WHERE coupon_id = $1
ORDER BY used_at DESC;

-- ============================================================================
-- NOTIFICATIONS QUERIES
-- ============================================================================

-- name: CreateNotification :one
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListNotifications :many
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: ListUnreadNotifications :many
SELECT * FROM notifications
WHERE user_id = $1 AND is_read = false
ORDER BY created_at DESC;

-- name: MarkNotificationRead :exec
UPDATE notifications
SET is_read = true
WHERE id = $1;

-- name: MarkAllNotificationsRead :exec
UPDATE notifications
SET is_read = true
WHERE user_id = $1 AND is_read = false;

-- name: DeleteNotification :exec
DELETE FROM notifications WHERE id = $1;

-- name: CountUnreadNotifications :one
SELECT COUNT(*) FROM notifications
WHERE user_id = $1 AND is_read = false;

-- ============================================================================
-- INVENTORY MANAGEMENT QUERIES
-- ============================================================================

-- name: CreateWarehouse :one
INSERT INTO warehouses (name, code, location, address, is_active)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListWarehouses :many
SELECT * FROM warehouses
WHERE is_active = true
ORDER BY name ASC;

-- name: GetWarehouse :one
SELECT * FROM warehouses WHERE id = $1 LIMIT 1;

-- name: UpdateWarehouse :one
UPDATE warehouses
SET name = $2, location = $3, address = $4, is_active = $5
WHERE id = $1
RETURNING *;

-- name: CreateWarehouseStock :one
INSERT INTO warehouse_stock (warehouse_id, variant_id, quantity, low_stock_threshold)
VALUES ($1, $2, $3, $4)
ON CONFLICT (warehouse_id, variant_id)
DO UPDATE SET quantity = $3, updated_at = NOW()
RETURNING *;

-- name: GetWarehouseStock :one
SELECT * FROM warehouse_stock
WHERE warehouse_id = $1 AND variant_id = $2
LIMIT 1;

-- name: ListLowStockItems :many
SELECT ws.*, w.name as warehouse_name, v.sku as variant_sku
FROM warehouse_stock ws
JOIN warehouses w ON ws.warehouse_id = w.id
JOIN variants v ON ws.variant_id = v.id
WHERE ws.quantity <= ws.low_stock_threshold
ORDER BY ws.quantity ASC;

-- name: CreateInventoryMovement :one
INSERT INTO inventory_movements (variant_id, quantity_change, reason, notes, user_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListInventoryMovements :many
SELECT * FROM inventory_movements
WHERE variant_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- ============================================================================
-- CUSTOMER MANAGEMENT QUERIES
-- ============================================================================

-- name: CreateCustomerNote :one
INSERT INTO customer_notes (customer_id, user_id, note)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListCustomerNotes :many
SELECT cn.*, au.first_name, au.last_name
FROM customer_notes cn
LEFT JOIN admin_users au ON cn.user_id = au.id
WHERE cn.customer_id = $1
ORDER BY cn.created_at DESC;

-- name: DeleteCustomerNote :exec
DELETE FROM customer_notes WHERE id = $1;

-- name: AddCustomerTag :exec
INSERT INTO customer_tags (customer_id, tag)
VALUES ($1, $2)
ON CONFLICT (customer_id, tag) DO NOTHING;

-- name: RemoveCustomerTag :exec
DELETE FROM customer_tags
WHERE customer_id = $1 AND tag = $2;

-- name: ListCustomerTags :many
SELECT tag FROM customer_tags
WHERE customer_id = $1
ORDER BY created_at DESC;

-- name: UpdateCustomerStats :exec
UPDATE customers
SET lifetime_value = $2, total_orders = $3, last_order_date = $4, segment = $5
WHERE id = $1;

-- ============================================================================
-- ANALYTICS & REPORTING QUERIES
-- ============================================================================

-- name: CreateDailyStat :one
INSERT INTO daily_stats (
    date, revenue, orders_count, new_customers, 
    returning_customers, avg_order_value, conversion_rate
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (date)
DO UPDATE SET
    revenue = $2,
    orders_count = $3,
    new_customers = $4,
    returning_customers = $5,
    avg_order_value = $6,
    conversion_rate = $7,
    updated_at = NOW()
RETURNING *;

-- name: GetDailyStats :many
SELECT * FROM daily_stats
WHERE date >= $1 AND date <= $2
ORDER BY date DESC;

-- name: GetTotalRevenue :one
SELECT COALESCE(SUM(revenue), 0) as total_revenue
FROM daily_stats
WHERE date >= $1 AND date <= $2;

-- name: CreateProductAnalytics :one
INSERT INTO product_analytics (product_id, date, views, add_to_cart, purchases, revenue)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (product_id, date)
DO UPDATE SET
    views = product_analytics.views + $3,
    add_to_cart = product_analytics.add_to_cart + $4,
    purchases = product_analytics.purchases + $5,
    revenue = product_analytics.revenue + $6
RETURNING *;

-- name: GetProductAnalytics :many
SELECT * FROM product_analytics
WHERE product_id = $1 AND date >= $2 AND date <= $3
ORDER BY date DESC;

-- name: GetTopSellingProducts :many
SELECT 
    p.id,
    p.title as name,
    p.thumbnail as image_url,
    SUM(pa.purchases) as total_sold,
    SUM(pa.revenue) as total_revenue
FROM product_analytics pa
JOIN products p ON pa.product_id = p.id
WHERE pa.date >= $1 AND pa.date <= $2
GROUP BY p.id, p.title, p.thumbnail
ORDER BY total_revenue DESC
LIMIT $3;
