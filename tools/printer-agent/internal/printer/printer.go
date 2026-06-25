package printer

// Printer is the interface implemented by all printer backends.
type Printer interface {
	// Write sends raw bytes (ESC/POS commands) to the printer.
	Write(data []byte) error
	// Close releases the underlying connection or file descriptor.
	Close() error
}
