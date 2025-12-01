package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type AnalyticsHandler struct {
	Repo *repository.Queries
}

func NewAnalyticsHandler(repo *repository.Queries) *AnalyticsHandler {
	return &AnalyticsHandler{Repo: repo}
}

func (h *AnalyticsHandler) GetSalesAnalytics(c echo.Context) error {
	// Parse date range from query params
	startDate := c.QueryParam("start_date")
	endDate := c.QueryParam("end_date")

	// Default to last 30 days if not provided
	end := time.Now()
	start := end.AddDate(0, 0, -30)

	if startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			start = parsed
		}
	}
	if endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			end = parsed
		}
	}

	params := repository.GetSalesAnalyticsParams{
		CreatedAt:   start,
		CreatedAt_2: end,
	}

	analytics, err := h.Repo.GetSalesAnalytics(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to fetch sales analytics: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch sales analytics"})
	}

	return c.JSON(http.StatusOK, analytics)
}

func (h *AnalyticsHandler) GetTopProducts(c echo.Context) error {
	startDate := c.QueryParam("start_date")
	endDate := c.QueryParam("end_date")
	limitStr := c.QueryParam("limit")

	end := time.Now()
	start := end.AddDate(0, 0, -30)
	limit := int32(10)

	if startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			start = parsed
		}
	}
	if endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			end = parsed
		}
	}
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil {
			limit = int32(val)
		}
	}

	params := repository.GetTopSellingProductsParams{
		CreatedAt:   start,
		CreatedAt_2: end,
		Limit:       limit,
	}

	products, err := h.Repo.GetTopSellingProducts(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to fetch top products: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch top products"})
	}

	return c.JSON(http.StatusOK, products)
}

func (h *AnalyticsHandler) GetCustomerMetrics(c echo.Context) error {
	startDate := c.QueryParam("start_date")
	endDate := c.QueryParam("end_date")

	end := time.Now()
	start := end.AddDate(0, 0, -30)

	if startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			start = parsed
		}
	}
	if endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			end = parsed
		}
	}

	params := repository.GetCustomerMetricsParams{
		CreatedAt:   start,
		CreatedAt_2: end,
	}

	metrics, err := h.Repo.GetCustomerMetrics(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to fetch customer metrics: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch customer metrics"})
	}

	// Calculate repeat customer rate
	repeatRate := 0.0
	if metrics.TotalCustomers > 0 {
		repeatRate = (float64(metrics.RepeatCustomers) / float64(metrics.TotalCustomers)) * 100
	}

	response := map[string]interface{}{
		"total_customers":         metrics.TotalCustomers,
		"repeat_customers":        metrics.RepeatCustomers,
		"repeat_customer_rate":    repeatRate,
		"avg_orders_per_customer": metrics.AvgOrdersPerCustomer,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *AnalyticsHandler) GetRevenueChart(c echo.Context) error {
	startDate := c.QueryParam("start_date")
	endDate := c.QueryParam("end_date")

	end := time.Now()
	start := end.AddDate(0, 0, -30)

	if startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			start = parsed
		}
	}
	if endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			end = parsed
		}
	}

	params := repository.GetRevenueByDateParams{
		CreatedAt:   start,
		CreatedAt_2: end,
	}

	revenueData, err := h.Repo.GetRevenueByDate(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to fetch revenue chart data: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch revenue chart data"})
	}

	return c.JSON(http.StatusOK, revenueData)
}
