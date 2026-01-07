package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type SettingsHandler struct {
	Repo *repository.Queries
	DB   *sql.DB
}

func NewSettingsHandler(repo *repository.Queries, db *sql.DB) *SettingsHandler {
	return &SettingsHandler{Repo: repo, DB: db}
}

// --- Store Settings ---

func (h *SettingsHandler) GetSettings(c echo.Context) error {
	settings, err := h.Repo.GetStoreSettings(c.Request().Context())
	if err != nil {
		if err == sql.ErrNoRows {
			// Return default settings if none exist
			return c.JSON(http.StatusOK, map[string]interface{}{
				"store_name": "Luxe Fashion",
				"currency":   "ETB",
			})
		}
		c.Logger().Errorf("Failed to fetch settings: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch settings"})
	}
	return c.JSON(http.StatusOK, settings)
}

// GetCartStatus returns only the cart_enabled status (public endpoint)
func (h *SettingsHandler) GetCartStatus(c echo.Context) error {
	settings, err := h.Repo.GetStoreSettings(c.Request().Context())
	if err != nil {
		// Default to enabled if settings don't exist
		return c.JSON(http.StatusOK, map[string]bool{"cart_enabled": true})
	}

	cartEnabled := true
	if settings.CartEnabled.Valid {
		cartEnabled = settings.CartEnabled.Bool
	}

	return c.JSON(http.StatusOK, map[string]bool{"cart_enabled": cartEnabled})
}

type UpdateSettingsRequest struct {
	StoreName     string  `json:"store_name"`
	StoreEmail    *string `json:"store_email"`
	StorePhone    *string `json:"store_phone"`
	Currency      *string `json:"currency"`
	HeroBannerUrl *string `json:"hero_banner_url"`
	HeroTitle     *string `json:"hero_title"`
	HeroSubtitle  *string `json:"hero_subtitle"`
	CartEnabled   *bool   `json:"cart_enabled"`
}

func (h *SettingsHandler) UpdateSettings(c echo.Context) error {
	var req UpdateSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	params := repository.UpdateStoreSettingsParams{
		StoreName: req.StoreName,
		StoreEmail: sql.NullString{
			String: func() string {
				if req.StoreEmail != nil {
					return *req.StoreEmail
				}
				return ""
			}(),
			Valid: req.StoreEmail != nil,
		},
		StorePhone: sql.NullString{
			String: func() string {
				if req.StorePhone != nil {
					return *req.StorePhone
				}
				return ""
			}(),
			Valid: req.StorePhone != nil,
		},
		Currency: sql.NullString{
			String: func() string {
				if req.Currency != nil {
					return *req.Currency
				}
				return ""
			}(),
			Valid: req.Currency != nil,
		},
		HeroBannerUrl: sql.NullString{
			String: func() string {
				if req.HeroBannerUrl != nil {
					return *req.HeroBannerUrl
				}
				return ""
			}(),
			Valid: req.HeroBannerUrl != nil,
		},
		HeroTitle: sql.NullString{
			String: func() string {
				if req.HeroTitle != nil {
					return *req.HeroTitle
				}
				return ""
			}(),
			Valid: req.HeroTitle != nil,
		},
		HeroSubtitle: sql.NullString{
			String: func() string {
				if req.HeroSubtitle != nil {
					return *req.HeroSubtitle
				}
				return ""
			}(),
			Valid: req.HeroSubtitle != nil,
		},
		CartEnabled: sql.NullBool{
			Bool: func() bool {
				if req.CartEnabled != nil {
					return *req.CartEnabled
				}
				return true
			}(),
			Valid: req.CartEnabled != nil,
		},
	}

	settings, err := h.Repo.UpdateStoreSettings(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to update settings: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update settings"})
	}

	return c.JSON(http.StatusOK, settings)
}

// --- Payment Accounts ---

type PaymentAccount struct {
	ID            string `json:"id"`
	BankName      string `json:"bank_name"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type,omitempty"`
	IsActive      bool   `json:"is_active"`
	DisplayOrder  int    `json:"display_order"`
}

type CreatePaymentAccountRequest struct {
	BankName      string `json:"bank_name"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"`
	DisplayOrder  int    `json:"display_order"`
}

