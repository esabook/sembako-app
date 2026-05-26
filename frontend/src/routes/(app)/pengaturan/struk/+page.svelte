<script lang="ts">
	import { onMount } from 'svelte'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import Spinner from '$lib/components/ui/Spinner.svelte'
	import StrukPreview from '$lib/components/ui/StrukPreview.svelte'
	import type { StrukData } from '$lib/utils/struk'

	// ── State dari pengaturan toko ────────────────────────────────────────────
	let loading  = $state(true)
	let namaToko = $state('Stokasir')
	let alamat   = $state('')
	let header   = $state('')
	let footer   = $state('Terima kasih sudah berbelanja!')
	let ukuran   = $state<'58' | '80'>('80')

	const kasirNama = $derived($user?.nama ?? 'Kasir')

	// ── Sample data (angka tetap, mudah dibaca) ───────────────────────────────
	const SUBTOTAL_KOTOR = 5 * 3500 + 2 * 4000 + 3 * 5000  // 40.500
	const DISKON_ITEM    = 1000
	const DISKON_LAIN    = 2500
	const NET            = SUBTOTAL_KOTOR - DISKON_ITEM - DISKON_LAIN  // 37.000
	const PPN            = Math.round(NET * 0.1)                        // 3.700
	const TOTAL          = NET + PPN                                    // 40.700
	const BAYAR          = 42000
	const KEMBALI        = BAYAR - TOTAL                               // 1.300

	// ── StrukData reaktif (header/footer/ukuran dari pengaturan) ─────────────
	const sampleData: StrukData = $derived({
		ukuran,
		namaToko,
		alamat,
		header,
		footer,
		noTransaksi: 'TRX-' + new Date().toLocaleDateString('sv-SE').replace(/-/g, '') + '-0001',
		waktu:       new Date(),
		kasirNama,
		pelangganNama: null,
		items: [
			{ nama: 'Indomie Goreng',  qty: 5, satuan: 'pcs', harga: 3500, diskon_item: 0           },
			{ nama: 'Aqua 600ml',      qty: 2, satuan: 'btl', harga: 4000, diskon_item: DISKON_ITEM  },
			{ nama: 'Teh Botol Sosro', qty: 3, satuan: 'btl', harga: 5000, diskon_item: 0           },
		],
		subtotalKotor: SUBTOTAL_KOTOR,
		diskonItem:    DISKON_ITEM,
		diskonLain:    DISKON_LAIN,
		ppn:           PPN,
		total:         TOTAL,
		metode:        'tunai',
		nominal:       BAYAR,
		kembali:       KEMBALI,
	})

	// ── Load pengaturan ───────────────────────────────────────────────────────
	onMount(async () => {
		const res = await api.get<Record<string, string>>('/pengaturan')
		if (res.success) {
			namaToko = res.data.nama_toko      ?? 'Stokasir'
			alamat   = res.data.alamat         ?? ''
			header   = res.data.struk_header   ?? ''
			footer   = res.data.struk_footer   ?? 'Terima kasih sudah berbelanja!'
			ukuran   = (res.data.struk_ukuran as '58' | '80') ?? '80'
		}
		loading = false
	})
</script>

<div class="space-y-4">
	{#if loading}
		<div class="flex justify-center py-16">
			<Spinner />
		</div>
	{:else}
		<!-- ── Keterangan ─────────────────────────────────────────────────── -->
		<div class="rounded border p-3 text-xs" style="background:var(--surface);border-color:var(--border);color:var(--text-dim)">
			Preview struk thermal (<strong style="color:var(--text)">{ukuran}mm</strong>)
			menggunakan data contoh — header/footer diambil dari pengaturan toko.
			Ubah ukuran di tab
			<a href="/pengaturan" class="underline" style="color:var(--accent)">Pengaturan</a>.
		</div>

		<!-- ── Preview ───────────────────────────────────────────────────── -->
		<div class="flex justify-center">
			<StrukPreview data={sampleData} />
		</div>
	{/if}
</div>
