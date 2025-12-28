package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ReturnHandler handles all return-related API endpoints
type ReturnHandler struct {
	DB *sql.DB
}

// NewReturnHandler creates a new ReturnHandler
func NewReturnHandler(db *sql.DB) *ReturnHandler {
	return &ReturnHandler{DB: db}
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

type CreateReturnRequest struct {
	FulfillmentOrderID int64               `json:"fulfillment_order_id" validate:"required"`
	Reason             string              `json:"reason" validate:"required"`
	ReasonCategory     string              `json:"reason_category"` // defective, wrong_item, not_as_described, size_issue, changed_mind, late_delivery, other
	Description        string              `json:"description"`
	PickupAddress      string              `json:"pickup_address"`
	PickupPhone        string              `json:"pickup_phone"`
	RefundAmount       *float64            `json:"refund_amount"`
	RestockItems       bool                `json:"restock_items"`
	Items              []ReturnItemRequest `json:"items"`
}

type ReturnItemRequest struct {
	OrderItemID string `json:"order_item_id" validate:"required"`
	Quantity    int    `json:"quantity"`
	Condition   string `json:"condition"` // unopened, opened, damaged, used
}

type ReturnResponse struct {
	ID                 int64      `json:"id"`
	FulfillmentOrderID int64      `json:"fulfillment_order_id"`
	TrackingNumber     string     `json:"tracking_number"`
	OrderNumber        int32      `json:"order_number"`
	Reason             string     `json:"reason"`
	ReasonCategory     string     `json:"reason_category"`
	Description        string     `json:"description"`
	Status             string     `json:"status"`
	PickupAddress      string     `json:"pickup_address"`
	PickupPhone        string     `json:"pickup_phone"`
	RefundAmount       *float64   `json:"refund_amount,omitempty"`
	RestockItems       bool       `json:"restock_items"`
	PickupDriverID     *int64     `json:"pickup_driver_id,omitempty"`
	PickupDriverName   string     `json:"pickup_driver_name,omitempty"`
	CustomerName       string     `json:"customer_name"`
	CustomerEmail      string     `json:"customer_email"`
	CustomerPhone      string     `json:"customer_phone"`
	RequestedAt        time.Time  `json:"requested_at"`
	ApprovedAt         *time.Time `json:"approved_at,omitempty"`
	PickupScheduledAt  *time.Time `json:"pickup_scheduled_at,omitempty"`
	PickedUpAt         *time.Time `json:"picked_up_at,omitempty"`
	ReceivedAt         *time.Time `json:"received_at,omitempty"`
	ProcessedAt        *time.Time `json:"processed_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type ReturnItemResponse struct {
	ID              int64  `json:"id"`
	OrderItemID     string `json:"order_item_id"`
	SKU             string `json:"sku"`
	ProductName     string `json:"product_name"`
	VariantName     string `json:"variant_name"`
	ImageURL        string `json:"image_url"`
	Quantity        int    `json:"quantity"`
	UnitPrice       string `json:"unit_price"`
	Condition       string `json:"condition"`
	InspectionNotes string `json:"inspection_notes"`
	RestockApproved *bool  `json:"restock_approved,omitempty"`
}

// ============================================================================
// RETURN REQUEST HANDLERS
// ============================================================================

// CreateReturnRequest creates a new return request
func (h *ReturnHandler) CreateReturnRequest(c echo.Context) error {
	var req CreateReturnRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Reason == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Reason is required"})
	}

	// Verify fulfillment order exists and is delivered
	var currentStatus string
	var orderID uuid.UUID
	err := h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_status, order_id FROM fulfillment_orders WHERE id = $1
	`, req.FulfillmentOrderID).Scan(&currentStatus, &orderID)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "delivered" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Can only request return for delivered orders. Current status: %s", currentStatus),
		})
	}

	// If no pickup address provided, get from original order
	if req.PickupAddress == "" {
		h.DB.QueryRowContext(c.Request().Context(), `
			SELECT COALESCE(delivery_address, ''), COALESCE(delivery_phone, '')
			FROM fulfillment_orders WHERE id = $1
		`, req.FulfillmentOrderID).Scan(&req.PickupAddress, &req.PickupPhone)
	}

	// Create return request
	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	var returnID int64
	var requestedAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), `
		INSERT INTO return_requests (
			fulfillment_order_id, reason, reason_category, description,
			pickup_address, pickup_phone, refund_amount, restock_items
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, requested_at
	`, req.FulfillmentOrderID, req.Reason, req.ReasonCategory, req.Description,
		req.PickupAddress, req.PickupPhone, req.RefundAmount, req.RestockItems,
	).Scan(&returnID, &requestedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create return request: " + err.Error()})
	}

	// Add return items
	for _, item := range req.Items {
		itemID, err := uuid.Parse(item.OrderItemID)
		if err != nil {
			continue
		}

		quantity := item.Quantity
		if quantity == 0 {
			quantity = 1
		}

		tx.ExecContext(c.Request().Context(), `
			INSERT INTO return_items (return_request_id, order_item_id, quantity, condition)
			VALUES ($1, $2, $3, $4)
		`, returnID, itemID, quantity, item.Condition)
	}

	// Update fulfillment order status
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders 
		SET fulfillment_status = 'return_requested', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, req.FulfillmentOrderID)

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'delivered', 'return_requested', 'system', $2)
	`, req.FulfillmentOrderID, "Return request created: "+req.Reason)

	// Create notification
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO fulfillment_notifications (type, title, message, reference_type, reference_id, priority)
		VALUES ('return_request', 'New Return Request', $1, 'return_request', $2, 'high')
	`, fmt.Sprintf("Return requested for order. Reason: %s", req.Reason), returnID)

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":                   returnID,
		"fulfillment_order_id": req.FulfillmentOrderID,
		"reason":               req.Reason,
		"status":               "requested",
		"requested_at":         requestedAt,
		"message":              "Return request created successfully",
	})
}

