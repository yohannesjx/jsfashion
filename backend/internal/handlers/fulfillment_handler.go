package handlers

import (
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// FulfillmentHandler handles all fulfillment-related API endpoints
type FulfillmentHandler struct {
	DB *sql.DB
}

// NewFulfillmentHandler creates a new FulfillmentHandler
func NewFulfillmentHandler(db *sql.DB) *FulfillmentHandler {
	return &FulfillmentHandler{DB: db}
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

type CreateFulfillmentOrderRequest struct {
	OrderID       uuid.UUID `json:"order_id" validate:"required"`
	DeliveryAddr  string    `json:"delivery_address"`
	DeliveryPhone string    `json:"delivery_phone"`
	DeliveryNotes string    `json:"delivery_notes"`
	Notes         string    `json:"notes"`
}

type FulfillmentOrderResponse struct {
	ID                int64      `json:"id"`
	OrderID           string     `json:"order_id"`
	OrderNumber       int32      `json:"order_number"`
	TrackingNumber    string     `json:"tracking_number"`
	FulfillmentStatus string     `json:"fulfillment_status"`
	PickerID          *int64     `json:"picker_id,omitempty"`
	PackerID          *int64     `json:"packer_id,omitempty"`
	DriverID          *int64     `json:"driver_id,omitempty"`
	PickedAt          *time.Time `json:"picked_at,omitempty"`
	PackedAt          *time.Time `json:"packed_at,omitempty"`
	ShippedAt         *time.Time `json:"shipped_at,omitempty"`
	DeliveredAt       *time.Time `json:"delivered_at,omitempty"`
	DeliveryAddress   string     `json:"delivery_address"`
	DeliveryPhone     string     `json:"delivery_phone"`
	TotalAmount       string     `json:"total_amount"`
	CustomerFirstName string     `json:"customer_first_name"`
	CustomerLastName  string     `json:"customer_last_name"`
	DriverFirstName   string     `json:"driver_first_name,omitempty"`
	DriverLastName    string     `json:"driver_last_name,omitempty"`
	DriverPhone       string     `json:"driver_phone,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type FulfillmentItemResponse struct {
	ID             string     `json:"id"`
	SKU            string     `json:"sku"`
	ProductName    string     `json:"product_name"`
	VariantName    string     `json:"variant_name"`
	ImageURL       string     `json:"image_url"`
	Quantity       int32      `json:"quantity"`
	UnitPrice      string     `json:"unit_price"`
	PickedQuantity int32      `json:"picked_quantity"`
	PackedQuantity int32      `json:"packed_quantity"`
	PickedAt       *time.Time `json:"picked_at,omitempty"`
	PackedAt       *time.Time `json:"packed_at,omitempty"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" validate:"required"`
	Notes  string `json:"notes"`
}

type ScanRequest struct {
	FulfillmentOrderID int64  `json:"fulfillment_order_id" validate:"required"`
	SKU                string `json:"sku" validate:"required"`
	Quantity           int32  `json:"quantity"`
}

type ScanResponse struct {
	Success       bool               `json:"success"`
	Message       string             `json:"message"`
	Item          *ScannedItemInfo   `json:"item,omitempty"`
	OrderProgress *OrderProgressInfo `json:"order_progress,omitempty"`
}

type ScannedItemInfo struct {
	SKU              string `json:"sku"`
	ProductName      string `json:"product_name"`
	VariantName      string `json:"variant_name"`
	QuantityRequired int32  `json:"quantity_required"`
	QuantityScanned  int32  `json:"quantity_scanned"`
}

type OrderProgressInfo struct {
	TotalItems   int  `json:"total_items"`
	ScannedItems int  `json:"scanned_items"`
	IsComplete   bool `json:"is_complete"`
}

type FulfillmentStatsResponse struct {
	PendingOrders     int64 `json:"pending_orders"`
	InPicking         int64 `json:"in_picking"`
	InPacking         int64 `json:"in_packing"`
	InTransit         int64 `json:"in_transit"`
	DeliveredToday    int64 `json:"delivered_today"`
	PendingReturns    int64 `json:"pending_returns"`
	ActiveDrivers     int64 `json:"active_drivers"`
	ActiveAssignments int64 `json:"active_assignments"`
}

// ============================================================================
// FULFILLMENT ORDER HANDLERS
// ============================================================================

// CreateFulfillmentOrder creates a new fulfillment order for an existing order
func (h *FulfillmentHandler) CreateFulfillmentOrder(c echo.Context) error {
	var req CreateFulfillmentOrderRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Generate tracking number
	trackingNumber := GenerateTrackingNumber()

	// Create fulfillment order
	query := `
		INSERT INTO fulfillment_orders (
			order_id, tracking_number, fulfillment_status,
			delivery_address, delivery_phone, delivery_notes, notes
		) VALUES ($1, $2, 'placed', $3, $4, $5, $6)
		RETURNING id, order_id, tracking_number, fulfillment_status, created_at, updated_at
	`

	var fo struct {
		ID                int64     `json:"id"`
		OrderID           uuid.UUID `json:"order_id"`
		TrackingNumber    string    `json:"tracking_number"`
		FulfillmentStatus string    `json:"fulfillment_status"`
		CreatedAt         time.Time `json:"created_at"`
		UpdatedAt         time.Time `json:"updated_at"`
	}

	err := h.DB.QueryRowContext(c.Request().Context(), query,
		req.OrderID, trackingNumber, req.DeliveryAddr, req.DeliveryPhone, req.DeliveryNotes, req.Notes,
	).Scan(&fo.ID, &fo.OrderID, &fo.TrackingNumber, &fo.FulfillmentStatus, &fo.CreatedAt, &fo.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create fulfillment order: " + err.Error()})
	}

	// Log status history
	h.logStatusChange(c.Request().Context(), fo.ID, "", "placed", nil, nil, "system", "Fulfillment order created")

	// Get order items
	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), req.OrderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order items"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":                 fo.ID,
		"order_id":           fo.OrderID.String(),
		"tracking_number":    fo.TrackingNumber,
		"fulfillment_status": fo.FulfillmentStatus,
		"items":              items,
		"created_at":         fo.CreatedAt,
	})
}

