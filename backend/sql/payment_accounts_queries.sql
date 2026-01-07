-- name: GetActivePaymentAccounts :many
SELECT id, bank_name, account_name, account_number, account_type, display_order
FROM payment_accounts
WHERE is_active = true
ORDER BY display_order ASC, created_at ASC;

-- name: GetAllPaymentAccounts :many
SELECT id, bank_name, account_name, account_number, account_type, is_active, display_order, created_at, updated_at
FROM payment_accounts
ORDER BY display_order ASC, created_at ASC;

-- name: GetPaymentAccountByID :one
SELECT id, bank_name, account_name, account_number, account_type, is_active, display_order, created_at, updated_at
FROM payment_accounts
WHERE id = $1;

-- name: CreatePaymentAccount :one
INSERT INTO payment_accounts (bank_name, account_name, account_number, account_type, display_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order, created_at, updated_at;

-- name: UpdatePaymentAccount :one
UPDATE payment_accounts
SET 
  bank_name = $2,
  account_name = $3,
  account_number = $4,
  account_type = $5,
  display_order = $6,
  updated_at = NOW()
WHERE id = $1
RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order, created_at, updated_at;

-- name: TogglePaymentAccountStatus :one
UPDATE payment_accounts
SET 
  is_active = $2,
  updated_at = NOW()
WHERE id = $1
RETURNING id, bank_name, account_name, account_number, account_type, is_active, display_order, created_at, updated_at;

-- name: DeletePaymentAccount :exec
UPDATE payment_accounts
SET 
  is_active = false,
  updated_at = NOW()
WHERE id = $1;
