package server

import (
	"encoding/json"
	"net/http"
	"time"

	"stokasir-printer-agent/internal/config"
	"stokasir-printer-agent/internal/escpos"
	"stokasir-printer-agent/internal/printer"
)

type handlers struct {
	cfg *config.Config
}

func newHandlers(cfg *config.Config) *handlers {
	return &handlers{cfg: cfg}
}

// ── Request / Response types ──────────────────────────────────────────────────

type PrintRequest struct {
	Data   escpos.StrukData `json:"data"`
	Copies int              `json:"copies"`
}

type statusResponse struct {
	OK     bool   `json:"ok"`
	Type   string `json:"type"`
	Device string `json:"device"`
	Width  int    `json:"width"`
}

type printResponse struct {
	OK      bool   `json:"ok"`
	Copies  int    `json:"copies,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func (h *handlers) health(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]any{"ok": true, "version": Version})
}

func (h *handlers) status(w http.ResponseWriter, r *http.Request) {
	device := h.cfg.Printer.Device
	if h.cfg.Printer.Type == "network" {
		device = h.cfg.Printer.Host
	}
	jsonOK(w, statusResponse{
		OK:     true,
		Type:   h.cfg.Printer.Type,
		Device: device,
		Width:  h.cfg.Printer.Width,
	})
}

func (h *handlers) cetak(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PrintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Copies < 1 {
		req.Copies = 1
	}

	data := escpos.Render(req.Data, h.cfg.Printer.Width)
	for i := 0; i < req.Copies; i++ {
		if err := h.writeToPrinter(data); err != nil {
			jsonErr(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	jsonOK(w, printResponse{OK: true, Copies: req.Copies})
}

func (h *handlers) test(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sample := sampleStrukData()
	data := escpos.Render(sample, h.cfg.Printer.Width)
	if err := h.writeToPrinter(data); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonOK(w, printResponse{OK: true, Copies: 1})
}

// ── Printer factory ───────────────────────────────────────────────────────────

func (h *handlers) writeToPrinter(data []byte) error {
	var p printer.Printer
	var err error

	switch h.cfg.Printer.Type {
	case "network":
		p, err = printer.NewNetwork(h.cfg.Printer.Host, h.cfg.Printer.Port)
	case "serial":
		p, err = printer.NewSerial(h.cfg.Printer.Device, 0)
	default: // "usb"
		p, err = printer.NewUSB(h.cfg.Printer.Device)
	}
	if err != nil {
		return err
	}
	defer p.Close()
	return p.Write(data)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func sampleStrukData() escpos.StrukData {
	nama := "Indomie Goreng"
	satuan := "pcs"
	return escpos.StrukData{
		Ukuran:        "80",
		NamaToko:      "Stokasir Demo",
		Alamat:        "Jl. Contoh No. 1",
		Header:        "Promo: Beli 5 Gratis 1",
		Footer:        "Terima kasih sudah berbelanja!",
		NoTransaksi:   "TRX-20240601-0001",
		Waktu:         time.Now(),
		KasirNama:     "Budi Santoso",
		PelangganNama: nil,
		Items: []escpos.StrukItem{
			{Nama: nama, Qty: 3, Satuan: &satuan, Harga: 3500, DiskonItem: 0},
			{Nama: "Aqua 600ml", Qty: 2, Harga: 4000, DiskonItem: 1000},
		},
		SubtotalKotor: 3*3500 + 2*4000,
		DiskonItem:    1000,
		DiskonLain:    0,
		Ppn:           0,
		Total:         3*3500 + 2*4000 - 1000,
		Metode:        "tunai",
		Nominal:       20000,
		Kembali:       20000 - (3*3500 + 2*4000 - 1000),
	}
}
