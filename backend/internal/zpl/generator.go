package zpl

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// LabelData contains all information needed to print a shipping/fulfillment label
type LabelData struct {
	OrderNumber    string
	TrackingNumber string
	CustomerName   string
	CustomerPhone  string
	Date           time.Time
	Items          []LabelItem
	CurrentLabel   int
	TotalLabels    int
	IsLastLabel    bool
}

// LabelItem represents a single line item on the label
type LabelItem struct {
	SKU      string
	Variant  string
	Quantity int
}

const (
	// Printer settings for Zebra GC420t (203 dpi)
	// 10cm x 7cm = ~4" x 2.75"
	// 1mm = 8 dots
	LabelWidthDots   = 800 // 100mm
	LabelHeightDots  = 560 // 70mm
	MaxItemsPerLabel = 10
)

// GenerateLabels creates ZPL code for one or more labels depending on item count
func GenerateLabels(data LabelData) string {
	var zplBuilder strings.Builder

	totalItems := len(data.Items)
	if totalItems == 0 {
		// Even if no items (weird), print one header label
		return generateSingleLabel(data)
	}

	// Calculate how many labels we need
	// We just split items into chunks of MaxItemsPerLabel

	// Exception: If exactly 0 items, we handle above.
	// Integer division ceiling
	numLabels := int(math.Ceil(float64(totalItems) / float64(MaxItemsPerLabel)))
	data.TotalLabels = numLabels

	for i := 0; i < numLabels; i++ {
		start := i * MaxItemsPerLabel
		end := start + MaxItemsPerLabel
		if end > totalItems {
			end = totalItems
		}

		// Create a copy of data for this specific label chunk
		chunkData := data
		chunkData.Items = data.Items[start:end]
		chunkData.CurrentLabel = i + 1
		chunkData.IsLastLabel = (i == numLabels-1)

		zplBuilder.WriteString(generateSingleLabel(chunkData))
	}

	return zplBuilder.String()
}

func generateSingleLabel(data LabelData) string {
	// Reference: ZPL II Programming Guide
	// ^XA = Start Format
	// ^PW = Print Width
	// ^LL = Label Length
	// ^CI28 = UTF-8 Encoding support (if available)

	zpl := fmt.Sprintf(`
^XA
^PW%d
^LL%d
^CI28
`, LabelWidthDots, LabelHeightDots)

	// --- HEADER SECTION (0 - 90 dots) ---

	// Order Number (Top Left, Large)
	// ^FO(x,y) ^A0N,h,w ^FD...^FS
	zpl += fmt.Sprintf(`^FO20,20^A0N,40,40^FDORDER: %s^FS`, clean(data.OrderNumber))

	// Date (Top Right, Small)
	zpl += fmt.Sprintf(`^FO550,25^A0N,25,25^FD%s^FS`, data.Date.Format("2006-01-02"))

	// Customer Name (Under Order #)
	custName := data.CustomerName
	if len(custName) > 30 {
		custName = custName[:30]
	}
	zpl += fmt.Sprintf(`^FO20,65^A0N,25,25^FDCustomer: %s^FS`, clean(custName))

	// Separator Line
	zpl += `^FO10,95^GB780,1,3^FS`

	// --- BARCODE SECTION (100 - 230 dots) ---

	// Tracking Number Text
	zpl += fmt.Sprintf(`^FO20,110^A0N,20,20^FDTracking #: %s^FS`, data.TrackingNumber)

	// Barcode (Code 128)
	// ^BC orientation, height, flag, mode, etc.
	// We center it roughly. Width ~800. Barcode might be ~400-500 depending on length.
	// Let's assume left margin 100 for balance.
	zpl += fmt.Sprintf(`^FO100,135^BCN,70,Y,N,N^FD%s^FS`, data.TrackingNumber)

	// Separator Line
	zpl += `^FO10,230^GB780,1,3^FS`

	// --- ITEMS HEADER (240 dots) ---
	zpl += `^FO20,240^A0N,20,20^FDQTY   SKU                     VARIANT^FS`

	// --- ITEMS LIST (265 - 500 dots) ---
	// Line height = 25 dots
	y := 265
	for _, item := range data.Items {
		// Qty
		zpl += fmt.Sprintf(`^FO20,%d^A0N,20,20^FD%d^FS`, y, item.Quantity)

		// SKU (Truncate if too long)
		sku := item.SKU
		if len(sku) > 18 {
			sku = sku[:18]
		}
		zpl += fmt.Sprintf(`^FO80,%d^A0N,20,20^FD%s^FS`, y, clean(sku))

		// Variant (Truncate)
		variant := item.Variant
		if len(variant) > 25 {
			variant = variant[:25] + ".."
		}
		zpl += fmt.Sprintf(`^FO350,%d^A0N,20,20^FD%s^FS`, y, clean(variant))

		y += 25
	}

	// --- FOOTER (Bottom) ---
	// Label X of Y
	zpl += fmt.Sprintf(`^FO650,530^A0N,20,20^FDLabel %d of %d^FS`, data.CurrentLabel, data.TotalLabels)

	// End Format
	zpl += `^XZ`

	return zpl
}

// clean escapes characters incompatible with ZPL or newlines
func clean(s string) string {
	// Basic sanitation
	s = strings.ReplaceAll(s, "^", "")
	s = strings.ReplaceAll(s, "~", "")
	s = strings.ReplaceAll(s, "\n", " ")
	return s
}
