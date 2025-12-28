package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

// DriverHandler handles all driver-related API endpoints
type DriverHandler struct {
	DB *sql.DB
}

// NewDriverHandler creates a new DriverHandler
func NewDriverHandler(db *sql.DB) *DriverHandler {
	return &DriverHandler{DB: db}
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

type CreateDriverRequest struct {
	EmployeeID          string `json:"employee_id" validate:"required"`
	FirstName           string `json:"first_name" validate:"required"`
	LastName            string `json:"last_name" validate:"required"`
	Phone               string `json:"phone" validate:"required"`
	Email               string `json:"email"`
	VehicleType         string `json:"vehicle_type"`
	VehiclePlate        string `json:"vehicle_plate"`
	MaxDailyAssignments int    `json:"max_daily_assignments"`
}

type UpdateDriverRequest struct {
	FirstName           string `json:"first_name"`
	LastName            string `json:"last_name"`
	Phone               string `json:"phone"`
	Email               string `json:"email"`
	VehicleType         string `json:"vehicle_type"`
	VehiclePlate        string `json:"vehicle_plate"`
	IsActive            *bool  `json:"is_active"`
	MaxDailyAssignments *int   `json:"max_daily_assignments"`
}

type DriverResponse struct {
	ID                  int64     `json:"id"`
	EmployeeID          string    `json:"employee_id"`
	FirstName           string    `json:"first_name"`
	LastName            string    `json:"last_name"`
	Phone               string    `json:"phone"`
	Email               string    `json:"email"`
	VehicleType         string    `json:"vehicle_type"`
	VehiclePlate        string    `json:"vehicle_plate"`
	IsActive            bool      `json:"is_active"`
	CurrentWorkload     int       `json:"current_workload"`
	MaxDailyAssignments int       `json:"max_daily_assignments"`
	ActiveAssignments   int       `json:"active_assignments,omitempty"`
	CompletedToday      int       `json:"completed_today,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type DriverAssignmentResponse struct {
	ID                 int64      `json:"id"`
	DriverID           int64      `json:"driver_id"`
	FulfillmentOrderID int64      `json:"fulfillment_order_id"`
	TrackingNumber     string     `json:"tracking_number"`
	OrderNumber        int32      `json:"order_number"`
	AssignmentType     string     `json:"assignment_type"`
	Status             string     `json:"status"`
	DeliveryAddress    string     `json:"delivery_address"`
	DeliveryPhone      string     `json:"delivery_phone"`
	CustomerName       string     `json:"customer_name"`
	TotalAmount        string     `json:"total_amount"`
	AssignedAt         time.Time  `json:"assigned_at"`
	PickedUpAt         *time.Time `json:"picked_up_at,omitempty"`
	CompletedAt        *time.Time `json:"completed_at,omitempty"`
}

type AutoAssignRequest struct {
	Notes string `json:"notes"`
}

// ============================================================================
// DRIVER CRUD HANDLERS
// ============================================================================

// CreateDriver creates a new driver
func (h *DriverHandler) CreateDriver(c echo.Context) error {
	var req CreateDriverRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.EmployeeID == "" || req.FirstName == "" || req.LastName == "" || req.Phone == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Missing required fields"})
	}

	if req.MaxDailyAssignments == 0 {
		req.MaxDailyAssignments = 20
	}

	query := `
		INSERT INTO drivers (
			employee_id, first_name, last_name, phone, email,
			vehicle_type, vehicle_plate, is_active, max_daily_assignments
		) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
		RETURNING id, employee_id, first_name, last_name, phone, email, 
		          vehicle_type, vehicle_plate, is_active, current_workload, 
		          max_daily_assignments, created_at, updated_at
	`

	var driver DriverResponse
	err := h.DB.QueryRowContext(c.Request().Context(), query,
		req.EmployeeID, req.FirstName, req.LastName, req.Phone, req.Email,
		req.VehicleType, req.VehiclePlate, req.MaxDailyAssignments,
	).Scan(
		&driver.ID, &driver.EmployeeID, &driver.FirstName, &driver.LastName,
		&driver.Phone, &driver.Email, &driver.VehicleType, &driver.VehiclePlate,
		&driver.IsActive, &driver.CurrentWorkload, &driver.MaxDailyAssignments,
		&driver.CreatedAt, &driver.UpdatedAt,
	)

	if err != nil {
		if isUniqueViolation(err) {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Employee ID already exists"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create driver: " + err.Error()})
	}

	return c.JSON(http.StatusCreated, driver)
}

// ListDrivers returns a paginated list of drivers
func (h *DriverHandler) ListDrivers(c echo.Context) error {
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

	activeOnly := c.QueryParam("active") == "true"

	var query string
	var args []interface{}

	if activeOnly {
		query = `
			SELECT 
				d.id, d.employee_id, d.first_name, d.last_name, d.phone,
				COALESCE(d.email, '') as email,
				COALESCE(d.vehicle_type, '') as vehicle_type,
				COALESCE(d.vehicle_plate, '') as vehicle_plate,
				d.is_active, d.current_workload, d.max_daily_assignments,
				d.created_at, d.updated_at,
				(SELECT COUNT(*) FROM driver_assignments da 
				 WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
				) as active_assignments,
				(SELECT COUNT(*) FROM driver_assignments da 
				 WHERE da.driver_id = d.id AND da.status = 'completed' 
				 AND DATE(da.completed_at) = CURRENT_DATE
				) as completed_today
			FROM drivers d
			WHERE d.is_active = true
			ORDER BY d.current_workload ASC, d.created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	} else {
		query = `
			SELECT 
				d.id, d.employee_id, d.first_name, d.last_name, d.phone,
				COALESCE(d.email, '') as email,
				COALESCE(d.vehicle_type, '') as vehicle_type,
				COALESCE(d.vehicle_plate, '') as vehicle_plate,
				d.is_active, d.current_workload, d.max_daily_assignments,
				d.created_at, d.updated_at,
				(SELECT COUNT(*) FROM driver_assignments da 
				 WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
				) as active_assignments,
				(SELECT COUNT(*) FROM driver_assignments da 
				 WHERE da.driver_id = d.id AND da.status = 'completed' 
				 AND DATE(da.completed_at) = CURRENT_DATE
				) as completed_today
			FROM drivers d
			ORDER BY d.created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	rows, err := h.DB.QueryContext(c.Request().Context(), query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list drivers"})
	}
	defer rows.Close()

	var drivers []DriverResponse
	for rows.Next() {
		var driver DriverResponse
		err := rows.Scan(
			&driver.ID, &driver.EmployeeID, &driver.FirstName, &driver.LastName,
			&driver.Phone, &driver.Email, &driver.VehicleType, &driver.VehiclePlate,
			&driver.IsActive, &driver.CurrentWorkload, &driver.MaxDailyAssignments,
			&driver.CreatedAt, &driver.UpdatedAt,
			&driver.ActiveAssignments, &driver.CompletedToday,
		)
		if err != nil {
			continue
		}
		drivers = append(drivers, driver)
	}

	return c.JSON(http.StatusOK, drivers)
}

// GetDriver returns a single driver by ID
func (h *DriverHandler) GetDriver(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	query := `
		SELECT 
			d.id, d.employee_id, d.first_name, d.last_name, d.phone,
			COALESCE(d.email, '') as email,
			COALESCE(d.vehicle_type, '') as vehicle_type,
			COALESCE(d.vehicle_plate, '') as vehicle_plate,
			d.is_active, d.current_workload, d.max_daily_assignments,
			d.created_at, d.updated_at,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
			) as active_assignments,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.status = 'completed' 
			 AND DATE(da.completed_at) = CURRENT_DATE
			) as completed_today,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.assignment_type = 'delivery'
			 AND da.status = 'completed'
			) as total_deliveries,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.assignment_type = 'return_pickup'
			 AND da.status = 'completed'
			) as total_pickups
		FROM drivers d
		WHERE d.id = $1
	`

	var driver DriverResponse
	var totalDeliveries, totalPickups int

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&driver.ID, &driver.EmployeeID, &driver.FirstName, &driver.LastName,
		&driver.Phone, &driver.Email, &driver.VehicleType, &driver.VehiclePlate,
		&driver.IsActive, &driver.CurrentWorkload, &driver.MaxDailyAssignments,
		&driver.CreatedAt, &driver.UpdatedAt,
		&driver.ActiveAssignments, &driver.CompletedToday,
		&totalDeliveries, &totalPickups,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Driver not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get driver"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"driver":           driver,
		"total_deliveries": totalDeliveries,
		"total_pickups":    totalPickups,
	})
}

// UpdateDriver updates driver information
func (h *DriverHandler) UpdateDriver(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req UpdateDriverRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Get current driver
	var current DriverResponse
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT id, first_name, last_name, phone, COALESCE(email, ''), 
		       COALESCE(vehicle_type, ''), COALESCE(vehicle_plate, ''),
		       is_active, max_daily_assignments
		FROM drivers WHERE id = $1
	`, id).Scan(
		&current.ID, &current.FirstName, &current.LastName, &current.Phone,
		&current.Email, &current.VehicleType, &current.VehiclePlate,
		&current.IsActive, &current.MaxDailyAssignments,
	)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Driver not found"})
	}

	// Apply updates
	if req.FirstName != "" {
		current.FirstName = req.FirstName
	}
	if req.LastName != "" {
		current.LastName = req.LastName
	}
	if req.Phone != "" {
		current.Phone = req.Phone
	}
	if req.Email != "" {
		current.Email = req.Email
	}
	if req.VehicleType != "" {
		current.VehicleType = req.VehicleType
	}
	if req.VehiclePlate != "" {
		current.VehiclePlate = req.VehiclePlate
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}
	if req.MaxDailyAssignments != nil {
		current.MaxDailyAssignments = *req.MaxDailyAssignments
	}

	query := `
		UPDATE drivers SET
			first_name = $2, last_name = $3, phone = $4, email = $5,
			vehicle_type = $6, vehicle_plate = $7, is_active = $8,
			max_daily_assignments = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, employee_id, first_name, last_name, phone,
		          COALESCE(email, ''), COALESCE(vehicle_type, ''), COALESCE(vehicle_plate, ''),
		          is_active, current_workload, max_daily_assignments, created_at, updated_at
	`

	var driver DriverResponse
	err = h.DB.QueryRowContext(c.Request().Context(), query,
		id, current.FirstName, current.LastName, current.Phone, current.Email,
		current.VehicleType, current.VehiclePlate, current.IsActive, current.MaxDailyAssignments,
	).Scan(
		&driver.ID, &driver.EmployeeID, &driver.FirstName, &driver.LastName,
		&driver.Phone, &driver.Email, &driver.VehicleType, &driver.VehiclePlate,
		&driver.IsActive, &driver.CurrentWorkload, &driver.MaxDailyAssignments,
		&driver.CreatedAt, &driver.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update driver"})
	}

	return c.JSON(http.StatusOK, driver)
}

