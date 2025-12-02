-- name: CreateUser :one
INSERT INTO users (email, password_hash, role)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: CreateProduct :one
INSERT INTO products (title, description, active, slug)
VALUES ($1, $2, $3, $4)
RETURNING 
    id::text as id,
    title as name,
    description,
    '0'::text as base_price,
    ''::text as category,
    thumbnail as image_url,
    active as is_active,
    created_at,
    updated_at;

-- name: GetProduct :one
SELECT 
    p.id::text as id,
    p.title as name,
    p.slug,
    p.description,
    COALESCE(min_price.price, p.base_price::text, '0')::text as base_price,
    ''::text as category,
    COALESCE(pi.url, p.thumbnail) as image_url,
    p.active as is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN LATERAL (
    SELECT MIN(pr.amount)::text as price
    FROM product_variants pv
    JOIN prices pr ON pr.variant_id = pv.id
    WHERE pv.product_id = p.id AND pv.active = true
) min_price ON true
LEFT JOIN LATERAL (
    SELECT url 
    FROM product_images 
    WHERE product_id = p.id 
    ORDER BY id 
    LIMIT 1
) pi ON true
WHERE p.id = $1::bigint LIMIT 1;

-- name: GetProductBySlug :one
SELECT 
    p.id::text as id,
    p.title as name,
    p.slug,
    p.description,
    COALESCE(min_price.price, p.base_price::text, '0')::text as base_price,
    ''::text as category,
    COALESCE(pi.url, p.thumbnail) as image_url,
    p.active as is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN LATERAL (
    SELECT MIN(pr.amount)::text as price
    FROM product_variants pv
    JOIN prices pr ON pr.variant_id = pv.id
    WHERE pv.product_id = p.id AND pv.active = true
) min_price ON true
LEFT JOIN LATERAL (
    SELECT url 
    FROM product_images 
    WHERE product_id = p.id 
    ORDER BY id 
    LIMIT 1
) pi ON true
WHERE p.slug = $1 LIMIT 1;

-- name: ListProducts :many
SELECT 
    p.id::text as id,
    p.title as name,
    p.slug,
    p.description,
    COALESCE(p.base_price, 0)::text as base_price,
    ''::text as category,
    COALESCE(pi.url, p.thumbnail) as image_url,
    p.active as is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN LATERAL (
    SELECT url 
    FROM product_images 
    WHERE product_id = p.id 
    ORDER BY position ASC
    LIMIT 1
) pi ON true
WHERE p.active = true
ORDER BY p.created_at DESC NULLS LAST, p.id DESC
LIMIT $1 OFFSET $2;

-- name: ListProductImages :many
SELECT * FROM product_images
WHERE product_id = $1
ORDER BY position ASC;

-- name: AddProductImage :one
INSERT INTO product_images (product_id, url, position)
VALUES ($1, $2, $3)
RETURNING *;

-- name: DeleteProductImage :exec
DELETE FROM product_images WHERE id = $1;


-- name: ListProductVariants :many
SELECT 
  v.id, 
  v.product_id, 
  CONCAT_WS(' / ', v.size, v.color)::text as name, 
  v.sku, 
  v.size, 
  v.color, 
  v.image, 
  v.stock_quantity as stock, 
  v.stock_quantity, 
  v.active, 
  COALESCE(p.amount, 0) as price, 
  v.display_order, 
  v.created_at, 
  v.updated_at
FROM product_variants v
LEFT JOIN prices p ON p.variant_id = v.id
WHERE v.product_id = $1::bigint
ORDER BY v.display_order ASC, v.created_at ASC;

-- name: CreateGiftCard :one
INSERT INTO gift_cards (code, initial_balance, current_balance, expiry_date)
VALUES ($1, $2, $2, $3)
RETURNING *;

-- name: GetGiftCardByCode :one
SELECT * FROM gift_cards
WHERE code = $1 LIMIT 1;