// ListReturnRequests returns a paginated list of return requests
func (h *ReturnHandler) ListReturnRequests(c echo.Context) error {
	limit := 50
	offset := 0

	if l := c.QueryParam("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := c.QueryParam("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	status := c.QueryParam("status")

	var query string
	var args []interface{}

	baseQuery := `
		SELECT 
			rr.id, rr.fulfillment_order_id, fo.tracking_number, o.order_number,
			rr.reason, COALESCE(rr.reason_category, '') as reason_category,
			COALESCE(rr.description, '') as description, rr.status,
			COALESCE(rr.pickup_address, '') as pickup_address,
			COALESCE(rr.pickup_phone, '') as pickup_phone,
			rr.refund_amount, rr.restock_items, rr.pickup_driver_id,
			CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
			COALESCE(c.email, '') as customer_email,
			COALESCE(c.phone, '') as customer_phone,
			COALESCE(d.first_name || ' ' || d.last_name, '') as driver_name,
			rr.requested_at, rr.approved_at, rr.pickup_scheduled_at,
			rr.picked_up_at, rr.received_at, rr.processed_at,
			rr.created_at, rr.updated_at
		FROM return_requests rr
		JOIN fulfillment_orders fo ON rr.fulfillment_order_id = fo.id
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN drivers d ON rr.pickup_driver_id = d.id
	`

	if status != "" {
		query = baseQuery + `
			WHERE rr.status = $1
			ORDER BY rr.created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{status, limit, offset}
	} else {
		query = baseQuery + `
			ORDER BY rr.created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	rows, err := h.DB.QueryContext(c.Request().Context(), query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list return requests"})
	}
	defer rows.Close()

	var returns []ReturnResponse
	for rows.Next() {
		var r ReturnResponse
		var refundAmount sql.NullFloat64

		err := rows.Scan(
			&r.ID, &r.FulfillmentOrderID, &r.TrackingNumber, &r.OrderNumber,
			&r.Reason, &r.ReasonCategory, &r.Description, &r.Status,
			&r.PickupAddress, &r.PickupPhone, &refundAmount, &r.RestockItems,
			&r.PickupDriverID, &r.CustomerName, &r.CustomerEmail, &r.CustomerPhone,
			&r.PickupDriverName,
			&r.RequestedAt, &r.ApprovedAt, &r.PickupScheduledAt,
			&r.PickedUpAt, &r.ReceivedAt, &r.ProcessedAt,
			&r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			continue
		}
		if refundAmount.Valid {
			r.RefundAmount = &refundAmount.Float64
		}
		returns = append(returns, r)
	}

	return c.JSON(http.StatusOK, returns)
}

// GetReturnRequest returns a single return request by ID
func (h *ReturnHandler) GetReturnRequest(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	query := `
		SELECT 
			rr.id, rr.fulfillment_order_id, fo.tracking_number, o.order_number,
			rr.reason, COALESCE(rr.reason_category, '') as reason_category,
			COALESCE(rr.description, '') as description, rr.status,
			COALESCE(rr.pickup_address, '') as pickup_address,
			COALESCE(rr.pickup_phone, '') as pickup_phone,
			rr.refund_amount, rr.restock_items, rr.pickup_driver_id,
			CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
			COALESCE(c.email, '') as customer_email,
			COALESCE(c.phone, '') as customer_phone,
			COALESCE(d.first_name || ' ' || d.last_name, '') as driver_name,
			COALESCE(d.phone, '') as driver_phone,
			rr.requested_at, rr.approved_at, rr.pickup_scheduled_at,
			rr.picked_up_at, rr.received_at, rr.processed_at,
			rr.created_at, rr.updated_at
		FROM return_requests rr
		JOIN fulfillment_orders fo ON rr.fulfillment_order_id = fo.id
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN drivers d ON rr.pickup_driver_id = d.id
		WHERE rr.id = $1
	`

	var r ReturnResponse
	var refundAmount sql.NullFloat64
	var driverPhone string

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&r.ID, &r.FulfillmentOrderID, &r.TrackingNumber, &r.OrderNumber,
		&r.Reason, &r.ReasonCategory, &r.Description, &r.Status,
		&r.PickupAddress, &r.PickupPhone, &refundAmount, &r.RestockItems,
		&r.PickupDriverID, &r.CustomerName, &r.CustomerEmail, &r.CustomerPhone,
		&r.PickupDriverName, &driverPhone,
		&r.RequestedAt, &r.ApprovedAt, &r.PickupScheduledAt,
		&r.PickedUpAt, &r.ReceivedAt, &r.ProcessedAt,
		&r.CreatedAt, &r.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get return request"})
	}

	if refundAmount.Valid {
		r.RefundAmount = &refundAmount.Float64
	}

	// Get return items
	items, err := h.getReturnItems(c, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get return items"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"return":       r,
		"items":        items,
		"driver_phone": driverPhone,
	})
}

