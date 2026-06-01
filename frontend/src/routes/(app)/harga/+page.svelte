<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import { toast } from '$lib/stores/ui.store.js'
	import Button from '$lib/components/ui/Button.svelte'
	import Spinner from '$lib/components/ui/Spinner.svelte'
	import SlideOver from '$lib/components/SlideOver.svelte'
	import DataTable, { type Column } from '$lib/components/DataTable.svelte'

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
	})

	// ── Types ──────────────────────────────────────────────────────────────────

	type BarangHarga = {
		id: number
		kode_barang: string
		nama_barang: string
		harga_beli_terakhir: number
		harga_jual_eceran: number
		harga_jual_grosir: number
		stok_sekarang: number
		nama_kategori: string | null
		singkatan_satuan: string | null
		margin_eceran: number | null
		margin_grosir: number | null
	}

	type HistoriHarga = {
		id: number
		harga_eceran: number
		harga_grosir: number
		tanggal_berlaku: string
		tanggal_berakhir: string | null
		nama_ubah: string | null
	}

	type PreviewMassal = {
		id: number
		kode_barang: string
		nama_barang: string
		harga_eceran_lama: number
		harga_grosir_lama: number
		harga_eceran_baru: number
		harga_grosir_baru: number
		margin_eceran_baru: number | null
	}

	// ── State ──────────────────────────────────────────────────────────────────

	type Tab = 'daftar' | 'massal'
	let tab = $derived<Tab>(
		(page.url.searchParams.get('tab') as Tab) ?? 'daftar'
	)

	// Daftar Harga
	let loading = $state(true)
	let barangList = $state<BarangHarga[]>([])
	let q = $state('')
	let filtered = $derived(
		q.trim()
			? barangList.filter(
					(b) =>
						b.nama_barang.toLowerCase().includes(q.toLowerCase()) ||
						b.kode_barang.toLowerCase().includes(q.toLowerCase())
			  )
			: barangList
	)

	// Edit Modal
	let editOpen = $state(false)
	let editTarget = $state<BarangHarga | null>(null)
	let editEceran = $state(0)
	let editGrosir = $state(0)
	let saving = $state(false)
	$effect(() => { if (!editOpen) editTarget = null })

	// Histori Modal
	let historiOpen = $state(false)
	let historiTarget = $state<BarangHarga | null>(null)
	let historiList = $state<HistoriHarga[]>([])
	let loadingHistori = $state(false)
	$effect(() => { if (!historiOpen) historiTarget = null })

	// Update Massal
	let massalChecked = $state<Set<number>>(new Set())
	let massalTipe = $state<'persen' | 'rupiah'>('persen')
	let massalNilaiEceran = $state(0)
	let massalNilaiGrosir = $state(0)
	let massalPreview = $state<PreviewMassal[]>([])
	let loadingSimulasi = $state(false)
	let loadingMassal = $state(false)
	let sudahSimulasi = $state(false)

	// ── Fetch ──────────────────────────────────────────────────────────────────

	onMount(async () => {
		const res = await api.get<BarangHarga[]>('/harga')
		if (res.success) barangList = res.data
		else toast.error('Gagal memuat data harga')
		loading = false
	})

	async function reload() {
		const res = await api.get<BarangHarga[]>('/harga')
		if (res.success) barangList = res.data
	}

	// ── Edit Single ────────────────────────────────────────────────────────────

	function bukaEdit(b: BarangHarga) {
		editTarget = b
		editEceran = b.harga_jual_eceran
		editGrosir = b.harga_jual_grosir
		editOpen = true
	}

	async function simpanEdit() {
		if (!editTarget) return
		saving = true
		const res = await api.put(`/harga/${editTarget.id}`, {
			harga_jual_eceran: editEceran,
			harga_jual_grosir: editGrosir,
		})
		if (res.success) {
			toast.sukses(`Harga ${editTarget.nama_barang} diperbarui`)
			editOpen = false
			await reload()
		} else {
			toast.error('Gagal menyimpan harga')
		}
		saving = false
	}

	// ── Histori ────────────────────────────────────────────────────────────────

	async function bukaHistori(b: BarangHarga) {
		historiTarget = b
		historiOpen = true
		historiList = []
		loadingHistori = true
		const res = await api.get<HistoriHarga[]>(`/harga/${b.id}/histori`)
		if (res.success) historiList = res.data
		else toast.error('Gagal memuat histori harga')
		loadingHistori = false
	}

	// ── Update Massal ──────────────────────────────────────────────────────────

	function toggleAll() {
		if (massalChecked.size === barangList.length) {
			massalChecked = new Set()
		} else {
			massalChecked = new Set(barangList.map((b) => b.id))
		}
		sudahSimulasi = false
		massalPreview = []
	}

	function toggleSatu(id: number) {
		const s = new Set(massalChecked)
		if (s.has(id)) s.delete(id)
		else s.add(id)
		massalChecked = s
		sudahSimulasi = false
		massalPreview = []
	}

	async function simulasi() {
		if (!massalChecked.size) {
			toast.error('Pilih minimal 1 barang')
			return
		}
		loadingSimulasi = true
		const res = await api.post<PreviewMassal[]>('/harga/simulasi', {
			barang_ids: [...massalChecked],
			tipe: massalTipe,
			nilai_eceran: massalNilaiEceran,
			nilai_grosir: massalNilaiGrosir,
		})
		if (res.success) {
			massalPreview = res.data
			sudahSimulasi = true
		} else {
			toast.error('Gagal menghitung simulasi')
		}
		loadingSimulasi = false
	}

	async function applyMassal() {
		loadingMassal = true
		const res = await api.post<{ updated: number }>('/harga/massal', {
			barang_ids: [...massalChecked],
			tipe: massalTipe,
			nilai_eceran: massalNilaiEceran,
			nilai_grosir: massalNilaiGrosir,
		})
		if (res.success) {
			toast.sukses(`${res.data.updated} barang berhasil diperbarui`)
			massalChecked = new Set()
			massalPreview = []
			sudahSimulasi = false
			massalNilaiEceran = 0
			massalNilaiGrosir = 0
			await reload()
			goto('?tab=daftar', { replaceState: true, noScroll: true })
		} else {
			toast.error('Gagal memperbarui harga')
		}
		loadingMassal = false
	}

	// ── DataTable ──────────────────────────────────────────────────────────────

	const HARGA_COLUMNS: Column[] = [
		{ key: 'nama_barang', label: 'Barang', sortable: true, minWidth: 140 },
		{ key: 'harga_beli_terakhir', label: 'H.Beli', align: 'right', sortable: true, priority: 3 },
		{ key: 'harga_jual_eceran', label: 'Eceran', align: 'right', sortable: true },
		{ key: 'margin_eceran', label: 'Margin E', align: 'right', sortable: true, priority: 2 },
		{ key: 'harga_jual_grosir', label: 'Grosir', align: 'right', sortable: true, priority: 2 },
		{ key: 'margin_grosir', label: 'Margin G', align: 'right', sortable: true, priority: 3 },
		{ key: 'aksi', label: '', align: 'right', sortable: false, hideable: false, minWidth: 90 },
	]

	let hSortKey = $state('')
	let hSortDir = $state<'asc' | 'desc'>('asc')
	let sortedFiltered = $derived.by(() => {
		if (!hSortKey) return filtered
		const list = [...filtered]
		list.sort((a, b) => {
			const av = a[hSortKey as keyof BarangHarga]
			const bv = b[hSortKey as keyof BarangHarga]
			if (av == null) return 1
			if (bv == null) return -1
			const cmp = typeof av === 'number' && typeof bv === 'number'
				? av - bv
				: String(av).localeCompare(String(bv), 'id')
			return hSortDir === 'asc' ? cmp : -cmp
		})
		return list
	})

	// ── Format ─────────────────────────────────────────────────────────────────

	function rp(n: number) {
		return new Intl.NumberFormat('id-ID').format(Math.round(n))
	}

	function pct(n: number | null) {
		if (n === null) return '-'
		return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
	}

	function marginColor(n: number | null): string {
		if (n === null) return 'color:var(--text-dim)'
		if (n < 5) return 'color:var(--danger)'
		if (n < 15) return 'color:var(--warn)'
		return 'color:var(--accent)'
	}
