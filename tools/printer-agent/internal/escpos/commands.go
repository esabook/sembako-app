package escpos

// ESC/POS raw byte command constants.
// Compatible with Epson, Star, Citizen, and most generic 58mm/80mm thermal printers.
var (
	Init        = []byte{0x1B, 0x40}              // ESC @ — initialize printer
	AlignLeft   = []byte{0x1B, 0x61, 0x00}        // ESC a 0
	AlignCenter = []byte{0x1B, 0x61, 0x01}        // ESC a 1
	AlignRight  = []byte{0x1B, 0x61, 0x02}        // ESC a 2
	BoldOn      = []byte{0x1B, 0x45, 0x01}        // ESC E 1
	BoldOff     = []byte{0x1B, 0x45, 0x00}        // ESC E 0
	DoubleSize  = []byte{0x1D, 0x21, 0x11}        // GS ! 17 — 2x width+height
	NormalSize  = []byte{0x1D, 0x21, 0x00}        // GS ! 0
	LF          = []byte{0x0A}                    // line feed
	Feed3       = []byte{0x1B, 0x64, 0x03}        // ESC d 3 — feed 3 lines
	Cut         = []byte{0x1D, 0x56, 0x42, 0x00}  // GS V B 0 — partial cut
)