// ApproveReturn approves a return request
func (h *ReturnHandler) ApproveReturn(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req struct {
		RefundAmount *float64 `json:"refund_amount"`
		Notes        string   `json:"notes"`
	}
	c.Bind(&req)

	// Check current status
	var currentStatus string
	var fulfillmentOrderID int64
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT status, fulfillment_order_id FROM return_requests WHERE id = $1", id,
	).Scan(&currentStatus, &fulfillmentOrderID)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}
	if currentStatus != "requested" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Can only approve requests in 'requested' status. Current: %s", currentStatus),
		})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// Update return request
	updateQuery := `
		UPDATE return_requests 
		SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
	`
	if req.RefundAmount != nil {
		updateQuery += fmt.Sprintf(", refund_amount = %f", *req.RefundAmount)
	}
	updateQuery += " WHERE id = $1 RETURNING approved_at"

	var approvedAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), updateQuery, id).Scan(&approvedAt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to approve return"})
	}

	// Update fulfillment order status
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders 
		SET fulfillment_status = 'return_approved', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, fulfillmentOrderID)

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'return_requested', 'return_approved', 'admin', $2)
	`, fulfillmentOrderID, req.Notes)

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"message":     "Return approved",
		"id":          id,
		"status":      "approved",
		"approved_at": approvedAt,
	})
}

// RejectReturn rejects a return request
func (h *ReturnHandler) RejectReturn(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req struct {
		Reason string `json:"reason" validate:"required"`
	}
	if err := c.Bind(&req); err != nil || req.Reason == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Rejection reason is required"})
	}

	var fulfillmentOrderID int64
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT fulfillment_order_id FROM return_requests WHERE id = $1", id,
	).Scan(&fulfillmentOrderID)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(c.Request().Context(), `
		UPDATE return_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to reject return"})
	}

	// Revert fulfillment status back to delivered
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders SET fulfillment_status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, fulfillmentOrderID)

	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'return_requested', 'delivered', 'admin', $2)
	`, fulfillmentOrderID, "Return rejected: "+req.Reason)

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Return rejected",
		"id":      id,
		"status":  "rejected",
	})
}

// AssignPickupDriver assigns a driver to pick up the return
func (h *ReturnHandler) AssignPickupDriver(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req struct {
		DriverID          int64      `json:"driver_id" validate:"required"`
		PickupScheduledAt *time.Time `json:"pickup_scheduled_at"`
		Notes             string     `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Verify driver is active
	var driverName string
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT CONCAT(first_name, ' ', last_name) FROM drivers WHERE id = $1 AND is_active = true
	`, req.DriverID).Scan(&driverName)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Driver not found or inactive"})
	}

	// Get return and fulfillment order info
	var fulfillmentOrderID int64
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_order_id, status FROM return_requests WHERE id = $1
	`, id).Scan(&fulfillmentOrderID, &currentStatus)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}
	if currentStatus != "approved" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Can only assign pickup for approved returns. Current: %s", currentStatus),
		})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// Update return request
	_, err = tx.ExecContext(c.Request().Context(), `
		UPDATE return_requests 
		SET pickup_driver_id = $2, status = 'pickup_assigned', 
		    pickup_scheduled_at = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, id, req.DriverID, req.PickupScheduledAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to assign driver"})
	}

	// Create driver assignment
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO driver_assignments (driver_id, fulfillment_order_id, assignment_type, notes)
		VALUES ($1, $2, 'return_pickup', $3)
	`, req.DriverID, fulfillmentOrderID, req.Notes)

	// Increment driver workload
	tx.ExecContext(c.Request().Context(), `
		UPDATE drivers SET current_workload = current_workload + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, req.DriverID)

	// Update fulfillment order
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders SET fulfillment_status = 'pickup_assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, fulfillmentOrderID)

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'return_approved', 'pickup_assigned', 'admin', $2)
	`, fulfillmentOrderID, fmt.Sprintf("Pickup assigned to driver: %s", driverName))

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"message":     "Pickup driver assigned",
		"id":          id,
		"driver_name": driverName,
		"status":      "pickup_assigned",
	})
}