-- name: UpdateGiftCardBalance :one
UPDATE gift_cards
SET current_balance = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CreateGiftCardTransaction :one
INSERT INTO gift_card_transactions (gift_card_id, order_id, amount, type)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- Product Mutations
-- name: UpdateProduct :one
UPDATE products
SET name = $2, description = $3, base_price = $4, category = $5, image_url = $6, is_active = $7, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteProduct :exec
DELETE FROM products WHERE id = $1;

-- Product Variant Mutations
-- name: CreateProductVariant :one
INSERT INTO product_variants (product_id, sku, size, color, image, price_adjustment, stock_quantity)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetProductVariant :one
SELECT * FROM product_variants WHERE id = $1 LIMIT 1;

-- name: UpdateProductVariant :one
UPDATE product_variants
SET sku = $2, size = $3, color = $4, image = $5, stock_quantity = $6, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteProductVariant :exec
DELETE FROM product_variants WHERE id = $1;

-- Orders
-- name: ListOrders :many
SELECT 
    o.id, 
    o.customer_id, 
    o.status, 
    o.total_amount, 
    o.payment_method, 
    o.created_at, 
    o.updated_at,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
ORDER BY o.created_at DESC;

-- name: GetOrder :one
SELECT 
    o.id, 
    o.customer_id, 
    o.status, 
    o.total_amount, 
    o.payment_method, 
    o.created_at, 
    o.updated_at,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE o.id = $1 LIMIT 1;

-- name: UpdateOrderStatus :one
UPDATE orders
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListOrderItems :many
SELECT 
    oi.id, 
    oi.order_id, 
    oi.variant_id, 
    oi.quantity, 
    oi.unit_price, 
    oi.subtotal,
    v.sku,
    p.title as product_name,
    v.name as variant_name,
    COALESCE(v.image, p.thumbnail) as image_url
FROM order_items oi
LEFT JOIN variants v ON oi.variant_id = v.id
LEFT JOIN products p ON v.product_id = p.id
WHERE oi.order_id = $1;

-- Customers
-- name: ListCustomers :many
SELECT 
    c.id, 
    c.first_name, 
    c.last_name, 
    c.email, 
    c.phone, 
    c.created_at,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id
ORDER BY c.created_at DESC;

-- name: GetCustomerDetails :one
SELECT 
    c.id, 
    c.first_name, 
    c.last_name, 
    c.email, 
    c.phone, 
    c.created_at,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.id = $1
GROUP BY c.id;

-- name: ListCustomerOrders :many
SELECT id, status, total_amount, created_at 
FROM orders 
WHERE customer_id = $1 
ORDER BY created_at DESC;

-- Coupons
-- name: ListCoupons :many
SELECT * FROM coupons
ORDER BY created_at DESC;

-- name: GetCoupon :one
SELECT * FROM coupons
WHERE id = $1 LIMIT 1;

-- name: GetCouponByCode :one
SELECT * FROM coupons
WHERE code = $1 LIMIT 1;