// ListFulfillmentOrders returns a paginated list of fulfillment orders
func (h *FulfillmentHandler) ListFulfillmentOrders(c echo.Context) error {
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

	if status != "" {
		query = `
			SELECT 
				fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
				fo.picker_id, fo.packer_id, fo.driver_id,
				fo.picked_at, fo.packed_at, fo.shipped_at, fo.delivered_at,
				fo.delivery_address, fo.delivery_phone, fo.created_at, fo.updated_at,
				o.order_number, o.total_amount,
				COALESCE(c.first_name, '') as customer_first_name,
				COALESCE(c.last_name, '') as customer_last_name,
				COALESCE(d.first_name, '') as driver_first_name,
				COALESCE(d.last_name, '') as driver_last_name
			FROM fulfillment_orders fo
			JOIN orders o ON fo.order_id = o.id
			LEFT JOIN customers c ON o.customer_id = c.id
			LEFT JOIN drivers d ON fo.driver_id = d.id
			WHERE fo.fulfillment_status = $1
			ORDER BY fo.created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{status, limit, offset}
	} else {
		query = `
			SELECT 
				fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
				fo.picker_id, fo.packer_id, fo.driver_id,
				fo.picked_at, fo.packed_at, fo.shipped_at, fo.delivered_at,
				fo.delivery_address, fo.delivery_phone, fo.created_at, fo.updated_at,
				o.order_number, o.total_amount,
				COALESCE(c.first_name, '') as customer_first_name,
				COALESCE(c.last_name, '') as customer_last_name,
				COALESCE(d.first_name, '') as driver_first_name,
				COALESCE(d.last_name, '') as driver_last_name
			FROM fulfillment_orders fo
			JOIN orders o ON fo.order_id = o.id
			LEFT JOIN customers c ON o.customer_id = c.id
			LEFT JOIN drivers d ON fo.driver_id = d.id
			ORDER BY fo.created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	rows, err := h.DB.QueryContext(c.Request().Context(), query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list fulfillment orders"})
	}
	defer rows.Close()

	var orders []FulfillmentOrderResponse
	for rows.Next() {
		var fo FulfillmentOrderResponse
		var orderID uuid.UUID
		var totalAmount float64
		var orderNumber int32

		err := rows.Scan(
			&fo.ID, &orderID, &fo.TrackingNumber, &fo.FulfillmentStatus,
			&fo.PickerID, &fo.PackerID, &fo.DriverID,
			&fo.PickedAt, &fo.PackedAt, &fo.ShippedAt, &fo.DeliveredAt,
			&fo.DeliveryAddress, &fo.DeliveryPhone, &fo.CreatedAt, &fo.UpdatedAt,
			&orderNumber, &totalAmount,
			&fo.CustomerFirstName, &fo.CustomerLastName,
			&fo.DriverFirstName, &fo.DriverLastName,
		)
		if err != nil {
			continue
		}
		fo.OrderID = orderID.String()
		fo.OrderNumber = orderNumber
		fo.TotalAmount = fmt.Sprintf("%.2f", totalAmount)
		orders = append(orders, fo)
	}

	return c.JSON(http.StatusOK, orders)
}

// GetFulfillmentOrder returns a single fulfillment order by ID
func (h *FulfillmentHandler) GetFulfillmentOrder(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	query := `
		SELECT 
			fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
			fo.picker_id, fo.packer_id, fo.driver_id,
			fo.picked_at, fo.packed_at, fo.shipped_at, fo.delivered_at,
			fo.delivery_address, fo.delivery_phone, fo.notes, fo.created_at, fo.updated_at,
			o.order_number, o.total_amount, o.payment_method,
			COALESCE(c.first_name, '') as customer_first_name,
			COALESCE(c.last_name, '') as customer_last_name,
			COALESCE(c.email, '') as customer_email,
			COALESCE(c.phone, '') as customer_phone,
			COALESCE(d.first_name, '') as driver_first_name,
			COALESCE(d.last_name, '') as driver_last_name,
			COALESCE(d.phone, '') as driver_phone,
			COALESCE(d.vehicle_type, '') as vehicle_type,
			COALESCE(d.vehicle_plate, '') as vehicle_plate
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN drivers d ON fo.driver_id = d.id
		WHERE fo.id = $1
	`

	var fo FulfillmentOrderResponse
	var orderID uuid.UUID
	var totalAmount float64
	var notes sql.NullString
	var paymentMethod, customerEmail, customerPhone, vehicleType, vehiclePlate string

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&fo.ID, &orderID, &fo.TrackingNumber, &fo.FulfillmentStatus,
		&fo.PickerID, &fo.PackerID, &fo.DriverID,
		&fo.PickedAt, &fo.PackedAt, &fo.ShippedAt, &fo.DeliveredAt,
		&fo.DeliveryAddress, &fo.DeliveryPhone, &notes, &fo.CreatedAt, &fo.UpdatedAt,
		&fo.OrderNumber, &totalAmount, &paymentMethod,
		&fo.CustomerFirstName, &fo.CustomerLastName, &customerEmail, &customerPhone,
		&fo.DriverFirstName, &fo.DriverLastName, &fo.DriverPhone,
		&vehicleType, &vehiclePlate,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get fulfillment order"})
	}

	fo.OrderID = orderID.String()
	fo.TotalAmount = fmt.Sprintf("%.2f", totalAmount)

	// Get order items
	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order items"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"order":          fo,
		"items":          items,
		"customer_email": customerEmail,
		"customer_phone": customerPhone,
		"payment_method": paymentMethod,
		"vehicle_type":   vehicleType,
		"vehicle_plate":  vehiclePlate,
		"notes":          notes.String,
	})
}

