package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/repository"
)

type CategoryHandler struct {
	Repo *repository.Queries
}

func NewCategoryHandler(repo *repository.Queries) *CategoryHandler {
	return &CategoryHandler{Repo: repo}
}

func (h *CategoryHandler) ListCategories(c echo.Context) error {
	categories, err := h.Repo.ListCategories(c.Request().Context())
	if err != nil {
		c.Logger().Errorf("Failed to fetch categories: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch categories"})
	}

	// Transform categories to ensure proper JSON serialization
	type CategoryResponse struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		Slug         string  `json:"slug"`
		ImageUrl     *string `json:"image_url,omitempty"`
		IsActive     *bool   `json:"is_active,omitempty"`
		DisplayOrder int32   `json:"display_order"`
		CreatedAt    string  `json:"created_at"`
		UpdatedAt    string  `json:"updated_at"`
	}

	var response []CategoryResponse
	for _, cat := range categories {
		cr := CategoryResponse{
			ID:           cat.ID,
			Name:         cat.Name,
			Slug:         cat.Slug,
			DisplayOrder: cat.DisplayOrder,
		}

		if cat.ImageUrl.Valid {
			// Create a copy to avoid pointer aliasing
			imageUrl := cat.ImageUrl.String
			cr.ImageUrl = &imageUrl
		}
		if cat.IsActive.Valid {
			isActive := cat.IsActive.Bool
			cr.IsActive = &isActive
		}
		if cat.CreatedAt.Valid {
			cr.CreatedAt = cat.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		if cat.UpdatedAt.Valid {
			cr.UpdatedAt = cat.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}

		response = append(response, cr)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *CategoryHandler) GetCategory(c echo.Context) error {
	id := c.Param("id")

	ctx := c.Request().Context()
	category, err := h.Repo.GetCategory(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Category not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch category"})
	}

	return c.JSON(http.StatusOK, category)
}

type CreateCategoryRequest struct {
	Name     string  `json:"name"`
	Slug     *string `json:"slug"`
	ImageUrl *string `json:"image_url"`
	IsActive *bool   `json:"is_active"`
}

func (h *CategoryHandler) CreateCategory(c echo.Context) error {
	var req CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Name is required"})
	}

	slug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	if req.Slug != nil && *req.Slug != "" {
		slug = *req.Slug
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	ctx := c.Request().Context()
	category, err := h.Repo.CreateCategory(ctx, repository.CreateCategoryParams{
		Name:     req.Name,
		Slug:     slug,
		ImageUrl: sql.NullString{String: getStringValue(req.ImageUrl), Valid: req.ImageUrl != nil},
		IsActive: sql.NullBool{Bool: isActive, Valid: true},
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create category"})
	}

	return c.JSON(http.StatusCreated, category)
}

type UpdateCategoryRequest struct {
	Name     *string `json:"name"`
	Slug     *string `json:"slug"`
	ImageUrl *string `json:"image_url"`
	IsActive *bool   `json:"is_active"`
}

func (h *CategoryHandler) UpdateCategory(c echo.Context) error {
	id := c.Param("id")

	var req UpdateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()

	// Get existing category
	existing, err := h.Repo.GetCategory(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Category not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch category"})
	}

	// Update fields
	name := existing.Name
	if req.Name != nil {
		name = *req.Name
	}

	slug := existing.Slug
	if req.Slug != nil {
		slug = *req.Slug
	}

	imageUrl := existing.ImageUrl
	if req.ImageUrl != nil {
		imageUrl = sql.NullString{String: *req.ImageUrl, Valid: true}
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = sql.NullBool{Bool: *req.IsActive, Valid: true}
	}

	category, err := h.Repo.UpdateCategory(ctx, repository.UpdateCategoryParams{
		ID:       id,
		Name:     name,
		Slug:     slug,
		ImageUrl: imageUrl,
		IsActive: isActive,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update category"})
	}

	return c.JSON(http.StatusOK, category)
}

func (h *CategoryHandler) DeleteCategory(c echo.Context) error {
	id := c.Param("id")

	ctx := c.Request().Context()
	err := h.Repo.DeleteCategory(ctx, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete category"})
	}

	return c.NoContent(http.StatusNoContent)
}

type ReorderCategoriesRequest struct {
	Categories []struct {
		ID           string `json:"id"`
		DisplayOrder int32  `json:"display_order"`
	} `json:"categories"`
}

func (h *CategoryHandler) ReorderCategories(c echo.Context) error {
	var req ReorderCategoriesRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()

	// Update display_order for each category
	for _, cat := range req.Categories {
		query := `UPDATE categories SET display_order = $1, updated_at = NOW() WHERE id = $2`
		_, err := h.Repo.DB().ExecContext(ctx, query, cat.DisplayOrder, cat.ID)
		if err != nil {
			c.Logger().Errorf("Failed to update category %s display_order: %v", cat.ID, err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update category order"})
		}
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Category order updated successfully"})
}

func (h *CategoryHandler) GetProductCategories(c echo.Context) error {
	productID := c.Param("productId")

	ctx := c.Request().Context()
	categories, err := h.Repo.ListProductCategories(ctx, productID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch product categories"})
	}

	return c.JSON(http.StatusOK, categories)
}

type SetProductCategoriesRequest struct {
	CategoryIDs []string `json:"category_ids"`
}

func (h *CategoryHandler) SetProductCategories(c echo.Context) error {
	productID := c.Param("productId")

	var req SetProductCategoriesRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()

	// Clear existing categories
	err := h.Repo.SetProductCategories(ctx, productID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to clear product categories"})
	}

	// Add new categories
	for _, catID := range req.CategoryIDs {
		err = h.Repo.AddProductCategory(ctx, repository.AddProductCategoryParams{
			ProductID:  productID,
			CategoryID: catID,
		})
		if err != nil {
			// Log the error with more details
			c.Logger().Errorf("Failed to add category %s to product %s: %v", catID, productID, err)
			// Return error instead of silently continuing
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error":   "Failed to add category to product",
				"details": err.Error(),
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Product categories updated successfully"})
}

func (h *CategoryHandler) GetCategoryProducts(c echo.Context) error {
	slug := c.Param("slug")
	ctx := c.Request().Context()

	// Parse pagination parameters
	limit := int32(100) // Default limit
	offset := int32(0)  // Default offset

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 32); err == nil && parsedLimit > 0 {
			limit = int32(parsedLimit)
		}
	}

	if pageStr := c.QueryParam("page"); pageStr != "" {
		if parsedPage, err := strconv.ParseInt(pageStr, 10, 32); err == nil && parsedPage > 0 {
			offset = int32((parsedPage - 1) * int64(limit))
		}
	} else if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.ParseInt(offsetStr, 10, 32); err == nil && parsedOffset >= 0 {
			offset = int32(parsedOffset)
		}
	}

	products, err := h.Repo.ListProductsByCategorySlug(ctx, repository.ListProductsByCategorySlugParams{
		Slug:   slug,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.Logger().Errorf("Failed to fetch category products: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch category products"})
	}

	type ProductResponse struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Description *string `json:"description,omitempty"`
		BasePrice   string  `json:"base_price"`
		Category    *string `json:"category,omitempty"`
		ImageUrl    *string `json:"image_url,omitempty"`
		IsActive    *bool   `json:"is_active,omitempty"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	}

	var response []ProductResponse
	for _, p := range products {
		// Keep price in cents (as stored in database)
		pr := ProductResponse{
			ID:        p.ID,
			Name:      p.Name,
			BasePrice: p.BasePrice, // Price in cents
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

	return c.JSON(http.StatusOK, response)
}
