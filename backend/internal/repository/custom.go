package repository

import (
	"context"
	"database/sql"
)

// UpdateProductByStringID updates a product using a string ID (for bigint IDs)
// This is a workaround for when the database uses bigint but the generated code expects UUID
// Note: The actual database uses 'title', 'thumbnail', 'active' but we map them to match the Product struct
func (q *Queries) UpdateProductByStringID(ctx context.Context, arg UpdateProductByStringIDParams) (Product, error) {
	// Map the fields to the actual database columns
	// title -> name (in Product struct)
	// thumbnail -> image_url (in Product struct)
	// active -> is_active (in Product struct)
	// base_price -> base_price (in Product struct)

	// Parse base_price string to int64 for DB
	basePrice := "0"
	if arg.BasePrice != "" {
		basePrice = arg.BasePrice
	}

	query := `UPDATE products 
		SET title = $2, description = $3, thumbnail = COALESCE($4, thumbnail), active = $5, base_price = $6::bigint, updated_at = NOW()
		WHERE id = $1::bigint
		RETURNING id::text as id, title as name, description, 
			COALESCE(base_price, 0)::text as base_price,
			''::text as category,
			COALESCE(thumbnail, '') as image_url,
			active as is_active, 
			created_at, updated_at`

	// Map isActive bool to the actual value
	isActiveValue := false
	if arg.IsActive.Valid {
		isActiveValue = arg.IsActive.Bool
	}

	// Get image_url value (thumbnail in DB)
	thumbnailValue := ""
	if arg.ImageUrl.Valid {
		thumbnailValue = arg.ImageUrl.String
	}

	row := q.db.QueryRowContext(ctx, query,
		arg.ID, arg.Name, arg.Description, thumbnailValue, isActiveValue, basePrice)

	var i Product
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.Description,
		&i.BasePrice,
		&i.Category,
		&i.ImageUrl,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

type UpdateProductByStringIDParams struct {
	ID          string
	Name        string
	Description sql.NullString
	BasePrice   string
	Category    sql.NullString
	ImageUrl    sql.NullString
	IsActive    sql.NullBool
}

// UpdateVariantPrice updates or inserts a price for a variant
func (q *Queries) UpdateVariantPrice(ctx context.Context, variantID string, amount int64, currency string) error {
	// First try to update existing price
	updateQuery := `UPDATE prices SET amount = $2, updated_at = NOW() WHERE variant_id = $1::uuid`
	result, err := q.db.ExecContext(ctx, updateQuery, variantID, amount)
	if err != nil {
		return err
	}

	// Check if any row was updated
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	// If no row was updated, insert a new one
	if rowsAffected == 0 {
		insertQuery := `INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
			VALUES ($1::uuid, $2, $3, NOW(), NOW())`
		_, err = q.db.ExecContext(ctx, insertQuery, variantID, amount, currency)
		return err
	}

	return nil
}

// DeleteProductByStringID deletes a product using a string ID (for bigint IDs)
func (q *Queries) DeleteProductByStringID(ctx context.Context, id string) error {
	query := `DELETE FROM products WHERE id = $1::bigint`
	_, err := q.db.ExecContext(ctx, query, id)
	return err
}