</script>

<div class="p-4 space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-lg font-bold" style="color:var(--text)">Manajemen Harga</h1>
	</div>

	<!-- Tab -->
	<div class="flex gap-1 border-b" style="border-color:var(--border)">
		{#each [['daftar', 'DAFTAR HARGA'], ['massal', 'UPDATE MASSAL']] as [id, label] (id)}
			<button
				onclick={() => goto(`?tab=${id}`, { replaceState: true, keepFocus: true, noScroll: true })}
				class="px-3 py-2 text-xs font-bold border-b-2 -mb-px"
				style="{tab === id ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}"
			>
				{label}
			</button>
		{/each}
	</div>

	<!-- ══ TAB: DAFTAR HARGA ══════════════════════════════════════════════════ -->
	{#if tab === 'daftar'}
		<div class="flex gap-2">
			<input
				type="search"
				bind:value={q}
				placeholder="Cari nama / kode..."
				class="flex-1 rounded border px-3 py-1.5 text-sm"
				style="background:var(--surface);border-color:var(--border);color:var(--text)"
			/>
		</div>

		{#if loading}
			<div class="flex justify-center py-12"><Spinner /></div>
		{:else}
			<DataTable
				columns={HARGA_COLUMNS}
				bind:sortKey={hSortKey}
				bind:sortDir={hSortDir}
				rowCount={sortedFiltered.length}
				emptyText="Tidak ada barang"
				tableId="harga-daftar"
				maxRows={15}
			>
				{#snippet body(hidden)}
					{#each sortedFiltered as b (b.id)}
						<tr class="border-t" style="border-color:var(--border)">
							{#if !hidden.has('nama_barang')}
								<td class="px-3 py-2 text-xs" style="color:var(--text)">
									<div class="font-medium">{b.nama_barang}</div>
									<div style="color:var(--text-dim)">{b.kode_barang} · {b.nama_kategori ?? '-'}</div>
								</td>
							{/if}
							{#if !hidden.has('harga_beli_terakhir')}
								<td class="px-3 py-2 text-right text-xs font-mono" style="color:var(--text-dim)">
									{rp(b.harga_beli_terakhir)}
								</td>
							{/if}
							{#if !hidden.has('harga_jual_eceran')}
								<td class="px-3 py-2 text-right text-xs font-mono font-bold" style="color:var(--text)">
									{rp(b.harga_jual_eceran)}
								</td>
							{/if}
							{#if !hidden.has('margin_eceran')}
								<td class="px-3 py-2 text-right text-xs font-mono" style={marginColor(b.margin_eceran)}>
									{pct(b.margin_eceran)}
								</td>
							{/if}
							{#if !hidden.has('harga_jual_grosir')}
								<td class="px-3 py-2 text-right text-xs font-mono font-bold" style="color:var(--text)">
									{rp(b.harga_jual_grosir)}
								</td>
							{/if}
							{#if !hidden.has('margin_grosir')}
								<td class="px-3 py-2 text-right text-xs font-mono" style={marginColor(b.margin_grosir)}>
									{pct(b.margin_grosir)}
								</td>
							{/if}
							{#if !hidden.has('aksi')}
								<td class="px-3 py-2">
									<div class="flex gap-1 justify-end">
										<button
											onclick={() => bukaEdit(b)}
											class="rounded px-2 py-1 text-xs font-bold"
											style="background:var(--surface2);color:var(--text)"
										>Edit</button>
										<button
											onclick={() => bukaHistori(b)}
											class="rounded px-2 py-1 text-xs"
											style="color:var(--text-dim)"
										>Histori</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				{/snippet}
			</DataTable>

			<p class="text-xs" style="color:var(--text-dim)">{sortedFiltered.length} barang · Margin: <span style="color:var(--danger)">merah &lt;5%</span> · <span style="color:var(--warn)">kuning &lt;15%</span> · <span style="color:var(--accent)">hijau ≥15%</span></p>
		{/if}
	{/if}

	<!-- ══ TAB: UPDATE MASSAL ═════════════════════════════════════════════════ -->
	{#if tab === 'massal'}
		<div class="space-y-4">
			<!-- Parameter -->
			<div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
				<h2 class="text-xs font-bold uppercase" style="color:var(--text-dim)">Parameter Perubahan</h2>

				<div class="flex gap-4">
					{#each [['persen', 'Persentase (%)'], ['rupiah', 'Nominal (Rp)']] as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" bind:group={massalTipe} value={val} class="accent-green-500" onchange={() => { sudahSimulasi = false; massalPreview = [] }} />
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="nilai_eceran" class="text-xs" style="color:var(--text-dim)">
							Perubahan Harga Eceran {massalTipe === 'persen' ? '(%)' : '(Rp)'}
						</label>
						<input
							id="nilai_eceran"
							type="number"
							bind:value={massalNilaiEceran}
							placeholder={massalTipe === 'persen' ? '10 = naik 10%' : '500 = naik Rp500'}
							class="w-full rounded border px-3 py-2 text-sm"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
							onchange={() => { sudahSimulasi = false; massalPreview = [] }}
						/>
					</div>
					<div class="space-y-1">
						<label for="nilai_grosir" class="text-xs" style="color:var(--text-dim)">
							Perubahan Harga Grosir {massalTipe === 'persen' ? '(%)' : '(Rp)'}
						</label>
						<input
							id="nilai_grosir"
							type="number"
							bind:value={massalNilaiGrosir}
							placeholder={massalTipe === 'persen' ? '8 = naik 8%' : '400 = naik Rp400'}
							class="w-full rounded border px-3 py-2 text-sm"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
							onchange={() => { sudahSimulasi = false; massalPreview = [] }}
						/>
					</div>
				</div>
			</div>

			<!-- Pilih Barang -->
			<div class="rounded border" style="border-color:var(--border)">
				<div class="flex items-center gap-3 px-3 py-2 border-b" style="background:var(--surface2);border-color:var(--border)">
					<input type="checkbox"
						checked={massalChecked.size === barangList.length && barangList.length > 0}
						onchange={toggleAll}
						class="accent-green-500"
					/>
					<span class="text-xs font-bold" style="color:var(--text-dim)">
						{massalChecked.size} / {barangList.length} barang dipilih
					</span>
				</div>
				<div class="max-h-64 overflow-y-auto">
					{#each barangList as b (b.id)}
						<label class="flex items-center gap-3 px-3 py-2 border-b cursor-pointer hover:opacity-80" style="border-color:var(--border)">
							<input type="checkbox"
								checked={massalChecked.has(b.id)}
								onchange={() => toggleSatu(b.id)}
								class="accent-green-500"
							/>
							<div class="flex-1 min-w-0">
								<div class="text-xs font-medium truncate" style="color:var(--text)">{b.nama_barang}</div>
								<div class="text-xs" style="color:var(--text-dim)">
									Eceran: {rp(b.harga_jual_eceran)} · Grosir: {rp(b.harga_jual_grosir)}
								</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Tombol -->
			<div class="flex gap-2 justify-end">
				<Button variant="ghost" onclick={simulasi} loading={loadingSimulasi}>
					Preview
				</Button>
				{#if sudahSimulasi}
					<Button onclick={applyMassal} loading={loadingMassal}>
						Terapkan ({massalChecked.size} barang)
					</Button>
				{/if}
			</div>

			<!-- Preview Simulasi -->
			{#if massalPreview.length > 0}
				<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
					<table class="w-full text-xs">
						<thead>
							<tr style="background:var(--surface2);color:var(--text-dim)">
								<th class="px-3 py-2 text-left font-bold">Barang</th>
								<th class="px-3 py-2 text-right font-bold">Eceran Lama</th>
								<th class="px-3 py-2 text-right font-bold">Eceran Baru</th>
								<th class="px-3 py-2 text-right font-bold">Grosir Lama</th>
								<th class="px-3 py-2 text-right font-bold">Grosir Baru</th>
								<th class="px-3 py-2 text-right font-bold">Margin</th>
							</tr>
						</thead>
						<tbody>
							{#each massalPreview as p (p.id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="px-3 py-2" style="color:var(--text)">{p.nama_barang}</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">{rp(p.harga_eceran_lama)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--accent)">{rp(p.harga_eceran_baru)}</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">{rp(p.harga_grosir_lama)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--accent)">{rp(p.harga_grosir_baru)}</td>
									<td class="px-3 py-2 text-right font-mono" style={marginColor(p.margin_eceran_baru)}>
										{pct(p.margin_eceran_baru)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ── SlideOver Edit Harga ───────────────────────────────────────────────── -->
<SlideOver bind:open={editOpen} title={editTarget ? `Edit Harga — ${editTarget.nama_barang}` : ''}>
	{#snippet children()}
	{#if editTarget}
	<div class="space-y-4">
		<div class="rounded p-3 text-xs" style="background:var(--surface2);color:var(--text-dim)">
			Harga Beli: <strong style="color:var(--text)">Rp {rp(editTarget.harga_beli_terakhir)}</strong>
		</div>

		<div class="space-y-1">
			<label for="edit_eceran" class="text-xs" style="color:var(--text-dim)">Harga Eceran (Rp)</label>
			<input
				id="edit_eceran"
				type="number"
				bind:value={editEceran}
				class="w-full rounded border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
			{#if editTarget.harga_beli_terakhir > 0}
				<p class="text-xs" style={marginColor(((editEceran - editTarget.harga_beli_terakhir) / editTarget.harga_beli_terakhir) * 100)}>
					Margin: {pct(((editEceran - editTarget.harga_beli_terakhir) / editTarget.harga_beli_terakhir) * 100)}
				</p>
			{/if}
		</div>

		<div class="space-y-1">
			<label for="edit_grosir" class="text-xs" style="color:var(--text-dim)">Harga Grosir (Rp)</label>
			<input
				id="edit_grosir"
				type="number"
				bind:value={editGrosir}
				class="w-full rounded border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
			{#if editTarget.harga_beli_terakhir > 0}
				<p class="text-xs" style={marginColor(((editGrosir - editTarget.harga_beli_terakhir) / editTarget.harga_beli_terakhir) * 100)}>
					Margin: {pct(((editGrosir - editTarget.harga_beli_terakhir) / editTarget.harga_beli_terakhir) * 100)}
				</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<Button variant="ghost" onclick={() => editOpen = false}>Batal</Button>
			<Button onclick={simpanEdit} loading={saving}>Simpan</Button>
		</div>
	</div>
	{/if}
	{/snippet}
</SlideOver>

<!-- ── SlideOver Histori Harga ────────────────────────────────────────────── -->
<SlideOver bind:open={historiOpen} title={historiTarget ? `Histori Harga — ${historiTarget.nama_barang}` : ''}>
	{#snippet children()}
	{#if loadingHistori}
		<div class="flex justify-center py-8"><Spinner /></div>
	{:else if historiList.length === 0}
		<p class="py-8 text-center text-xs" style="color:var(--text-dim)">Belum ada histori harga</p>
	{:else}
		<table class="w-full text-xs">
			<thead>
				<tr style="color:var(--text-dim)">
					<th class="pb-2 text-left font-bold">Tanggal</th>
					<th class="pb-2 text-right font-bold">Eceran</th>
					<th class="pb-2 text-right font-bold">Grosir</th>
					<th class="pb-2 text-left font-bold">Diubah oleh</th>
					<th class="pb-2 text-left font-bold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each historiList as h (h.id)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="py-2" style="color:var(--text)">{h.tanggal_berlaku}</td>
						<td class="py-2 text-right font-mono" style="color:var(--text)">{rp(h.harga_eceran)}</td>
						<td class="py-2 text-right font-mono" style="color:var(--text)">{rp(h.harga_grosir)}</td>
						<td class="py-2" style="color:var(--text-dim)">{h.nama_ubah ?? '-'}</td>
						<td class="py-2">
							{#if h.tanggal_berakhir === null}
								<span class="rounded px-1.5 py-0.5 text-xs font-bold" style="background:var(--accent);color:var(--bg)">AKTIF</span>
							{:else}
								<span style="color:var(--text-dim)">s/d {h.tanggal_berakhir}</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{/snippet}
</SlideOver>
