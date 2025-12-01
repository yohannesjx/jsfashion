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

func (h *CouponHandler) ListCoupons(c echo.Context) error {
	coupons, err := h.Repo.ListCoupons(c.Request().Context())
	if err != nil {
		c.Logger().Errorf("Failed to fetch coupons: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch coupons"})
	}
	return c.JSON(http.StatusOK, coupons)
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

	return c.JSON(http.StatusOK, coupon)
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

	return c.JSON(http.StatusCreated, coupon)
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

	return c.JSON(http.StatusOK, coupon)
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
