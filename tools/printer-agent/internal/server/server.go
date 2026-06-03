package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"stokasir-printer-agent/internal/config"
)

type Server struct {
	cfg    *config.Config
	mux    *http.ServeMux
	server *http.Server
}

func New(cfg *config.Config) *Server {
	s := &Server{cfg: cfg, mux: http.NewServeMux()}
	h := newHandlers(cfg)

	s.mux.HandleFunc("/health", h.health)
	s.mux.HandleFunc("/status", h.status)
	s.mux.HandleFunc("/cetak", h.cetak)
	s.mux.HandleFunc("/test", h.test)

	s.server = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      corsMiddleware(s.mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

func (s *Server) Start() error {
	ln, err := net.Listen("tcp", s.server.Addr)
	if err != nil {
		return fmt.Errorf("cannot bind to %s: %w", s.server.Addr, err)
	}
	log.Printf("stokasir-printer-agent listening on %s (printer: %s %s)",
		s.server.Addr, s.cfg.Printer.Type, s.cfg.Printer.Device)
	return s.server.Serve(ln)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// corsMiddleware allows calls from any HTTPS origin and from localhost origins.
// The agent only binds to 127.0.0.1, so only local callers can reach it anyway.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
