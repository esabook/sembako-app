VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags "-s -w -X stokasir-printer-agent/internal/server.Version=$(VERSION)"
BINARY  := stokasir-printer-agent

.PHONY: all build-pi build-linux build-win build-mac build-all install-pi clean help

all: build-linux

## build-pi: Raspberry Pi (Linux arm64)
build-pi:
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY)-linux-arm64 ./cmd/printer-agent

## build-linux: Linux amd64
build-linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY)-linux-amd64 ./cmd/printer-agent

## build-win: Windows amd64
build-win:
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY).exe ./cmd/printer-agent

## build-mac: macOS arm64 (M1/M2)
build-mac:
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY)-darwin-arm64 ./cmd/printer-agent

## build-mac-intel: macOS amd64 (Intel)
build-mac-intel:
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY)-darwin-amd64 ./cmd/printer-agent

## build-all: Semua platform sekaligus
build-all: build-pi build-linux build-win build-mac build-mac-intel

## install-pi: Copy binary + aktifkan systemd service di Raspberry Pi
install-pi: build-pi
	sudo cp dist/$(BINARY)-linux-arm64 /usr/local/bin/$(BINARY)
	sudo mkdir -p /etc/stokasir
	sudo cp config.example.yaml /etc/stokasir/printer-agent.yaml
	sudo cp stokasir-printer.service /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable --now $(BINARY)
	@echo "Selesai. Edit /etc/stokasir/printer-agent.yaml lalu:"
	@echo "  sudo systemctl restart $(BINARY)"

## clean: Hapus hasil build
clean:
	rm -rf dist/

## help: Tampilkan daftar target
help:
	@grep -E '^## ' Makefile | sed 's/## //'