// GetFulfillmentOrderByTracking returns a fulfillment order by tracking number
func (h *FulfillmentHandler) GetFulfillmentOrderByTracking(c echo.Context) error {
	trackingNumber := c.Param("tracking")

	query := `
		SELECT 
			fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
			fo.picked_at, fo.packed_at, fo.shipped_at, fo.delivered_at,
			fo.created_at, fo.updated_at,
			o.order_number, o.total_amount,
			COALESCE(c.first_name, '') as customer_first_name,
			COALESCE(c.last_name, '') as customer_last_name,
			COALESCE(d.first_name, '') as driver_first_name,
			COALESCE(d.last_name, '') as driver_last_name,
			COALESCE(d.phone, '') as driver_phone
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN drivers d ON fo.driver_id = d.id
		WHERE fo.tracking_number = $1
	`

	var fo FulfillmentOrderResponse
	var orderID uuid.UUID
	var totalAmount float64

	err := h.DB.QueryRowContext(c.Request().Context(), query, trackingNumber).Scan(
		&fo.ID, &orderID, &fo.TrackingNumber, &fo.FulfillmentStatus,
		&fo.PickedAt, &fo.PackedAt, &fo.ShippedAt, &fo.DeliveredAt,
		&fo.CreatedAt, &fo.UpdatedAt,
		&fo.OrderNumber, &totalAmount,
		&fo.CustomerFirstName, &fo.CustomerLastName,
		&fo.DriverFirstName, &fo.DriverLastName, &fo.DriverPhone,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Tracking number not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order"})
	}

	fo.OrderID = orderID.String()
	fo.TotalAmount = fmt.Sprintf("%.2f", totalAmount)

	return c.JSON(http.StatusOK, fo)
}

// UpdateFulfillmentStatus updates the status of a fulfillment order
func (h *FulfillmentHandler) UpdateFulfillmentStatus(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req UpdateStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Get current status
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT fulfillment_status FROM fulfillment_orders WHERE id = $1", id,
	).Scan(&currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}

	// Update status
	query := `
		UPDATE fulfillment_orders 
		SET fulfillment_status = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, fulfillment_status, updated_at
	`

	var result struct {
		ID        int64     `json:"id"`
		Status    string    `json:"status"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id, req.Status).Scan(
		&result.ID, &result.Status, &result.UpdatedAt,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update status"})
	}

	// Log status change
	// Get admin user ID from context if available
	var adminID *int64
	if userID, ok := c.Get("user_id").(int64); ok {
		adminID = &userID
	}
	h.logStatusChange(c.Request().Context(), id, currentStatus, req.Status, adminID, nil, "admin", req.Notes)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Status updated successfully",
		"order":   result,
	})
}

// GetFulfillmentOrderItems returns the SKU list for a fulfillment order
func (h *FulfillmentHandler) GetFulfillmentOrderItems(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	// Get order_id from fulfillment order
	var orderID uuid.UUID
	var trackingNumber string
	var orderNumber int32
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fo.order_id, fo.tracking_number, o.order_number
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		WHERE fo.id = $1
	`, id).Scan(&orderID, &trackingNumber, &orderNumber)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get order"})
	}

	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get items"})
	}

	// Calculate totals
	totalItems := 0
	pickedItems := 0
	packedItems := 0
	for _, item := range items {
		totalItems += int(item.Quantity)
		pickedItems += int(item.PickedQuantity)
		packedItems += int(item.PackedQuantity)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"fulfillment_order_id": id,
		"tracking_number":      trackingNumber,
		"order_number":         orderNumber,
		"items":                items,
		"totals": map[string]int{
			"total_items":  totalItems,
			"picked_items": pickedItems,
			"packed_items": packedItems,
		},
	})
}