// DeleteDriver deactivates a driver
func (h *DriverHandler) DeleteDriver(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	// Check for active assignments
	var activeCount int
	h.DB.QueryRowContext(c.Request().Context(), `
		SELECT COUNT(*) FROM driver_assignments 
		WHERE driver_id = $1 AND status IN ('assigned', 'picked_up', 'in_progress')
	`, id).Scan(&activeCount)

	if activeCount > 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Driver has %d active assignments. Please reassign before deactivating.", activeCount),
		})
	}

	_, err = h.DB.ExecContext(c.Request().Context(),
		"UPDATE drivers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to deactivate driver"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Driver deactivated successfully"})
}

// ============================================================================
// ASSIGNMENT HANDLERS
// ============================================================================

// GetDriverAssignments returns assignments for a driver
func (h *DriverHandler) GetDriverAssignments(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

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

	status := c.QueryParam("status") // active, completed, all

	var query string
	var args []interface{}

	baseQuery := `
		SELECT 
			da.id, da.driver_id, da.fulfillment_order_id,
			fo.tracking_number, o.order_number, da.assignment_type, da.status,
			COALESCE(fo.delivery_address, '') as delivery_address,
			COALESCE(fo.delivery_phone, '') as delivery_phone,
			CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
			o.total_amount,
			da.assigned_at, da.picked_up_at, da.completed_at
		FROM driver_assignments da
		JOIN fulfillment_orders fo ON da.fulfillment_order_id = fo.id
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		WHERE da.driver_id = $1
	`

	if status == "active" {
		query = baseQuery + `
			AND da.status IN ('assigned', 'picked_up', 'in_progress')
			ORDER BY da.assigned_at ASC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{id, limit, offset}
	} else if status == "completed" {
		query = baseQuery + `
			AND da.status = 'completed'
			ORDER BY da.completed_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{id, limit, offset}
	} else {
		query = baseQuery + `
			ORDER BY da.assigned_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{id, limit, offset}
	}

	rows, err := h.DB.QueryContext(c.Request().Context(), query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get assignments"})
	}
	defer rows.Close()

	var assignments []DriverAssignmentResponse
	for rows.Next() {
		var a DriverAssignmentResponse
		var totalAmount float64

		err := rows.Scan(
			&a.ID, &a.DriverID, &a.FulfillmentOrderID,
			&a.TrackingNumber, &a.OrderNumber, &a.AssignmentType, &a.Status,
			&a.DeliveryAddress, &a.DeliveryPhone, &a.CustomerName, &totalAmount,
			&a.AssignedAt, &a.PickedUpAt, &a.CompletedAt,
		)
		if err != nil {
			continue
		}
		a.TotalAmount = fmt.Sprintf("%.2f", totalAmount)
		assignments = append(assignments, a)
	}

	return c.JSON(http.StatusOK, assignments)
}

// AutoAssignDriver assigns the driver with lowest workload to an order
func (h *DriverHandler) AutoAssignDriver(c echo.Context) error {
	orderIDStr := c.Param("orderId")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	var req AutoAssignRequest
	c.Bind(&req) // Optional notes

	// Check if order is ready for assignment
	var currentStatus string
	var trackingNumber string
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT fulfillment_status, tracking_number FROM fulfillment_orders WHERE id = $1
	`, orderID).Scan(&currentStatus, &trackingNumber)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}
	if currentStatus != "packed" && currentStatus != "awaiting_pickup" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Order is not ready for driver assignment. Current status: %s", currentStatus),
		})
	}

	// Get driver with lowest workload
	var driver DriverResponse
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT id, employee_id, first_name, last_name, phone,
		       COALESCE(vehicle_type, ''), COALESCE(vehicle_plate, ''),
		       current_workload
		FROM drivers 
		WHERE is_active = true AND current_workload < max_daily_assignments
		ORDER BY current_workload ASC
		LIMIT 1
	`).Scan(
		&driver.ID, &driver.EmployeeID, &driver.FirstName, &driver.LastName,
		&driver.Phone, &driver.VehicleType, &driver.VehiclePlate, &driver.CurrentWorkload,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "No available drivers. All drivers are at maximum capacity.",
		})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to find available driver"})
	}

	// Begin transaction
	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// Create assignment
	var assignmentID int64
	var assignedAt time.Time
	err = tx.QueryRowContext(c.Request().Context(), `
		INSERT INTO driver_assignments (driver_id, fulfillment_order_id, assignment_type, notes)
		VALUES ($1, $2, 'delivery', $3)
		RETURNING id, assigned_at
	`, driver.ID, orderID, req.Notes).Scan(&assignmentID, &assignedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create assignment"})
	}

	// Update fulfillment order
	_, err = tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders 
		SET driver_id = $2, fulfillment_status = 'awaiting_pickup', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, orderID, driver.ID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update order"})
	}

	// Increment driver workload
	_, err = tx.ExecContext(c.Request().Context(), `
		UPDATE drivers 
		SET current_workload = current_workload + 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, driver.ID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update driver workload"})
	}

	// Log status change
	_, err = tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, $2, 'awaiting_pickup', 'system', $3)
	`, orderID, currentStatus, fmt.Sprintf("Auto-assigned to driver: %s %s", driver.FirstName, driver.LastName))

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to log status change"})
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Driver assigned successfully",
		"assignment": map[string]interface{}{
			"id": assignmentID,
			"driver": map[string]interface{}{
				"id":               driver.ID,
				"name":             driver.FirstName + " " + driver.LastName,
				"phone":            driver.Phone,
				"vehicle_type":     driver.VehicleType,
				"current_workload": driver.CurrentWorkload + 1,
			},
			"fulfillment_order_id": orderID,
			"tracking_number":      trackingNumber,
			"assignment_type":      "delivery",
			"assigned_at":          assignedAt,
		},
		"assignment_reason": "Lowest workload driver available",
	})
}

// ManualAssignDriver assigns a specific driver to an order
func (h *DriverHandler) ManualAssignDriver(c echo.Context) error {
	orderIDStr := c.Param("orderId")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	var req struct {
		DriverID int64  `json:"driver_id" validate:"required"`
		Notes    string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Verify driver exists and is active
	var driverName string
	var currentWorkload, maxAssignments int
	err = h.DB.QueryRowContext(c.Request().Context(), `
		SELECT CONCAT(first_name, ' ', last_name), current_workload, max_daily_assignments
		FROM drivers WHERE id = $1 AND is_active = true
	`, req.DriverID).Scan(&driverName, &currentWorkload, &maxAssignments)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Driver not found or inactive"})
	}

	if currentWorkload >= maxAssignments {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Driver is at maximum capacity (%d/%d)", currentWorkload, maxAssignments),
		})
	}

	// Check order status
	var currentStatus string
	err = h.DB.QueryRowContext(c.Request().Context(),
		"SELECT fulfillment_status FROM fulfillment_orders WHERE id = $1", orderID,
	).Scan(&currentStatus)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Fulfillment order not found"})
	}

	// Begin transaction
	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// Create assignment
	var assignmentID int64
	err = tx.QueryRowContext(c.Request().Context(), `
		INSERT INTO driver_assignments (driver_id, fulfillment_order_id, assignment_type, notes)
		VALUES ($1, $2, 'delivery', $3)
		RETURNING id
	`, req.DriverID, orderID, req.Notes).Scan(&assignmentID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create assignment"})
	}

	// Update order and driver
	tx.ExecContext(c.Request().Context(), `
		UPDATE fulfillment_orders 
		SET driver_id = $2, fulfillment_status = 'awaiting_pickup', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, orderID, req.DriverID)

	tx.ExecContext(c.Request().Context(), `
		UPDATE drivers SET current_workload = current_workload + 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, req.DriverID)

	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, change_source, notes)
		VALUES ($1, $2, 'awaiting_pickup', 'admin', $3)
	`, orderID, currentStatus, fmt.Sprintf("Manually assigned to driver: %s", driverName))

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":       true,
		"message":       "Driver assigned successfully",
		"assignment_id": assignmentID,
		"driver_name":   driverName,
	})
}

