// Template data & HTML renderer untuk struk thermal printer.
// Dipakai oleh kasir (print popup) dan pengaturan/struk (visual preview).

// ── Types ──────────────────────────────────────────────────────────────────

export type StrukItem = {
	nama: string
	qty: number
	satuan?: string | null
	harga: number       // harga per satuan
	diskon_item: number // total diskon baris ini (Rp)
}

export type StrukData = {
	// Konfigurasi kertas
	ukuran: '58' | '80'
	// Identitas toko
	namaToko: string
	alamat: string
	header: string    // struk_header (bisa multi-baris, pisah \n)
	footer: string    // struk_footer (bisa multi-baris, pisah \n)
	// Metadata transaksi
	noTransaksi: string
	waktu: Date
	kasirNama: string
	pelangganNama?: string | null
	// Barang
	items: StrukItem[]
	// Ringkasan keuangan
	subtotalKotor: number  // sum(qty × harga) — sebelum semua diskon
	diskonItem: number     // sum diskon per baris
	diskonLain: number     // diskon member + promo (gabungan)
	ppn: number            // PPN (0 = tidak dipungut)
	total: number          // jumlah akhir (setelah semua diskon + ppn)
	metode: string         // 'tunai' | 'transfer' | 'qris' | 'hutang'
	nominal: number        // jumlah bayar
	kembali: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function escHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) =>
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
	)
}

export function formatWaktuStruk(d: Date): string {
	const dd   = String(d.getDate()).padStart(2, '0')
	const mm   = String(d.getMonth() + 1).padStart(2, '0')
	const yyyy = d.getFullYear()
	const hh   = String(d.getHours()).padStart(2, '0')
	const min  = String(d.getMinutes()).padStart(2, '0')
	return `${dd}/${mm}/${yyyy}-${hh}:${min}`
}

export const METODE_LABEL_STRUK: Record<string, string> = {
	tunai:    'Tunai',
	transfer: 'Transfer',
	qris:     'QRIS',
	hutang:   'Hutang',
}

function rp(n: number): string {
	return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

// ── HTML renderer (untuk print popup) ─────────────────────────────────────

export function renderStrukHtml(d: StrukData): string {
	const lebar    = d.ukuran === '58' ? '58mm' : '80mm'
	const waktuStr = formatWaktuStruk(d.waktu)
	const totalQty = d.items.reduce((s, i) => s + i.qty, 0)

	const itemsHtml = d.items
		.map(
			(item) => `
<div style="font-weight:600">${escHtml(item.nama)}</div>
<div style="display:flex;justify-content:space-between;font-size:8.5pt;color:#444">
  <span>${item.qty}${item.satuan ? ' ' + escHtml(item.satuan) : ''} &times; ${rp(item.harga)}</span>
  <span style="color:#000">${rp(item.qty * item.harga - item.diskon_item)}</span>
</div>
${item.diskon_item > 0 ? `<div style="font-size:8pt;color:#b36000">&nbsp;&nbsp;diskon &minus;${rp(item.diskon_item)}</div>` : ''}`
		)
		.join('')

	const headerLines = d.header
		? d.header.split('\n').map((b) => `<div style="text-align:center;font-size:8pt">${escHtml(b)}</div>`).join('')
		: ''
	const footerLines = d.footer
		? d.footer.split('\n').map((b) => `<div style="text-align:center;font-size:8pt">${escHtml(b)}</div>`).join('')
		: ''

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Struk</title>
<style>
@page{size:${lebar} auto;margin:4mm 5mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:9.5pt;color:#000;width:100%}
hr{border:none;border-top:1px dashed #000;margin:5px 0}
.row{display:flex;justify-content:space-between}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:12pt">${escHtml(d.namaToko)}</div>
${d.alamat ? `<div style="text-align:center;font-size:8pt">${escHtml(d.alamat)}</div>` : ''}
${headerLines}
${d.noTransaksi ? `<div style="text-align:center;font-size:8pt;color:#666;margin-top:2px">No: ${escHtml(d.noTransaksi)}</div>` : ''}
<hr>
<div style="font-size:8.5pt">Tgl : ${waktuStr}</div>
${d.kasirNama ? `<div style="font-size:8.5pt">Ksr : ${escHtml(d.kasirNama)}</div>` : ''}
${d.pelangganNama ? `<div style="font-size:8.5pt">Pelanggan: <b>${escHtml(d.pelangganNama)}</b></div>` : ''}
<hr>
${itemsHtml}
<hr>
<div class="row" style="font-size:8.5pt"><span>Total Qty</span><span>${totalQty}</span></div>
<div class="row" style="font-size:8.5pt"><span>Subtotal</span><span>${rp(d.subtotalKotor)}</span></div>
${d.diskonItem > 0 ? `<div class="row" style="font-size:8.5pt;color:#b36000"><span>Diskon item</span><span>&minus;${rp(d.diskonItem)}</span></div>` : ''}
${d.diskonLain > 0 ? `<div class="row" style="font-size:8.5pt;color:#b36000"><span>Diskon</span><span>&minus;${rp(d.diskonLain)}</span></div>` : ''}
${d.ppn > 0 ? `<div class="row" style="font-size:8.5pt"><span>PPN 10%</span><span>${rp(d.ppn)}</span></div>` : ''}
<div class="row" style="font-weight:bold;font-size:11pt;margin-top:2px">
  <span>TOTAL</span><span>Rp ${rp(d.total)}</span>
</div>
<hr>
<div class="row" style="font-size:8.5pt">
  <span>${escHtml(METODE_LABEL_STRUK[d.metode] ?? d.metode)}</span><span>${rp(d.nominal)}</span>
</div>
<div class="row" style="font-size:8.5pt">
  <span>Kembali</span><span>${rp(d.kembali)}</span>
</div>
${d.metode === 'hutang' ? '<div style="text-align:center;font-weight:bold;font-size:8.5pt;margin-top:3px">[ TRANSAKSI HUTANG ]</div>' : ''}
<hr>
${footerLines}
</body></html>`
}

// ── Print popup ────────────────────────────────────────────────────────────

export function cetakStrukPopup(html: string, onBlokir: () => void): void {
	const w = window.open('', '_blank', 'width=420,height=700,menubar=no,toolbar=no')
	if (!w) {
		onBlokir()
		return
	}
	w.document.write(html)
	w.document.close()
	w.onload = () => {
		w.print()
		w.close()
	}
}