// GetStatusHistory returns the status change history for a fulfillment order
func (h *FulfillmentHandler) GetStatusHistory(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	query := `
		SELECT 
			osh.id, osh.previous_status, osh.new_status, osh.change_source,
			osh.notes, osh.created_at,
			COALESCE(admin.first_name || ' ' || admin.last_name, '') as changed_by_admin,
			COALESCE(driver.first_name || ' ' || driver.last_name, '') as changed_by_driver
		FROM order_status_history osh
		LEFT JOIN admin_users admin ON osh.changed_by_admin = admin.id
		LEFT JOIN drivers driver ON osh.changed_by_driver = driver.id
		WHERE osh.fulfillment_order_id = $1
		ORDER BY osh.created_at DESC
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get status history"})
	}
	defer rows.Close()

	history := []map[string]interface{}{}
	for rows.Next() {
		var entry struct {
			ID              int64          `json:"id"`
			PreviousStatus  sql.NullString `json:"previous_status"`
			NewStatus       string         `json:"new_status"`
			ChangeSource    string         `json:"change_source"`
			Notes           sql.NullString `json:"notes"`
			CreatedAt       time.Time      `json:"created_at"`
			ChangedByAdmin  string         `json:"changed_by_admin"`
			ChangedByDriver string         `json:"changed_by_driver"`
		}

		err := rows.Scan(
			&entry.ID, &entry.PreviousStatus, &entry.NewStatus, &entry.ChangeSource,
			&entry.Notes, &entry.CreatedAt, &entry.ChangedByAdmin, &entry.ChangedByDriver,
		)
		if err != nil {
			continue
		}

		changedBy := entry.ChangedByAdmin
		if entry.ChangedByDriver != "" {
			changedBy = entry.ChangedByDriver + " (Driver)"
		}
		if changedBy == "" {
			changedBy = "System"
		}

		history = append(history, map[string]interface{}{
			"id":              entry.ID,
			"previous_status": entry.PreviousStatus.String,
			"new_status":      entry.NewStatus,
			"change_source":   entry.ChangeSource,
			"changed_by":      changedBy,
			"notes":           entry.Notes.String,
			"created_at":      entry.CreatedAt,
		})
	}

	return c.JSON(http.StatusOK, history)
}

// ============================================================================
// PICKER/PACKER HANDLERS
// ============================================================================

// ListPendingPicking returns orders waiting to be picked
func (h *FulfillmentHandler) ListPendingPicking(c echo.Context) error {
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

	query := `
		SELECT 
			fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
			fo.created_at,
			o.order_number, o.total_amount, o.created_at as order_created_at,
			COALESCE(c.first_name, '') as customer_first_name,
			COALESCE(c.last_name, '') as customer_last_name,
			(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = fo.order_id) as item_count
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		WHERE fo.fulfillment_status = 'placed'
		ORDER BY fo.created_at ASC
		LIMIT $1 OFFSET $2
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list orders"})
	}
	defer rows.Close()

	orders := []map[string]interface{}{}
	for rows.Next() {
		var id int64
		var orderID uuid.UUID
		var trackingNumber, status string
		var createdAt, orderCreatedAt time.Time
		var orderNumber int32
		var totalAmount float64
		var customerFirstName, customerLastName string
		var itemCount int

		err := rows.Scan(
			&id, &orderID, &trackingNumber, &status, &createdAt,
			&orderNumber, &totalAmount, &orderCreatedAt,
			&customerFirstName, &customerLastName, &itemCount,
		)
		if err != nil {
			continue
		}

		orders = append(orders, map[string]interface{}{
			"id":               id,
			"order_id":         orderID.String(),
			"tracking_number":  trackingNumber,
			"status":           status,
			"order_number":     orderNumber,
			"total_amount":     fmt.Sprintf("%.2f", totalAmount),
			"customer_name":    customerFirstName + " " + customerLastName,
			"item_count":       itemCount,
			"order_created_at": orderCreatedAt,
			"created_at":       createdAt,
		})
	}

	return c.JSON(http.StatusOK, orders)
}

