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
	settingsHandler := NewSettingsHandler(repo, db)
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

	// Public cart status endpoint (no auth required)
	api.GET("/cart-status", settingsHandler.GetCartStatus)

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
	admin.POST("/products/:id/duplicate", productHandler.DuplicateProduct, auth.RequireRole("super_admin", "admin", "editor"))

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
	admin.POST("/orders/:id/confirm", orderHandler.ConfirmOrder, auth.RequireRole("super_admin", "admin"))

	// Customer Routes
	admin.GET("/customers", customerHandler.ListCustomers)
	admin.GET("/customers/:id", customerHandler.GetCustomer)

	// Dashboard Routes
	admin.GET("/dashboard/stats", dashboardHandler.GetStats)
	admin.GET("/dashboard/recent-orders", dashboardHandler.GetRecentOrders)
	admin.GET("/dashboard/top-products", dashboardHandler.GetTopProducts)
	admin.GET("/dashboard/sales", dashboardHandler.GetSalesData)
	admin.GET("/inventory/export", dashboardHandler.ExportInventory)

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

	// Payment Accounts Routes (Admin only)
	admin.GET("/payment-accounts", settingsHandler.GetAllPaymentAccounts, auth.RequireRole("super_admin", "admin"))
	admin.POST("/payment-accounts", settingsHandler.CreatePaymentAccount, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/payment-accounts/:id", settingsHandler.UpdatePaymentAccount, auth.RequireRole("super_admin", "admin"))
	admin.PUT("/payment-accounts/:id/toggle", settingsHandler.TogglePaymentAccountStatus, auth.RequireRole("super_admin", "admin"))
	admin.DELETE("/payment-accounts/:id", settingsHandler.DeletePaymentAccount, auth.RequireRole("super_admin", "admin"))

	// Public Payment Accounts endpoint (for Flutter app)
	api.GET("/payment-accounts", settingsHandler.GetActivePaymentAccounts)

	// Inventory Routes
	inventoryHandler := NewInventoryHandler(repo)
	admin.GET("/inventory/stats", inventoryHandler.GetStats)
	admin.GET("/inventory/low-stock", inventoryHandler.GetLowStock)
	admin.GET("/inventory/movements", inventoryHandler.ListMovements)
	admin.POST("/inventory/bulk-update", inventoryHandler.BulkUpdateStock, auth.RequireRole("super_admin", "admin"))

	// Analytics Routes
	analyticsHandler := NewAnalyticsHandler(repo)
	admin.GET("/analytics/sales", analyticsHandler.GetSalesAnalytics)

	// Fulfillment Routes
	fulfillmentHandler := NewFulfillmentHandler(db)
	fulfillment := admin.Group("/fulfillment")

	// Picking
	fulfillment.GET("/pick/pending", fulfillmentHandler.ListPendingPicking)
	fulfillment.POST("/pick/:id/start", fulfillmentHandler.StartPicking)
	fulfillment.POST("/pick/scan", fulfillmentHandler.ScanPick)
	fulfillment.POST("/pick/:id/complete", fulfillmentHandler.CompletePicking)

	// Packing
	fulfillment.GET("/pack/pending", fulfillmentHandler.ListPendingPacking)
	fulfillment.POST("/pack/:id/start", fulfillmentHandler.StartPacking)
	fulfillment.POST("/pack/scan", fulfillmentHandler.ScanPack)
	fulfillment.POST("/pack/:id/complete", fulfillmentHandler.CompletePacking)
	fulfillment.GET("/pack/:id/label", fulfillmentHandler.GenerateLabel)
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

	// Media Library Routes (Admin/Editor only)
	mediaHandler := NewMediaHandler()
	admin.GET("/media", mediaHandler.ListMedia, auth.RequireRole("super_admin", "admin", "editor"))
	admin.DELETE("/media/:filename", mediaHandler.DeleteMedia, auth.RequireRole("super_admin", "admin"))

	// ============================================================================
	// FULFILLMENT SYSTEM ROUTES
	// ============================================================================

	// Initialize driver and return handlers
	driverHandler := NewDriverHandler(db)
	returnHandler := NewReturnHandler(db)

	// Fulfillment Order Routes (Admin)
	fulfillment.POST("/orders", fulfillmentHandler.CreateFulfillmentOrder, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.GET("/orders", fulfillmentHandler.ListFulfillmentOrders)
	fulfillment.GET("/orders/:id", fulfillmentHandler.GetFulfillmentOrder)
	fulfillment.GET("/orders/tracking/:tracking", fulfillmentHandler.GetFulfillmentOrderByTracking)
	fulfillment.PUT("/orders/:id/status", fulfillmentHandler.UpdateFulfillmentStatus, auth.RequireRole("super_admin", "admin"))
	fulfillment.GET("/orders/:id/label", fulfillmentHandler.GenerateLabel, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.GET("/orders/:id/items", fulfillmentHandler.GetFulfillmentOrderItems)
	fulfillment.GET("/orders/:id/history", fulfillmentHandler.GetStatusHistory)
	fulfillment.GET("/stats", fulfillmentHandler.GetFulfillmentStats)

	// Picker/Packer Routes (Admin - for warehouse staff)
	fulfillment.GET("/pick/pending", fulfillmentHandler.ListPendingPicking)
	fulfillment.POST("/pick/start/:orderId", fulfillmentHandler.StartPicking, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.POST("/pick/scan", fulfillmentHandler.ScanPick, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.POST("/pick/complete/:orderId", fulfillmentHandler.CompletePicking, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.GET("/pack/pending", fulfillmentHandler.ListPendingPacking)
	fulfillment.POST("/pack/start/:orderId", fulfillmentHandler.StartPacking, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.POST("/pack/scan", fulfillmentHandler.ScanPack, auth.RequireRole("super_admin", "admin", "editor"))
	fulfillment.POST("/pack/complete/:orderId", fulfillmentHandler.CompletePacking, auth.RequireRole("super_admin", "admin", "editor"))

	// Driver Management Routes (Admin)
	drivers := admin.Group("/drivers")
	drivers.POST("", driverHandler.CreateDriver, auth.RequireRole("super_admin", "admin"))
	drivers.GET("", driverHandler.ListDrivers)
	drivers.GET("/:id", driverHandler.GetDriver)
	drivers.PUT("/:id", driverHandler.UpdateDriver, auth.RequireRole("super_admin", "admin"))
	drivers.DELETE("/:id", driverHandler.DeleteDriver, auth.RequireRole("super_admin", "admin"))
	drivers.GET("/:id/assignments", driverHandler.GetDriverAssignments)
	drivers.GET("/:id/workload", driverHandler.GetDriverWorkload)
	drivers.POST("/auto-assign/:orderId", driverHandler.AutoAssignDriver, auth.RequireRole("super_admin", "admin"))
	drivers.POST("/assign/:orderId", driverHandler.ManualAssignDriver, auth.RequireRole("super_admin", "admin"))

	// Return Management Routes (Admin)
	returns := admin.Group("/returns")
	returns.POST("", returnHandler.CreateReturnRequest, auth.RequireRole("super_admin", "admin"))
	returns.GET("", returnHandler.ListReturnRequests)
	returns.GET("/:id", returnHandler.GetReturnRequest)
	returns.PUT("/:id/approve", returnHandler.ApproveReturn, auth.RequireRole("super_admin", "admin"))
	returns.PUT("/:id/reject", returnHandler.RejectReturn, auth.RequireRole("super_admin", "admin"))
	returns.PUT("/:id/assign-pickup", returnHandler.AssignPickupDriver, auth.RequireRole("super_admin", "admin"))
	returns.PUT("/:id/received", returnHandler.MarkReturnReceived, auth.RequireRole("super_admin", "admin"))
	returns.PUT("/:id/complete", returnHandler.CompleteReturn, auth.RequireRole("super_admin", "admin"))

	// ============================================================================
	// DRIVER APP ROUTES (For driver mobile app)
	// ============================================================================
	driverApp := api.Group("/driver-app")
	driverApp.GET("/assignments", driverHandler.GetMyAssignments)
	driverApp.PUT("/assignments/:id/status", driverHandler.UpdateAssignmentStatus)
	driverApp.PUT("/delivery/:orderId/delivered", driverHandler.MarkDelivered)
	driverApp.PUT("/return/:id/picked-up", returnHandler.MarkReturnPickedUp)

	// Public tracking endpoint (no auth required)
	api.GET("/tracking/:tracking", fulfillmentHandler.GetFulfillmentOrderByTracking)

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
	api.GET("/products/variants/sku/:sku", productHandler.GetVariantBySku) // For barcode scanner - must be before :id
	api.GET("/products/variants/:id", productHandler.GetVariant)
	// api.POST("/products/variants", productHandler.CreateVariant) // These are admin-only operations
	// api.PUT("/products/:id/variants/:id", productHandler.UpdateVariant)
	// api.DELETE("/products/variants/:id", productHandler.DeleteVariant)
	// api.POST("/products/:productId/variants/bulk", productHandler.BulkUpdateVariants)

	// Order Routes (Public for shop checkout)
	// api.GET("/orders", orderHandler.ListOrders) // Public shop routes should not list all orders
	// api.GET("/orders/:id", orderHandler.GetOrder) // Public shop routes should not get arbitrary orders
	api.POST("/orders", orderHandler.CreateOrder)
	api.GET("/orders/number/:orderNumber", orderHandler.GetOrderPublic)                       // Public order lookup by order number
	api.POST("/orders/:orderNumber/payment-screenshot", orderHandler.UploadPaymentScreenshot) // Upload payment proof
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

	// Telegram Webhook
	telegramHandler := NewTelegramWebhookHandler(repo)
	api.POST("/telegram/webhook", telegramHandler.HandleWebhook)

	// Static Files - use absolute path since working directory is /root
	e.Static("/uploads", "/app/uploads")

	// ============================================================================
	// POPUP / MARKETING ROUTES
	// ============================================================================
	popupHandler := NewPopupHandler(db)

	// Admin Popup Routes
	admin.GET("/popups", popupHandler.ListPopups)
	admin.POST("/popups", popupHandler.CreatePopup, auth.RequireRole("super_admin", "admin", "editor"))
	admin.PUT("/popups/:id", popupHandler.UpdatePopup, auth.RequireRole("super_admin", "admin", "editor"))
	admin.PUT("/popups/:id/toggle", popupHandler.ToggleStatus, auth.RequireRole("super_admin", "admin", "editor"))
	admin.DELETE("/popups/:id", popupHandler.DeletePopup, auth.RequireRole("super_admin", "admin"))

	// Public Popup Routes
	api.GET("/popups/active", popupHandler.GetActivePopup)
}
