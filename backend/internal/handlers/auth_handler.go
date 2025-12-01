package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/luxe-fashion/backend/internal/auth"
	"github.com/luxe-fashion/backend/internal/repository"

	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	Repo *repository.Queries
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         UserInfo  `json:"user"`
}

type UserInfo struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// Login authenticates a user and returns JWT tokens
func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	ctx := c.Request().Context()

	// Get user by email
	user, err := h.Repo.GetAdminUserByEmail(ctx, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "invalid email or password",
			})
		}
		c.Logger().Errorf("Failed to get user: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal server error",
		})
	}

	// Check if user is active
	if !user.IsActive {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "account is disabled",
		})
	}

	// Verify password
	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "invalid email or password",
		})
	}

	// Generate access token
	accessToken, err := auth.GenerateAccessToken(
		user.ID,
		user.Email,
		user.Role,
		user.FirstName.String,
		user.LastName.String,
	)
	if err != nil {
		c.Logger().Errorf("Failed to generate access token: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to generate token",
		})
	}

	// Generate refresh token
	refreshToken, err := auth.GenerateRefreshToken(user.ID)
	if err != nil {
		c.Logger().Errorf("Failed to generate refresh token: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to generate token",
		})
	}

	// Store refresh token in database
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	_, err = h.Repo.CreateRefreshToken(ctx, repository.CreateRefreshTokenParams{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		c.Logger().Errorf("Failed to store refresh token: %v", err)
		// Continue anyway, token is still valid
	}

	// Update last login
	_ = h.Repo.UpdateAdminUserLastLogin(ctx, user.ID)

	return c.JSON(http.StatusOK, LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(15 * time.Minute),
		User: UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName.String,
			LastName:  user.LastName.String,
			Role:      user.Role,
		},
	})
}

// Refresh generates new access token from refresh token
func (h *AuthHandler) Refresh(c echo.Context) error {
	var req RefreshRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	ctx := c.Request().Context()

	// Validate refresh token
	userID, err := auth.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "invalid refresh token",
		})
	}

	// Check if refresh token exists in database
	_, err = h.Repo.GetRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "refresh token not found or expired",
		})
	}

	// Get user
	user, err := h.Repo.GetAdminUserByID(ctx, userID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "user not found",
		})
	}

	if !user.IsActive {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "account is disabled",
		})
	}

	// Generate new access token
	accessToken, err := auth.GenerateAccessToken(
		user.ID,
		user.Email,
		user.Role,
		user.FirstName.String,
		user.LastName.String,
	)
	if err != nil {
		c.Logger().Errorf("Failed to generate access token: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to generate token",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"access_token": accessToken,
		"expires_at":   time.Now().Add(15 * time.Minute),
		"user": UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName.String,
			LastName:  user.LastName.String,
			Role:      user.Role,
		},
	})
}

// Logout invalidates refresh token
func (h *AuthHandler) Logout(c echo.Context) error {
	var req RefreshRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	ctx := c.Request().Context()

	// Delete refresh token
	err := h.Repo.DeleteRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		c.Logger().Errorf("Failed to delete refresh token: %v", err)
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "logged out successfully",
	})
}

// Me returns current user info
func (h *AuthHandler) Me(c echo.Context) error {
	userID, ok := auth.GetUserID(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
	}

	ctx := c.Request().Context()
	user, err := h.Repo.GetAdminUserByID(ctx, userID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "user not found",
		})
	}

	return c.JSON(http.StatusOK, UserInfo{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName.String,
		LastName:  user.LastName.String,
		Role:      user.Role,
	})
}