// ListPendingPacking returns orders waiting to be packed
func (h *FulfillmentHandler) ListPendingPacking(c echo.Context) error {
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

	query := `
		SELECT 
			fo.id, fo.order_id, fo.tracking_number, fo.fulfillment_status,
			fo.picked_at, fo.created_at,
			o.order_number, o.total_amount,
			COALESCE(c.first_name, '') as customer_first_name,
			COALESCE(c.last_name, '') as customer_last_name,
			(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = fo.order_id) as item_count
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		WHERE fo.fulfillment_status = 'picked'
		ORDER BY fo.picked_at ASC
		LIMIT $1 OFFSET $2
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list orders"})
	}
	defer rows.Close()

	orders := []map[string]interface{}{}
	for rows.Next() {
		var id int64
		var orderID uuid.UUID
		var trackingNumber, status string
		var pickedAt sql.NullTime
		var createdAt time.Time
		var orderNumber int32
		var totalAmount float64
		var customerFirstName, customerLastName string
		var itemCount int

		err := rows.Scan(
			&id, &orderID, &trackingNumber, &status, &pickedAt, &createdAt,
			&orderNumber, &totalAmount,
			&customerFirstName, &customerLastName, &itemCount,
		)
		if err != nil {
			continue
		}

		order := map[string]interface{}{
			"id":              id,
			"order_id":        orderID.String(),
			"tracking_number": trackingNumber,
			"status":          status,
			"order_number":    orderNumber,
			"total_amount":    fmt.Sprintf("%.2f", totalAmount),
			"customer_name":   customerFirstName + " " + customerLastName,
			"item_count":      itemCount,
			"created_at":      createdAt,
		}
		if pickedAt.Valid {
			order["picked_at"] = pickedAt.Time
		}
		orders = append(orders, order)
	}

	return c.JSON(http.StatusOK, orders)
}

// StartPicking starts the picking process for an order
func (h *FulfillmentHandler) StartPicking(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	// Get picker ID from context
	var pickerID int64 = 1 // Default, should be from auth context
	if userID, ok := c.Get("user_id").(int64); ok {
		pickerID = userID
	}

	// Check current status
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT fulfillment_status FROM fulfillment_orders WHERE id = $1", id,
	).Scan(&currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "placed" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not ready for picking. Current status: %s", currentStatus),
		})
	}

	// Update status to picking
	query := `
		UPDATE fulfillment_orders 
		SET picker_id = $2, fulfillment_status = 'picking', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, tracking_number, fulfillment_status
	`

	var result struct {
		ID             int64  `json:"id"`
		TrackingNumber string `json:"tracking_number"`
		Status         string `json:"status"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id, pickerID).Scan(
		&result.ID, &result.TrackingNumber, &result.Status,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start picking"})
	}

	h.logStatusChange(c.Request().Context(), id, currentStatus, "picking", &pickerID, nil, "picker_app", "Picking started")

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Picking started",
		"order":   result,
	})
}

// ScanPick scans an item during picking
func (h *FulfillmentHandler) ScanPick(c echo.Context) error {
	return h.processScan(c, "pick")
}

// CompletePicking completes the picking process
func (h *FulfillmentHandler) CompletePicking(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	// Get order_id and check status
	var orderID uuid.UUID
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT order_id, fulfillment_status FROM fulfillment_orders WHERE id = $1", id,
	).Scan(&orderID, &currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "picking" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not in picking status. Current status: %s", currentStatus),
		})
	}

	// Verify all items are picked
	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to verify items"})
	}

	for _, item := range items {
		if item.PickedQuantity < item.Quantity {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("Not all items picked. %s: %d/%d", item.SKU, item.PickedQuantity, item.Quantity),
			})
		}
	}

	// Update status to picked
	query := `
		UPDATE fulfillment_orders 
		SET fulfillment_status = 'picked', picked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, tracking_number, fulfillment_status, picked_at
	`

	var result struct {
		ID             int64     `json:"id"`
		TrackingNumber string    `json:"tracking_number"`
		Status         string    `json:"status"`
		PickedAt       time.Time `json:"picked_at"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&result.ID, &result.TrackingNumber, &result.Status, &result.PickedAt,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to complete picking"})
	}

	var pickerID *int64
	if userID, ok := c.Get("user_id").(int64); ok {
		pickerID = &userID
	}
	h.logStatusChange(c.Request().Context(), id, currentStatus, "picked", pickerID, nil, "picker_app", "Picking completed")

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Picking completed",
		"order":   result,
	})
}

// StartPacking starts the packing process
func (h *FulfillmentHandler) StartPacking(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var packerID int64 = 1
	if userID, ok := c.Get("user_id").(int64); ok {
		packerID = userID
	}

	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT fulfillment_status FROM fulfillment_orders WHERE id = $1", id,
	).Scan(&currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "picked" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not ready for packing. Current status: %s", currentStatus),
		})
	}

	query := `
		UPDATE fulfillment_orders 
		SET packer_id = $2, fulfillment_status = 'packing', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, tracking_number, fulfillment_status
	`

	var result struct {
		ID             int64  `json:"id"`
		TrackingNumber string `json:"tracking_number"`
		Status         string `json:"status"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id, packerID).Scan(
		&result.ID, &result.TrackingNumber, &result.Status,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start packing"})
	}

	h.logStatusChange(c.Request().Context(), id, currentStatus, "packing", &packerID, nil, "picker_app", "Packing started")

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Packing started",
		"order":   result,
	})
}

// ScanPack scans an item during packing
func (h *FulfillmentHandler) ScanPack(c echo.Context) error {
	return h.processScan(c, "pack")
}