type UpdatePaymentAccountRequest struct {
	BankName      string `json:"bank_name"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"`
	DisplayOrder  int    `json:"display_order"`
}

// GetActivePaymentAccounts returns active payment accounts for public use (Flutter app)
func (h *SettingsHandler) GetActivePaymentAccounts(c echo.Context) error {
	query := `
		SELECT id, bank_name, account_name, account_number, account_type, display_order
		FROM payment_accounts
		WHERE is_active = true
		ORDER BY display_order ASC, created_at ASC
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query)
	if err != nil {
		c.Logger().Errorf("Failed to fetch payment accounts: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch payment accounts"})
	}
	defer rows.Close()

	var accounts []PaymentAccount
	for rows.Next() {
		var acc PaymentAccount
		var accountType sql.NullString
		if err := rows.Scan(&acc.ID, &acc.BankName, &acc.AccountName, &acc.AccountNumber, &accountType, &acc.DisplayOrder); err != nil {
			c.Logger().Errorf("Failed to scan payment account: %v", err)
			continue
		}
		if accountType.Valid {
			acc.AccountType = accountType.String
		}
		acc.IsActive = true
		accounts = append(accounts, acc)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"accounts": accounts})
}

// GetAllPaymentAccounts returns all payment accounts for admin
func (h *SettingsHandler) GetAllPaymentAccounts(c echo.Context) error {
	query := `
		SELECT id, bank_name, account_name, account_number, account_type, is_active, display_order
		FROM payment_accounts
		ORDER BY display_order ASC, created_at ASC
	`

	rows, err := h.DB.QueryContext(c.Request().Context(), query)
	if err != nil {
		c.Logger().Errorf("Failed to fetch payment accounts: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch payment accounts"})
	}
	defer rows.Close()

	var accounts []PaymentAccount
	for rows.Next() {
		var acc PaymentAccount
		var accountType sql.NullString
		if err := rows.Scan(&acc.ID, &acc.BankName, &acc.AccountName, &acc.AccountNumber, &accountType, &acc.IsActive, &acc.DisplayOrder); err != nil {
			c.Logger().Errorf("Failed to scan payment account: %v", err)
			continue
		}
		if accountType.Valid {
			acc.AccountType = accountType.String
		}
		accounts = append(accounts, acc)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"accounts": accounts})
}

// CreatePaymentAccount creates a new payment account
func (h *SettingsHandler) CreatePaymentAccount(c echo.Context) error {
	var req CreatePaymentAccountRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	query := `
		INSERT INTO payment_accounts (bank_name, account_name, account_number, account_type, display_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order
	`

	var acc PaymentAccount
	var accountType sql.NullString
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		query,
		req.BankName,
		req.AccountName,
		req.AccountNumber,
		req.AccountType,
		req.DisplayOrder,
	).Scan(&acc.ID, &acc.BankName, &acc.AccountName, &acc.AccountNumber, &accountType, &acc.IsActive, &acc.DisplayOrder)

	if err != nil {
		c.Logger().Errorf("Failed to create payment account: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create payment account"})
	}

	if accountType.Valid {
		acc.AccountType = accountType.String
	}

	return c.JSON(http.StatusCreated, acc)
}

// UpdatePaymentAccount updates an existing payment account
func (h *SettingsHandler) UpdatePaymentAccount(c echo.Context) error {
	id := c.Param("id")

	var req UpdatePaymentAccountRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	query := `
		UPDATE payment_accounts
		SET bank_name = $2, account_name = $3, account_number = $4, account_type = $5, display_order = $6, updated_at = NOW()
		WHERE id = $1
		RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order
	`

	var acc PaymentAccount
	var accountType sql.NullString
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		query,
		id,
		req.BankName,
		req.AccountName,
		req.AccountNumber,
		req.AccountType,
		req.DisplayOrder,
	).Scan(&acc.ID, &acc.BankName, &acc.AccountName, &acc.AccountNumber, &accountType, &acc.IsActive, &acc.DisplayOrder)

	if err != nil {
		c.Logger().Errorf("Failed to update payment account: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update payment account"})
	}

	if accountType.Valid {
		acc.AccountType = accountType.String
	}

	return c.JSON(http.StatusOK, acc)
}

// TogglePaymentAccountStatus toggles the active status of a payment account
func (h *SettingsHandler) TogglePaymentAccountStatus(c echo.Context) error {
	id := c.Param("id")

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	query := `
		UPDATE payment_accounts
		SET is_active = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order
	`

	var acc PaymentAccount
	var accountType sql.NullString
	err := h.DB.QueryRowContext(
		c.Request().Context(),
		query,
		id,
		req.IsActive,
	).Scan(&acc.ID, &acc.BankName, &acc.AccountName, &acc.AccountNumber, &accountType, &acc.IsActive, &acc.DisplayOrder)

	if err != nil {
		c.Logger().Errorf("Failed to toggle payment account status: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to toggle payment account status"})
	}

	if accountType.Valid {
		acc.AccountType = accountType.String
	}

	return c.JSON(http.StatusOK, acc)
}

// DeletePaymentAccount soft deletes a payment account
func (h *SettingsHandler) DeletePaymentAccount(c echo.Context) error {
	id := c.Param("id")

	query := `
		UPDATE payment_accounts
		SET is_active = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := h.DB.ExecContext(c.Request().Context(), query, id)
	if err != nil {
		c.Logger().Errorf("Failed to delete payment account: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete payment account"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Payment account deleted successfully"})
}

// --- Admin Users ---

func (h *SettingsHandler) ListUsers(c echo.Context) error {
	users, err := h.Repo.ListAdminUsers(c.Request().Context())
	if err != nil {
		c.Logger().Errorf("Failed to fetch users: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch users"})
	}
	return c.JSON(http.StatusOK, users)
}

type CreateUserRequest struct {
	Email     string  `json:"email"`
	Password  string  `json:"password"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Role      string  `json:"role"`
}

func (h *SettingsHandler) CreateUser(c echo.Context) error {
	var req CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to hash password"})
	}

	params := repository.CreateAdminUserParams{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName: sql.NullString{
			String: func() string {
				if req.FirstName != nil {
					return *req.FirstName
				}
				return ""
			}(),
			Valid: req.FirstName != nil,
		},
		LastName: sql.NullString{
			String: func() string {
				if req.LastName != nil {
					return *req.LastName
				}
				return ""
			}(),
			Valid: req.LastName != nil,
		},
		Role: req.Role,
		IsActive: sql.NullBool{
			Bool:  true,
			Valid: true,
		},
	}

	user, err := h.Repo.CreateAdminUser(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to create user: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create user"})
	}

	return c.JSON(http.StatusCreated, user)
}

type UpdateUserRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Role      string  `json:"role"`
	IsActive  *bool   `json:"is_active"`
}

func (h *SettingsHandler) UpdateUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	var req UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	params := repository.UpdateAdminUserParams{
		ID: id,
		FirstName: sql.NullString{
			String: func() string {
				if req.FirstName != nil {
					return *req.FirstName
				}
				return ""
			}(),
			Valid: req.FirstName != nil,
		},
		LastName: sql.NullString{
			String: func() string {
				if req.LastName != nil {
					return *req.LastName
				}
				return ""
			}(),
			Valid: req.LastName != nil,
		},
		Role: req.Role,
		IsActive: sql.NullBool{
			Bool: func() bool {
				if req.IsActive != nil {
					return *req.IsActive
				}
				return true
			}(),
			Valid: req.IsActive != nil,
		},
	}

	user, err := h.Repo.UpdateAdminUser(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to update user: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update user"})
	}

	return c.JSON(http.StatusOK, user)
}

type UpdatePasswordRequest struct {
	Password string `json:"password"`
}

func (h *SettingsHandler) UpdatePassword(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	var req UpdatePasswordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to hash password"})
	}

	params := repository.UpdateAdminPasswordParams{
		ID:           id,
		PasswordHash: string(hashedPassword),
	}

	err = h.Repo.UpdateAdminPassword(c.Request().Context(), params)
	if err != nil {
		c.Logger().Errorf("Failed to update password: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update password"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Password updated successfully"})
}

func (h *SettingsHandler) DeleteUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	err = h.Repo.DeleteAdminUser(c.Request().Context(), id)
	if err != nil {
		c.Logger().Errorf("Failed to delete user: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete user"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "User deleted successfully"})
}
