package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type PopupHandler struct {
	DB *sql.DB
}

type Popup struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	ImageURL     string     `json:"image_url"`
	ActionType   string     `json:"action_type"`
	ActionTarget string     `json:"action_target"`
	StartDate    *time.Time `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
	IsActive     bool       `json:"is_active"`
	Frequency    string     `json:"frequency"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func NewPopupHandler(db *sql.DB) *PopupHandler {
	return &PopupHandler{DB: db}
}

// GetActivePopup returns the single most relevant active popup for the app
func (h *PopupHandler) GetActivePopup(c echo.Context) error {
	query := `
		SELECT id, title, image_url, action_type, action_target, start_date, end_date, is_active, frequency 
		FROM popups 
		WHERE is_active = true 
		AND (start_date IS NULL OR start_date <= NOW()) 
		AND (end_date IS NULL OR end_date >= NOW()) 
		ORDER BY created_at DESC 
		LIMIT 1
	`
	var p Popup
	err := h.DB.QueryRowContext(c.Request().Context(), query).Scan(
		&p.ID, &p.Title, &p.ImageURL, &p.ActionType, &p.ActionTarget, &p.StartDate, &p.EndDate, &p.IsActive, &p.Frequency,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusOK, map[string]interface{}{"popup": nil})
		}
		c.Logger().Errorf("Failed to fetch active popup: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"popup": p})
}

// ListPopups (Admin)
func (h *PopupHandler) ListPopups(c echo.Context) error {
	rows, err := h.DB.QueryContext(c.Request().Context(), `
		SELECT id, title, image_url, action_type, action_target, start_date, end_date, is_active, frequency, created_at 
		FROM popups 
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch popups"})
	}
	defer rows.Close()

	popups := []Popup{}
	for rows.Next() {
		var p Popup
		if err := rows.Scan(
			&p.ID, &p.Title, &p.ImageURL, &p.ActionType, &p.ActionTarget, &p.StartDate, &p.EndDate, &p.IsActive, &p.Frequency, &p.CreatedAt,
		); err != nil {
			continue
		}
		popups = append(popups, p)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"popups": popups})
}

// CreatePopup (Admin)
func (h *PopupHandler) CreatePopup(c echo.Context) error {
	var input Popup
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid input"})
	}

	query := `
		INSERT INTO popups (title, image_url, action_type, action_target, start_date, end_date, frequency, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	err := h.DB.QueryRowContext(c.Request().Context(), query,
		input.Title, input.ImageURL, input.ActionType, input.ActionTarget, input.StartDate, input.EndDate, input.Frequency, input.IsActive,
	).Scan(&input.ID)

	if err != nil {
		c.Logger().Errorf("Failed to create popup: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create popup"})
	}

	return c.JSON(http.StatusCreated, input)
}

// UpdatePopup (Admin)
func (h *PopupHandler) UpdatePopup(c echo.Context) error {
	id := c.Param("id")
	var input Popup
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid input"})
	}

	query := `
		UPDATE popups 
		SET title=$1, image_url=$2, action_type=$3, action_target=$4, start_date=$5, end_date=$6, frequency=$7, is_active=$8, updated_at=NOW()
		WHERE id=$9
	`
	_, err := h.DB.ExecContext(c.Request().Context(), query,
		input.Title, input.ImageURL, input.ActionType, input.ActionTarget, input.StartDate, input.EndDate, input.Frequency, input.IsActive, id,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update popup"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Popup updated successfully"})
}

// ToggleStatus (Admin)
func (h *PopupHandler) ToggleStatus(c echo.Context) error {
	id := c.Param("id")
	var input struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid input"})
	}

	_, err := h.DB.ExecContext(c.Request().Context(), "UPDATE popups SET is_active=$1 WHERE id=$2", input.IsActive, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to toggle status"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Status updated"})
}

// DeletePopup (Admin)
func (h *PopupHandler) DeletePopup(c echo.Context) error {
	id := c.Param("id")
	_, err := h.DB.ExecContext(c.Request().Context(), "DELETE FROM popups WHERE id=$1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete popup"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Popup deleted"})
}