// CompletePacking completes the packing process
func (h *FulfillmentHandler) CompletePacking(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var orderID uuid.UUID
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT order_id, fulfillment_status FROM fulfillment_orders WHERE id = $1", id,
	).Scan(&orderID, &currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "packing" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not in packing status. Current status: %s", currentStatus),
		})
	}

	// Verify all items are packed
	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to verify items"})
	}

	for _, item := range items {
		if item.PackedQuantity < item.Quantity {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("Not all items packed. %s: %d/%d", item.SKU, item.PackedQuantity, item.Quantity),
			})
		}
	}

	query := `
		UPDATE fulfillment_orders 
		SET fulfillment_status = 'packed', packed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, tracking_number, fulfillment_status, packed_at
	`

	var result struct {
		ID             int64     `json:"id"`
		TrackingNumber string    `json:"tracking_number"`
		Status         string    `json:"status"`
		PackedAt       time.Time `json:"packed_at"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&result.ID, &result.TrackingNumber, &result.Status, &result.PackedAt,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to complete packing"})
	}

	var packerID *int64
	if userID, ok := c.Get("user_id").(int64); ok {
		packerID = &userID
	}
	h.logStatusChange(c.Request().Context(), id, currentStatus, "packed", packerID, nil, "picker_app", "Packing completed")

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Packing completed - ready for driver assignment",
		"order":   result,
	})
}

// ============================================================================
// STATS HANDLERS
// ============================================================================

// GetFulfillmentStats returns dashboard statistics
func (h *FulfillmentHandler) GetFulfillmentStats(c echo.Context) error {
	query := `
		SELECT 
			(SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status = 'placed') as pending_orders,
			(SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('picking', 'picked')) as in_picking,
			(SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('packing', 'packed')) as in_packing,
			(SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('awaiting_pickup', 'in_transit')) as in_transit,
			(SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status = 'delivered' AND DATE(delivered_at) = CURRENT_DATE) as delivered_today,
			(SELECT COUNT(*) FROM return_requests WHERE status IN ('requested', 'approved')) as pending_returns,
			(SELECT COUNT(*) FROM drivers WHERE is_active = true) as active_drivers,
			(SELECT COUNT(*) FROM driver_assignments WHERE status IN ('assigned', 'picked_up', 'in_progress')) as active_assignments
	`

	var stats FulfillmentStatsResponse
	err := h.DB.QueryRowContext(c.Request().Context(), query).Scan(
		&stats.PendingOrders, &stats.InPicking, &stats.InPacking, &stats.InTransit,
		&stats.DeliveredToday, &stats.PendingReturns, &stats.ActiveDrivers, &stats.ActiveAssignments,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get stats"})
	}

	return c.JSON(http.StatusOK, stats)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func GenerateTrackingNumber() string {
	now := time.Now()
	return fmt.Sprintf("TRK-%s-%06d", now.Format("20060102"), now.UnixNano()%1000000)
}

func (h *FulfillmentHandler) getOrderItemsWithScanStatus(ctx interface{}, orderID uuid.UUID) ([]FulfillmentItemResponse, error) {
	query := `
		SELECT 
			oi.id,
			oi.quantity,
			oi.unit_price,
			COALESCE(pv.sku, 'N/A') as sku,
			COALESCE(p.title, 'Unknown Product') as product_name,
			COALESCE(CONCAT_WS(' / ', pv.size, pv.color), '') as variant_name,
			COALESCE(pv.image, p.thumbnail, '') as image_url,
			COALESCE(pick_scans.picked_qty, 0)::integer as picked_quantity,
			COALESCE(pack_scans.packed_qty, 0)::integer as packed_quantity,
			pick_scans.picked_at,
			pack_scans.packed_at
		FROM order_items oi
		LEFT JOIN product_variants pv ON oi.variant_id = pv.id
		LEFT JOIN products p ON pv.product_id = p.id
		LEFT JOIN LATERAL (
			SELECT SUM(fs.quantity_scanned) as picked_qty, MAX(fs.scanned_at) as picked_at
			FROM fulfillment_scans fs
			JOIN fulfillment_orders fo ON fs.fulfillment_order_id = fo.id
			WHERE fo.order_id = oi.order_id 
			  AND fs.order_item_id = oi.id 
			  AND fs.scan_type = 'pick'
		) pick_scans ON true
		LEFT JOIN LATERAL (
			SELECT SUM(fs.quantity_scanned) as packed_qty, MAX(fs.scanned_at) as packed_at
			FROM fulfillment_scans fs
			JOIN fulfillment_orders fo ON fs.fulfillment_order_id = fo.id
			WHERE fo.order_id = oi.order_id 
			  AND fs.order_item_id = oi.id 
			  AND fs.scan_type = 'pack'
		) pack_scans ON true
		WHERE oi.order_id = $1
		ORDER BY oi.id
	`

	// Type assert context
	var rows *sql.Rows
	var err error

	if echoCtx, ok := ctx.(echo.Context); ok {
		rows, err = h.DB.QueryContext(echoCtx.Request().Context(), query, orderID)
	} else if reqCtx, ok := ctx.(interface{ Done() <-chan struct{} }); ok {
		_ = reqCtx // Use type assertion result
		rows, err = h.DB.Query(query, orderID)
	} else {
		rows, err = h.DB.Query(query, orderID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []FulfillmentItemResponse
	for rows.Next() {
		var item FulfillmentItemResponse
		var id uuid.UUID
		var unitPrice float64
		var pickedAt, packedAt sql.NullTime

		err := rows.Scan(
			&id, &item.Quantity, &unitPrice,
			&item.SKU, &item.ProductName, &item.VariantName, &item.ImageURL,
			&item.PickedQuantity, &item.PackedQuantity,
			&pickedAt, &packedAt,
		)
		if err != nil {
			continue
		}

		item.ID = id.String()
		item.UnitPrice = fmt.Sprintf("%.2f", unitPrice)
		if pickedAt.Valid {
			item.PickedAt = &pickedAt.Time
		}
		if packedAt.Valid {
			item.PackedAt = &packedAt.Time
		}
		items = append(items, item)
	}

	return items, nil
}

func (h *FulfillmentHandler) processScan(c echo.Context, scanType string) error {
	var req ScanRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Quantity == 0 {
		req.Quantity = 1
	}

	// Get order details
	var orderID uuid.UUID
	var currentStatus string
	err := h.DB.QueryRowContext(c.Request().Context(),
		"SELECT order_id, fulfillment_status FROM fulfillment_orders WHERE id = $1", req.FulfillmentOrderID,
	).Scan(&orderID, &currentStatus)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}

	// Validate status
	expectedStatus := "picking"
	if scanType == "pack" {
		expectedStatus = "packing"
	}
	if currentStatus != expectedStatus {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not in %s status", expectedStatus),
		})
	}

	// Find order item by SKU
	var orderItemID uuid.UUID
	var productName, variantName string
	var quantity int32
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT oi.id, p.title, CONCAT_WS(' / ', pv.size, pv.color), oi.quantity
		FROM order_items oi
		JOIN product_variants pv ON oi.variant_id = pv.id
		JOIN products p ON pv.product_id = p.id
		WHERE oi.order_id = $1 AND pv.sku = $2
	`, orderID, req.SKU).Scan(&orderItemID, &productName, &variantName, &quantity)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "SKU not found in this order"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to find item"})
	}

	// Get current scan count
	var scannedSoFar int32
	h.DB.QueryRowContext(c.Request().Context(), `
		SELECT COALESCE(SUM(quantity_scanned), 0)
		FROM fulfillment_scans
		WHERE fulfillment_order_id = $1 AND order_item_id = $2 AND scan_type = $3
	`, req.FulfillmentOrderID, orderItemID, scanType).Scan(&scannedSoFar)

	if scannedSoFar+req.Quantity > quantity {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Already scanned %d/%d. Cannot scan %d more", scannedSoFar, quantity, req.Quantity),
		})
	}

	// Get scanner ID
	var scannerID int64 = 1
	if userID, ok := c.Get("user_id").(int64); ok {
		scannerID = userID
	}

	// Create scan record
	_, err = h.DB.ExecContext(c.Request().Context(), `
		INSERT INTO fulfillment_scans (fulfillment_order_id, order_item_id, sku, scanned_by, scan_type, quantity_scanned)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, req.FulfillmentOrderID, orderItemID, req.SKU, scannerID, scanType, req.Quantity)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to record scan"})
	}

	newTotal := scannedSoFar + req.Quantity

	// Get order progress
	items, _ := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	totalItems := 0
	scannedItems := 0
	for _, item := range items {
		totalItems += int(item.Quantity)
		if scanType == "pick" {
			scannedItems += int(item.PickedQuantity)
		} else {
			scannedItems += int(item.PackedQuantity)
		}
	}
	// Add the current scan
	scannedItems += int(req.Quantity)

	return c.JSON(http.StatusOK, ScanResponse{
		Success: true,
		Message: "Item scanned successfully",
		Item: &ScannedItemInfo{
			SKU:              req.SKU,
			ProductName:      productName,
			VariantName:      variantName,
			QuantityRequired: quantity,
			QuantityScanned:  newTotal,
		},
		OrderProgress: &OrderProgressInfo{
			TotalItems:   totalItems,
			ScannedItems: scannedItems,
			IsComplete:   scannedItems >= totalItems,
		},
	})
}

// GenerateLabel generates ZPL code for shipping labels
func (h *FulfillmentHandler) GenerateLabel(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	// Get order details
	var orderID uuid.UUID
	var labelData LabelData
	var firstName, lastName string

	query := `
		SELECT 
			fo.order_id, fo.tracking_number, fo.created_at,
			o.order_number,
			COALESCE(c.first_name, '') as first_name,
			COALESCE(c.last_name, '') as last_name,
			COALESCE(fo.delivery_phone, '') as phone
		FROM fulfillment_orders fo
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		WHERE fo.id = $1
	`

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&orderID,
		&labelData.TrackingNumber,
		&labelData.Date,
		&labelData.OrderNumber,
		&firstName,
		&lastName,
		&labelData.CustomerPhone,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Order not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch order details"})
	}

	labelData.CustomerName = fmt.Sprintf("%s %s", firstName, lastName)

	// Get items
	items, err := h.getOrderItemsWithScanStatus(c.Request().Context(), orderID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch items"})
	}

	// Convert items to ZPL items
	for _, item := range items {
		labelData.Items = append(labelData.Items, LabelItem{
			SKU:      item.SKU,
			Variant:  item.VariantName,
			Quantity: int(item.Quantity),
		})
	}

	// Generate ZPL
	zplCode := generateZPLLabels(labelData)

	return c.String(http.StatusOK, zplCode)
}

func (h *FulfillmentHandler) logStatusChange(ctx interface{}, fulfillmentOrderID int64, previousStatus, newStatus string, adminID, driverID *int64, source, notes string) {
	query := `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, changed_by_admin, changed_by_driver, change_source, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	if echoCtx, ok := ctx.(echo.Context); ok {
		h.DB.ExecContext(echoCtx.Request().Context(), query, fulfillmentOrderID, previousStatus, newStatus, adminID, driverID, source, notes)
	} else {
		h.DB.Exec(query, fulfillmentOrderID, previousStatus, newStatus, adminID, driverID, source, notes)
	}
}