-- name: CreateCoupon :one
INSERT INTO coupons (
  code, type, value, min_order_value, max_discount, 
  usage_limit, starts_at, expires_at, is_active
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: UpdateCoupon :one
UPDATE coupons
SET 
  code = $2,
  type = $3,
  value = $4,
  min_order_value = $5,
  max_discount = $6,
  usage_limit = $7,
  starts_at = $8,
  expires_at = $9,
  is_active = $10,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: DeleteCoupon :exec
DELETE FROM coupons
WHERE id = $1;

-- name: GetCustomer :one
SELECT * FROM customers WHERE id = $1 LIMIT 1;

-- Categories
-- name: ListCategories :many
SELECT id, name, slug, image_url, is_active, COALESCE(display_order, 0) as display_order, created_at, updated_at FROM categories
WHERE is_active = true
ORDER BY display_order ASC, name ASC;

-- name: GetCategory :one
SELECT id, name, slug, image_url, is_active, COALESCE(display_order, 0) as display_order, created_at, updated_at FROM categories WHERE id = $1 LIMIT 1;

-- name: CreateCategory :one
INSERT INTO categories (name, slug, image_url, is_active)
VALUES ($1, $2, $3, $4)
RETURNING id, name, slug, image_url, is_active, created_at, updated_at;

-- name: UpdateCategory :one
UPDATE categories
SET name = $2, slug = $3, image_url = $4, is_active = $5, updated_at = NOW()
WHERE id = $1
RETURNING id, name, slug, image_url, is_active, created_at, updated_at;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;

-- Product Categories (Many-to-Many)
-- name: ListProductCategories :many
SELECT c.id, c.name, c.slug, c.image_url, c.is_active, c.created_at, c.updated_at FROM categories c
JOIN product_categories pc ON c.id = pc.category_id
WHERE pc.product_id = $1;
-- Inventory
-- name: CreateInventoryMovement :one
INSERT INTO inventory_movements (
  variant_id, type, quantity, previous_stock, new_stock, reference_id, note, user_id
) VALUES (
  $1::uuid, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: ListInventoryMovements :many
SELECT im.*, v.sku, p.title as product_name, u.email as user_email
FROM inventory_movements im
JOIN product_variants v ON im.variant_id = v.id
JOIN products p ON v.product_id = p.id::text::bigint
LEFT JOIN admin_users u ON im.user_id = u.id
ORDER BY im.created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetLowStockVariants :many
SELECT v.id, v.sku, v.stock_quantity, p.title as product_name, p.image_url
FROM variants v
JOIN products p ON v.product_id = p.id
WHERE v.stock_quantity < $1
ORDER BY v.stock_quantity ASC;

-- name: GetInventoryStats :one
SELECT 
  COUNT(*) FILTER (WHERE stock_quantity < 1) as low_stock_count,
  COALESCE(SUM(stock_quantity), 0)::bigint as total_stock_items
FROM variants;
-- Analytics
-- name: GetSalesAnalytics :one
SELECT 
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0)::bigint as total_revenue,
  COALESCE(AVG(o.total_amount), 0)::bigint as average_order_value,
  COUNT(DISTINCT o.customer_id) as unique_customers
FROM orders o
WHERE o.created_at >= $1 AND o.created_at <= $2;

-- name: GetTopSellingProducts :many
SELECT 
  p.id,
  p.title as product_name,
  p.image_url,
  COUNT(oi.id) as order_count,
  COALESCE(SUM(oi.quantity), 0)::bigint as total_quantity_sold,
  COALESCE(SUM(oi.price * oi.quantity), 0)::bigint as total_revenue
FROM products p
JOIN variants v ON p.id = v.product_id
JOIN order_items oi ON v.id = oi.variant_id
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= $1 AND o.created_at <= $2
GROUP BY p.id, p.title, p.image_url
ORDER BY total_revenue DESC
LIMIT $3;

-- name: GetCustomerMetrics :one
SELECT 
  COUNT(DISTINCT customer_id) as total_customers,
  COUNT(DISTINCT CASE WHEN order_count > 1 THEN customer_id END) as repeat_customers,
  COALESCE(AVG(order_count), 0) as avg_orders_per_customer
FROM (
  SELECT customer_id, COUNT(*) as order_count
  FROM orders
  WHERE created_at >= $1 AND created_at <= $2
  GROUP BY customer_id
) customer_orders;

-- name: GetRevenueByDate :many
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  COALESCE(SUM(total_amount), 0)::bigint as revenue
FROM orders
WHERE created_at >= $1 AND created_at <= $2
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- name: SetProductCategories :exec
DELETE FROM product_categories WHERE product_id = $1::bigint::integer;

-- name: AddProductCategory :exec
INSERT INTO product_categories (product_id, category_id)
VALUES ($1::bigint::integer, $2::integer)
ON CONFLICT (product_id, category_id) DO NOTHING;

-- name: RemoveProductCategory :exec
DELETE FROM product_categories
WHERE product_id = $1 AND category_id = $2;

-- name: CreateOrder :one
INSERT INTO orders (customer_id, status, total_amount, payment_method)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: CreateOrderItem :one
INSERT INTO order_items (order_id, variant_id, quantity, unit_price, subtotal)
VALUES ($1, $2::uuid, $3, $4, $5)
RETURNING *;

-- name: UpdateVariantStock :exec
UPDATE product_variants
SET stock_quantity = stock_quantity - $2
WHERE id = $1::uuid;
