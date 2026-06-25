package printer

import "go.bug.st/serial"

// SerialPrinter writes raw bytes to a serial port (USB-CDC, RS232).
// Works on Windows (COM3), Linux (/dev/ttyUSB0), macOS (/dev/tty.usbserial-*).
type SerialPrinter struct {
	port serial.Port
}

func NewSerial(device string, baudRate int) (*SerialPrinter, error) {
	if baudRate == 0 {
		baudRate = 9600
	}
	mode := &serial.Mode{
		BaudRate: baudRate,
		DataBits: 8,
		Parity:   serial.NoParity,
		StopBits: serial.OneStopBit,
	}
	port, err := serial.Open(device, mode)
	if err != nil {
		return nil, err
	}
	return &SerialPrinter{port: port}, nil
}

func (p *SerialPrinter) Write(data []byte) error {
	_, err := p.port.Write(data)
	return err
}

func (p *SerialPrinter) Close() error {
	return p.port.Close()
}