// MarkReturnPickedUp marks the return as picked up by driver
func (h *ReturnHandler) MarkReturnPickedUp(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var fulfillmentOrderID int64
	var driverID sql.NullInt64
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_order_id, pickup_driver_id FROM return_requests WHERE id = $1
	`, id).Scan(&fulfillmentOrderID, &driverID)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	var pickedUpAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), `
		UPDATE return_requests 
		SET status = 'picked_up', picked_up_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING picked_up_at
	`, id).Scan(&pickedUpAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update return"})
	}

	// Update fulfillment order
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders SET fulfillment_status = 'picked_up', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, fulfillmentOrderID)

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, changed_by_driver, change_source, notes)
		VALUES ($1, 'pickup_assigned', 'picked_up', $2, 'driver_app', 'Return package picked up')
	`, fulfillmentOrderID, driverID)

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":      true,
		"message":      "Return marked as picked up",
		"id":           id,
		"status":       "picked_up",
		"picked_up_at": pickedUpAt,
	})
}

// MarkReturnReceived marks the return as received at warehouse
func (h *ReturnHandler) MarkReturnReceived(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var fulfillmentOrderID int64
	var driverID sql.NullInt64
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_order_id, pickup_driver_id FROM return_requests WHERE id = $1
	`, id).Scan(&fulfillmentOrderID, &driverID)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	var receivedAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), `
		UPDATE return_requests 
		SET status = 'received', received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING received_at
	`, id).Scan(&receivedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update return"})
	}

	// Update fulfillment order
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders SET fulfillment_status = 'return_received', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, fulfillmentOrderID)

	// Complete driver assignment
	tx.ExecContext(c.Request().Context(), `
		UPDATE driver_assignments 
		SET status = 'completed', completed_at = CURRENT_TIMESTAMP
		WHERE fulfillment_order_id = $1 AND assignment_type = 'return_pickup' AND status != 'completed'
	`, fulfillmentOrderID)

	// Decrement driver workload if we have driver ID
	if driverID.Valid {
		tx.ExecContext(c.Request().Context(), `
			UPDATE drivers SET current_workload = GREATEST(current_workload - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1
		`, driverID.Int64)
	}

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'picked_up', 'return_received', 'admin', 'Return package received at warehouse')
	`, fulfillmentOrderID)

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"message":     "Return marked as received",
		"id":          id,
		"status":      "received",
		"received_at": receivedAt,
	})
}

