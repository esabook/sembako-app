<script lang="ts">
	import { onMount } from 'svelte'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import Spinner from '$lib/components/ui/Spinner.svelte'

	// ── Tipe ─────────────────────────────────────────────────────────────────
	type SampleItem = {
		nama: string
		qty: number
		satuan: string
		harga: number
		diskon: number   // diskon per item (Rp)
	}

	// ── Sample data (contoh barang) ───────────────────────────────────────────
	const ITEMS: SampleItem[] = [
		{ nama: 'Indomie Goreng', qty: 5, satuan: 'pcs', harga: 3500, diskon: 0 },
		{ nama: 'Aqua 600ml',     qty: 2, satuan: 'btl', harga: 4000, diskon: 1000 },  // diskon Rp 1.000
		{ nama: 'Teh Botol Sosro', qty: 3, satuan: 'btl', harga: 5000, diskon: 0 },
	]

	const DISKON_MEMBER = 2500   // contoh diskon member/promo

	// ── State ─────────────────────────────────────────────────────────────────
	let loading  = $state(true)
	let namaToko = $state('Stokasir')
	let alamat   = $state('')
	let header   = $state('')
	let footer   = $state('')
	let ukuran   = $state('80')

	// ── Kalkulasi ─────────────────────────────────────────────────────────────
	const totalQty     = ITEMS.reduce((s, i) => s + i.qty, 0)
	const subtotalKotor = ITEMS.reduce((s, i) => s + i.qty * i.harga, 0)
	const totalDiskonItem = ITEMS.reduce((s, i) => s + i.diskon, 0)
	const subtotal     = subtotalKotor - totalDiskonItem - DISKON_MEMBER
	const ppn          = Math.round(subtotal * 0.1)
	const total        = subtotal + ppn
	const bayar        = Math.ceil(total / 1000) * 1000
	const kembali      = bayar - total

	// ── Contoh nomor & waktu ──────────────────────────────────────────────────
	const NO_TRX = 'TRX-' + new Date().toLocaleDateString('sv-SE').replace(/-/g, '') + '-0001'

	function nowStr() {
		const d = new Date()
		const dd  = String(d.getDate()).padStart(2, '0')
		const mm  = String(d.getMonth() + 1).padStart(2, '0')
		const yyyy = d.getFullYear()
		const hh  = String(d.getHours()).padStart(2, '0')
		const min = String(d.getMinutes()).padStart(2, '0')
		return `${dd}/${mm}/${yyyy}-${hh}:${min}`
	}

	const waktu  = nowStr()
	const kasir  = $derived($user?.nama ?? 'Kasir')

	// ── Format rupiah ─────────────────────────────────────────────────────────
	function rp(n: number) {
		return new Intl.NumberFormat('id-ID').format(Math.round(n))
	}

	// ── Load pengaturan ───────────────────────────────────────────────────────
	onMount(async () => {
		const res = await api.get<Record<string, string>>('/pengaturan')
		if (res.success) {
			namaToko = res.data.nama_toko  ?? 'Stokasir'
			alamat   = res.data.alamat     ?? ''
			header   = res.data.struk_header ?? ''
			footer   = res.data.struk_footer ?? 'Terima kasih sudah berbelanja!'
			ukuran   = res.data.struk_ukuran ?? '80'
		}
		loading = false
	})

	// ── Dash line ─────────────────────────────────────────────────────────────
	// Lebar karakter: 80mm ≈ 42 char, 58mm ≈ 32 char
	const DASH = $derived(ukuran === '58' ? '--------------------------------' : '------------------------------------------')
</script>

