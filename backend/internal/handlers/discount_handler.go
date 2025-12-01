package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type DiscountHandler struct{}

func NewDiscountHandler() *DiscountHandler {
	return &DiscountHandler{}
}

func (h *DiscountHandler) ListDiscounts(c echo.Context) error {
	// For now, return empty array
	// TODO: Implement discount table and queries
	return c.JSON(http.StatusOK, []interface{}{})
}

func (h *DiscountHandler) GetDiscount(c echo.Context) error {
	return c.JSON(http.StatusNotFound, map[string]string{"error": "Discount not found"})
}

func (h *DiscountHandler) CreateDiscount(c echo.Context) error {
	// TODO: Implement discount creation
	return c.JSON(http.StatusNotImplemented, map[string]string{"error": "Not implemented yet"})
}

func (h *DiscountHandler) UpdateDiscount(c echo.Context) error {
	// TODO: Implement discount update
	return c.JSON(http.StatusNotImplemented, map[string]string{"error": "Not implemented yet"})
}

func (h *DiscountHandler) DeleteDiscount(c echo.Context) error {
	// TODO: Implement discount deletion
	return c.JSON(http.StatusNotImplemented, map[string]string{"error": "Not implemented yet"})
}