// CompleteReturn completes the return process
func (h *ReturnHandler) CompleteReturn(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req struct {
		RestockApproved bool    `json:"restock_approved"`
		RefundProcessed bool    `json:"refund_processed"`
		FinalAmount     float64 `json:"final_amount"`
		Notes           string  `json:"notes"`
	}
	c.Bind(&req)

	var fulfillmentOrderID int64
	var restockItems bool
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_order_id, restock_items FROM return_requests WHERE id = $1
	`, id).Scan(&fulfillmentOrderID, &restockItems)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Return request not found"})
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	var processedAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), `
		UPDATE return_requests 
		SET status = 'completed', processed_at = CURRENT_TIMESTAMP, 
		    refund_amount = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING processed_at
	`, id, req.FinalAmount).Scan(&processedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to complete return"})
	}

	// Update fulfillment order
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders SET fulfillment_status = 'return_completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, fulfillmentOrderID)

	// Log status change
	notes := req.Notes
	if req.RefundProcessed {
		notes += fmt.Sprintf(" | Refund: %.2f", req.FinalAmount)
	}
	if restockItems && req.RestockApproved {
		notes += " | Items restocked"
	}

	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, 'return_received', 'return_completed', 'admin', $2)
	`, fulfillmentOrderID, notes)

	// TODO: If restocking is approved, increment stock for returned items
	if restockItems && req.RestockApproved {
		// Get return items and restock them
		rows, _ := tx.QueryContext(c.Request().Context(), `
			SELECT ri.order_item_id, ri.quantity, oi.variant_id
			FROM return_items ri
			JOIN order_items oi ON ri.order_item_id = oi.id
			WHERE ri.return_request_id = $1
		`, id)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var orderItemID uuid.UUID
				var quantity int
				var variantID int64
				if rows.Scan(&orderItemID, &quantity, &variantID) == nil {
					tx.ExecContext(c.Request().Context(), `
						UPDATE product_variants SET stock_quantity = stock_quantity + $2 WHERE id = $1
					`, variantID, quantity)
				}
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":      true,
		"message":      "Return completed",
		"id":           id,
		"status":       "completed",
		"processed_at": processedAt,
		"restocked":    restockItems && req.RestockApproved,
	})
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func (h *ReturnHandler) getReturnItems(c echo.Context, returnRequestID int64) ([]ReturnItemResponse, error) {
	query := `
		SELECT 
			ri.id, ri.order_item_id::text, COALESCE(pv.sku, 'N/A') as sku,
			COALESCE(p.title, 'Unknown') as product_name,
			COALESCE(CONCAT_WS(' / ', pv.size, pv.color), '') as variant_name,
			COALESCE(pv.image, p.thumbnail, '') as image_url,
			ri.quantity, oi.unit_price,
			COALESCE(ri.condition, '') as condition,
			COALESCE(ri.inspection_notes, '') as inspection_notes,
			ri.restock_approved
		FROM return_items ri
		JOIN order_items oi ON ri.order_item_id = oi.id
		LEFT JOIN product_variants pv ON oi.variant_id = pv.id
		LEFT JOIN products p ON pv.product_id = p.id
		WHERE ri.return_request_id = $1
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query, returnRequestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ReturnItemResponse
	for rows.Next() {
		var item ReturnItemResponse
		var unitPrice float64
		var restockApproved sql.NullBool

		err := rows.Scan(
			&item.ID, &item.OrderItemID, &item.SKU, &item.ProductName,
			&item.VariantName, &item.ImageURL, &item.Quantity, &unitPrice,
			&item.Condition, &item.InspectionNotes, &restockApproved,
		)
		if err != nil {
			continue
		}

		item.UnitPrice = fmt.Sprintf("%.2f", unitPrice)
		if restockApproved.Valid {
			item.RestockApproved = &restockApproved.Bool
		}
		items = append(items, item)
	}

	return items, nil
}
