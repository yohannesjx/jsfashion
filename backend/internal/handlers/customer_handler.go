package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type CustomerHandler struct {
	Repo *repository.Queries
}

func NewCustomerHandler(repo *repository.Queries) *CustomerHandler {
	return &CustomerHandler{Repo: repo}
}

type CustomerResponse struct {
	ID            string  `json:"id"`
	FirstName     *string `json:"first_name"`
	LastName      *string `json:"last_name"`
	Email         string  `json:"email"`
	Phone         *string `json:"phone"`
	CreatedAt     string  `json:"created_at"`
	TotalOrders   int64   `json:"total_orders"`
	TotalSpent    string  `json:"total_spent"`
	LastOrderDate *string `json:"last_order_date"`
}

func (h *CustomerHandler) ListCustomers(c echo.Context) error {
	customers, err := h.Repo.ListCustomers(c.Request().Context())
	if err != nil {
		c.Logger().Errorf("Failed to fetch customers: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch customers"})
	}

	response := make([]CustomerResponse, len(customers))
	for i, cust := range customers {
		response[i] = CustomerResponse{
			ID:          cust.ID.String(),
			FirstName:   stringOrNil(cust.FirstName),
			LastName:    stringOrNil(cust.LastName),
			Email:       cust.Email,
			Phone:       stringOrNil(cust.Phone),
			CreatedAt:   timeOrEmpty(cust.CreatedAt),
			TotalOrders: cust.TotalOrders,
			TotalSpent:  cust.TotalSpent,
			LastOrderDate: func() *string {
				if cust.LastOrderDate.Valid {
					t := cust.LastOrderDate.Time.Format(time.RFC3339)
					return &t
				}
				return nil
			}(),
		}
	}

	return c.JSON(http.StatusOK, response)
}

func (h *CustomerHandler) GetCustomer(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid customer ID"})
	}

	ctx := c.Request().Context()

	// Get customer details with stats
	customer, err := h.Repo.GetCustomerDetails(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Customer not found"})
		}
		c.Logger().Errorf("Failed to fetch customer %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch customer"})
	}

	// Get customer orders
	orders, err := h.Repo.ListCustomerOrders(ctx, uuid.NullUUID{UUID: id, Valid: true})
	if err != nil {
		c.Logger().Errorf("Failed to fetch orders for customer %s: %v", idStr, err)
		// Don't fail the whole request, just return empty orders
		orders = []repository.ListCustomerOrdersRow{}
	}

	custResponse := CustomerResponse{
		ID:          customer.ID.String(),
		FirstName:   stringOrNil(customer.FirstName),
		LastName:    stringOrNil(customer.LastName),
		Email:       customer.Email,
		Phone:       stringOrNil(customer.Phone),
		CreatedAt:   timeOrEmpty(customer.CreatedAt),
		TotalOrders: customer.TotalOrders,
		TotalSpent:  customer.TotalSpent,
		LastOrderDate: func() *string {
			if customer.LastOrderDate.Valid {
				t := customer.LastOrderDate.Time.Format(time.RFC3339)
				return &t
			}
			return nil
		}(),
	}

	response := map[string]interface{}{
		"customer": custResponse,
		"orders":   orders,
	}

	return c.JSON(http.StatusOK, response)
}

func stringOrNil(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

func timeOrEmpty(nt sql.NullTime) string {
	if nt.Valid {
		return nt.Time.Format(time.RFC3339)
	}
	return ""
}

func getStringFromNull(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}
