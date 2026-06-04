package escpos

import (
	"bytes"
	"fmt"
	"math"
	"strings"
	"time"
)

// StrukItem mirrors the TypeScript StrukItem type.
type StrukItem struct {
	Nama       string   `json:"nama"`
	Qty        float64  `json:"qty"`
	Satuan     *string  `json:"satuan"`
	Harga      float64  `json:"harga"`
	DiskonItem float64  `json:"diskon_item"`
}

// StrukData mirrors the TypeScript StrukData type.
type StrukData struct {
	Ukuran        string      `json:"ukuran"`
	NamaToko      string      `json:"namaToko"`
	Alamat        string      `json:"alamat"`
	Header        string      `json:"header"`
	Footer        string      `json:"footer"`
	NoTransaksi   string      `json:"noTransaksi"`
	Waktu         time.Time   `json:"waktu"`
	KasirNama     string      `json:"kasirNama"`
	KasirKode     *string     `json:"kasirKode"`
	PelangganNama *string     `json:"pelangganNama"`
	Items         []StrukItem `json:"items"`
	SubtotalKotor float64     `json:"subtotalKotor"`
	DiskonItem    float64     `json:"diskonItem"`
	DiskonLain    float64     `json:"diskonLain"`
	Ppn           float64     `json:"ppn"`
	Total         float64     `json:"total"`
	Metode        string      `json:"metode"`
	Nominal       float64     `json:"nominal"`
	Kembali       float64     `json:"kembali"`
}

