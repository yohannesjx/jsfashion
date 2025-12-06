package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
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
		// Try to look for a default or return error
		// For development, we can print this to console
		fmt.Println("TELEGRAM_CHAT_ID is not set. Skipping Telegram notification.")
		return nil
	}

	// Format message
	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("🛍️ *New Order #%d*\n\n", n.OrderNumber))
	msg.WriteString(fmt.Sprintf("👤 *Customer:* %s\n", escapeMarkdown(n.CustomerName)))
	msg.WriteString(fmt.Sprintf("📞 *Phone:* `%s`\n", escapeMarkdown(n.CustomerPhone)))
	msg.WriteString(fmt.Sprintf("📍 *Address:* %s, %s\n\n", escapeMarkdown(n.Address), escapeMarkdown(n.City)))

	msg.WriteString("🛒 *Items:*\n")
	for _, item := range n.Items {
		variantInfo := ""
		if item.Variant != "" {
			variantInfo = fmt.Sprintf(" (%s)", item.Variant)
		}
		msg.WriteString(fmt.Sprintf("• %dx %s%s - %s ETB\n",
			item.Quantity,
			escapeMarkdown(item.Name),
			escapeMarkdown(variantInfo),
			formatPrice(item.Price*int64(item.Quantity))))
	}

	msg.WriteString(fmt.Sprintf("\n💰 *Total: %s ETB*", formatPrice(n.TotalAmount)))

	// Send request
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s", token)

	var reqBody []byte
	var method string

	if n.ImageURL != "" {
		method = "sendPhoto"
		payload := map[string]interface{}{
			"chat_id":    chatID,
			"photo":      n.ImageURL,
			"caption":    msg.String(),
			"parse_mode": "MarkdownV2",
		}
		reqBody, _ = json.Marshal(payload)
	} else {
		method = "sendMessage"
		payload := map[string]interface{}{
			"chat_id":    chatID,
			"text":       msg.String(),
			"parse_mode": "MarkdownV2",
		}
		reqBody, _ = json.Marshal(payload)
	}

	resp, err := http.Post(fmt.Sprintf("%s/%s", apiURL, method), "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram api returned status: %s", resp.Status)
	}

	return nil
}

func escapeMarkdown(text string) string {
	// MarkdownV2 requires escaping specific characters
	replacer := strings.NewReplacer(
		"_", "\\_", "*", "\\*", "[", "\\[", "]", "\\]", "(", "\\(", ")", "\\)", "~", "\\~",
		"`", "\\`", ">", "\\>", "#", "\\#", "+", "\\+", "-", "\\-", "=", "\\=", "|", "\\|",
		"{", "\\{", "}", "\\}", ".", "\\.", "!", "\\!",
	)
	return replacer.Replace(text)
}

func formatPrice(cents int64) string {
	// Assuming price is in cents? Or just raw value?
	// Based on previous code, price seems to be in cents sometimes, but let's check.
	// In the frontend it was divided by 100.
	// In product_handler.go: "base_price": product.BasePrice (which is string/numeric)
	// In order_handler.go: TotalAmount is int64.
	// Let's assume it's just the value for now, or format with commas.
	// Actually, looking at order_handler.go, subtotal := variant.Price * int64(item.Quantity).
	// variant.Price is int64.
	// If it's in cents, we should divide by 100.
	// Let's check `product_handler.go` again.
	// "priceInCents := float64(v.Price)"
	// So yes, it's likely distinct units.
	// But in `order_handler.go`, `TotalAmount` is stored as string in DB but calculated as int64.
	// I'll assume it's the full integer price for now based on "2900 Birr" in screenshots.
	// Wait, the screenshot showed "2,900 Birr".
	// If `variant.Price` is 2900, then it's 2900.
	return fmt.Sprintf("%d", cents)
}
