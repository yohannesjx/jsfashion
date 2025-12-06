package handlers

import (
	"database/sql"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/auth"
	"github.com/luxe-fashion/backend/internal/repository"
	"github.com/redis/go-redis/v9"
)

func RegisterRoutes(e *echo.Echo, repo *repository.Queries, db *sql.DB, rdb *redis.Client) {
	// Handlers
	productHandler := NewProductHandler(repo, rdb)
	orderHandler := NewOrderHandler(repo, db)
	customerHandler := NewCustomerHandler(repo)
	dashboardHandler := NewDashboardHandler(repo, db)
	settingsHandler := NewSettingsHandler(repo)
	couponHandler := NewCouponHandler(repo)
	discountHandler := NewDiscountHandler()
	authHandler := &AuthHandler{Repo: repo}

	// API Group
	api := e.Group("/api/v1")

	// ============================================================================
	// PUBLIC AUTH ROUTES (No authentication required)
	// ============================================================================
	authGroup := api.Group("/admin/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/refresh", authHandler.Refresh)
	authGroup.POST("/logout", authHandler.Logout)
	authGroup.GET("/me", authHandler.Me, auth.AuthMiddleware())

	// ============================================================================
	// PROTECTED ADMIN ROUTES (Authentication required)
	// ============================================================================
	admin := api.Group("/admin", auth.AuthMiddleware())

	// Product Routes (Admin/Editor can manage)
	admin.GET("/products", productHandler.ListProducts)
	admin.GET("/products/:id", productHandler.GetProduct)
	admin.POST("/products", productHandler.CreateProduct, auth.RequireRole("super_admin", "admin", "editor"))
	admin.PUT("/products/:id", productHandler.UpdateProduct, auth.RequireRole("super_admin", "admin", "editor"))
	admin.DELETE("/products/:id", productHandler.DeleteProduct, auth.RequireRole("super_admin", "admin"))

	// Product Variant Routes
	admin.GET("/products/variants/:id", productHandler.GetVariant)
	admin.POST("/products/variants", productHandler.CreateVariant, auth.RequireRole("super_admin", "admin", "editor"))
	admin.PUT("/products/variants/:id", productHandler.UpdateVariant, auth.RequireRole("super_admin", "admin", "editor"))
	admin.DELETE("/products/variants/:id", productHandler.DeleteVariant, auth.RequireRole("super_admin", "admin"))
	admin.POST("/products/:productId/variants/bulk", productHandler.BulkUpdateVariants, auth.RequireRole("super_admin", "admin", "editor"))

	// Order Routes (All authenticated users can view)
	admin.GET("/orders", orderHandler.ListOrders)
	admin.GET("/orders/:id", orderHandler.GetOrder)
	admin.PUT("/orders/:id", orderHandler.UpdateOrderStatus, auth.RequireRole("super_admin", "admin"))

	// Customer Routes
	admin.GET("/customers", customerHandler.ListCustomers)
	admin.GET("/customers/:id", customerHandler.GetCustomer)

	// Dashboard Routes
	admin.GET("/dashboard/stats", dashboardHandler.GetStats)
	admin.GET("/dashboard/recent-orders", dashboardHandler.GetRecentOrders)
	admin.GET("/dashboard/top-products", dashboardHandler.GetTopProducts)
	admin.GET("/dashboard/sales", dashboardHandler.GetSalesData)

	// Coupon Routes
	admin.GET("/coupons", couponHandler.ListCoupons, auth.RequireRole("super_admin", "admin", "editor"))
	admin.GET("/coupons/:id", couponHandler.GetCoupon, auth.RequireRole("super_admin", "admin", "editor"))
	admin.POST("/coupons", couponHandler.CreateCoupon, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/coupons/:id", couponHandler.UpdateCoupon, auth.RequireRole("super_admin", "admin"))
	admin.DELETE("/coupons/:id", couponHandler.DeleteCoupon, auth.RequireRole("super_admin", "admin"))

	// Settings Routes (Admin only)
	admin.GET("/settings", settingsHandler.GetSettings, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/settings", settingsHandler.UpdateSettings, auth.RequireRole("super_admin", "admin"))

	// User Management Routes (Admin only)
	admin.GET("/users", settingsHandler.ListUsers, auth.RequireRole("super_admin", "admin"))
	admin.POST("/users", settingsHandler.CreateUser, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/users/:id", settingsHandler.UpdateUser, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/users/:id/password", settingsHandler.UpdatePassword, auth.RequireRole("super_admin", "admin"))
	admin.DELETE("/users/:id", settingsHandler.DeleteUser, auth.RequireRole("super_admin", "admin"))

	// Inventory Routes
	inventoryHandler := NewInventoryHandler(repo)
	admin.GET("/inventory/stats", inventoryHandler.GetStats)
	admin.GET("/inventory/low-stock", inventoryHandler.GetLowStock)
	admin.GET("/inventory/movements", inventoryHandler.ListMovements)
	admin.POST("/inventory/bulk-update", inventoryHandler.BulkUpdateStock, auth.RequireRole("super_admin", "admin"))

	// Analytics Routes
	analyticsHandler := NewAnalyticsHandler(repo)
	admin.GET("/analytics/sales", analyticsHandler.GetSalesAnalytics)
	admin.GET("/analytics/top-products", analyticsHandler.GetTopProducts)
	admin.GET("/analytics/customer-metrics", analyticsHandler.GetCustomerMetrics)
	admin.GET("/analytics/revenue-chart", analyticsHandler.GetRevenueChart)

	// Discount Routes
	admin.GET("/discounts", discountHandler.ListDiscounts)
	admin.GET("/discounts/:id", discountHandler.GetDiscount)
	admin.POST("/discounts", discountHandler.CreateDiscount, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/discounts/:id", discountHandler.UpdateDiscount, auth.RequireRole("super_admin", "admin"))
	admin.DELETE("/discounts/:id", discountHandler.DeleteDiscount, auth.RequireRole("super_admin", "admin"))

	// Category Routes
	categoryHandler := NewCategoryHandler(repo)
	admin.GET("/categories", categoryHandler.ListCategories)
	admin.GET("/categories/:id", categoryHandler.GetCategory)
	admin.POST("/categories", categoryHandler.CreateCategory, auth.RequireRole("super_admin", "admin", "editor"))
	admin.PUT("/categories/:id", categoryHandler.UpdateCategory, auth.RequireRole("super_admin", "admin", "editor"))
	admin.DELETE("/categories/:id", categoryHandler.DeleteCategory, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/categories/reorder", categoryHandler.ReorderCategories, auth.RequireRole("super_admin", "admin", "editor"))
	admin.GET("/products/:productId/categories", categoryHandler.GetProductCategories)
	admin.PUT("/products/:productId/categories", categoryHandler.SetProductCategories, auth.RequireRole("super_admin", "admin", "editor"))

	// Upload Routes (Admin/Editor only)
	uploadHandler := NewUploadHandler()
	admin.POST("/upload", uploadHandler.UploadFile, auth.RequireRole("super_admin", "admin", "editor"))

	// ============================================================================
	// PUBLIC SHOP ROUTES (No authentication required)
	// ============================================================================
	api.GET("/products", productHandler.ListProducts)
	api.GET("/products/:id", productHandler.GetProduct)
	api.GET("/products/:id/related", productHandler.GetRelatedProducts)
	// api.POST("/products", productHandler.CreateProduct) // These are admin-only operations
	// api.PUT("/products/:id", productHandler.UpdateProduct)
	// api.DELETE("/products/:id", productHandler.DeleteProduct)

	// Product Variant Routes
	api.GET("/products/variants/:id", productHandler.GetVariant)
	// api.POST("/products/variants", productHandler.CreateVariant) // These are admin-only operations
	// api.PUT("/products/:id/variants/:id", productHandler.UpdateVariant)
	// api.DELETE("/products/variants/:id", productHandler.DeleteVariant)
	// api.POST("/products/:productId/variants/bulk", productHandler.BulkUpdateVariants)

	// Order Routes (Public for shop checkout)
	// api.GET("/orders", orderHandler.ListOrders) // Public shop routes should not list all orders
	// api.GET("/orders/:id", orderHandler.GetOrder) // Public shop routes should not get arbitrary orders
	api.POST("/orders", orderHandler.CreateOrder)
	// api.PUT("/orders/:id", orderHandler.UpdateOrder)

	// Customer Routes (Public for shop)

	// Settings Routes
	api.GET("/settings", settingsHandler.GetSettings)
	api.PUT("/settings", settingsHandler.UpdateSettings)

	// Discount Routes
	api.GET("/discounts", discountHandler.ListDiscounts)
	api.GET("/discounts/:id", discountHandler.GetDiscount)
	api.POST("/discounts", discountHandler.CreateDiscount)
	api.PUT("/discounts/:id", discountHandler.UpdateDiscount)
	api.DELETE("/discounts/:id", discountHandler.DeleteDiscount)

	// Category Routes (Public for shop)
	api.GET("/categories", categoryHandler.ListCategories)
	api.GET("/categories/:id", categoryHandler.GetCategory)
	api.POST("/categories", categoryHandler.CreateCategory)
	api.PUT("/categories/:id", categoryHandler.UpdateCategory)
	api.DELETE("/categories/:id", categoryHandler.DeleteCategory)
	api.GET("/products/:productId/categories", categoryHandler.GetProductCategories)
	api.PUT("/products/:productId/categories", categoryHandler.SetProductCategories)
	api.GET("/categories/:slug/products", categoryHandler.GetCategoryProducts)

	// Upload Routes
	api.POST("/upload", uploadHandler.UploadFile)

	// Static Files
	e.Static("/uploads", "./uploads")
}