// Render converts StrukData to ESC/POS bytes ready to send to a thermal printer.
// width is the character width of the paper (32 for 58mm, 42 for 80mm).
func Render(d StrukData, width int) []byte {
	var buf bytes.Buffer
	w := func(b []byte) { buf.Write(b) }
	s := func(str string) { buf.WriteString(str) }
	nl := func() { w(LF) }

	sep := strings.Repeat("-", width)
	sepEq := strings.Repeat("=", width)

	rp := func(n float64) string {
		return fmt.Sprintf("Rp %s", formatRupiah(n))
	}

	// ── Initialize ───────────────────────────────────────────────────────────
	w(Init)

	// ── Header: Nama Toko ────────────────────────────────────────────────────
	w(AlignCenter)
	w(BoldOn)
	w(DoubleSize)
	s(center(d.NamaToko, width/2)) // double-size chars are 2× wide
	nl()
	w(NormalSize)
	w(BoldOff)

	if d.Alamat != "" {
		w(AlignCenter)
		for _, line := range splitLines(d.Alamat, width) {
			s(line)
			nl()
		}
	}

	if d.Header != "" {
		w(AlignCenter)
		for _, line := range strings.Split(d.Header, "\n") {
			for _, wrapped := range splitLines(strings.TrimSpace(line), width) {
				s(wrapped)
				nl()
			}
		}
	}

	if d.NoTransaksi != "" {
		w(AlignCenter)
		s(d.NoTransaksi)
		nl()
	}

	// ── Meta ─────────────────────────────────────────────────────────────────
	s(sep)
	nl()
	w(AlignLeft)

	waktuStr := d.Waktu.In(jakartaLoc()).Format("02/01/2006-15:04")
	s(fmt.Sprintf("Tgl : %s", waktuStr))
	nl()

	if d.KasirNama != "" {
		kode := ""
		if d.KasirKode != nil {
			kode = *d.KasirKode + " "
		}
		s(fmt.Sprintf("Ksr : %s%s", kode, d.KasirNama))
		nl()
	}

	if d.PelangganNama != nil && *d.PelangganNama != "" {
		s(fmt.Sprintf("Pelanggan: %s", *d.PelangganNama))
		nl()
	}

	// ── Items ─────────────────────────────────────────────────────────────────
	s(sep)
	nl()
	w(AlignLeft)

	totalQty := 0.0
	for _, item := range d.Items {
		totalQty += item.Qty
		subtotal := item.Qty*item.Harga - item.DiskonItem

		// Line 1: item name (truncated)
		name := item.Nama
		if len(name) > width-2 {
			name = name[:width-2]
		}
		s(name)
		nl()

		// Line 2: qty × harga = subtotal (right-aligned)
		qtyStr := fmt.Sprintf("%.0f", item.Qty)
		if item.Satuan != nil && *item.Satuan != "" {
			qtyStr = fmt.Sprintf("%.0f %s", item.Qty, *item.Satuan)
		}
		hargaStr := formatRupiah(item.Harga)
		subStr := formatRupiah(subtotal)

		detail := fmt.Sprintf(" %s x %s = %s", qtyStr, hargaStr, subStr)
		detail = rightAlign(detail, width)
		s(detail)
		nl()

		if item.DiskonItem > 0 {
			disc := fmt.Sprintf("  (diskon -%s)", formatRupiah(item.DiskonItem))
			s(disc)
			nl()
		}
	}

	// ── Summary ───────────────────────────────────────────────────────────────
	s(sep)
	nl()

	printRow := func(label, val string) {
		pad := width - len(label) - len(val)
		if pad < 1 {
			pad = 1
		}
		s(label + strings.Repeat(" ", pad) + val)
		nl()
	}

	printRow("Total Qty", fmt.Sprintf("%.0f", totalQty))
	printRow("Subtotal", rp(d.SubtotalKotor))
	if d.DiskonItem > 0 {
		printRow("Diskon item", "-"+rp(d.DiskonItem))
	}
	if d.DiskonLain > 0 {
		printRow("Diskon", "-"+rp(d.DiskonLain))
	}
	if d.Ppn > 0 {
		printRow("PPN 10%", rp(d.Ppn))
	}

	// TOTAL — bold, double height
	s(sepEq)
	nl()
	w(BoldOn)
	w(DoubleSize)
	totalLabel := "TOTAL"
	totalVal := "Rp " + formatRupiah(d.Total)
	// double-size chars are 2× wide, so effective width is width/2
	halfW := width / 2
	pad := halfW - len(totalLabel) - len(totalVal)
	if pad < 1 {
		pad = 1
	}
	s(totalLabel + strings.Repeat(" ", pad) + totalVal)
	nl()
	w(NormalSize)
	w(BoldOff)
	s(sepEq)
	nl()

	metodeLabel := map[string]string{
		"tunai": "Tunai", "transfer": "Transfer",
		"qris": "QRIS", "hutang": "Hutang",
	}
	ml := metodeLabel[d.Metode]
	if ml == "" {
		ml = d.Metode
	}
	printRow(ml, formatRupiah(d.Nominal))
	printRow("Kembali", formatRupiah(d.Kembali))

	if d.Metode == "hutang" {
		w(AlignCenter)
		w(BoldOn)
		s("[ TRANSAKSI HUTANG ]")
		nl()
		w(BoldOff)
		w(AlignLeft)
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	if d.Footer != "" {
		s(sep)
		nl()
		w(AlignCenter)
		for _, line := range strings.Split(d.Footer, "\n") {
			for _, wrapped := range splitLines(strings.TrimSpace(line), width) {
				s(wrapped)
				nl()
			}
		}
	}

	// Feed and cut
	w(Feed3)
	w(Cut)

	return buf.Bytes()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func formatRupiah(n float64) string {
	n = math.Round(n)
	if n < 0 {
		return "-" + formatRupiah(-n)
	}
	s := fmt.Sprintf("%.0f", n)
	// Insert dots every 3 digits from right
	var out []byte
	for i, c := range []byte(s) {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, c)
	}
	return string(out)
}

func center(s string, width int) string {
	if len(s) >= width {
		return s[:width]
	}
	pad := (width - len(s)) / 2
	return strings.Repeat(" ", pad) + s
}

func rightAlign(s string, width int) string {
	if len(s) >= width {
		return s
	}
	return strings.Repeat(" ", width-len(s)) + s
}

// splitLines wraps long lines at word boundaries up to maxWidth.
func splitLines(s string, maxWidth int) []string {
	if s == "" {
		return []string{""}
	}
	if len(s) <= maxWidth {
		return []string{s}
	}
	var lines []string
	for len(s) > maxWidth {
		cut := maxWidth
		// try to break at last space
		for i := maxWidth - 1; i > maxWidth/2; i-- {
			if s[i] == ' ' {
				cut = i
				break
			}
		}
		lines = append(lines, s[:cut])
		s = strings.TrimSpace(s[cut:])
	}
	if s != "" {
		lines = append(lines, s)
	}
	return lines
}

func jakartaLoc() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return time.FixedZone("WIB", 7*3600)
	}
	return loc
}
