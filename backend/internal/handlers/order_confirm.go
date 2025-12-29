package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

// ConfirmOrder confirms a pending order and creates a fulfillment order
func (h *OrderHandler) ConfirmOrder(c echo.Context) error {
	idStr := c.Param("id")
	orderID, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	ctx := c.Request().Context()

	// Get order details
	order, err := h.Repo.GetOrder(ctx, orderID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Order not found"})
		}
		c.Logger().Errorf("Failed to get order %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order"})
	}

	// Check if order is already confirmed
	if order.Status != "pending" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is already %s", order.Status),
		})
	}

	// Update order status to confirmed
	_, err = h.Repo.UpdateOrderStatus(ctx, repository.UpdateOrderStatusParams{
		ID:     orderID,
		Status: "confirmed",
	})
	if err != nil {
		c.Logger().Errorf("Failed to confirm order %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to confirm order"})
	}

	// Generate tracking number
	trackingNumber := GenerateTrackingNumber()

	// Prepare delivery details from customer info
	deliveryAddress := ""
	deliveryPhone := order.CustomerPhone.String
	if order.CustomerFirstName.Valid {
		deliveryAddress = fmt.Sprintf("%s %s", order.CustomerFirstName.String, order.CustomerLastName.String)
	}

	// Create fulfillment order
	var fulfillmentID int64
	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO fulfillment_orders (
			order_id, tracking_number, fulfillment_status,
			delivery_address, delivery_phone, notes
		) VALUES ($1, $2, 'placed', $3, $4, $5)
		RETURNING id
	`, orderID, trackingNumber, deliveryAddress, deliveryPhone, "Auto-created on order confirmation").Scan(&fulfillmentID)

	if err != nil {
		c.Logger().Errorf("Failed to create fulfillment order for %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create fulfillment order"})
	}

	// Log status history
	_, err = h.DB.ExecContext(ctx, `
		INSERT INTO order_status_history (
			fulfillment_order_id, previous_status, new_status,
			change_source, notes, created_at
		) VALUES ($1, '', 'placed', 'admin', 'Order confirmed and sent to warehouse', CURRENT_TIMESTAMP)
	`, fulfillmentID)
	if err != nil {
		c.Logger().Warnf("Failed to log status history: %v", err)
		// Don't fail the request
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":            "Order confirmed successfully",
		"order_id":           orderID,
		"fulfillment_id":     fulfillmentID,
		"tracking_number":    trackingNumber,
		"fulfillment_status": "placed",
	})
}
