<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { api } from '$lib/utils/api'
	import { user } from '$lib/stores/auth.js'
	import Button from '$lib/components/ui/Button.svelte'
	import Modal from '$lib/components/ui/Modal.svelte'

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir')
	})

	// ── Types ──────────────────────────────────────────────────────────────────

	type ReturListItem = {
		id: number
		no_retur: string
		penjualan_id: number
		no_transaksi: string | null
		tanggal: string
		total_retur: number
		alasan: string | null
		metode_refund: 'tunai' | 'kurang_piutang' | 'tukar_barang'
		kasir_nama: string | null
	}

	type PenjualanDetail = {
		id: number
		no_transaksi: string
		tanggal: string
		total: number
		metode_bayar: string
		status: string
		pelanggan_id: number | null
		items: PenjualanItem[]
	}

	type PenjualanItem = {
		id: number
		barang_id: number
		nama_barang: string
		kode_barang: string
		satuan_id: number | null
		jumlah: number
		harga_jual: number
		diskon_item: number
		subtotal: number
	}

	type ReturDetail = {
		id: number
		no_retur: string
		no_transaksi: string | null
		tanggal: string
		total_retur: number
		alasan: string | null
		metode_refund: string
		catatan: string | null
		kasir_nama: string | null
		items: {
			barang_id: number
			nama_barang: string
			kode_barang: string
			nama_satuan: string | null
			jumlah_retur: number
			harga_jual: number
			subtotal: number
		}[]
	}

	type KasBank = { id: number; nama: string; tipe: 'kas' | 'bank' }

	type ItemRetur = PenjualanItem & {
		dipilih: boolean
		jumlah_retur: number
	}

	// ── State ──────────────────────────────────────────────────────────────────

	let loading = $state(true)
	let returList = $state<ReturListItem[]>([])
	let kasBankList = $state<KasBank[]>([])
	let error = $state('')

	const hariIni = new Date().toISOString().slice(0, 10)
	const sebulanLalu = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
	let filterDari = $state(sebulanLalu)
	let filterSampai = $state(hariIni)

	// ── Modal Buat Retur ──────────────────────────────────────────────────────

	let modalBuat = $state(false)
	let step = $state<1 | 2 | 3>(1)

	let cariNo = $state('')
	let loadingCari = $state(false)
	let errorCari = $state('')
	let trxAsal = $state<PenjualanDetail | null>(null)
	let itemsRetur = $state<ItemRetur[]>([])

	let alasan = $state('')
	let metodeRefund = $state<'tunai' | 'kurang_piutang' | 'tukar_barang'>('tunai')
	let kasBankId = $state(0)
	let catatan = $state('')
	let saving = $state(false)

	// ── Modal Detail ──────────────────────────────────────────────────────────

	let modalDetail = $state(false)
	let detailData = $state<ReturDetail | null>(null)
	let loadingDetail = $state(false)

	// ── Computed ──────────────────────────────────────────────────────────────

	let itemsDipilih = $derived(itemsRetur.filter((i) => i.dipilih && i.jumlah_retur > 0))
	let totalRetur = $derived(itemsDipilih.reduce((s, i) => s + i.harga_jual * i.jumlah_retur, 0))

	// ── API calls ─────────────────────────────────────────────────────────────

	async function loadRetur() {
		loading = true
		error = ''
		const res = await api.get<ReturListItem[]>(
			`/retur-penjualan?dari=${filterDari}&sampai=${filterSampai}`
		)
		if (res.success) returList = res.data
		else error = res.error
		loading = false
	}

	async function loadKasBank() {
		const res = await api.get<KasBank[]>('/keuangan/kas-bank')
		if (res.success) {
			kasBankList = res.data
			kasBankId = res.data[0]?.id ?? 0
		}
	}

	async function cariTransaksi() {
		if (!cariNo.trim()) return
		loadingCari = true
		errorCari = ''
		trxAsal = null
		const res = await api.get<PenjualanDetail[]>(
			`/penjualan?q=${encodeURIComponent(cariNo.trim())}`
		)
		if (!res.success) { errorCari = res.error; loadingCari = false; return }

		const found = (res.data as unknown as PenjualanDetail[]).find(
			(t: PenjualanDetail) => t.no_transaksi === cariNo.trim()
		)
		if (!found) {
			const byId = await api.get<PenjualanDetail>(`/penjualan/${cariNo.trim()}`)
			if (byId.success) {
				await loadTrxDetail(byId.data.id)
			} else {
				errorCari = 'Transaksi tidak ditemukan'
			}
		} else {
			await loadTrxDetail(found.id)
		}
		loadingCari = false
	}

	async function loadTrxDetail(id: number) {
		const res = await api.get<PenjualanDetail>(`/penjualan/${id}`)
		if (!res.success) { errorCari = res.error; return }
		if (res.data.status === 'void') { errorCari = 'Transaksi sudah di-void, tidak bisa diretur'; return }
		trxAsal = res.data
		itemsRetur = res.data.items.map((i) => ({
			...i,
			dipilih: false,
			jumlah_retur: 0,
		}))
	}

	async function lihatDetail(id: number) {
		modalDetail = true
		loadingDetail = true
		detailData = null
		const res = await api.get<ReturDetail>(`/retur-penjualan/${id}`)
		if (res.success) detailData = res.data
		loadingDetail = false
	}

	async function submitRetur() {
		if (!trxAsal || !itemsDipilih.length) return
		saving = true
		const body = {
			penjualan_id: trxAsal.id,
			alasan: alasan || undefined,
			metode_refund: metodeRefund,
			kas_bank_id: metodeRefund === 'tunai' ? kasBankId : undefined,
			catatan: catatan || undefined,
			items: itemsDipilih.map((i) => ({
				barang_id: i.barang_id,
				satuan_id: i.satuan_id ?? undefined,
				jumlah_retur: i.jumlah_retur,
				harga_jual: i.harga_jual,
			})),
		}
		const res = await api.post<{ no_retur: string }>('/retur-penjualan', body)
		saving = false
		if (!res.success) { errorCari = res.error; return }
		tutupModalBuat()
		await loadRetur()
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function bukaBuat() {
		modalBuat = true
		step = 1
		cariNo = ''
		errorCari = ''
		trxAsal = null
		itemsRetur = []
		alasan = ''
		metodeRefund = 'tunai'
		catatan = ''
	}

	function tutupModalBuat() {
		modalBuat = false
	}

	function lanjutStep2() {
		if (!trxAsal) return
		metodeRefund = trxAsal.metode_bayar === 'hutang' ? 'kurang_piutang' : 'tunai'
		step = 2
	}

	function lanjutStep3() {
		if (!itemsDipilih.length) return
		step = 3
	}

	function toggleItem(idx: number) {
		itemsRetur[idx].dipilih = !itemsRetur[idx].dipilih
		if (itemsRetur[idx].dipilih && itemsRetur[idx].jumlah_retur === 0) {
			itemsRetur[idx].jumlah_retur = itemsRetur[idx].jumlah
		}
	}

	function fmt(n: number) {
		return n.toLocaleString('id-ID')
	}

	function fmtTgl(s: string) {
		return new Date(s).toLocaleDateString('id-ID', {
			day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
		})
	}

	const labelMetode: Record<string, string> = {
		tunai: 'Refund Tunai',
		kurang_piutang: 'Kurangi Piutang',
		tukar_barang: 'Tukar Barang',
	}

	onMount(async () => {
		await Promise.all([loadRetur(), loadKasBank()])
	})
</script>

<div class="flex min-h-[calc(100vh-44px)] flex-col gap-4 p-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base font-bold" style="color:var(--text)">Retur Penjualan</h1>
			<p class="text-xs" style="color:var(--text-dim)">Kembalikan barang dari transaksi penjualan</p>
		</div>
		<div class="flex gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto('/kasir')}>← Kasir</Button>
			<Button variant="primary" size="sm" onclick={bukaBuat}>+ Buat Retur</Button>
		</div>
	</div>

	<!-- Filter -->
	<div class="flex flex-wrap items-center gap-2 rounded border p-3 text-sm" style="background:var(--surface);border-color:var(--border)">
		<label class="flex items-center gap-1" style="color:var(--text-dim)">
			Dari
			<input type="date" bind:value={filterDari}
				class="rounded border px-2 py-1 text-xs" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
		</label>
		<label class="flex items-center gap-1" style="color:var(--text-dim)">
			Sampai
			<input type="date" bind:value={filterSampai}
				class="rounded border px-2 py-1 text-xs" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
		</label>
		<Button variant="ghost" size="sm" onclick={loadRetur}>Tampilkan</Button>
	</div>

	<!-- Tabel retur -->
	<div class="rounded border" style="background:var(--surface);border-color:var(--border)">
		{#if loading}
			<p class="p-6 text-center text-sm" style="color:var(--text-dim)">Memuat...</p>
		{:else if error}
			<p class="p-6 text-center text-sm" style="color:var(--danger)">{error}</p>
		{:else if returList.length === 0}
			<p class="p-8 text-center text-sm" style="color:var(--text-dim)">Belum ada retur pada periode ini.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b" style="border-color:var(--border)">
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">No Retur</th>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">No Transaksi Asal</th>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Tanggal</th>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Alasan</th>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Metode</th>
							<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Total Retur</th>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Kasir</th>
							<th class="px-3 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each returList as r}
							<tr class="border-b transition-colors hover:bg-[var(--surface2)]" style="border-color:var(--border)">
								<td class="px-3 py-2 font-mono font-bold" style="color:var(--accent)">{r.no_retur}</td>
								<td class="px-3 py-2 font-mono" style="color:var(--text-dim)">{r.no_transaksi ?? '-'}</td>
								<td class="px-3 py-2" style="color:var(--text)">{fmtTgl(r.tanggal)}</td>
								<td class="px-3 py-2 max-w-[140px] truncate" style="color:var(--text)">{r.alasan ?? '-'}</td>
								<td class="px-3 py-2">
									<span class="rounded px-1.5 py-0.5 text-[10px] font-bold"
										style={r.metode_refund === 'tunai'
											? 'background:rgba(0,230,118,0.12);color:var(--accent)'
											: r.metode_refund === 'kurang_piutang'
											? 'background:rgba(64,196,255,0.12);color:var(--info)'
											: 'background:rgba(255,179,0,0.12);color:var(--warn)'}>
										{labelMetode[r.metode_refund]}
									</span>
								</td>
								<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--danger)">
									-Rp {fmt(r.total_retur)}
								</td>
								<td class="px-3 py-2" style="color:var(--text-dim)">{r.kasir_nama ?? '-'}</td>
								<td class="px-3 py-2">
									<button onclick={() => lihatDetail(r.id)}
										class="rounded px-2 py-1 text-[10px] font-bold transition-colors"
										style="background:var(--surface2);color:var(--text-dim)">
										Detail
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex items-center justify-between border-t px-3 py-2 text-xs" style="border-color:var(--border);color:var(--text-dim)">
				<span>{returList.length} retur ditemukan</span>
				<span class="font-bold" style="color:var(--danger)">
					Total: -Rp {fmt(returList.reduce((s, r) => s + r.total_retur, 0))}
				</span>
			</div>
		{/if}
	</div>
</div>

<!-- ═══ Modal Buat Retur ═══════════════════════════════════════════════════ -->

{#if modalBuat}
	<Modal judul="Buat Retur Penjualan" lebar="lg" ontutup={tutupModalBuat}>
		<!-- Step indicator -->
		<div class="mb-4 flex gap-2 text-xs">
			{#each [['1', 'Cari Transaksi'], ['2', 'Pilih Item'], ['3', 'Konfirmasi']] as [s, label]}
				<div class="flex items-center gap-1">
					<span class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
						style={Number(s) <= step
							? 'background:var(--accent);color:var(--bg)'
							: 'background:var(--surface2);color:var(--text-dim)'}>
						{s}
					</span>
					<span style={Number(s) === step ? 'color:var(--text)' : 'color:var(--text-dim)'}>{label}</span>
					{#if Number(s) < 3}<span style="color:var(--border)">→</span>{/if}
				</div>
			{/each}
		</div>

		<!-- Step 1: Cari transaksi -->
		{#if step === 1}
			<div class="space-y-3">
				<p class="text-xs" style="color:var(--text-dim)">Masukkan nomor transaksi asal (format: TRX-YYYYMMDD-XXXXX)</p>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={cariNo}
						placeholder="TRX-20250517-12345"
						onkeydown={(e) => e.key === 'Enter' && cariTransaksi()}
						class="flex-1 rounded border px-3 py-2 font-mono text-sm"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					<Button variant="primary" size="sm" loading={loadingCari} onclick={cariTransaksi}>
						Cari
					</Button>
				</div>

				{#if errorCari}
					<p class="text-xs" style="color:var(--danger)">{errorCari}</p>
				{/if}

				{#if trxAsal}
					<div class="rounded border p-3 text-xs space-y-1" style="background:var(--surface2);border-color:var(--border)">
						<div class="flex justify-between">
							<span style="color:var(--text-dim)">No Transaksi</span>
							<span class="font-mono font-bold" style="color:var(--accent)">{trxAsal.no_transaksi}</span>
						</div>
						<div class="flex justify-between">
							<span style="color:var(--text-dim)">Tanggal</span>
							<span style="color:var(--text)">{fmtTgl(trxAsal.tanggal)}</span>
						</div>
						<div class="flex justify-between">
							<span style="color:var(--text-dim)">Total</span>
							<span class="font-bold" style="color:var(--text)">Rp {fmt(trxAsal.total)}</span>
						</div>
						<div class="flex justify-between">
							<span style="color:var(--text-dim)">Metode Bayar</span>
							<span style="color:var(--text)">{trxAsal.metode_bayar}</span>
						</div>
						<div class="flex justify-between">
							<span style="color:var(--text-dim)">Jumlah Item</span>
							<span style="color:var(--text)">{trxAsal.items.length} item</span>
						</div>
					</div>
				{/if}
			</div>

			{#snippet footer()}
				<Button variant="ghost" size="sm" onclick={tutupModalBuat}>Batal</Button>
				<Button variant="primary" size="sm" disabled={!trxAsal} onclick={lanjutStep2}>
					Lanjut →
				</Button>
			{/snippet}
		{/if}

		<!-- Step 2: Pilih item -->
		{#if step === 2}
			<div class="space-y-3">
				<p class="text-xs" style="color:var(--text-dim)">
					Centang item yang diretur dan sesuaikan jumlahnya.
				</p>
				<div class="space-y-2 max-h-72 overflow-y-auto">
					{#each itemsRetur as item, idx}
						<label class="flex cursor-pointer items-start gap-3 rounded border p-2.5 transition-colors"
							style={item.dipilih
								? 'border-color:var(--accent);background:rgba(0,230,118,0.05)'
								: 'border-color:var(--border);background:var(--surface2)'}>
							<input type="checkbox" checked={item.dipilih} onchange={() => toggleItem(idx)} class="mt-0.5" />
							<div class="flex-1 min-w-0">
								<div class="text-xs font-bold truncate" style="color:var(--text)">{item.nama_barang}</div>
								<div class="text-[10px]" style="color:var(--text-dim)">
									{item.kode_barang} · Harga: Rp {fmt(item.harga_jual)} · Dibeli: {item.jumlah}
								</div>
							</div>
							{#if item.dipilih}
								<div class="flex items-center gap-1">
									<span class="text-[10px]" style="color:var(--text-dim)">Qty retur:</span>
									<input
										type="number"
										min="1"
										max={item.jumlah}
										bind:value={itemsRetur[idx].jumlah_retur}
										onclick={(e) => e.stopPropagation()}
										class="w-16 rounded border px-1.5 py-1 text-center text-xs font-mono"
										style="background:var(--surface);border-color:var(--border);color:var(--text)"
									/>
								</div>
							{/if}
						</label>
					{/each}
				</div>

				{#if itemsDipilih.length > 0}
					<div class="flex justify-between rounded border px-3 py-2 text-xs font-bold"
						style="border-color:var(--accent);background:rgba(0,230,118,0.06);color:var(--accent)">
						<span>{itemsDipilih.length} item dipilih</span>
						<span>Total: Rp {fmt(totalRetur)}</span>
					</div>
				{/if}
			</div>

			{#snippet footer()}
				<Button variant="ghost" size="sm" onclick={() => (step = 1)}>← Kembali</Button>
				<Button variant="primary" size="sm" disabled={itemsDipilih.length === 0} onclick={lanjutStep3}>
					Lanjut →
				</Button>
			{/snippet}
		{/if}

		<!-- Step 3: Konfirmasi -->
		{#if step === 3}
			<div class="space-y-3 text-sm">
				<!-- Ringkasan item -->
				<div class="rounded border p-3 space-y-1 text-xs" style="background:var(--surface2);border-color:var(--border)">
					<p class="font-bold mb-1.5" style="color:var(--text)">Item yang diretur:</p>
					{#each itemsDipilih as i}
						<div class="flex justify-between">
							<span style="color:var(--text)">{i.nama_barang} × {i.jumlah_retur}</span>
							<span class="font-mono" style="color:var(--text-dim)">Rp {fmt(i.harga_jual * i.jumlah_retur)}</span>
						</div>
					{/each}
					<div class="border-t mt-2 pt-2 flex justify-between font-bold" style="border-color:var(--border)">
						<span style="color:var(--text)">Total Retur</span>
						<span style="color:var(--danger)">-Rp {fmt(totalRetur)}</span>
					</div>
				</div>

				<!-- Alasan -->
				<div>
					<label for="alasan" class="block text-xs mb-1" style="color:var(--text-dim)">Alasan Retur</label>
					<input id="alasan" type="text" bind:value={alasan} placeholder="Barang rusak, salah item, dll"
						class="w-full rounded border px-3 py-2 text-xs"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>

				<!-- Metode Refund -->
				<div>
					<p class="block text-xs mb-1" style="color:var(--text-dim)">Metode Refund</p>
					<div class="flex gap-2">
						{#each [['tunai', 'Refund Tunai'], ['kurang_piutang', 'Kurangi Piutang'], ['tukar_barang', 'Tukar Barang']] as [val, label]}
							<label class="flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs"
								style={metodeRefund === val
									? 'border-color:var(--accent);background:rgba(0,230,118,0.08);color:var(--text)'
									: 'border-color:var(--border);color:var(--text-dim)'}>
								<input type="radio" bind:group={metodeRefund} value={val}
									disabled={val === 'kurang_piutang' && trxAsal?.metode_bayar !== 'hutang'} />
								{label}
							</label>
						{/each}
					</div>
					{#if metodeRefund === 'kurang_piutang' && trxAsal?.metode_bayar !== 'hutang'}
						<p class="mt-1 text-[10px]" style="color:var(--warn)">Kurangi piutang hanya tersedia untuk transaksi hutang.</p>
					{/if}
				</div>

				<!-- Pilih Kas/Bank (jika tunai) -->
				{#if metodeRefund === 'tunai'}
					<div>
						<label for="kas-bank" class="block text-xs mb-1" style="color:var(--text-dim)">Akun Kas / Bank</label>
						<select id="kas-bank" bind:value={kasBankId}
							class="w-full rounded border px-3 py-2 text-xs"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)">
							{#each kasBankList as kb}
								<option value={kb.id}>{kb.nama} ({kb.tipe})</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Catatan -->
				<div>
					<label for="catatan" class="block text-xs mb-1" style="color:var(--text-dim)">Catatan (opsional)</label>
					<textarea id="catatan" bind:value={catatan} rows="2" placeholder="Catatan tambahan..."
						class="w-full rounded border px-3 py-2 text-xs resize-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"></textarea>
				</div>

				{#if errorCari}
					<p class="text-xs" style="color:var(--danger)">{errorCari}</p>
				{/if}
			</div>

			{#snippet footer()}
				<Button variant="ghost" size="sm" onclick={() => (step = 2)}>← Kembali</Button>
				<Button variant="danger" size="sm" loading={saving} onclick={submitRetur}>
					Proses Retur
				</Button>
			{/snippet}
		{/if}
	</Modal>
{/if}

<!-- ═══ Modal Detail Retur ════════════════════════════════════════════════ -->

{#if modalDetail}
	<Modal judul="Detail Retur" lebar="md" ontutup={() => (modalDetail = false)}>
		{#if loadingDetail}
			<p class="py-8 text-center text-sm" style="color:var(--text-dim)">Memuat...</p>
		{:else if detailData}
			<div class="space-y-3 text-xs">
				<div class="grid grid-cols-2 gap-x-4 gap-y-1 rounded border p-3" style="background:var(--surface2);border-color:var(--border)">
					<span style="color:var(--text-dim)">No Retur</span>
					<span class="font-mono font-bold" style="color:var(--accent)">{detailData.no_retur}</span>
					<span style="color:var(--text-dim)">Transaksi Asal</span>
					<span class="font-mono" style="color:var(--text)">{detailData.no_transaksi ?? '-'}</span>
					<span style="color:var(--text-dim)">Tanggal</span>
					<span style="color:var(--text)">{fmtTgl(detailData.tanggal)}</span>
					<span style="color:var(--text-dim)">Kasir</span>
					<span style="color:var(--text)">{detailData.kasir_nama ?? '-'}</span>
					<span style="color:var(--text-dim)">Metode Refund</span>
					<span style="color:var(--text)">{labelMetode[detailData.metode_refund] ?? detailData.metode_refund}</span>
					<span style="color:var(--text-dim)">Alasan</span>
					<span style="color:var(--text)">{detailData.alasan ?? '-'}</span>
					{#if detailData.catatan}
						<span style="color:var(--text-dim)">Catatan</span>
						<span style="color:var(--text)">{detailData.catatan}</span>
					{/if}
				</div>

				<div class="rounded border" style="border-color:var(--border)">
					<table class="w-full">
						<thead>
							<tr class="border-b" style="border-color:var(--border)">
								<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Barang</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Qty</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Harga</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Subtotal</th>
							</tr>
						</thead>
						<tbody>
							{#each detailData.items as item}
								<tr class="border-b" style="border-color:var(--border)">
									<td class="px-3 py-2" style="color:var(--text)">
										<div class="font-bold">{item.nama_barang}</div>
										<div style="color:var(--text-dim)">{item.kode_barang}</div>
									</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text)">{item.jumlah_retur}</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">Rp {fmt(item.harga_jual)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--danger)">Rp {fmt(item.subtotal)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr>
								<td colspan="3" class="px-3 py-2 text-right font-bold text-xs" style="color:var(--text)">Total Retur</td>
								<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--danger)">
									-Rp {fmt(detailData.total_retur)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		{/if}
	</Modal>
{/if}
