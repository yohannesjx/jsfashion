package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadFile(c echo.Context) error {
	// Read form file
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "No file uploaded"})
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid file type. Only images are allowed."})
	}

	// Open source file
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to open file"})
	}
	defer src.Close()

	// Ensure uploads directory exists - use absolute path
	uploadDir := "/app/uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create upload directory"})
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s-%d%s", uuid.New().String(), time.Now().Unix(), ext)
	dstPath := filepath.Join(uploadDir, filename)

	// Create destination file
	dst, err := os.Create(dstPath)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create destination file"})
	}
	defer dst.Close()

	// Copy content
	if _, err = io.Copy(dst, src); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save file"})
	}

	// Return public URL
	// Use API base URL for consistent access
	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.jsfashion.et"
	}
	publicUrl := fmt.Sprintf("%s/uploads/%s", baseURL, filename)

	return c.JSON(http.StatusOK, map[string]string{
		"url": publicUrl,
	})
}