// GetDriverWorkload returns workload stats for a driver
func (h *DriverHandler) GetDriverWorkload(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	query := `
		SELECT 
			d.id, d.first_name, d.last_name,
			d.current_workload, d.max_daily_assignments,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
			) as pending_count,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.status = 'completed' 
			 AND DATE(da.completed_at) = CURRENT_DATE
			) as completed_today,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.assignment_type = 'delivery' AND da.status = 'completed'
			) as total_deliveries,
			(SELECT COUNT(*) FROM driver_assignments da 
			 WHERE da.driver_id = d.id AND da.assignment_type = 'return_pickup' AND da.status = 'completed'
			) as total_pickups
		FROM drivers d
		WHERE d.id = $1
	`

	var stats struct {
		ID                  int64  `json:"id"`
		FirstName           string `json:"first_name"`
		LastName            string `json:"last_name"`
		CurrentWorkload     int    `json:"current_workload"`
		MaxDailyAssignments int    `json:"max_daily_assignments"`
		PendingCount        int    `json:"pending_count"`
		CompletedToday      int    `json:"completed_today"`
		TotalDeliveries     int    `json:"total_deliveries"`
		TotalPickups        int    `json:"total_pickups"`
	}

	err = h.DB.QueryRowContext(c.Request().Context(), query, id).Scan(
		&stats.ID, &stats.FirstName, &stats.LastName,
		&stats.CurrentWorkload, &stats.MaxDailyAssignments,
		&stats.PendingCount, &stats.CompletedToday,
		&stats.TotalDeliveries, &stats.TotalPickups,
	)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Driver not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get workload"})
	}

	return c.JSON(http.StatusOK, stats)
}

