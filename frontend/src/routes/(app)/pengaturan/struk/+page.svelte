<script lang="ts">
	import { onMount } from 'svelte'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import Spinner from '$lib/components/ui/Spinner.svelte'
	import StrukPreview from '$lib/components/ui/StrukPreview.svelte'
	import { renderStrukHtml, buildStrukHtmlCopies, cetakStrukPopup, type StrukData } from '$lib/utils/struk'

	let loading  = $state(true)
	let saving   = $state(false)
	let saved    = $state(false)

	// ── Form fields ───────────────────────────────────────────────────────────
	let namaToko  = $state('Stokasir')
	let alamat    = $state('')
	let header    = $state('')
	let footer    = $state('Terima kasih sudah berbelanja!')
	let ukuran    = $state<'58' | '80'>('80')
	let autoCetak = $state(false)
	let copy      = $state<'1' | '2'>('1')

	const kasirNama = $derived($user?.nama ?? 'Kasir')
	const kasirKode = $derived($user?.kode_karyawan ?? null)

	// ── Sample data ───────────────────────────────────────────────────────────
	const SUBTOTAL_KOTOR = 5 * 3500 + 2 * 4000 + 3 * 5000
	const DISKON_ITEM    = 1000
	const DISKON_LAIN    = 2500
	const NET            = SUBTOTAL_KOTOR - DISKON_ITEM - DISKON_LAIN
	const TOTAL          = NET
	const BAYAR          = 42000

	const sampleData: StrukData = $derived({
		ukuran,
		namaToko,
		alamat,
		header,
		footer,
		noTransaksi: 'TRX-' + new Date().toLocaleDateString('sv-SE').replace(/-/g, '') + '-0001',
		waktu:       new Date(),
		kasirNama,
		kasirKode,
		pelangganNama: null,
		items: [
			{ nama: 'Indomie Goreng',  qty: 5, satuan: 'pcs', harga: 3500, diskon_item: 0          },
			{ nama: 'Aqua 600ml',      qty: 2, satuan: 'btl', harga: 4000, diskon_item: DISKON_ITEM },
			{ nama: 'Teh Botol Sosro', qty: 3, satuan: 'btl', harga: 5000, diskon_item: 0          },
		],
		subtotalKotor: SUBTOTAL_KOTOR,
		diskonItem:    DISKON_ITEM,
		diskonLain:    DISKON_LAIN,
		ppn:           0,
		total:         TOTAL,
		metode:        'tunai',
		nominal:       BAYAR,
		kembali:       BAYAR - TOTAL,
	})

	// ── Load pengaturan ───────────────────────────────────────────────────────
	onMount(async () => {
		const res = await api.get<Record<string, string>>('/pengaturan')
		if (res.success) {
			namaToko  = res.data.nama_toko      ?? 'Stokasir'
			alamat    = res.data.alamat         ?? ''
			header    = res.data.struk_header   ?? ''
			footer    = res.data.struk_footer   ?? 'Terima kasih sudah berbelanja!'
			ukuran    = (res.data.struk_ukuran as '58' | '80') ?? '80'
			copy      = (res.data.struk_copy as '1' | '2') ?? '1'
			autoCetak = res.data.auto_cetak === 'true'
		}
		loading = false
	})

	// ── Simpan ────────────────────────────────────────────────────────────────
	async function simpan() {
		saving = true
		const res = await api.post('/pengaturan/bulk', {
			struk_header: header,
			struk_footer: footer,
			struk_ukuran: ukuran,
			struk_copy:   copy,
			auto_cetak:   String(autoCetak),
		})
		saving = false
		if (res.success) {
			saved = true
			setTimeout(() => { saved = false }, 2000)
		}
	}

	// ── Test cetak ────────────────────────────────────────────────────────────
	function cetakContoh() {
		const html = buildStrukHtmlCopies(sampleData, Number(copy))
		cetakStrukPopup(html, () => alert('Popup diblokir browser — izinkan popup untuk halaman ini'))
	}
