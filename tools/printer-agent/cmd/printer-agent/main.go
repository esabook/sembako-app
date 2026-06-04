package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"stokasir-printer-agent/internal/config"
	"stokasir-printer-agent/internal/server"
)

func main() {
	var (
		configPath = flag.String("config", "", "path to config YAML file")
		showVer    = flag.Bool("version", false, "show version and exit")
	)
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "stokasir-printer-agent — ESC/POS bridge for Stokasir POS\n\n")
		fmt.Fprintf(os.Stderr, "Usage: %s [options]\n\nOptions:\n", os.Args[0])
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, `
Config file search order:
  1. --config /path/to/file.yaml
  2. $HOME/.config/stokasir/printer-agent.yaml
  3. /etc/stokasir/printer-agent.yaml
  4. ./printer-agent.yaml

Printer types:
  usb     — raw file write  (device: /dev/usb/lp0, LPT1)
  serial  — serial port     (device: /dev/ttyUSB0, COM3)
  network — TCP RAW socket  (host: 192.168.1.x, port: 9100)
`)
	}
	flag.Parse()

	if *showVer {
		fmt.Println("stokasir-printer-agent", server.Version)
		os.Exit(0)
	}

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	srv := server.New(cfg)

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("shutting down...")
		if err := srv.Shutdown(context.Background()); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	if err := srv.Start(); err != nil {
		log.Println(err)
	}
}
