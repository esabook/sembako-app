package printer

import "os"

// USBPrinter writes raw bytes to a Linux USB printer device file (e.g. /dev/usb/lp0).
// On Windows, this can also target LPT1 or a raw USB device path.
type USBPrinter struct {
	path string
	file *os.File
}

func NewUSB(devicePath string) (*USBPrinter, error) {
	f, err := os.OpenFile(devicePath, os.O_WRONLY, 0600)
	if err != nil {
		return nil, err
	}
	return &USBPrinter{path: devicePath, file: f}, nil
}

func (p *USBPrinter) Write(data []byte) error {
	_, err := p.file.Write(data)
	return err
}

func (p *USBPrinter) Close() error {
	return p.file.Close()
}