// ============================================================================
// DRIVER APP HANDLERS
// ============================================================================

// GetMyAssignments returns assignments for the logged-in driver
func (h *DriverHandler) GetMyAssignments(c echo.Context) error {
	// In production, get driver ID from auth token
	driverIDStr := c.QueryParam("driver_id") // Temporary for testing
	if driverIDStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Driver ID required"})
	}
	driverID, err := strconv.ParseInt(driverIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid driver ID"})
	}

	query := `
		SELECT 
			da.id, da.driver_id, da.fulfillment_order_id,
			fo.tracking_number, o.order_number, da.assignment_type, da.status,
			COALESCE(fo.delivery_address, '') as delivery_address,
			COALESCE(fo.delivery_phone, '') as delivery_phone,
			COALESCE(fo.delivery_notes, '') as delivery_notes,
			CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
			COALESCE(c.phone, '') as customer_phone,
			o.total_amount,
			da.assigned_at
		FROM driver_assignments da
		JOIN fulfillment_orders fo ON da.fulfillment_order_id = fo.id
		JOIN orders o ON fo.order_id = o.id
		LEFT JOIN customers c ON o.customer_id = c.id
		WHERE da.driver_id = $1 AND da.status IN ('assigned', 'picked_up', 'in_progress')
		ORDER BY da.assigned_at ASC
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query, driverID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get assignments"})
	}
	defer rows.Close()

	var assignments []map[string]interface{}
	for rows.Next() {
		var id, driverID, fulfillmentOrderID int64
		var trackingNumber, assignmentType, status, deliveryAddress, deliveryPhone, deliveryNotes, customerName, customerPhone string
		var orderNumber int32
		var totalAmount float64
		var assignedAt time.Time

		err := rows.Scan(
			&id, &driverID, &fulfillmentOrderID,
			&trackingNumber, &orderNumber, &assignmentType, &status,
			&deliveryAddress, &deliveryPhone, &deliveryNotes,
			&customerName, &customerPhone, &totalAmount, &assignedAt,
		)
		if err != nil {
			continue
		}

		assignments = append(assignments, map[string]interface{}{
			"id":                   id,
			"fulfillment_order_id": fulfillmentOrderID,
			"tracking_number":      trackingNumber,
			"order_number":         orderNumber,
			"assignment_type":      assignmentType,
			"status":               status,
			"delivery_address":     deliveryAddress,
			"delivery_phone":       deliveryPhone,
			"delivery_notes":       deliveryNotes,
			"customer_name":        customerName,
			"customer_phone":       customerPhone,
			"total_amount":         fmt.Sprintf("%.2f", totalAmount),
			"assigned_at":          assignedAt,
		})
	}

	return c.JSON(http.StatusOK, assignments)
}

// UpdateAssignmentStatus updates the status of a driver assignment
func (h *DriverHandler) UpdateAssignmentStatus(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var req struct {
		Status string `json:"status" validate:"required"`
		Notes  string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	validStatuses := map[string]bool{
		"picked_up":   true,
		"in_progress": true,
		"completed":   true,
		"failed":      true,
	}
	if !validStatuses[req.Status] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid status"})
	}

	var updateQuery string
	if req.Status == "picked_up" {
		updateQuery = `
			UPDATE driver_assignments 
			SET status = $2, picked_up_at = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING id, status
		`
	} else if req.Status == "completed" || req.Status == "failed" {
		updateQuery = `
			UPDATE driver_assignments 
			SET status = $2, completed_at = CURRENT_TIMESTAMP, notes = COALESCE(notes || E'\n', '') || $3
			WHERE id = $1
			RETURNING id, status
		`
	} else {
		updateQuery = `
			UPDATE driver_assignments SET status = $2 WHERE id = $1 RETURNING id, status
		`
	}

	var result struct {
		ID     int64  `json:"id"`
		Status string `json:"status"`
	}

	if req.Status == "completed" || req.Status == "failed" {
		err = h.DB.QueryRowContext(c.Request().Context(), updateQuery, id, req.Status, req.Notes).Scan(&result.ID, &result.Status)
	} else {
		err = h.DB.QueryRowContext(c.Request().Context(), updateQuery, id, req.Status).Scan(&result.ID, &result.Status)
	}

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update status"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":    true,
		"message":    "Status updated",
		"assignment": result,
	})
}

// MarkDelivered marks an order as delivered
func (h *DriverHandler) MarkDelivered(c echo.Context) error {
	orderIDStr := c.Param("orderId")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid order ID"})
	}

	var req struct {
		SignatureURL string `json:"signature_url"`
		PhotoURL     string `json:"photo_url"`
		Notes        string `json:"notes"`
	}
	c.Bind(&req)

	// Get driver ID from token or query param (temp)
	driverIDStr := c.QueryParam("driver_id")
	var driverID int64
	if driverIDStr != "" {
		driverID, _ = strconv.ParseInt(driverIDStr, 10, 64)
	}

	tx, err := h.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// Update fulfillment order
	var trackingNumber string
	err = tx.QueryRowContext(c.Request().Context(), `
		UPDATE fulfillment_orders 
		SET fulfillment_status = 'delivered', delivered_at = CURRENT_TIMESTAMP,
		    signature_url = $2, delivery_photo_url = $3, 
		    notes = COALESCE(notes || E'\n', '') || $4,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING tracking_number
	`, orderID, req.SignatureURL, req.PhotoURL, req.Notes).Scan(&trackingNumber)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update order"})
	}

	// Update assignment
	tx.ExecContext(c.Request().Context(), `
		UPDATE driver_assignments 
		SET status = 'completed', completed_at = CURRENT_TIMESTAMP
		WHERE fulfillment_order_id = $1 AND status IN ('assigned', 'picked_up', 'in_progress')
	`, orderID)

	// Decrement driver workload
	if driverID > 0 {
		tx.ExecContext(c.Request().Context(), `
			UPDATE drivers 
			SET current_workload = GREATEST(current_workload - 1, 0), updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, driverID)
	}

	// Log status change
	tx.ExecContext(c.Request().Context(), `
		INSERT INTO order_status_history (fulfillment_order_id, previous_status, new_status, changed_by_driver, change_source, notes)
		VALUES ($1, 'in_transit', 'delivered', $2, 'driver_app', $3)
	`, orderID, driverID, "Delivery confirmed")

	if err = tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	// Get driver workload stats
	var completedToday, pending int
	if driverID > 0 {
		h.DB.QueryRowContext(c.Request().Context(), `
			SELECT 
				(SELECT COUNT(*) FROM driver_assignments WHERE driver_id = $1 AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE),
				(SELECT COUNT(*) FROM driver_assignments WHERE driver_id = $1 AND status IN ('assigned', 'picked_up', 'in_progress'))
		`, driverID).Scan(&completedToday, &pending)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Delivery confirmed",
		"order": map[string]interface{}{
			"id":                 orderID,
			"tracking_number":    trackingNumber,
			"fulfillment_status": "delivered",
			"delivered_at":       time.Now(),
		},
		"driver_workload": map[string]interface{}{
			"completed_today": completedToday,
			"pending":         pending,
		},
	})
}

// Helper function to check for unique constraint violation
func isUniqueViolation(err error) bool {
	return err != nil && (contains(err.Error(), "unique") || contains(err.Error(), "duplicate"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