// ============================================================================
// ZPL LABEL GENERATION (INLINE)
// ============================================================================

// LabelData contains all information needed to print a shipping/fulfillment label
type LabelData struct {
	OrderNumber    string
	TrackingNumber string
	CustomerName   string
	CustomerPhone  string
	Date           time.Time
	Items          []LabelItem
	CurrentLabel   int
	TotalLabels    int
	IsLastLabel    bool
}

// LabelItem represents a single line item on the label
type LabelItem struct {
	SKU      string
	Variant  string
	Quantity int
}

const (
	// Printer settings for Zebra GC420t (203 dpi)
	LabelWidthDots   = 800 // 100mm
	LabelHeightDots  = 560 // 70mm
	MaxItemsPerLabel = 10
)

// generateZPLLabels creates ZPL code for one or more labels depending on item count
func generateZPLLabels(data LabelData) string {
	var zplBuilder strings.Builder

	totalItems := len(data.Items)
	if totalItems == 0 {
		return generateSingleZPLLabel(data)
	}

	numLabels := int(math.Ceil(float64(totalItems) / float64(MaxItemsPerLabel)))
	data.TotalLabels = numLabels

	for i := 0; i < numLabels; i++ {
		start := i * MaxItemsPerLabel
		end := start + MaxItemsPerLabel
		if end > totalItems {
			end = totalItems
		}

		chunkData := data
		chunkData.Items = data.Items[start:end]
		chunkData.CurrentLabel = i + 1
		chunkData.IsLastLabel = (i == numLabels-1)

		zplBuilder.WriteString(generateSingleZPLLabel(chunkData))
	}

	return zplBuilder.String()
}

