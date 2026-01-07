package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type CouponHandler struct {
	Repo *repository.Queries
}

func NewCouponHandler(repo *repository.Queries) *CouponHandler {
	return &CouponHandler{Repo: repo}
}

type JSONCoupon struct {
	ID                   int64      `json:"id"`
	Code                 string     `json:"code"`
	Type                 string     `json:"type"`
	Value                string     `json:"value"`
	MinOrderValue        *string    `json:"min_order_value"`
	MaxDiscount          *string    `json:"max_discount"`
	UsageLimit           *int32     `json:"usage_limit"`
	UsageCount           int32      `json:"usage_count"`
	SingleUsePerCustomer bool       `json:"single_use_per_customer"`
	ApplicableProducts   []string   `json:"applicable_products"`
	ApplicableCategories []string   `json:"applicable_categories"`
	StartsAt             *time.Time `json:"starts_at"`
	ExpiresAt            *time.Time `json:"expires_at"`
	IsActive             bool       `json:"is_active"`
	CreatedBy            *int64     `json:"created_by"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func mapToJSONCoupon(c repository.Coupon) JSONCoupon {
	var minOrderValue *string
	if c.MinOrderValue.Valid {
		minOrderValue = &c.MinOrderValue.String
	}

	var maxDiscount *string
	if c.MaxDiscount.Valid {
		maxDiscount = &c.MaxDiscount.String
	}

	var usageLimit *int32
	if c.UsageLimit.Valid {
		usageLimit = &c.UsageLimit.Int32
	}

	var startsAt *time.Time
	if c.StartsAt.Valid {
		startsAt = &c.StartsAt.Time
	}

	var expiresAt *time.Time
	if c.ExpiresAt.Valid {
		expiresAt = &c.ExpiresAt.Time
	}

	var createdBy *int64
	if c.CreatedBy.Valid {
		val := c.CreatedBy.Int64
		createdBy = &val
	}

	// Helper to convert []int64 to []string
	applicableProducts := make([]string, len(c.ApplicableProducts))
	for i, v := range c.ApplicableProducts {
		applicableProducts[i] = strconv.FormatInt(v, 10)
	}

	applicableCategories := make([]string, len(c.ApplicableCategories))
	for i, v := range c.ApplicableCategories {
		applicableCategories[i] = strconv.FormatInt(v, 10)
	}

	return JSONCoupon{
		ID:                   c.ID,
		Code:                 c.Code,
		Type:                 c.Type,
		Value:                c.Value,
		MinOrderValue:        minOrderValue,
		MaxDiscount:          maxDiscount,
		UsageLimit:           usageLimit,
		UsageCount:           c.UsageCount.Int32, // Assuming Valid if 0 is acceptable, or handle null? Usually count is not null.
		SingleUsePerCustomer: c.SingleUsePerCustomer.Bool,
		ApplicableProducts:   applicableProducts,
		ApplicableCategories: applicableCategories,
		StartsAt:             startsAt,
		ExpiresAt:            expiresAt,
		IsActive:             c.IsActive.Valid && c.IsActive.Bool, // Handle NullBool for IsActive
		CreatedBy:            createdBy,
		CreatedAt:            c.CreatedAt.Time,
		UpdatedAt:            c.UpdatedAt.Time,
	}
}

func (h *CouponHandler) ListCoupons(c echo.Context) error {
	coupons, err := h.Repo.ListCoupons(c.Request().Context())
	if err != nil {
		c.Logger().Errorf("Failed to fetch coupons: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch coupons"})
	}

	jsonCoupons := make([]JSONCoupon, len(coupons))
	for i, coupon := range coupons {
		jsonCoupons[i] = mapToJSONCoupon(coupon)
	}

	return c.JSON(http.StatusOK, jsonCoupons)
}

func (h *CouponHandler) GetCoupon(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid coupon ID"})
	}

	coupon, err := h.Repo.GetCoupon(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Coupon not found"})
		}
		c.Logger().Errorf("Failed to fetch coupon %d: %v", id, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch coupon"})
	}

	return c.JSON(http.StatusOK, mapToJSONCoupon(coupon))
}

type CreateCouponRequest struct {
	Code          string     `json:"code"`
	Type          string     `json:"type"`
	Value         string     `json:"value"`
	MinOrderValue *string    `json:"min_order_value"`
	MaxDiscount   *string    `json:"max_discount"`
	UsageLimit    *int32     `json:"usage_limit"`
	StartsAt      *time.Time `json:"starts_at"`
	ExpiresAt     *time.Time `json:"expires_at"`
	IsActive      *bool      `json:"is_active"`
}

func (h *CouponHandler) CreateCoupon(c echo.Context) error {
	var req CreateCouponRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	params := repository.CreateCouponParams{
		Code:  req.Code,
		Type:  req.Type,
		Value: req.Value,
		MinOrderValue: sql.NullString{
			String: func() string {
				if req.MinOrderValue != nil {
					return *req.MinOrderValue
				}
				return ""
			}(),
			Valid: req.MinOrderValue != nil,
		},
		MaxDiscount: sql.NullString{
			String: func() string {
				if req.MaxDiscount != nil {
					return *req.MaxDiscount
				}
				return ""
			}(),
			Valid: req.MaxDiscount != nil,
		},
		UsageLimit: sql.NullInt32{
			Int32: func() int32 {
				if req.UsageLimit != nil {
					return *req.UsageLimit
				}
				return 0
			}(),
			Valid: req.UsageLimit != nil,
		},
		StartsAt: sql.NullTime{
			Time: func() time.Time {
				if req.StartsAt != nil {
					return *req.StartsAt
				}
				return time.Time{}
			}(),
			Valid: req.StartsAt != nil,
		},
		ExpiresAt: sql.NullTime{
			Time: func() time.Time {
				if req.ExpiresAt != nil {
					return *req.ExpiresAt
				}
				return time.Time{}
			}(),
			Valid: req.ExpiresAt != nil,
		},
		IsActive: sql.NullBool{
			Bool: func() bool {
				if req.IsActive != nil {
					return *req.IsActive
				}
				return true // Default to active
			}(),
			Valid: true,
		},
	}

	coupon, err := h.Repo.CreateCoupon(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to create coupon: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create coupon"})
	}

	return c.JSON(http.StatusCreated, mapToJSONCoupon(coupon))
}

func (h *CouponHandler) UpdateCoupon(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid coupon ID"})
	}

	var req CreateCouponRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	params := repository.UpdateCouponParams{
		ID:    id,
		Code:  req.Code,
		Type:  req.Type,
		Value: req.Value,
		MinOrderValue: sql.NullString{
			String: func() string {
				if req.MinOrderValue != nil {
					return *req.MinOrderValue
				}
				return ""
			}(),
			Valid: req.MinOrderValue != nil,
		},
		MaxDiscount: sql.NullString{
			String: func() string {
				if req.MaxDiscount != nil {
					return *req.MaxDiscount
				}
				return ""
			}(),
			Valid: req.MaxDiscount != nil,
		},
		UsageLimit: sql.NullInt32{
			Int32: func() int32 {
				if req.UsageLimit != nil {
					return *req.UsageLimit
				}
				return 0
			}(),
			Valid: req.UsageLimit != nil,
		},
		StartsAt: sql.NullTime{
			Time: func() time.Time {
				if req.StartsAt != nil {
					return *req.StartsAt
				}
				return time.Time{}
			}(),
			Valid: req.StartsAt != nil,
		},
		ExpiresAt: sql.NullTime{
			Time: func() time.Time {
				if req.ExpiresAt != nil {
					return *req.ExpiresAt
				}
				return time.Time{}
			}(),
			Valid: req.ExpiresAt != nil,
		},
		IsActive: sql.NullBool{
			Bool: func() bool {
				if req.IsActive != nil {
					return *req.IsActive
				}
				return true
			}(),
			Valid: true,
		},
	}

	coupon, err := h.Repo.UpdateCoupon(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to update coupon: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update coupon"})
	}

	return c.JSON(http.StatusOK, mapToJSONCoupon(coupon))
}

func (h *CouponHandler) DeleteCoupon(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid coupon ID"})
	}

	err = h.Repo.DeleteCoupon(c.Request().Context(), id)
	if err != nil {
		c.Logger().Errorf("Failed to delete coupon: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete coupon"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Coupon deleted successfully"})
}
