package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type OrderHandler struct {
	Repo repository.Querier
	DB   *sql.DB
}

func NewOrderHandler(repo repository.Querier, db *sql.DB) *OrderHandler {
	return &OrderHandler{Repo: repo, DB: db}
}

type CreateOrderRequest struct {
	CustomerID      *uuid.UUID       `json:"customer_id"` // Nullable for guest checkout
	PaymentMethod   string           `json:"payment_method"`
	Items           []OrderItemInput `json:"items"`
	ShippingAddress *ShippingAddress `json:"shipping_address"` // For guest checkout
}

type ShippingAddress struct {
	FullName       string `json:"full_name"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	Address        string `json:"address"`
	City           string `json:"city"`
	DeliveryMethod string `json:"delivery_method"`
}

type OrderItemInput struct {
	VariantID uuid.UUID `json:"variant_id"`
	Quantity  int32     `json:"quantity"`
}

// splitName splits a full name into first and last name
func splitName(fullName string) []string {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return []string{"", ""}
	}
	if len(parts) == 1 {
		return []string{parts[0], ""}
	}
	return []string{parts[0], strings.Join(parts[1:], " ")}
}

// CreateOrder creates a new order with stock deduction
func (h *OrderHandler) CreateOrder(c echo.Context) error {
	var req CreateOrderRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// CustomerID is optional for guest checkout
	if len(req.Items) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Order must contain at least one item"})
	}

	ctx := c.Request().Context()

	// Step 1: Validate stock availability and calculate total
	type ItemWithPrice struct {
		VariantID     uuid.UUID
		Quantity      int32
		UnitPrice     int64
		PreviousStock int32
	}
	itemsWithPrices := make([]ItemWithPrice, 0, len(req.Items))
	var totalAmount int64

	for _, item := range req.Items {
		variant, err := h.Repo.GetProductVariant(ctx, item.VariantID.String())
		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusBadRequest, map[string]string{"error": "Variant not found"})
			}
			c.Logger().Errorf("Failed to get variant %s: %v", item.VariantID, err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to validate stock"})
		}

		// Check stock (handle sql.NullInt32)
		stockQty := int32(0)
		if variant.StockQuantity.Valid {
			stockQty = variant.StockQuantity.Int32
		}

		if stockQty < item.Quantity {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error":      "Insufficient stock",
				"variant_id": item.VariantID.String(),
			})
		}

		subtotal := variant.Price * int64(item.Quantity)
		totalAmount += subtotal

		itemsWithPrices = append(itemsWithPrices, ItemWithPrice{
			VariantID:     item.VariantID,
			Quantity:      item.Quantity,
			UnitPrice:     variant.Price,
			PreviousStock: stockQty,
		})
	}

	// Step 2: Create or use customer
	var customerUUID uuid.NullUUID
	if req.CustomerID != nil {
		customerUUID = uuid.NullUUID{
			UUID:  *req.CustomerID,
			Valid: true,
		}
	} else if req.ShippingAddress != nil && req.ShippingAddress.FullName != "" {
		// Guest checkout: Create a customer record from shipping address
		// Split full name into first/last name
		nameParts := splitName(req.ShippingAddress.FullName)

		var newCustomerID uuid.UUID
		err := h.DB.QueryRowContext(ctx, `
			INSERT INTO customers (first_name, last_name, email, phone)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, nameParts[0], nameParts[1],
			sql.NullString{String: req.ShippingAddress.Email, Valid: req.ShippingAddress.Email != ""},
			req.ShippingAddress.Phone,
		).Scan(&newCustomerID)

		if err != nil {
			c.Logger().Errorf("Failed to create customer: %v", err)
			// Don't fail the order, just proceed without customer
		} else {
			customerUUID = uuid.NullUUID{
				UUID:  newCustomerID,
				Valid: true,
			}
		}
	}

	order, err := h.Repo.CreateOrder(ctx, repository.CreateOrderParams{
		CustomerID:    customerUUID,
		Status:        "pending",
		TotalAmount:   strconv.FormatInt(totalAmount, 10), // Convert int64 to string
		PaymentMethod: sql.NullString{String: req.PaymentMethod, Valid: req.PaymentMethod != ""},
	})
	if err != nil {
		c.Logger().Errorf("Failed to create order: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create order"})
	}

	// Step 3: Create order items, deduct stock, and log inventory movements
	for _, item := range itemsWithPrices {
		// Create order item
		_, err := h.Repo.CreateOrderItem(ctx, repository.CreateOrderItemParams{
			OrderID:   order.ID,
			VariantID: item.VariantID,
			Quantity:  item.Quantity,
			UnitPrice: strconv.FormatInt(item.UnitPrice, 10),
			Subtotal:  strconv.FormatInt(item.UnitPrice*int64(item.Quantity), 10),
		})
		if err != nil {
			c.Logger().Errorf("Failed to create order item: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create order items"})
		}

		// Deduct stock
		err = h.Repo.UpdateVariantStock(ctx, repository.UpdateVariantStockParams{
			ID:    item.VariantID,
			Stock: item.Quantity,
		})
		if err != nil {
			c.Logger().Errorf("Failed to update stock for variant %s: %v", item.VariantID, err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update stock"})
		}

		// Log inventory movement
		_, err = h.Repo.CreateInventoryMovement(ctx, repository.CreateInventoryMovementParams{
			VariantID: uuid.NullUUID{
				UUID:  item.VariantID,
				Valid: true,
			},
			Type:          "sale",
			Quantity:      item.Quantity,
			PreviousStock: item.PreviousStock,
			NewStock:      item.PreviousStock - item.Quantity,
			ReferenceID:   sql.NullString{String: order.ID.String(), Valid: true},
			Note:          sql.NullString{String: "Order created", Valid: true},
			UserID:        sql.NullInt64{Int64: 0, Valid: false}, // System action
		})
		if err != nil {
			c.Logger().Errorf("Failed to log inventory movement: %v", err)
			// Don't fail the order, just log the error
		}
	}

	// Step 4: Return created order
	return c.JSON(http.StatusCreated, map[string]interface{}{
		"order":   order,
		"message": "Order created successfully",
	})
}

