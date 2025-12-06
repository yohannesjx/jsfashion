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

func SendTelegramOrder(n OrderNotification) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		token = "8372588034:AAEKayEevw-OVPAm6Vbid3X0TrcPpoIEQUk"
	}
	chatID := os.Getenv("TELEGRAM_CHAT_ID")
	if chatID == "" {
		chatID = "358753046"
	}

	// Format message - simple plain text first to avoid formatting issues
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

	msg.WriteString(fmt.Sprintf("\n💰 TOTAL: %d ETB", n.TotalAmount))

	// Send as plain text message (no photo, no special formatting)
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)

	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    msg.String(),
	}
	reqBody, _ := json.Marshal(payload)

	fmt.Printf("Telegram Request: %s\n", string(reqBody))

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("http error: %v", err)
	}
	defer resp.Body.Close()

	// Read response body for debugging
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Telegram Response: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram api returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
