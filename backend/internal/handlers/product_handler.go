package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
	"github.com/redis/go-redis/v9"
)

type ProductHandler struct {
	Repo  *repository.Queries
	Redis *redis.Client
}

func NewProductHandler(repo *repository.Queries, rdb *redis.Client) *ProductHandler {
	return &ProductHandler{Repo: repo, Redis: rdb}
}

func (h *ProductHandler) ListProducts(c echo.Context) error {
	ctx := c.Request().Context()

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 {
		limit = 20 // Default limit
	}
	offset := (page - 1) * limit

	// Get search query and category filter
	searchQuery := c.QueryParam("search")
	categoryID := c.QueryParam("category_id")

	// Check if this is an admin request (admin routes have /admin/ prefix)
	isAdmin := strings.HasPrefix(c.Request().URL.Path, "/api/v1/admin/")

	// Cache Key
	cacheKey := fmt.Sprintf("products:list:%d:%d:%s:%s:%v", limit, offset, searchQuery, categoryID, isAdmin)

	// Check Cache
	if h.Redis != nil {
		val, err := h.Redis.Get(ctx, cacheKey).Result()
		if err == nil {
			// Cache hit
			c.Response().Header().Set("Content-Type", "application/json")
			c.Response().Header().Set("X-Cache", "HIT")
			return c.String(http.StatusOK, val)
		}
	}

	var products []repository.Product
	var err error

	if searchQuery != "" || categoryID != "" {
		// Build stock filter conditionally
		stockFilter := ""
		if !isAdmin {
			stockFilter = `AND EXISTS (
                SELECT 1 FROM product_variants pv 
                WHERE pv.product_id = p.id 
                AND COALESCE(pv.stock_quantity, 0) > 0
            )`
		}

		// Build category filter
		categoryFilter := ""
		categoryArgs := []interface{}{}
		argIndex := 1

		if searchQuery != "" {
			categoryArgs = append(categoryArgs, "%"+searchQuery+"%")
			argIndex++
		}

		if categoryID != "" {
			categoryFilter = fmt.Sprintf(`AND EXISTS (
				SELECT 1 FROM product_categories pc
				WHERE pc.product_id = p.id
				AND pc.category_id = $%d
			)`, argIndex)
			categoryArgs = append(categoryArgs, categoryID)
			argIndex++
		}

		// Build WHERE clause
		whereClause := "WHERE 1=1"
		if !isAdmin {
			whereClause += " AND p.active = true"
		}

		if searchQuery != "" {
			whereClause += " AND p.title ILIKE $1"
		}

		// Search products by name and/or category
		query := fmt.Sprintf(`
			SELECT 
				p.id::text,
				p.title as name,
				p.slug,
				p.description,
				COALESCE(p.base_price, 0)::text as base_price,
				NULL::text as category,
				(
					SELECT pi.url 
					FROM product_images pi 
					WHERE pi.product_id = p.id 
					ORDER BY pi.position ASC 
					LIMIT 1
				) as image_url,
				p.active as is_active,
				p.created_at,
				p.updated_at
			FROM products p
			%s
            %s
            %s
			ORDER BY p.created_at DESC
			LIMIT $%d OFFSET $%d
		`, whereClause, categoryFilter, stockFilter, argIndex, argIndex+1)

		categoryArgs = append(categoryArgs, limit, offset)

		rows, err := h.Repo.DB().QueryContext(ctx, query, categoryArgs...)
		if err != nil {
			c.Logger().Errorf("Failed to search products: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to search products"})
		}
		defer rows.Close()

		for rows.Next() {
			var p repository.Product
			if err := rows.Scan(
				&p.ID,
				&p.Name,
				&p.Slug,
				&p.Description,
				&p.BasePrice,
				&p.Category,
				&p.ImageUrl,
				&p.IsActive,
				&p.CreatedAt,
				&p.UpdatedAt,
			); err != nil {
				c.Logger().Errorf("Failed to scan product: %v", err)
				continue
			}
			products = append(products, p)
		}
	} else {
		// Regular list without search or category filter
		params := repository.ListProductsParams{
			Limit:  int32(limit),
			Offset: int32(offset),
		}

		if isAdmin {
			products, err = h.Repo.ListProductsAdmin(ctx, params)
		} else {
			products, err = h.Repo.ListProducts(ctx, params)
		}
		if err != nil {
			c.Logger().Errorf("Failed to fetch products: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch products"})
		}
	}

	// Transform products to ensure proper JSON serialization
	type ProductResponse struct {
		ID          string                   `json:"id"`
		Name        string                   `json:"name"`
		Slug        string                   `json:"slug"`
		Description *string                  `json:"description,omitempty"`
		BasePrice   string                   `json:"base_price"`
		Category    *string                  `json:"category,omitempty"`
		ImageUrl    *string                  `json:"image_url,omitempty"`
		IsActive    *bool                    `json:"is_active,omitempty"`
		Variants    []map[string]interface{} `json:"variants"`
		CreatedAt   string                   `json:"created_at"`
		UpdatedAt   string                   `json:"updated_at"`
	}

	var response []ProductResponse
	for _, p := range products {
		// Keep price in cents (as stored in database)
		pr := ProductResponse{
			ID:        p.ID,
			Name:      p.Name,
			Slug:      p.Slug,
			BasePrice: p.BasePrice, // Price in cents
			Variants:  []map[string]interface{}{},
		}

		if p.Description.Valid {
			pr.Description = &p.Description.String
		}
		if p.Category.Valid {
			pr.Category = &p.Category.String
		}
		// Use image_url from SQL query (already fetched via LEFT JOIN LATERAL)
		if p.ImageUrl.Valid {
			// Create a copy of the string to avoid pointer aliasing issues
			imageUrl := p.ImageUrl.String
			pr.ImageUrl = &imageUrl
		}
		if p.IsActive.Valid {
			pr.IsActive = &p.IsActive.Bool
		}
		if p.CreatedAt.Valid {
			pr.CreatedAt = p.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		if p.UpdatedAt.Valid {
			pr.UpdatedAt = p.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}

		// Fetch first variant with sale_price for POS grid display
		variants, err := h.Repo.ListProductVariants(ctx, p.ID)
		if err == nil && len(variants) > 0 {
			// Just include the first variant with sale_price info
			v := variants[0]
			variantMap := map[string]interface{}{
				"id":    v.ID,
				"price": float64(v.Price),
			}
			if v.SalePrice.Valid {
				variantMap["sale_price"] = float64(v.SalePrice.Int64)
			}
			pr.Variants = append(pr.Variants, variantMap)
		}

		response = append(response, pr)
	}

	// Cache Result
	if h.Redis != nil {
		jsonBytes, _ := json.Marshal(response)
		h.Redis.Set(ctx, cacheKey, string(jsonBytes), 1*time.Minute) // Cache for 1 minute
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ProductHandler) GetProduct(c echo.Context) error {
	id := c.Param("id")
	// Remove UUID validation since we use bigint IDs as strings
	// id, err := uuid.Parse(idStr)
	// if err != nil {
	// 	return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid product ID"})
	// }

	ctx := c.Request().Context()

	var product repository.Product
	var err error

	// Check if id is numeric
	if _, parseErr := strconv.ParseInt(id, 10, 64); parseErr != nil {
		// It's a slug
		product, err = h.Repo.GetProductBySlug(ctx, id)
	} else {
		// It's an ID
		product, err = h.Repo.GetProduct(ctx, id)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Product not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch product"})
	}

	// Use product.ID for related data fetching since id param might be a slug
	images, err := h.Repo.ListProductImages(ctx, product.ID)
	if err != nil {
		images = []repository.ProductImage{}
	}

	variants, err := h.Repo.ListProductVariants(ctx, product.ID)
	if err != nil {
		variants = []repository.ProductVariant{}
	}

	// Convert product base_price from cents to dollars
	productResponse := map[string]interface{}{
		"id":   product.ID,
		"name": product.Name,
		"slug": product.Slug,
		"description": func() interface{} {
			if product.Description.Valid {
				return product.Description.String
			}
			return nil
		}(),
		"base_price": product.BasePrice, // Price in cents
		"category": func() interface{} {
			if product.Category.Valid {
				return product.Category.String
			}
			return nil
		}(),
		"image_url": func() interface{} {
			if product.ImageUrl.Valid {
				return product.ImageUrl.String
			}
			return nil
		}(),
		"is_active": func() interface{} {
			if product.IsActive.Valid {
				return product.IsActive.Bool
			}
			return nil
		}(),
		"created_at": func() string {
			if product.CreatedAt.Valid {
				return product.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			}
			return ""
		}(),
		"updated_at": func() string {
			if product.UpdatedAt.Valid {
				return product.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			}
			return ""
		}(),
	}

	// Keep variant prices in cents
	variantsResponse := make([]map[string]interface{}, len(variants))
	for i, v := range variants {
		priceInCents := float64(v.Price)
		variantsResponse[i] = map[string]interface{}{
			"id":         v.ID,
			"product_id": v.ProductID,
			"name":       v.Name,
			"sku":        v.Sku,
			"size": func() interface{} {
				if v.Size.Valid {
					return v.Size.String
				}
				return nil
			}(),
			"color": func() interface{} {
				if v.Color.Valid {
					return v.Color.String
				}
				return nil
			}(),
			"image": func() interface{} {
				if v.Image.Valid {
					return v.Image.String
				}
				return nil
			}(),
			"stock": func() interface{} {
				if v.Stock.Valid {
					return v.Stock.Int32
				}
				return nil
			}(),
			"stock_quantity": func() interface{} {
				if v.StockQuantity.Valid {
					return v.StockQuantity.Int32
				}
				return 0
			}(),
			"active": func() interface{} {
				if v.Active.Valid {
					return v.Active.Bool
				}
				return nil
			}(),
			"price": priceInCents, // Price in cents
			"sale_price": func() interface{} {
				if v.SalePrice.Valid {
					return float64(v.SalePrice.Int64)
				}
				return nil
			}(),
			"display_order": v.DisplayOrder,
			"created_at": func() string {
				if v.CreatedAt.Valid {
					return v.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
				}
				return ""
			}(),
			"updated_at": func() string {
				if v.UpdatedAt.Valid {
					return v.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
				}
				return ""
			}(),
		}
	}

	response := map[string]interface{}{
		"product":  productResponse,
		"images":   images,
		"variants": variantsResponse,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ProductHandler) GetRelatedProducts(c echo.Context) error {
	id := c.Param("id")
	limit := int32(4)
	if l := c.QueryParam("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = int32(val)
		}
	}

	ctx := c.Request().Context()

	// Cache Key
	cacheKey := fmt.Sprintf("products:related:%s:%d", id, limit)

	// Check Cache
	if h.Redis != nil {
		val, err := h.Redis.Get(ctx, cacheKey).Result()
		if err == nil {
			c.Response().Header().Set("Content-Type", "application/json")
			c.Response().Header().Set("X-Cache", "HIT")
			return c.String(http.StatusOK, val)
		}
	}

	products, err := h.Repo.GetRelatedProducts(ctx, repository.GetRelatedProductsParams{
		ProductID: id,
		Limit:     limit,
	})
	if err != nil {
		c.Logger().Errorf("Failed to fetch related products: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch related products"})
	}

	// Transform response
	// Transform response
	type ProductResponse struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Slug        string  `json:"slug"`
		Description *string `json:"description,omitempty"`
		BasePrice   string  `json:"base_price"`
		SalePrice   *int64  `json:"sale_price,omitempty"`
		Category    *string `json:"category,omitempty"`
		ImageUrl    *string `json:"image_url,omitempty"`
		IsActive    *bool   `json:"is_active,omitempty"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	}

	var response []ProductResponse
	for _, p := range products {
		pr := ProductResponse{
			ID:        p.ID,
			Name:      p.Name,
			Slug:      p.Slug,
			BasePrice: p.BasePrice,
		}
		if p.SalePrice.Valid {
			salePrice := p.SalePrice.Int64
			pr.SalePrice = &salePrice
		}
		if p.Description.Valid {
			pr.Description = &p.Description.String
		}
		if p.Category.Valid {
			pr.Category = &p.Category.String
		}
		if p.ImageUrl.Valid {
			imageUrl := p.ImageUrl.String
			pr.ImageUrl = &imageUrl
		}
		if p.IsActive.Valid {
			isActive := p.IsActive.Bool
			pr.IsActive = &isActive
		}
		if p.CreatedAt.Valid {
			pr.CreatedAt = p.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		if p.UpdatedAt.Valid {
			pr.UpdatedAt = p.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		response = append(response, pr)
	}

	// Cache Result
	if h.Redis != nil {
		jsonBytes, _ := json.Marshal(response)
		h.Redis.Set(ctx, cacheKey, string(jsonBytes), 5*time.Minute) // Cache for 5 minutes
	}

	return c.JSON(http.StatusOK, response)
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	BasePrice   string  `json:"base_price"`
	Category    *string `json:"category"`
	ImageUrl    *string `json:"image_url"`
	IsActive    *bool   `json:"is_active"`
}

func (h *ProductHandler) CreateProduct(c echo.Context) error {
	var req CreateProductRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Name is required"})
	}

	ctx := c.Request().Context()

	// Use provided slug or generate from name
	var slug string
	if req.Slug != nil && *req.Slug != "" {
		// Use provided slug, but ensure it's URL-friendly
		slug = generateSlugFromText(*req.Slug)
	} else {
		// Generate slug from name with timestamp for uniqueness
		slug = generateSlug(req.Name)
	}

	// Set default active status
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	// Parse base_price (comes as string in cents)
	basePrice := "0"
	if req.BasePrice != "" {
		basePrice = req.BasePrice
	}

	// Use raw SQL since sqlc schema doesn't match database
	var product struct {
		ID        string
		Name      string
		Slug      string
		BasePrice string
		CreatedAt string
		UpdatedAt string
	}

	err := h.Repo.DB().QueryRowContext(ctx, `
		INSERT INTO products (title, description, active, slug, base_price, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5::bigint, NOW(), NOW())
		RETURNING
			id::text,
			title as name,
			slug,
			COALESCE(base_price, 0)::text as base_price,
			created_at::text,
			updated_at::text
	`, req.Name, req.Description, isActive, slug, basePrice).Scan(&product.ID, &product.Name, &product.Slug, &product.BasePrice, &product.CreatedAt, &product.UpdatedAt)

	if err != nil {
		c.Logger().Errorf("Failed to create product: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create product"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":         product.ID,
		"name":       product.Name,
		"slug":       product.Slug,
		"base_price": product.BasePrice,
		"is_active":  isActive,
		"created_at": product.CreatedAt,
		"updated_at": product.UpdatedAt,
	})
}

// Helper function to generate URL-friendly slug (without timestamp)
func generateSlugFromText(text string) string {
	// Simple slug generation - lowercase and replace spaces with hyphens
	slug := strings.ToLower(text)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, slug)
	return slug
}

// Helper function to generate URL-friendly slug (with timestamp for uniqueness)
func generateSlug(name string) string {
	slug := generateSlugFromText(name)
	// Add timestamp to ensure uniqueness
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	return slug + "-" + timestamp
}

type UpdateProductRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	BasePrice   *string  `json:"base_price"`
	Category    *string  `json:"category"`
	ImageUrl    *string  `json:"image_url"`
	IsActive    *bool    `json:"is_active"`
	Images      []string `json:"images"`
}

func (h *ProductHandler) UpdateProduct(c echo.Context) error {
	idStr := c.Param("id")
	// Product IDs are bigint (string), not UUID

	var req UpdateProductRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()

	// First get existing product to check if it exists
	existing, err := h.Repo.GetProduct(ctx, idStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Product not found"})
		}
		c.Logger().Errorf("Failed to fetch product %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch product"})
	}

	// Update fields
	name := existing.Name
	if req.Name != nil {
		name = *req.Name
	}

	basePrice := existing.BasePrice
	if req.BasePrice != nil {
		basePrice = *req.BasePrice
	}

	description := existing.Description
	if req.Description != nil {
		description = sql.NullString{String: *req.Description, Valid: true}
	}

	category := existing.Category
	if req.Category != nil {
		category = sql.NullString{String: *req.Category, Valid: true}
	}

	imageUrl := existing.ImageUrl
	if req.ImageUrl != nil {
		imageUrl = sql.NullString{String: *req.ImageUrl, Valid: true}
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = sql.NullBool{Bool: *req.IsActive, Valid: true}
	}

	// Always use the custom method that handles string IDs (bigint)
	product, err := h.Repo.UpdateProductByStringID(ctx, repository.UpdateProductByStringIDParams{
		ID:          idStr,
		Name:        name,
		Description: description,
		BasePrice:   basePrice,
		Category:    category,
		ImageUrl:    imageUrl,
		IsActive:    isActive,
	})

	if err != nil {
		c.Logger().Errorf("Failed to update product with string ID %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to update product",
			"details": err.Error(),
		})
	}

	// 1. Sync single ImageUrl to product_images (if provided and Images array is NOT provided)
	if req.ImageUrl != nil && req.Images == nil {
		c.Logger().Infof("Syncing ImageUrl to product_images for product %s. New URL: %s", idStr, *req.ImageUrl)

		// We treat this as "updating the main image"
		// Delete existing images to ensure this one becomes the main one
		existingImages, err := h.Repo.ListProductImages(ctx, idStr)
		if err != nil {
			c.Logger().Errorf("Failed to list existing images: %v", err)
		} else {
			c.Logger().Infof("Found %d existing images for product %s", len(existingImages), idStr)
			for _, img := range existingImages {
				err := h.Repo.DeleteProductImage(ctx, img.ID)
				if err != nil {
					c.Logger().Errorf("Failed to delete image %s: %v", img.ID, err)
				} else {
					c.Logger().Infof("Deleted image %s", img.ID)
				}
			}
		}

		_, err = h.Repo.AddProductImage(ctx, repository.AddProductImageParams{
			ProductID: idStr,
			Url:       *req.ImageUrl,
			Position:  0,
		})
		if err != nil {
			c.Logger().Errorf("Failed to add new main image %s: %v", *req.ImageUrl, err)
		} else {
			c.Logger().Infof("Added new main image to product_images")
		}
	}

	// Handle multiple images
	if req.Images != nil {
		// Fetch existing images
		existingImages, err := h.Repo.ListProductImages(ctx, idStr)
		if err != nil {
			c.Logger().Errorf("Failed to fetch existing images: %v", err)
		} else {
			// Delete all existing images
			for _, img := range existingImages {
				err := h.Repo.DeleteProductImage(ctx, img.ID)
				if err != nil {
					c.Logger().Errorf("Failed to delete image %s: %v", img.ID, err)
				}
			}

			// Add new images
			for i, url := range req.Images {
				_, err := h.Repo.AddProductImage(ctx, repository.AddProductImageParams{
					ProductID: idStr,
					Url:       url,
					Position:  int64(i),
				})
				if err != nil {
					c.Logger().Errorf("Failed to add image %s: %v", url, err)
				}
			}
		}
	}

	return c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) DeleteProduct(c echo.Context) error {
	idStr := c.Param("id")
	// Product IDs are bigint (string), not UUID
	ctx := c.Request().Context()

	// 1. Check for existing orders
	orderCount, err := h.Repo.CountOrderItemsByProductID(ctx, idStr)
	if err != nil {
		c.Logger().Errorf("Failed to check orders for product %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to check product dependencies"})
	}
	if orderCount > 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Cannot delete product with existing orders"})
	}

	// 2. Delete dependencies
	// Delete product images
	if err := h.Repo.DeleteProductImagesByProductID(ctx, idStr); err != nil {
		c.Logger().Errorf("Failed to delete images for product %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete product images"})
	}

	// Delete product variants (cascades to inventory_movements)
	// Note: prices and product_variants are deleted automatically via cascade from products
	if err := h.Repo.DeleteProductVariants(ctx, idStr); err != nil {
		c.Logger().Errorf("Failed to delete variants for product %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete product variants"})
	}

	// 3. Delete product
	err = h.Repo.DeleteProductByStringID(ctx, idStr)
	if err != nil {
		c.Logger().Errorf("Failed to delete product %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete product"})
	}

	return c.NoContent(http.StatusNoContent)
}

// Variant Handlers
func (h *ProductHandler) GetVariant(c echo.Context) error {
	idStr := c.Param("id")
	// Variant IDs are bigint (string), not UUID

	ctx := c.Request().Context()
	variant, err := h.Repo.GetProductVariant(ctx, idStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Variant not found"})
		}
		c.Logger().Errorf("Failed to fetch variant %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch variant"})
	}

	return c.JSON(http.StatusOK, variant)
}

type CreateVariantRequest struct {
	ProductID       string  `json:"product_id"`
	Sku             string  `json:"sku"`
	Size            *string `json:"size"`
	Color           *string `json:"color"`
	PriceAdjustment *string `json:"price_adjustment"`
	StockQuantity   *int32  `json:"stock_quantity"`
	DisplayOrder    *int32  `json:"display_order"`
	Image           *string `json:"image"`
}

func (h *ProductHandler) CreateVariant(c echo.Context) error {
	var req CreateVariantRequest
	// Parse request
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.ProductID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Product ID is required"})
	}

	stockQty := int32(0)
	if req.StockQuantity != nil {
		stockQty = *req.StockQuantity
	}

	ctx := c.Request().Context()

	// Auto-generate SKU if not provided (random 6-digit)
	if req.Sku == "" {
		maxRetries := 5
		for i := 0; i < maxRetries; i++ {
			rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
			req.Sku = fmt.Sprintf("%06d", rnd.Intn(900000)+100000)

			// Try to insert with this SKU
			// We can't check uniqueness easily without a separate query or try-insert.
			// Ideally we should just proceed to insert and handle error, but CreateVariant logic below does the insert.
			// So for now, we just pick one and let the insert below fail if duplicate (user will have to retry or we loop here if we refactor).
			// Refactoring to loop the insert:

			variant, err := h.Repo.CreateProductVariant(ctx, repository.CreateProductVariantParams{
				ProductID:     req.ProductID,
				Sku:           req.Sku,
				Size:          toNullString(req.Size),
				Color:         toNullString(req.Color),
				Image:         toNullString(req.Image),
				StockQuantity: sql.NullInt32{Int32: stockQty, Valid: true},
			})

			if err == nil {
				return c.JSON(http.StatusCreated, variant)
			}

			if !strings.Contains(err.Error(), "duplicate key") && !strings.Contains(err.Error(), "unique constraint") {
				// If error is NOT a duplicate SKU error, return it immediately
				c.Logger().Errorf("Failed to create variant: %v", err)
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create variant", "details": err.Error()})
			}
			// If it WAS a duplicate, loop continues to try new SKU
		}
		return c.JSON(http.StatusConflict, map[string]string{"error": "Failed to generate unique SKU after retries"})
	}

	// Manual SKU provided
	variant, err := h.Repo.CreateProductVariant(ctx, repository.CreateProductVariantParams{
		ProductID:     req.ProductID,
		Sku:           req.Sku,
		Size:          toNullString(req.Size),
		Color:         toNullString(req.Color),
		Image:         toNullString(req.Image),
		StockQuantity: sql.NullInt32{Int32: stockQty, Valid: true},
	})

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "SKU already exists"})
		}
		c.Logger().Errorf("Failed to create variant: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create variant", "details": err.Error()})
	}

	return c.JSON(http.StatusCreated, variant)
}

func (h *ProductHandler) DuplicateProduct(c echo.Context) error {
	idStr := c.Param("id")
	ctx := c.Request().Context()

	// 1. Fetch original product
	original, err := h.Repo.GetProduct(ctx, idStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Product not found"})
		}
		c.Logger().Errorf("Failed to fetch product %s for duplication: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch original product"})
	}

	// 2. Prepare new product data
	newName := fmt.Sprintf("%s (Copy)", original.Name)
	newSlug := generateSlug(newName) // This includes timestamp, ensuring uniqueness

	// 3. Create new product
	var newProduct struct {
		ID        string
		Name      string
		Slug      string
		BasePrice string
		CreatedAt string
		UpdatedAt string
	}

	// Default active to false for the copy
	isActive := false

	err = h.Repo.DB().QueryRowContext(ctx, `
		INSERT INTO products (title, description, active, slug, base_price, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5::bigint, NOW(), NOW())
		RETURNING
			id::text,
			title as name,
			slug,
			COALESCE(base_price, 0)::text as base_price,
			created_at::text,
			updated_at::text
	`, newName, original.Description, isActive, newSlug, original.BasePrice).Scan(&newProduct.ID, &newProduct.Name, &newProduct.Slug, &newProduct.BasePrice, &newProduct.CreatedAt, &newProduct.UpdatedAt)

	if err != nil {
		c.Logger().Errorf("Failed to duplicate product: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to duplicate product"})
	}

	// 3.5 Copy Categories
	categories, err := h.Repo.ListProductCategories(ctx, idStr)
	if err == nil {
		for _, cat := range categories {
			err := h.Repo.AddProductCategory(ctx, repository.AddProductCategoryParams{
				ProductID:  newProduct.ID,
				CategoryID: cat.ID,
			})
			if err != nil {
				c.Logger().Warnf("Failed to add category %s directly to duplicate product %s: %v", cat.ID, newProduct.ID, err)
			}
		}
	}

	// 4. Copy Images
	images, err := h.Repo.ListProductImages(ctx, idStr)
	if err == nil {
		for i, img := range images {
			_, err := h.Repo.AddProductImage(ctx, repository.AddProductImageParams{
				ProductID: newProduct.ID,
				Url:       img.Url,
				Position:  int64(i),
			})
			if err != nil {
				c.Logger().Warnf("Failed to copy image %s for duplicate product %s: %v", img.Url, newProduct.ID, err)
			}
		}
	}

	// 5. Copy Variants
	variants, err := h.Repo.ListProductVariants(ctx, idStr)
	if err == nil {
		for _, v := range variants {
			// Generate unique SKU (random 6-digit)
			var newSku string
			maxRetries := 5
			for i := 0; i < maxRetries; i++ {
				// Generate random 6-digit number
				rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
				newSku = fmt.Sprintf("%06d", rnd.Intn(900000)+100000)

				createParams := repository.CreateProductVariantParams{
					ProductID:     newProduct.ID,
					Sku:           newSku,
					StockQuantity: v.StockQuantity,
				}

				if v.Size.Valid {
					createParams.Size = v.Size
				}
				if v.Color.Valid {
					createParams.Color = v.Color
				}
				if v.Image.Valid {
					createParams.Image = v.Image
				}

				newVariant, err := h.Repo.CreateProductVariant(ctx, createParams)
				if err == nil {
					// Success, fix price and continue to next variant
					// Copy Price
					err = h.Repo.UpdateVariantPrice(ctx, newVariant.ID, v.Price, "Br")
					if err != nil {
						c.Logger().Warnf("Failed to set price for duplicate variant %s: %v", newVariant.ID, err)
					}

					// Copy Sale Price
					if v.SalePrice.Valid {
						salePrice := v.SalePrice.Int64
						err = h.Repo.UpdateVariantSalePriceOnly(ctx, newVariant.ID, &salePrice)
						if err != nil {
							c.Logger().Warnf("Failed to set sale price for duplicate variant %s: %v", newVariant.ID, err)
						}
					}
					break // Break retry loop
				}

				if i == maxRetries-1 {
					c.Logger().Errorf("Failed to copy variant %s after retries: %v", v.Sku, err)
				}
			}
		}
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":         newProduct.ID,
		"name":       newProduct.Name,
		"slug":       newProduct.Slug,
		"base_price": newProduct.BasePrice,
		"is_active":  isActive,
		"created_at": newProduct.CreatedAt,
		"updated_at": newProduct.UpdatedAt,
		"message":    "Product duplicated successfully",
	})
}

type UpdateVariantRequest struct {
	Sku             *string  `json:"sku"`
	Size            *string  `json:"size"`
	Color           *string  `json:"color"`
	PriceAdjustment *string  `json:"price_adjustment"`
	Price           *float64 `json:"price"`      // Direct price in Birr
	SalePrice       *float64 `json:"sale_price"` // Sale/discount price in Birr
	StockQuantity   *int32   `json:"stock_quantity"`
	DisplayOrder    *int32   `json:"display_order"`
	Image           *string  `json:"image"`
}

func (h *ProductHandler) UpdateVariant(c echo.Context) error {
	idStr := c.Param("id")
	// Variant IDs are bigint (string), not UUID
	// id, err := uuid.Parse(idStr)
	// if err != nil {
	// 	return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid variant ID"})
	// }

	var req UpdateVariantRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()

	// Get existing variant
	existing, err := h.Repo.GetProductVariant(ctx, idStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Variant not found"})
		}
		c.Logger().Errorf("Failed to fetch variant %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch variant"})
	}

	// Update fields
	sku := existing.Sku
	if req.Sku != nil {
		sku = *req.Sku
	}

	stockQty := existing.StockQuantity
	if req.StockQuantity != nil {
		stockQty = sql.NullInt32{Int32: *req.StockQuantity, Valid: true}
	}

	image := existing.Image
	if req.Image != nil {
		image = toNullString(req.Image)
	}

	size := existing.Size
	if req.Size != nil {
		size = toNullString(req.Size)
	}

	color := existing.Color
	if req.Color != nil {
		color = toNullString(req.Color)
	}

	variant, err := h.Repo.UpdateProductVariant(ctx, repository.UpdateProductVariantParams{
		ID:            idStr,
		Sku:           sku,
		Size:          size,
		Color:         color,
		Image:         image,
		StockQuantity: stockQty,
	})

	if err != nil {
		c.Logger().Errorf("Failed to update variant %s: %v", idStr, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update variant"})
	}

	// Handle price update - prioritize direct price over price_adjustment
	if req.Price != nil {
		// Direct price provided (in Birr)
		newPriceCents := int64(*req.Price)

		// Handle sale price if provided
		var salePriceCents *int64
		if req.SalePrice != nil {
			sp := int64(*req.SalePrice)
			salePriceCents = &sp
		}

		// Update or insert price (and sale_price) in prices table
		err = h.Repo.UpdateVariantPriceWithSale(ctx, idStr, newPriceCents, salePriceCents, "Br")
		if err != nil {
			c.Logger().Errorf("Failed to update price for variant %s: %v", idStr, err)
		}
	} else if req.SalePrice != nil {
		// Only sale_price provided, don't touch regular price
		var salePriceCents *int64
		sp := int64(*req.SalePrice)
		salePriceCents = &sp

		// Update only sale_price
		err = h.Repo.UpdateVariantSalePriceOnly(ctx, idStr, salePriceCents)
		if err != nil {
			c.Logger().Errorf("Failed to update sale price for variant %s: %v", idStr, err)
		}
	} else if req.PriceAdjustment != nil {
		// price_adjustment is the difference from base price, we need to calculate actual price and update prices table
		// Get product base price
		product, err := h.Repo.GetProduct(ctx, existing.ProductID)
		if err == nil {
			basePriceFloat, _ := strconv.ParseFloat(product.BasePrice, 64)
			adjustmentFloat, _ := strconv.ParseFloat(*req.PriceAdjustment, 64)
			newPriceCents := int64(basePriceFloat + adjustmentFloat)

			// Update or insert price in prices table
			err = h.Repo.UpdateVariantPrice(ctx, idStr, newPriceCents, "Br")
			if err != nil {
				c.Logger().Errorf("Failed to update price for variant %s: %v", idStr, err)
			}
		}
	}

	return c.JSON(http.StatusOK, variant)
}

func toNullString(s *string) sql.NullString {
	if s == nil || *s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}

func (h *ProductHandler) DeleteVariant(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Variant ID is required"})
	}

	ctx := c.Request().Context()
	err := h.Repo.DeleteProductVariant(ctx, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete variant"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Variant deleted successfully"})
}

type BulkUpdateVariantRequest struct {
	Variants []struct {
		ID            string  `json:"id"`
		Sku           *string `json:"sku"`
		Size          *string `json:"size"`
		Color         *string `json:"color"`
		StockQuantity *int32  `json:"stock_quantity"`
		Active        *bool   `json:"active"`
		DisplayOrder  *int32  `json:"display_order"`
	} `json:"variants"`
}

func (h *ProductHandler) BulkUpdateVariants(c echo.Context) error {
	productID := c.Param("productId")
	// productID, err := uuid.Parse(productIDStr)
	// if err != nil {
	// 	return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid product ID"})
	// }

	var req BulkUpdateVariantRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()
	var updatedVariants []repository.ProductVariant

	for _, vReq := range req.Variants {
		variantID := vReq.ID
		// variantID, err := uuid.Parse(vReq.ID)
		// if err != nil {
		// 	continue
		// }

		existing, err := h.Repo.GetProductVariant(ctx, variantID)
		if err != nil {
			continue
		}

		// Verify variant belongs to product
		if existing.ProductID != productID {
			continue
		}

		sku := existing.Sku
		if vReq.Sku != nil {
			sku = *vReq.Sku
		}

		stockQty := existing.StockQuantity
		if vReq.StockQuantity != nil {
			stockQty = sql.NullInt32{Int32: *vReq.StockQuantity, Valid: true}
		}

		size := existing.Size
		if vReq.Size != nil {
			size = toNullString(vReq.Size)
		}

		color := existing.Color
		if vReq.Color != nil {
			color = toNullString(vReq.Color)
		}

		// Active and DisplayOrder are not supported in product_variants table yet

		variant, err := h.Repo.UpdateProductVariant(ctx, repository.UpdateProductVariantParams{
			ID:            variantID,
			Sku:           sku,
			Size:          size,
			Color:         color,
			StockQuantity: stockQty,
		})

		if err == nil {
			updatedVariants = append(updatedVariants, variant)
		}
	}

	return c.JSON(http.StatusOK, updatedVariants)
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GetVariantBySku retrieves a variant and its product by SKU (for barcode scanning)
func (h *ProductHandler) GetVariantBySku(c echo.Context) error {
	ctx := c.Request().Context()
	sku := c.Param("sku")

	if sku == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "SKU is required"})
	}

	result, err := h.Repo.GetVariantBySku(ctx, sku)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Variant not found"})
	}

	// Format sale price (null if not set)
	var salePriceValue interface{} = nil
	if result.SalePrice.Valid {
		salePriceValue = result.SalePrice.Int64
	}

	// Format response
	response := map[string]interface{}{
		"variant": map[string]interface{}{
			"id":               result.VariantID,
			"sku":              result.VariantSku,
			"size":             nullStringValue(result.Size),
			"color":            nullStringValue(result.Color),
			"price":            result.Price,
			"sale_price":       salePriceValue,
			"price_adjustment": nullStringValue(result.PriceAdjustment),
			"stock_quantity":   result.StockQuantity,
			"image":            nullStringValue(result.VariantImage),
		},
		"product": map[string]interface{}{
			"id":         result.ProductID,
			"name":       result.ProductName,
			"base_price": result.ProductPrice,
			"image_url":  nullStringValue(result.ProductImage),
		},
	}

	return c.JSON(http.StatusOK, response)
}

func nullStringValue(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}
