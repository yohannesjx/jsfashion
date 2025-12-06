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
		chatID = "358753046" // Default to admin's chat ID
	}

	// Format message
	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("🛍️ <b>New Order #%d</b>\n\n", n.OrderNumber))
	msg.WriteString(fmt.Sprintf("👤 <b>Customer:</b> %s\n", escapeHTML(n.CustomerName)))
	msg.WriteString(fmt.Sprintf("📞 <b>Phone:</b> <code>%s</code>\n", escapeHTML(n.CustomerPhone)))
	msg.WriteString(fmt.Sprintf("📍 <b>Address:</b> %s, %s\n\n", escapeHTML(n.Address), escapeHTML(n.City)))

	msg.WriteString("🛒 <b>Items:</b>\n")
	for _, item := range n.Items {
		variantInfo := ""
		if item.Variant != "" {
			variantInfo = fmt.Sprintf(" (%s)", item.Variant)
		}
		msg.WriteString(fmt.Sprintf("• %dx %s%s - %s ETB\n",
			item.Quantity,
			escapeHTML(item.Name),
			escapeHTML(variantInfo),
			formatPrice(item.Price*int64(item.Quantity))))
	}

	msg.WriteString(fmt.Sprintf("\n💰 <b>Total: %s ETB</b>", formatPrice(n.TotalAmount)))

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
			"parse_mode": "HTML",
		}
		reqBody, _ = json.Marshal(payload)
	} else {
		method = "sendMessage"
		payload := map[string]interface{}{
			"chat_id":    chatID,
			"text":       msg.String(),
			"parse_mode": "HTML",
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

func escapeHTML(text string) string {
	replacer := strings.NewReplacer(
		"<", "&lt;",
		">", "&gt;",
		"&", "&amp;",
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
