package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type OrderItem struct {
	Name     string
	Quantity int32
	Price    int64
	Variant  string
}

type OrderNotification struct {
	OrderNumber   int32
	CustomerName  string
	CustomerPhone string
	Address       string
	City          string
	TotalAmount   int64
	Items         []OrderItem
	ImageURL      string
}

// Default chat IDs - all admins who should receive order notifications
var defaultChatIDs = []string{
	"358753046",  // @jj_admin (Main admin)
	"6734086506", // Kakidan Wondwessen
	"7399604556", // @jsfashionsupport (Customer Support)
	"2097854740", // @jsfashionaddis (J's Fashion)
}

func SendTelegramOrder(n OrderNotification) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}

	// Get chat IDs from env or use defaults
	chatIDsStr := os.Getenv("TELEGRAM_CHAT_IDS")
	var chatIDs []string
	if chatIDsStr != "" {
		chatIDs = strings.Split(chatIDsStr, ",")
	} else {
		chatIDs = defaultChatIDs
	}

	// Format message
	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("🛍 NEW ORDER #%d\n\n", n.OrderNumber))
	msg.WriteString(fmt.Sprintf("👤 Customer: %s\n", n.CustomerName))
	msg.WriteString(fmt.Sprintf("📞 Phone: %s\n", n.CustomerPhone))

	if n.Address != "" || n.City != "" {
		msg.WriteString(fmt.Sprintf("📍 Address: %s, %s\n\n", n.Address, n.City))
	} else {
		msg.WriteString("\n")
	}

	msg.WriteString("🛒 Items:\n")
	for _, item := range n.Items {
		variantInfo := ""
		if item.Variant != "" && item.Variant != " / " {
			variantInfo = fmt.Sprintf(" (%s)", item.Variant)
		}
		itemTotal := item.Price * int64(item.Quantity)
		msg.WriteString(fmt.Sprintf("  • %dx %s%s - %d ETB\n",
			item.Quantity,
			item.Name,
			variantInfo,
			itemTotal))
	}

	msg.WriteString(fmt.Sprintf("\n💰 TOTAL: %d ETB\n\n", n.TotalAmount))
	msg.WriteString(fmt.Sprintf("🔗 View: https://jsfashion.et/thank-you/%d", n.OrderNumber))

	// Create inline keyboard with action buttons
	inlineKeyboard := map[string]interface{}{
		"inline_keyboard": [][]map[string]interface{}{
			{
				{
					"text":          "✅ Deliver",
					"callback_data": fmt.Sprintf("deliver_%d", n.OrderNumber),
				},
				{
					"text":          "❌ Cancel",
					"callback_data": fmt.Sprintf("cancel_%d", n.OrderNumber),
				},
			},
		},
	}

	// Send to all chat IDs
	var lastErr error
	for _, chatID := range chatIDs {
		chatID = strings.TrimSpace(chatID)
		if chatID == "" {
			continue
		}

		apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)

		payload := map[string]interface{}{
			"chat_id":      chatID,
			"text":         msg.String(),
			"reply_markup": inlineKeyboard,
		}
		reqBody, _ := json.Marshal(payload)

		resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
		if err != nil {
			lastErr = fmt.Errorf("http error for chat %s: %v", chatID, err)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("telegram api returned status %d for chat %s: %s", resp.StatusCode, chatID, string(body))
		} else {
			fmt.Printf("Telegram notification sent to chat %s for Order #%d\n", chatID, n.OrderNumber)
		}
	}

	return lastErr
}

// SendTelegramMessage sends a simple message to all configured chat IDs
func SendTelegramMessage(message string) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}

	chatIDsStr := os.Getenv("TELEGRAM_CHAT_IDS")
	var chatIDs []string
	if chatIDsStr != "" {
		chatIDs = strings.Split(chatIDsStr, ",")
	} else {
		chatIDs = defaultChatIDs
	}

	var lastErr error
	for _, chatID := range chatIDs {
		chatID = strings.TrimSpace(chatID)
		if chatID == "" {
			continue
		}

		apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
		payload := map[string]interface{}{
			"chat_id": chatID,
			"text":    message,
		}
		reqBody, _ := json.Marshal(payload)

		resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
		if err != nil {
			lastErr = err
			continue
		}
		resp.Body.Close()
	}

	return lastErr
}

// AnswerCallbackQuery responds to a callback query from inline button
func AnswerCallbackQuery(callbackQueryID, text string) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/answerCallbackQuery", token)
	payload := map[string]interface{}{
		"callback_query_id": callbackQueryID,
		"text":              text,
		"show_alert":        true,
	}
	reqBody, _ := json.Marshal(payload)

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// EditMessageText updates the original message after an action
func EditMessageText(chatID int64, messageID int, newText string) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/editMessageText", token)
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"message_id": messageID,
		"text":       newText,
	}
	reqBody, _ := json.Marshal(payload)

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// SendTelegramPhoto sends a photo with caption to all configured chat IDs
func SendTelegramPhoto(photoURL, caption string) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}

	chatIDsStr := os.Getenv("TELEGRAM_CHAT_IDS")
	var chatIDs []string
	if chatIDsStr != "" {
		chatIDs = strings.Split(chatIDsStr, ",")
	} else {
		chatIDs = defaultChatIDs
	}

	var lastErr error
	for _, chatID := range chatIDs {
		chatID = strings.TrimSpace(chatID)
		if chatID == "" {
			continue
		}

		apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendPhoto", token)
		payload := map[string]interface{}{
			"chat_id": chatID,
			"photo":   photoURL,
			"caption": caption,
		}
		reqBody, _ := json.Marshal(payload)

		resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
		if err != nil {
			lastErr = fmt.Errorf("http error for chat %s: %v", chatID, err)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("telegram api returned status %d for chat %s: %s", resp.StatusCode, chatID, string(body))
		} else {
			fmt.Printf("Telegram photo sent to chat %s\n", chatID)
		}
	}

	return lastErr
}
