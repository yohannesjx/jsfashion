package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type DashboardHandler struct {
	Repo *repository.Queries
	DB   *sql.DB
}

func NewDashboardHandler(repo *repository.Queries, db *sql.DB) *DashboardHandler {
	return &DashboardHandler{
		Repo: repo,
		DB:   db,
	}
}

type DashboardStats struct {
	TotalRevenue        float64 `json:"total_revenue"`
	OrdersToday         int     `json:"orders_today"`
	TotalOrders         int     `json:"total_orders"`
	TotalCustomers      int     `json:"total_customers"`
	ConversionRate      float64 `json:"conversion_rate"`
	AvgOrderValue       float64 `json:"avg_order_value"`
	TotalSold           int     `json:"total_sold"`
	TotalInventoryValue float64 `json:"total_inventory_value"`
	ProductCount        int     `json:"product_count"`
	VariantCount        int     `json:"variant_count"`
}

type SalesDataPoint struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

type TopProduct struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Sales    int     `json:"sales"`
	Revenue  float64 `json:"revenue"`
	ImageURL string  `json:"image_url"`
}

type InventoryExportItem struct {
	ProductName string  `json:"product_name"`
	SKU         string  `json:"sku"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
}

// GetStats returns dashboard statistics
func (h *DashboardHandler) GetStats(c echo.Context) error {
	ctx := c.Request().Context()

	// Get total revenue
	var totalRevenue float64
	err := h.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(total_amount), 0)
		FROM orders
		WHERE status NOT IN ('cancelled', 'refunded')
	`).Scan(&totalRevenue)
	if err != nil {
		totalRevenue = 0
	}

	// Get orders today
	var ordersToday int
	err = h.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM orders
		WHERE DATE(created_at) = CURRENT_DATE
	`).Scan(&ordersToday)
	if err != nil {
		ordersToday = 0
	}

	// Get total orders
	var totalOrders int
	err = h.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM orders
	`).Scan(&totalOrders)
	if err != nil {
		totalOrders = 0
	}

	// Get total customers
	var totalCustomers int
	err = h.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM customers
	`).Scan(&totalCustomers)
	if err != nil {
		totalCustomers = 0
	}

	// Get total items sold
	var totalSold int
	err = h.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status NOT IN ('cancelled', 'refunded')
	`).Scan(&totalSold)
	if err != nil {
		totalSold = 0
	}

	// Get Inventory Stats
	var totalInventoryValue float64

	// Calculate total value (price * stock)
	// Ensure we cast to numeric to avoid integer overflow or type issues
	err = h.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(CAST(price AS NUMERIC) * CAST(stock_quantity AS NUMERIC)), 0)
		FROM product_variants
		WHERE active = true
	`).Scan(&totalInventoryValue)
	if err != nil {
		c.Logger().Errorf("Failed to calculate inventory value: %v", err)
		totalInventoryValue = 0
	}

	// Calculate counts
	var productCount int
	var variantCount int
	h.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM products WHERE active = true").Scan(&productCount)
	h.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM product_variants WHERE active = true").Scan(&variantCount)

	// Calculate average order value
	var avgOrderValue float64
	if totalOrders > 0 {
		avgOrderValue = totalRevenue / float64(totalOrders)
	}

	// Simple conversion rate (orders / customers)
	var conversionRate float64
	if totalCustomers > 0 {
		conversionRate = (float64(totalOrders) / float64(totalCustomers)) * 100
	}

	stats := DashboardStats{
		TotalRevenue:        totalRevenue,
		OrdersToday:         ordersToday,
		TotalOrders:         totalOrders,
		TotalCustomers:      totalCustomers,
		ConversionRate:      conversionRate,
		AvgOrderValue:       avgOrderValue,
		TotalSold:           totalSold,
		TotalInventoryValue: totalInventoryValue,
		ProductCount:        productCount,
		VariantCount:        variantCount,
	}

	return c.JSON(http.StatusOK, stats)
}

// ExportInventory returns all active variants for CSV export
func (h *DashboardHandler) ExportInventory(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.QueryContext(ctx, `
		SELECT 
			p.title as product_name,
			v.sku,
			v.price,
			v.stock_quantity
		FROM product_variants v
		JOIN products p ON v.product_id = p.id
		WHERE v.active = true AND p.active = true
		ORDER BY p.title, v.sku
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to fetch inventory",
		})
	}
	defer rows.Close()

	var items []InventoryExportItem
	for rows.Next() {
		var item InventoryExportItem
		if err := rows.Scan(&item.ProductName, &item.SKU, &item.Price, &item.Stock); err != nil {
			continue
		}
		items = append(items, item)
	}

	return c.JSON(http.StatusOK, items)
}

// GetSalesData returns sales data for charts (last 30 days)
func (h *DashboardHandler) GetSalesData(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.QueryContext(ctx, `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as orders,
			COALESCE(SUM(total_amount), 0) as revenue
		FROM orders
		WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
		  AND status NOT IN ('cancelled', 'refunded')
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to fetch sales data",
		})
	}
	defer rows.Close()

	var salesData []SalesDataPoint
	for rows.Next() {
		var point SalesDataPoint
		var date time.Time
		if err := rows.Scan(&date, &point.Orders, &point.Revenue); err != nil {
			continue
		}
		point.Date = date.Format("2006-01-02")
		salesData = append(salesData, point)
	}

	return c.JSON(http.StatusOK, salesData)
}

// GetTopProducts returns top selling products
func (h *DashboardHandler) GetTopProducts(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.QueryContext(ctx, `
		SELECT 
			p.id::text,
			p.title as name,
			p.thumbnail as image_url,
			COUNT(oi.id) as sales,
			COALESCE(SUM(oi.subtotal), 0) as revenue
		FROM products p
		JOIN variants v ON v.product_id = p.id
		JOIN order_items oi ON oi.variant_id = v.id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status NOT IN ('cancelled', 'refunded')
		  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
		GROUP BY p.id, p.title, p.thumbnail
		ORDER BY revenue DESC
		LIMIT 10
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to fetch top products",
		})
	}
	defer rows.Close()

	var products []TopProduct
	for rows.Next() {
		var product TopProduct
		if err := rows.Scan(&product.ID, &product.Name, &product.ImageURL, &product.Sales, &product.Revenue); err != nil {
			continue
		}
		products = append(products, product)
	}

	return c.JSON(http.StatusOK, products)
}

// GetRecentOrders returns recent orders
func (h *DashboardHandler) GetRecentOrders(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.QueryContext(ctx, `
		SELECT 
			o.id::text,
			o.order_number,
			o.status,
			o.total_amount as total,
			o.created_at,
			COALESCE(c.first_name || ' ' || c.last_name, c.email) as customer_name
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		ORDER BY o.created_at DESC
		LIMIT 10
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to fetch recent orders",
		})
	}
	defer rows.Close()

	type RecentOrder struct {
		ID           string    `json:"id"`
		OrderNumber  int       `json:"order_number"`
		Status       string    `json:"status"`
		Total        float64   `json:"total"`
		CustomerName string    `json:"customer_name"`
		CreatedAt    time.Time `json:"created_at"`
	}

	var orders []RecentOrder
	for rows.Next() {
		var order RecentOrder
		if err := rows.Scan(&order.ID, &order.OrderNumber, &order.Status, &order.Total, &order.CreatedAt, &order.CustomerName); err != nil {
			continue
		}
		orders = append(orders, order)
	}

	return c.JSON(http.StatusOK, orders)
}
