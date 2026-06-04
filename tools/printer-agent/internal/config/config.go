package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

type PrinterConfig struct {
	Type   string `yaml:"type"`   // usb | serial | network
	Device string `yaml:"device"` // /dev/usb/lp0 | COM3 | /dev/ttyUSB0
	Host   string `yaml:"host"`   // IP for network printer
	Port   int    `yaml:"port"`   // default 9100
	Width  int    `yaml:"width"`  // 32 (58mm) or 42 (80mm)
}

type Config struct {
	Server  ServerConfig  `yaml:"server"`
	Printer PrinterConfig `yaml:"printer"`
}

func Default() *Config {
	return &Config{
		Server: ServerConfig{
			Host: "127.0.0.1",
			Port: 9999,
		},
		Printer: PrinterConfig{
			Type:   "usb",
			Device: "/dev/usb/lp0",
			Port:   9100,
			Width:  42,
		},
	}
}

// Load reads config from the first file found in the search path.
// Explicit configPath (from --config flag) takes priority.
func Load(configPath string) (*Config, error) {
	cfg := Default()

	paths := []string{}
	if configPath != "" {
		paths = append(paths, configPath)
	}

	home, _ := os.UserHomeDir()
	paths = append(paths,
		filepath.Join(home, ".config", "stokasir", "printer-agent.yaml"),
		"/etc/stokasir/printer-agent.yaml",
		"printer-agent.yaml",
	)

	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, err
		}
		break
	}

	// Apply defaults for zero values
	if cfg.Server.Host == "" {
		cfg.Server.Host = "127.0.0.1"
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 9999
	}
	if cfg.Printer.Width == 0 {
		cfg.Printer.Width = 42
	}
	if cfg.Printer.Port == 0 {
		cfg.Printer.Port = 9100
	}

	return cfg, nil
}
