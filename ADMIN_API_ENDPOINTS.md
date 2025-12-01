# Admin Dashboard - Required Go API Endpoints

This document lists all the API endpoints that the admin dashboard expects from the Go backend. All endpoints should be prefixed with `/api/v1`.

## Products

### GET /products
List all products
- **Response**: Array of `Product` objects
- **Fields**: `id`, `name`, `description`, `base_price`, `category`, `image_url`, `is_active`, `created_at`, `updated_at`

### GET /products/:id
Get product details with images and variants
- **Response**: Object with `product`, `images`, `variants`
- **Product fields**: Same as above
- **Images**: Array with `id`, `product_id`, `url`, `alt_text`, `display_order`, `created_at`
- **Variants**: Array with `id`, `product_id`, `sku`, `size`, `color`, `price_adjustment`, `stock_quantity`, `created_at`, `updated_at`

### POST /products
Create a new product
- **Request Body**: `{ name, description?, base_price, category?, image_url?, is_active? }`
- **Response**: Created `Product` object

### PUT /products/:id
Update a product
- **Request Body**: Partial product fields
- **Response**: Updated `Product` object

### DELETE /products/:id
Delete a product
- **Response**: Success message

## Product Variants

### POST /products/variants
Create a new variant
- **Request Body**: `{ product_id, sku, size?, color?, price_adjustment?, stock_quantity }`
- **Response**: Created `ProductVariant` object

### PUT /products/variants/:id
Update a variant
- **Request Body**: Partial variant fields
- **Response**: Updated `ProductVariant` object

### DELETE /products/variants/:id
Delete a variant
- **Response**: Success message

### POST /products/:productId/variants/bulk
Bulk update variants
- **Request Body**: `{ variants: Array<{ id, sku?, size?, color?, price_adjustment?, stock_quantity? }> }`
- **Response**: Array of updated `ProductVariant` objects

## Orders

### GET /orders
List all orders
- **Response**: Array of `Order` objects
- **Fields**: `id`, `customer_id`, `status`, `total_amount`, `payment_method`, `created_at`, `updated_at`

### GET /orders/:id
Get order details with customer and items
- **Response**: `OrderDetail` object
- **Includes**: `customer` object (if exists) and `items` array
- **Customer fields**: `id`, `first_name`, `last_name`, `email`, `phone`
- **Items fields**: `id`, `order_id`, `variant_id`, `quantity`, `unit_price`, `subtotal`

### PUT /orders/:id
Update order (primarily status)
- **Request Body**: `{ status?, payment_method? }`
- **Response**: Updated `Order` object

## Customers

### GET /customers
List all customers
- **Response**: Array of `Customer` objects
- **Fields**: `id`, `first_name`, `last_name`, `email`, `phone`, `created_at`

### GET /customers/:id
Get customer details with stats
- **Response**: `CustomerDetail` object
- **Additional fields**: `orders_count?`, `total_spent?`, `last_order_date?`

## Discounts

### GET /discounts
List all discount codes
- **Response**: Array of `Discount` objects
- **Fields**: `id`, `code`, `type`, `value`, `minimum_amount?`, `active_from?`, `active_until?`, `usage_limit?`, `usage_count?`, `is_active`, `created_at`, `updated_at`

### GET /discounts/:id
Get discount details
- **Response**: `Discount` object

### POST /discounts
Create a new discount
- **Request Body**: `{ code, type, value, minimum_amount?, active_from?, active_until?, usage_limit?, is_active? }`
- **Response**: Created `Discount` object

### PUT /discounts/:id
Update a discount
- **Request Body**: Partial discount fields
- **Response**: Updated `Discount` object

### DELETE /discounts/:id
Delete a discount
- **Response**: Success message

## Settings

### GET /settings
Get store settings
- **Response**: `StoreSettings` object
- **Fields**: `store_name`, `contact_email`, `currency`, `logo_url?`, `support_email?`

### PUT /settings
Update store settings
- **Request Body**: Partial settings fields
- **Response**: Updated `StoreSettings` object

## Dashboard

### GET /dashboard/stats
Get dashboard statistics
- **Response**: `DashboardStats` object
- **Fields**: 
  - `revenue_today`, `revenue_week`, `revenue_month` (strings)
  - `orders_today`, `orders_week`, `orders_month` (numbers)
  - `customers_today`, `customers_week`, `customers_month` (numbers)
  - `products_total` (number)

### GET /dashboard/recent-orders?limit=10
Get recent orders for dashboard
- **Query Params**: `limit` (optional, default 10)
- **Response**: Array of `RecentOrder` objects
- **Fields**: `id`, `customer_name?`, `customer_email?`, `total`, `status`, `created_at`

### GET /dashboard/top-products?limit=10
Get top selling products
- **Query Params**: `limit` (optional, default 10)
- **Response**: Array of `TopProduct` objects
- **Fields**: `id`, `name`, `image_url?`, `total_sold`, `revenue`

### GET /dashboard/sales?period=month
Get sales data for charts
- **Query Params**: `period` (week | month | year)
- **Response**: Array of `SalesData` objects
- **Fields**: `date`, `revenue`, `orders`

## Notes

- All monetary values should be strings (DECIMAL in database) to avoid precision issues
- All dates should be ISO 8601 strings
- UUIDs should be strings
- All endpoints should return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Error responses should follow: `{ error: string, message?: string }`
- CORS should be enabled for the frontend origin
- Consider adding pagination for list endpoints in the future

