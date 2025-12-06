package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/luxe-fashion/backend/internal/notification"
	"github.com/luxe-fashion/backend/internal/repository"
)

type TelegramWebhookHandler struct {
	Repo repository.Querier
}

func NewTelegramWebhookHandler(repo repository.Querier) *TelegramWebhookHandler {
	return &TelegramWebhookHandler{Repo: repo}
}

// TelegramUpdate represents an incoming update from Telegram
type TelegramUpdate struct {
	UpdateID      int64          `json:"update_id"`
	CallbackQuery *CallbackQuery `json:"callback_query"`
}

type CallbackQuery struct {
	ID      string   `json:"id"`
	From    TGUser   `json:"from"`
	Message *Message `json:"message"`
	Data    string   `json:"data"`
}

type TGUser struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}

type Message struct {
	MessageID int    `json:"message_id"`
	Text      string `json:"text"`
	Chat      Chat   `json:"chat"`
}

type Chat struct {
	ID int64 `json:"id"`
}

// HandleWebhook processes incoming Telegram webhook updates
func (h *TelegramWebhookHandler) HandleWebhook(c echo.Context) error {
	var update TelegramUpdate
	if err := c.Bind(&update); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	// Handle callback queries (button presses)
	if update.CallbackQuery != nil {
		return h.handleCallbackQuery(c, update.CallbackQuery)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (h *TelegramWebhookHandler) handleCallbackQuery(c echo.Context, cq *CallbackQuery) error {
	data := cq.Data
	ctx := c.Request().Context()

	// Parse callback data: "action_orderNumber"
	parts := strings.Split(data, "_")
	if len(parts) != 2 {
		notification.AnswerCallbackQuery(cq.ID, "Invalid action")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	action := parts[0]
	orderNumber, err := strconv.ParseInt(parts[1], 10, 32)
	if err != nil {
		notification.AnswerCallbackQuery(cq.ID, "Invalid order number")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	// Get the order
	order, err := h.Repo.GetOrderByNumber(ctx, int32(orderNumber))
	if err != nil {
		notification.AnswerCallbackQuery(cq.ID, "Order not found")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	var newStatus string
	var statusEmoji string
	var statusText string

	switch action {
	case "deliver":
		newStatus = "delivered"
		statusEmoji = "✅"
		statusText = "DELIVERED"
	case "cancel":
		newStatus = "cancelled"
		statusEmoji = "❌"
		statusText = "CANCELLED"
	default:
		notification.AnswerCallbackQuery(cq.ID, "Unknown action")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	// Check if order is already in a final status
	if order.Status == "delivered" || order.Status == "cancelled" {
		notification.AnswerCallbackQuery(cq.ID, fmt.Sprintf("Order already %s", order.Status))
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	// Update order status using raw SQL since we need to use order ID from GetOrderByNumber
	// We have order.ID as string
	orderUUID, err := parseUUID(order.ID)
	if err != nil {
		notification.AnswerCallbackQuery(cq.ID, "Failed to parse order ID")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	_, err = h.Repo.UpdateOrderStatus(ctx, repository.UpdateOrderStatusParams{
		ID:     orderUUID,
		Status: newStatus,
	})
	if err != nil {
		c.Logger().Errorf("Failed to update order status: %v", err)
		notification.AnswerCallbackQuery(cq.ID, "Failed to update order status")
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	}

	// Answer the callback query
	notification.AnswerCallbackQuery(cq.ID, fmt.Sprintf("Order #%d marked as %s!", orderNumber, statusText))

	// Update the message to show the new status
	if cq.Message != nil {
		// Get original text and append status
		originalText := cq.Message.Text
		// Find where to insert the status (before the View link)
		lines := strings.Split(originalText, "\n")
		var newLines []string
		for _, line := range lines {
			if strings.HasPrefix(line, "🔗") {
				newLines = append(newLines, fmt.Sprintf("\n%s %s\n", statusEmoji, statusText))
			}
			newLines = append(newLines, line)
		}
		newText := strings.Join(newLines, "\n")

		notification.EditMessageText(cq.Message.Chat.ID, cq.Message.MessageID, newText)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// parseUUID parses a string into uuid.UUID
func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
