package repository

import (
	"context"
	"database/sql"
	"time"
)

// Admin user types
type AdminUser struct {
	ID           int64
	Email        string
	PasswordHash string
	FirstName    sql.NullString
	LastName     sql.NullString
	Role         string
	IsActive     bool
	LastLogin    sql.NullTime
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateRefreshTokenParams struct {
	UserID    int64
	Token     string
	ExpiresAt time.Time
}

type RefreshToken struct {
	ID        int64
	UserID    int64
	Token     string
	ExpiresAt time.Time
	CreatedAt time.Time
}

// GetAdminUserByEmail retrieves an admin user by email
func (q *Queries) GetAdminUserByEmail(ctx context.Context, email string) (AdminUser, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, updated_at
		FROM admin_users
		WHERE email = $1
		LIMIT 1
	`
	var user AdminUser
	err := q.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.LastLogin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

// GetAdminUserByID retrieves an admin user by ID
func (q *Queries) GetAdminUserByID(ctx context.Context, id int64) (AdminUser, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, updated_at
		FROM admin_users
		WHERE id = $1
		LIMIT 1
	`
	var user AdminUser
	err := q.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.LastLogin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

// CreateRefreshToken stores a new refresh token
func (q *Queries) CreateRefreshToken(ctx context.Context, params CreateRefreshTokenParams) (RefreshToken, error) {
	query := `
		INSERT INTO refresh_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, token, expires_at, created_at
	`
	var token RefreshToken
	err := q.db.QueryRowContext(ctx, query, params.UserID, params.Token, params.ExpiresAt).Scan(
		&token.ID,
		&token.UserID,
		&token.Token,
		&token.ExpiresAt,
		&token.CreatedAt,
	)
	return token, err
}

// GetRefreshToken retrieves a refresh token
func (q *Queries) GetRefreshToken(ctx context.Context, token string) (RefreshToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, created_at
		FROM refresh_tokens
		WHERE token = $1 AND expires_at > NOW()
		LIMIT 1
	`
	var rt RefreshToken
	err := q.db.QueryRowContext(ctx, query, token).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Token,
		&rt.ExpiresAt,
		&rt.CreatedAt,
	)
	return rt, err
}

// DeleteRefreshToken deletes a refresh token
func (q *Queries) DeleteRefreshToken(ctx context.Context, token string) error {
	query := `DELETE FROM refresh_tokens WHERE token = $1`
	_, err := q.db.ExecContext(ctx, query, token)
	return err
}

// UpdateAdminUserLastLogin updates the last login timestamp
func (q *Queries) UpdateAdminUserLastLogin(ctx context.Context, id int64) error {
	query := `UPDATE admin_users SET last_login = NOW() WHERE id = $1`
	_, err := q.db.ExecContext(ctx, query, id)
	return err
}
