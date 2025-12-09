package handlers

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

type MediaHandler struct{}

type MediaFile struct {
	URL        string    `json:"url"`
	Filename   string    `json:"filename"`
	UploadedAt time.Time `json:"uploadedAt"`
	Size       int64     `json:"size"`
}

func NewMediaHandler() *MediaHandler {
	return &MediaHandler{}
}

// ListMedia returns all uploaded media files
func (h *MediaHandler) ListMedia(c echo.Context) error {
	uploadsDir := "./uploads"
	var mediaFiles []MediaFile

	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.jsfashion.et"
	}

	// Check if uploads directory exists
	if _, err := os.Stat(uploadsDir); os.IsNotExist(err) {
		c.Logger().Errorf("Uploads directory does not exist: %s", uploadsDir)
		return c.JSON(http.StatusOK, []MediaFile{}) // Return empty array
	}

	// Walk through uploads directory
	err := filepath.WalkDir(uploadsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			c.Logger().Errorf("Error walking path %s: %v", path, err)
			return err
		}

		// Skip directories and non-image files
		if d.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(d.Name()))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
			return nil
		}

		// Get file info
		info, err := d.Info()
		if err != nil {
			c.Logger().Warnf("Cannot get info for %s: %v", path, err)
			return nil // Skip files we can't read
		}

		// Get relative path from uploads directory
		relPath, err := filepath.Rel(uploadsDir, path)
		if err != nil {
			c.Logger().Warnf("Cannot get relative path for %s: %v", path, err)
			return nil
		}

		// Convert to URL path (use forward slashes)
		urlPath := filepath.ToSlash(relPath)

		mediaFiles = append(mediaFiles, MediaFile{
			URL:        fmt.Sprintf("%s/uploads/%s", baseURL, urlPath),
			Filename:   d.Name(),
			UploadedAt: info.ModTime(),
			Size:       info.Size(),
		})

		return nil
	})

	if err != nil {
		c.Logger().Errorf("Failed to walk uploads directory: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to list media files",
		})
	}

	c.Logger().Infof("Found %d media files", len(mediaFiles))

	// Sort by upload date (newest first)
	// Simple bubble sort since we don't expect thousands of files
	for i := 0; i < len(mediaFiles)-1; i++ {
		for j := i + 1; j < len(mediaFiles); j++ {
			if mediaFiles[i].UploadedAt.Before(mediaFiles[j].UploadedAt) {
				mediaFiles[i], mediaFiles[j] = mediaFiles[j], mediaFiles[i]
			}
		}
	}

	return c.JSON(http.StatusOK, mediaFiles)
}

// DeleteMedia deletes a media file
func (h *MediaHandler) DeleteMedia(c echo.Context) error {
	filename := c.Param("filename")

	if filename == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Filename is required",
		})
	}

	// Security: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid filename",
		})
	}

	// Check in main uploads directory
	filePath := filepath.Join("./uploads", filename)

	// Also check in payment-screenshots subdirectory
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		filePath = filepath.Join("./uploads/payment-screenshots", filename)
	}

	// Delete the file
	if err := os.Remove(filePath); err != nil {
		if os.IsNotExist(err) {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "File not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete file",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "File deleted successfully",
	})
}
