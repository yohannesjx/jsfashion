package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// AuthMiddleware validates JWT token and adds user info to context
func AuthMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, map[string]string{
					"error": "missing authorization header",
				})
			}

			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, map[string]string{
					"error": "invalid authorization header format",
				})
			}

			tokenString := parts[1]
			claims, err := ValidateAccessToken(tokenString)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, map[string]string{
					"error": "invalid or expired token",
				})
			}

			// Add user info to context
			c.Set("user_id", claims.UserID)
			c.Set("user_email", claims.Email)
			c.Set("user_role", claims.Role)
			c.Set("user_first_name", claims.FirstName)
			c.Set("user_last_name", claims.LastName)

			return next(c)
		}
	}
}

// RequireRole middleware checks if user has required role
func RequireRole(allowedRoles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userRole, ok := c.Get("user_role").(string)
			if !ok {
				return echo.NewHTTPError(http.StatusUnauthorized, map[string]string{
					"error": "user role not found in context",
				})
			}

			// Super admin has access to everything
			if userRole == "super_admin" {
				return next(c)
			}

			// Check if user role is in allowed roles
			for _, role := range allowedRoles {
				if userRole == role {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusForbidden, map[string]string{
				"error": "insufficient permissions",
			})
		}
	}
}

// OptionalAuth middleware that doesn't fail if no token is provided
func OptionalAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return next(c)
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString := parts[1]
				if claims, err := ValidateAccessToken(tokenString); err == nil {
					c.Set("user_id", claims.UserID)
					c.Set("user_email", claims.Email)
					c.Set("user_role", claims.Role)
				}
			}

			return next(c)
		}
	}
}

// GetUserID helper to extract user ID from context
func GetUserID(c echo.Context) (int64, bool) {
	userID, ok := c.Get("user_id").(int64)
	return userID, ok
}

// GetUserRole helper to extract user role from context
func GetUserRole(c echo.Context) (string, bool) {
	role, ok := c.Get("user_role").(string)
	return role, ok
}