<div class="space-y-4">
	{#if loading}
		<div class="flex justify-center py-16">
			<Spinner />
		</div>
	{:else}
		<!-- ── Keterangan ──────────────────────────────────────────────────── -->
		<div class="rounded border p-3 text-xs" style="background:var(--surface);border-color:var(--border);color:var(--text-dim)">
			Preview struk thermal ({ukuran}mm) menggunakan data contoh. Header/footer diambil dari pengaturan toko.
		</div>

		<!-- ── Preview struk ──────────────────────────────────────────────── -->
		<div class="flex justify-center">
			<div
				class="rounded border p-4 text-left"
				style="
					background:#fff;
					border-color:#ccc;
					color:#000;
					font-family:'Courier New',Courier,monospace;
					font-size:{ukuran === '58' ? '8.5pt' : '9.5pt'};
					width:{ukuran === '58' ? '200px' : '260px'};
					box-shadow:0 2px 8px rgba(0,0,0,.15);
				"
			>
				<!-- 1. Header: nama toko + alamat + struk_header ──────────────── -->
				<div style="text-align:center;font-weight:bold;font-size:1.1em;margin-bottom:2px">{namaToko}</div>
				{#if alamat}
					<div style="text-align:center;font-size:0.85em;color:#555;margin-bottom:2px">{alamat}</div>
				{/if}
				{#if header}
					{#each header.split('\n') as baris, i (i)}
						<div style="text-align:center;font-size:0.85em">{baris}</div>
					{/each}
				{/if}
				<!-- No. Transaksi -->
				<div style="text-align:center;font-size:0.8em;color:#666;margin-top:2px">No: {NO_TRX}</div>

				<!-- 2. Dash line ──────────────────────────────────────────────── -->
				<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

				<!-- 3. Tanggal & kasir ───────────────────────────────────────── -->
				<div style="font-size:0.85em">Tgl : {waktu}</div>
				<div style="font-size:0.85em">Ksr : {kasir}</div>

				<!-- 4. Dash line ──────────────────────────────────────────────── -->
				<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

				<!-- 5. Barang ────────────────────────────────────────────────── -->
				{#each ITEMS as item (item.nama)}
					<div style="font-weight:600">{item.nama}</div>
					<div style="display:flex;justify-content:space-between;font-size:0.88em;color:#444">
						<span>{item.qty} {item.satuan} × {rp(item.harga)}</span>
						<span style="color:#000">{rp(item.qty * item.harga)}</span>
					</div>
					{#if item.diskon > 0}
						<div style="font-size:0.82em;color:#b36000">&nbsp;&nbsp;diskon &minus;{rp(item.diskon)}</div>
					{/if}
				{/each}

				<!-- 6. Dash line ──────────────────────────────────────────────── -->
				<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

				<!-- 7. Ringkasan ─────────────────────────────────────────────── -->
				<div style="display:flex;justify-content:space-between;font-size:0.88em">
					<span>Total Qty</span><span>{totalQty}</span>
				</div>
				<div style="display:flex;justify-content:space-between;font-size:0.88em">
					<span>Subtotal</span><span>{rp(subtotalKotor)}</span>
				</div>
				{#if totalDiskonItem > 0}
					<div style="display:flex;justify-content:space-between;font-size:0.88em;color:#b36000">
						<span>Diskon item</span><span>&minus;{rp(totalDiskonItem)}</span>
					</div>
				{/if}
				<div style="display:flex;justify-content:space-between;font-size:0.88em;color:#b36000">
					<span>Diskon promo</span><span>&minus;{rp(DISKON_MEMBER)}</span>
				</div>
				<div style="display:flex;justify-content:space-between;font-size:0.88em">
					<span>PPN 10%</span><span>{rp(ppn)}</span>
				</div>
				<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.1em;margin-top:2px">
					<span>TOTAL</span><span>Rp {rp(total)}</span>
				</div>
				<div style="display:flex;justify-content:space-between;font-size:0.88em;margin-top:2px">
					<span>Tunai</span><span>{rp(bayar)}</span>
				</div>
				<div style="display:flex;justify-content:space-between;font-size:0.88em">
					<span>Kembali</span><span>{rp(kembali)}</span>
				</div>

				<!-- 8. Footer ───────────────────────────────────────────────── -->
				{#if footer}
					<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>
					{#each footer.split('\n') as baris, i (i)}
						<div style="text-align:center;font-size:0.85em">{baris}</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- ── Catatan ukuran ──────────────────────────────────────────────── -->
		<p class="text-center text-xs" style="color:var(--text-dim)">
			Ukuran kertas: <strong style="color:var(--text)">{ukuran}mm</strong> —
			ubah di tab <a href="/pengaturan" class="underline" style="color:var(--accent)">Pengaturan</a>
		</p>
	{/if}
</div>
