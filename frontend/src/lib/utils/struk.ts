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
	kasirKode?: string | null
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
// Struktur & style harus identik dengan StrukPreview.svelte.
// Pakai satuan em (relatif) agar ukuran 58mm vs 80mm otomatis menyesuaikan.

export function renderStrukHtml(d: StrukData): string {
	const lebar        = d.ukuran === '58' ? '58mm' : '80mm'
	const baseFontSize = d.ukuran === '58' ? '8.5pt' : '9.5pt'
	const waktuStr     = formatWaktuStruk(d.waktu)
	const totalQty     = d.items.reduce((s, i) => s + i.qty, 0)

	// 1 baris per item: [nama | qty | harga | subtotal] — sama dengan preview
	const itemsHtml = d.items
		.map((item) =>
			`<div style="display:flex;justify-content:space-between;">` +
			`<span>${escHtml(item.nama.slice(0, 20))}</span>` +
			`<span>${item.qty}</span>` +
			`<span>${rp(item.harga)}</span>` +
			`<span>${rp(item.qty * item.harga - item.diskon_item)}</span>` +
			`</div>`
		)
		.join('')

	const headerLines = d.header
		? d.header.split('\n').map((b) => `<div style="text-align:center;font-size:0.85em">${escHtml(b)}</div>`).join('')
		: ''
	const footerLines = d.footer
		? d.footer.split('\n').map((b) => `<div style="text-align:center;font-size:0.85em">${escHtml(b)}</div>`).join('')
		: ''

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Struk</title>
<style>
@page{size:${lebar} auto;margin:4mm 5mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:${baseFontSize};color:#000;width:100%}
hr{border:none;border-top:1px dashed #000;margin:4px 0}
.row{display:flex;justify-content:space-between}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:1.1em;margin-bottom:2px">${escHtml(d.namaToko)}</div>
${d.alamat ? `<div style="text-align:center;font-size:0.85em;color:#555;margin-bottom:2px">${escHtml(d.alamat)}</div>` : ''}
${headerLines}
${d.noTransaksi ? `<div style="text-align:center;font-size:0.8em;color:#666;margin-top:2px">${escHtml(d.noTransaksi)}</div>` : ''}
<hr>
<div style="font-size:0.85em">Tgl : ${waktuStr}</div>
${d.kasirNama ? `<div style="font-size:0.85em">Ksr : ${d.kasirKode ? escHtml(d.kasirKode) + ' ' : ''}${escHtml(d.kasirNama)}</div>` : ''}
${d.pelangganNama ? `<div style="font-size:0.85em">Pelanggan: <b>${escHtml(d.pelangganNama)}</b></div>` : ''}
<hr>
${itemsHtml}
<hr>
<div class="row" style="font-size:0.88em"><span>Total Qty</span><span>${totalQty}</span></div>
<div class="row" style="font-size:0.88em"><span>Subtotal</span><span>${rp(d.subtotalKotor)}</span></div>
${d.diskonItem > 0 ? `<div class="row" style="font-size:0.88em"><span>Diskon item</span><span>&minus;${rp(d.diskonItem)}</span></div>` : ''}
${d.diskonLain > 0 ? `<div class="row" style="font-size:0.88em"><span>Diskon</span><span>&minus;${rp(d.diskonLain)}</span></div>` : ''}
${d.ppn > 0 ? `<div class="row" style="font-size:0.88em"><span>PPN 10%</span><span>${rp(d.ppn)}</span></div>` : ''}
<div class="row" style="font-weight:bold;font-size:1.1em;margin-top:2px">
  <span>TOTAL</span><span>Rp ${rp(d.total)}</span>
</div>
<div class="row" style="font-size:0.88em;margin-top:2px">
  <span>${escHtml(METODE_LABEL_STRUK[d.metode] ?? d.metode)}</span><span>${rp(d.nominal)}</span>
</div>
<div class="row" style="font-size:0.88em">
  <span>Kembali</span><span>${rp(d.kembali)}</span>
</div>
${d.metode === 'hutang' ? '<div style="text-align:center;font-weight:bold;font-size:0.85em;margin-top:3px">[ TRANSAKSI HUTANG ]</div>' : ''}
${d.footer ? `<hr>${footerLines}` : ''}
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