func generateSingleZPLLabel(data LabelData) string {
	zpl := fmt.Sprintf(`
^XA
^PW%d
^LL%d
^CI28
`, LabelWidthDots, LabelHeightDots)

	// Order Number
	zpl += fmt.Sprintf(`^FO20,20^A0N,40,40^FDORDER: %s^FS`, cleanZPL(data.OrderNumber))

	// Date
	zpl += fmt.Sprintf(`^FO550,25^A0N,25,25^FD%s^FS`, data.Date.Format("2006-01-02"))

	// Customer Name
	custName := data.CustomerName
	if len(custName) > 30 {
		custName = custName[:30]
	}
	zpl += fmt.Sprintf(`^FO20,65^A0N,25,25^FDCustomer: %s^FS`, cleanZPL(custName))

	// Separator Line
	zpl += `^FO10,95^GB780,1,3^FS`

	// Tracking Number Text
	zpl += fmt.Sprintf(`^FO20,110^A0N,20,20^FDTracking #: %s^FS`, data.TrackingNumber)

	// Barcode (Code 128)
	zpl += fmt.Sprintf(`^FO100,135^BCN,70,Y,N,N^FD%s^FS`, data.TrackingNumber)

	// Separator Line
	zpl += `^FO10,230^GB780,1,3^FS`

	// Items Header
	zpl += `^FO20,240^A0N,20,20^FDQTY   SKU                     VARIANT^FS`

	// Items List
	y := 265
	for _, item := range data.Items {
		zpl += fmt.Sprintf(`^FO20,%d^A0N,20,20^FD%d^FS`, y, item.Quantity)

		sku := item.SKU
		if len(sku) > 18 {
			sku = sku[:18]
		}
		zpl += fmt.Sprintf(`^FO80,%d^A0N,20,20^FD%s^FS`, y, cleanZPL(sku))

		variant := item.Variant
		if len(variant) > 25 {
			variant = variant[:25] + ".."
		}
		zpl += fmt.Sprintf(`^FO350,%d^A0N,20,20^FD%s^FS`, y, cleanZPL(variant))

		y += 25
	}

	// Label X of Y
	zpl += fmt.Sprintf(`^FO650,530^A0N,20,20^FDLabel %d of %d^FS`, data.CurrentLabel, data.TotalLabels)

	// End Format
	zpl += `^XZ`

	return zpl
}

func cleanZPL(s string) string {
	s = strings.ReplaceAll(s, "^", "")
	s = strings.ReplaceAll(s, "~", "")
	s = strings.ReplaceAll(s, "\n", " ")
	return s
}
