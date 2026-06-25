package printer

import (
	"fmt"
	"net"
	"time"
)

// NetworkPrinter sends raw bytes to a network-attached thermal printer
// via TCP socket (standard RAW port 9100).
type NetworkPrinter struct {
	host string
	port int
	conn net.Conn
}

func NewNetwork(host string, port int) (*NetworkPrinter, error) {
	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return nil, err
	}
	return &NetworkPrinter{host: host, port: port, conn: conn}, nil
}

func (p *NetworkPrinter) Write(data []byte) error {
	_ = p.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	_, err := p.conn.Write(data)
	return err
}

func (p *NetworkPrinter) Close() error {
	return p.conn.Close()
}