</script>

<div class="space-y-5 pb-8">
	{#if loading}
		<div class="flex justify-center py-16">
			<Spinner />
		</div>
	{:else}
		<!-- ── Form pengaturan ─────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-xs font-bold uppercase tracking-widest" style="color:var(--text-dim)">Pengaturan Struk</h2>

			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Header -->
				<div class="space-y-1">
					<label for="s-header" class="text-xs" style="color:var(--text-dim)">Header Struk</label>
					<textarea
						id="s-header"
						bind:value={header}
						placeholder="Teks di atas garis pemisah (misal: promo, tagline)"
						rows="3"
						class="w-full rounded border px-3 py-2 text-sm resize-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					></textarea>
				</div>

				<!-- Footer -->
				<div class="space-y-1">
					<label for="s-footer" class="text-xs" style="color:var(--text-dim)">Footer Struk</label>
					<textarea
						id="s-footer"
						bind:value={footer}
						placeholder="Teks penutup (ucapan terima kasih, dll)"
						rows="3"
						class="w-full rounded border px-3 py-2 text-sm resize-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					></textarea>
				</div>
			</div>

			<!-- Ukuran kertas -->
			<div class="space-y-1.5">
				<span class="text-xs" style="color:var(--text-dim)">Ukuran Kertas Thermal</span>
				<div class="flex gap-4">
					{#each ([['58', '58mm (sempit)'], ['80', '80mm (lebar)']] as [string, string][]) as [val, lbl] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" bind:group={ukuran} value={val} class="accent-green-500" />
							<span class="text-sm" style="color:var(--text)">{lbl}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Jumlah copy -->
			<div class="space-y-1.5">
				<span class="text-xs" style="color:var(--text-dim)">Jumlah Salinan (Copy)</span>
				<div class="flex gap-4">
					{#each ([['1', '1 copy'], ['2', '2 copy']] as [string, string][]) as [val, lbl] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" bind:group={copy} value={val} class="accent-green-500" />
							<span class="text-sm" style="color:var(--text)">{lbl}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Auto-cetak -->
			<div class="flex items-center justify-between rounded border p-3" style="border-color:var(--border);background:var(--surface2)">
				<div>
					<div class="text-sm font-medium" style="color:var(--text)">Auto-cetak setelah transaksi</div>
					<div class="text-xs mt-0.5" style="color:var(--text-dim)">Struk langsung tercetak tanpa harus klik tombol</div>
				</div>
				<button
					onclick={() => { autoCetak = !autoCetak }}
					class="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
					style="background:{autoCetak ? 'var(--accent)' : 'var(--border)'}"
					aria-label="Toggle auto-cetak"
					role="switch"
					aria-checked={autoCetak}
				>
					<span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
						style="transform:translateX({autoCetak ? '1.25rem' : '0.125rem'})"></span>
				</button>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-1">
				<button
					onclick={simpan}
					disabled={saving}
					class="px-4 py-2 rounded text-sm font-bold transition-all disabled:opacity-50"
					style="background:var(--accent);color:var(--bg)"
				>
					{saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan'}
				</button>
				<button
					onclick={cetakContoh}
					class="px-4 py-2 rounded text-sm border transition-all hover:opacity-80"
					style="border-color:var(--border);color:var(--text)"
				>
					🖨 Cetak Contoh
				</button>
			</div>
		</section>

		<!-- ── Preview ────────────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-xs font-bold uppercase tracking-widest" style="color:var(--text-dim)">
				Preview Struk <span style="color:var(--accent)">{ukuran}mm</span>
			</h2>
			<p class="text-xs" style="color:var(--text-dim)">
				Preview menggunakan data contoh. Perubahan langsung terlihat sebelum disimpan.
			</p>
			<div class="flex justify-center">
				<StrukPreview data={sampleData} />
			</div>
		</section>
	{/if}
</div>