// ListOrders returns a list of all orders
func (h *OrderHandler) ListOrders(c echo.Context) error {
	ctx := c.Request().Context()

	orders, err := h.Repo.ListOrders(ctx)
	if err != nil {
		c.Logger().Errorf("Failed to list orders: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch orders"})
	}

	type OrderResponse struct {
		ID                string  `json:"id"`
		OrderNumber       int32   `json:"order_number"`
		CustomerID        *string `json:"customer_id,omitempty"`
		Status            string  `json:"status"`
		TotalAmount       string  `json:"total_amount"`
		PaymentMethod     string  `json:"payment_method"`
		CreatedAt         string  `json:"created_at"`
		UpdatedAt         string  `json:"updated_at"`
		CustomerFirstName string  `json:"customer_first_name"`
		CustomerLastName  string  `json:"customer_last_name"`
		CustomerEmail     string  `json:"customer_email"`
	}

	response := make([]OrderResponse, len(orders))
	for i, o := range orders {
		var customerID *string
		if o.CustomerID.Valid {
			id := o.CustomerID.UUID.String()
			customerID = &id
		}

		response[i] = OrderResponse{
			ID:                o.ID.String(),
			OrderNumber:       o.OrderNumber,
			CustomerID:        customerID,
			Status:            o.Status,
			TotalAmount:       o.TotalAmount,
			PaymentMethod:     o.PaymentMethod.String,
			CreatedAt:         o.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:         o.UpdatedAt.Time.Format(time.RFC3339),
			CustomerFirstName: o.CustomerFirstName.String,
			CustomerLastName:  o.CustomerLastName.String,
			CustomerEmail:     o.CustomerEmail.String,
		}
	}

	return c.JSON(http.StatusOK, response)
}

// GetOrder returns a single order by ID
func (h *OrderHandler) GetOrder(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	ctx := c.Request().Context()

	// Get order details
	order, err := h.Repo.GetOrder(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Order not found"})
		}
		c.Logger().Errorf("Failed to fetch order %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch order"})
	}

	// Get order items
	items, err := h.Repo.ListOrderItems(ctx, id)
	if err != nil {
		c.Logger().Errorf("Failed to fetch order items for %s: %v", idStr, err)
		// Don't fail the whole request, just return empty items
		items = []repository.ListOrderItemsRow{}
	}

	type OrderItemResponse struct {
		ID          string `json:"id"`
		OrderID     string `json:"order_id"`
		VariantID   string `json:"variant_id"`
		Quantity    int32  `json:"quantity"`
		UnitPrice   string `json:"unit_price"`
		Subtotal    string `json:"subtotal"`
		Sku         string `json:"sku"`
		ProductName string `json:"product_name"`
		VariantName string `json:"variant_name"`
		ImageUrl    string `json:"image_url"`
	}

	itemsResponse := make([]OrderItemResponse, len(items))
	for i, item := range items {
		itemsResponse[i] = OrderItemResponse{
			ID:          item.ID.String(),
			OrderID:     item.OrderID.String(),
			VariantID:   item.VariantID.String(),
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			Subtotal:    item.Subtotal,
			Sku:         item.Sku.String,
			ProductName: item.ProductName.String,
			VariantName: item.VariantName,
			ImageUrl:    item.ImageUrl.String,
		}
	}

	// Transform order to clean response
	var customerID *string
	if order.CustomerID.Valid {
		id := order.CustomerID.UUID.String()
		customerID = &id
	}

	type OrderResponse struct {
		ID                string  `json:"id"`
		OrderNumber       int32   `json:"order_number"`
		CustomerID        *string `json:"customer_id,omitempty"`
		Status            string  `json:"status"`
		TotalAmount       string  `json:"total_amount"`
		PaymentMethod     string  `json:"payment_method"`
		CreatedAt         string  `json:"created_at"`
		UpdatedAt         string  `json:"updated_at"`
		CustomerFirstName string  `json:"customer_first_name"`
		CustomerLastName  string  `json:"customer_last_name"`
		CustomerEmail     string  `json:"customer_email"`
		CustomerPhone     string  `json:"customer_phone"`
	}

	orderResponse := OrderResponse{
		ID:                order.ID.String(),
		OrderNumber:       order.OrderNumber,
		CustomerID:        customerID,
		Status:            order.Status,
		TotalAmount:       order.TotalAmount,
		PaymentMethod:     order.PaymentMethod.String,
		CreatedAt:         order.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:         order.UpdatedAt.Time.Format(time.RFC3339),
		CustomerFirstName: order.CustomerFirstName.String,
		CustomerLastName:  order.CustomerLastName.String,
		CustomerEmail:     order.CustomerEmail.String,
		CustomerPhone:     order.CustomerPhone.String,
	}

	response := map[string]interface{}{
		"order": orderResponse,
		"items": itemsResponse,
	}

	return c.JSON(http.StatusOK, response)
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status"`
}

// UpdateOrderStatus updates the status of an order and handles stock restoration on cancellation
func (h *OrderHandler) UpdateOrderStatus(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	var req UpdateOrderStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Status == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Status is required"})
	}

	ctx := c.Request().Context()

	// Get current order to check if already cancelled
	currentOrder, err := h.Repo.GetOrder(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Order not found"})
		}
		c.Logger().Errorf("Failed to get order %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order"})
	}

	// Prevent duplicate cancellations
	if currentOrder.Status == "cancelled" && req.Status == "cancelled" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Order is already cancelled"})
	}

	// Update order status
	updatedOrder, err := h.Repo.UpdateOrderStatus(ctx, repository.UpdateOrderStatusParams{
		ID:     id,
		Status: req.Status,
	})
	if err != nil {
		c.Logger().Errorf("Failed to update order status %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update order status"})
	}

	// If cancelling, restore stock
	if req.Status == "cancelled" && currentOrder.Status != "cancelled" {
		// Get order items
		items, err := h.Repo.ListOrderItems(ctx, id)
		if err != nil {
			c.Logger().Errorf("Failed to get order items for %s: %v", idStr, err)
			// Don't fail the status update, just log the error
			c.Logger().Warnf("Stock restoration skipped due to error fetching order items")
		} else {
			// Restore stock for each item
			for _, item := range items {
				// item.VariantID is already uuid.UUID
				variantID := item.VariantID

				// Get current stock
				variant, err := h.Repo.GetProductVariant(ctx, variantID.String())
				if err != nil {
					c.Logger().Errorf("Failed to get variant %s: %v", variantID, err)
					continue
				}

				previousStock := int32(0)
				if variant.StockQuantity.Valid {
					previousStock = variant.StockQuantity.Int32
				}

				// Restore stock (add back the quantity)
				// Note: UpdateVariantStock subtracts, so we pass negative quantity
				err = h.Repo.UpdateVariantStock(ctx, repository.UpdateVariantStockParams{
					ID:    variantID,
					Stock: -item.Quantity, // Negative to add back
				})
				if err != nil {
					c.Logger().Errorf("Failed to restore stock for variant %s: %v", variantID, err)
					continue
				}

				// Log inventory movement
				_, err = h.Repo.CreateInventoryMovement(ctx, repository.CreateInventoryMovementParams{
					VariantID: uuid.NullUUID{
						UUID:  variantID,
						Valid: true,
					},
					Type:          "cancellation",
					Quantity:      item.Quantity,
					PreviousStock: previousStock,
					NewStock:      previousStock + item.Quantity,
					ReferenceID:   sql.NullString{String: updatedOrder.ID.String(), Valid: true},
					Note:          sql.NullString{String: "Order cancelled", Valid: true},
					UserID:        sql.NullInt64{Int64: 0, Valid: false}, // System action
				})
				if err != nil {
					c.Logger().Errorf("Failed to log inventory movement: %v", err)
					// Don't fail, just log
				}
			}
			c.Logger().Infof("Stock restored for %d items from cancelled order %s", len(items), idStr)
		}
	}

	return c.JSON(http.StatusOK, updatedOrder)
}
