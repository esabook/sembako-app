<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import { withLoading } from '$lib/utils/async';
	import {
		fetchPaketMembership, fetchKreditMembership, fetchLayanan,
		createPaket, updatePaket, jualPaket,
	} from '../jasa.api';
	import type { PaketMembership, KreditMembership, LayananBarang } from '../jasa.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type PelangganRingkas = { id: number; nama: string };

	let paket = $state<PaketMembership[]>([]);
	let kredit = $state<KreditMembership[]>([]);
	let layanan = $state<LayananBarang[]>([]);
	let pelanggan = $state<PelangganRingkas[]>([]);
	let loading = $state(false);
	let tab = $state<'paket' | 'kredit'>('kredit');

	// form paket
	let paketOpen = $state(false);
	let editPaketId = $state<number | null>(null);
	let pNama = $state('');
	let pBarangId = $state<number | null>(null);
	let pSesi = $state(1);
	let pHarga = $state(0);
	let pBerlaku = $state(0);
	let pErr = $state('');

	// jual paket
	let jualOpen = $state(false);
	let jPelangganId = $state<number | null>(null);
	let jPaketId = $state<number | null>(null);
	let jErr = $state('');

	const paketCols = [
		{ key: 'kode_paket', label: 'Kode', width: 100 },
		{ key: 'nama', label: 'Nama Paket' },
		{ key: 'layanan_nama', label: 'Layanan' },
		{ key: 'jumlah_sesi', label: 'Sesi', width: 70 },
		{ key: 'harga', label: 'Harga', width: 110 },
		{ key: 'masa_berlaku_hari', label: 'Berlaku (hr)', width: 100 },
		{ key: 'aksi', label: '', width: 80 },
	];

	const kreditCols = [
		{ key: 'pelanggan_nama', label: 'Pelanggan' },
		{ key: 'paket_nama', label: 'Paket' },
		{ key: 'sisa_kuota', label: 'Sisa', width: 70 },
		{ key: 'tanggal_mulai', label: 'Mulai', width: 100 },
		{ key: 'tanggal_expired', label: 'Expired', width: 100 },
		{ key: 'status', label: 'Status', width: 90 },
	];

	const WARNA_KREDIT: Record<string, string> = {
		aktif: 'var(--accent)',
		habis: 'var(--text-dim)',
		expired: 'var(--danger)',
	};

	async function muat() {
		loading = true;
		[paket, kredit] = await Promise.all([fetchPaketMembership(), fetchKreditMembership()]);
		loading = false;
	}

	async function muatMaster() {
		layanan = await fetchLayanan();
		const r = await api.get<PelangganRingkas[]>('/pelanggan');
		if (r.success) pelanggan = r.data;
	}

	// ── Paket ──
	function bukaPaket(p?: PaketMembership) {
		editPaketId = p?.id ?? null;
		pNama = p?.nama ?? '';
		pBarangId = p?.barang_id ?? null;
		pSesi = p?.jumlah_sesi ?? 1;
		pHarga = p?.harga ?? 0;
		pBerlaku = p?.masa_berlaku_hari ?? 0;
		pErr = '';
		paketOpen = true;
	}
	async function simpanPaket() {
		pErr = '';
		if (!pNama.trim()) { pErr = 'Nama paket wajib diisi'; return; }
		if (pSesi < 1) { pErr = 'Jumlah sesi minimal 1'; return; }
		const body = { nama: pNama.trim(), barang_id: pBarangId, jumlah_sesi: pSesi, harga: pHarga, masa_berlaku_hari: pBerlaku };
		const ok = editPaketId
			? await withLoading(() => updatePaket(editPaketId!, body), { loadingKey: 'paket-save', modul: 'jasa', aksi: 'paket', errorPesan: 'Gagal simpan paket' })
			: await withLoading(() => createPaket(body), { loadingKey: 'paket-save', modul: 'jasa', aksi: 'paket', errorPesan: 'Gagal simpan paket' });
		if (ok !== null) { paketOpen = false; muat(); }
	}

	// ── Jual paket ──
	function bukaJual() { jPelangganId = null; jPaketId = null; jErr = ''; jualOpen = true; }
	async function simpanJual() {
		jErr = '';
		if (!jPelangganId) { jErr = 'Pilih pelanggan'; return; }
		if (!jPaketId) { jErr = 'Pilih paket'; return; }
		const ok = await withLoading(() => jualPaket(jPelangganId!, jPaketId!), {
			loadingKey: 'jual-paket', modul: 'jasa', aksi: 'jual-paket', errorPesan: 'Gagal jual paket',
		});
		if (ok !== null) { jualOpen = false; muat(); }
	}

	onMount(() => { muat(); muatMaster(); });
</script>

<div class="p-3 md:p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Membership & Paket</h1>
		{#if tab === 'kredit'}
			<button class="btn btn-primary btn-sm" onclick={bukaJual}>+ Jual Paket</button>
		{:else}
			<button class="btn btn-primary btn-sm" onclick={() => bukaPaket()}>+ Paket</button>
		{/if}
	</div>

	<div class="mb-4 flex w-fit overflow-hidden rounded-lg border border-[var(--border)]">
		{#each [['kredit', 'Kredit Pelanggan'], ['paket', 'Definisi Paket']] as [v, l] (v)}
			<button
				class="px-4 py-2 text-sm transition-colors
					{tab === v ? 'bg-[var(--accent)] text-black font-semibold' : 'text-[var(--text)]'}"
				onclick={() => (tab = v as 'paket' | 'kredit')}
			>{l}</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else if tab === 'kredit'}
		<DataTable columns={kreditCols} rowCount={kredit.length} pageSize={25} emptyText="Belum ada kredit membership.">
			{#snippet body(hidden)}
				{#each kredit as r (r.id)}
					<tr>
						{#if !hidden.has('pelanggan_nama')}<td class="px-3 py-2">{r.pelanggan_nama}</td>{/if}
						{#if !hidden.has('paket_nama')}<td class="px-3 py-2">{r.paket_nama}</td>{/if}
						{#if !hidden.has('sisa_kuota')}<td class="px-3 py-2 text-center">{r.sisa_kuota}</td>{/if}
						{#if !hidden.has('tanggal_mulai')}<td class="px-3 py-2 text-sm">{r.tanggal_mulai}</td>{/if}
						{#if !hidden.has('tanggal_expired')}<td class="px-3 py-2 text-sm">{r.tanggal_expired ?? '∞'}</td>{/if}
						{#if !hidden.has('status')}
							<td class="px-3 py-2">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium text-black"
									style="background:{WARNA_KREDIT[r.status] ?? 'var(--surface2)'}">
									{r.status}
								</span>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{:else}
		<DataTable columns={paketCols} rowCount={paket.length} pageSize={25} emptyText="Belum ada paket membership.">
			{#snippet body(hidden)}
				{#each paket as r (r.id)}
					<tr>
						{#if !hidden.has('kode_paket')}<td class="px-3 py-2 font-mono text-xs">{r.kode_paket}</td>{/if}
						{#if !hidden.has('nama')}<td class="px-3 py-2 font-medium">{r.nama}</td>{/if}
						{#if !hidden.has('layanan_nama')}<td class="px-3 py-2 text-sm">{r.layanan_nama ?? '—'}</td>{/if}
						{#if !hidden.has('jumlah_sesi')}<td class="px-3 py-2 text-center">{r.jumlah_sesi}</td>{/if}
						{#if !hidden.has('harga')}<td class="px-3 py-2 text-right font-mono">Rp {r.harga.toLocaleString('id-ID')}</td>{/if}
						{#if !hidden.has('masa_berlaku_hari')}<td class="px-3 py-2 text-center">{r.masa_berlaku_hari === 0 ? '∞' : r.masa_berlaku_hari}</td>{/if}
						{#if !hidden.has('aksi')}<td class="px-3 py-2 text-right"><button class="btn btn-xs btn-ghost" onclick={() => bukaPaket(r)}>Edit</button></td>{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<!-- Modal Paket -->
<ModalWindow bind:open={paketOpen} title="{editPaketId ? 'Edit' : 'Tambah'} Paket" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="p-nama">Nama Paket</label>
			<input id="p-nama" class="input input-bordered w-full text-sm" bind:value={pNama} placeholder="mis. Paket Cuci 10x" />
		</div>
		<div>
			<label class="label text-sm" for="p-layanan">Layanan (opsional)</label>
			<select id="p-layanan" class="select select-bordered w-full text-sm" bind:value={pBarangId}>
				<option value={null}>— multi-layanan —</option>
				{#each layanan as l (l.id)}<option value={l.id}>{l.nama_barang}</option>{/each}
			</select>
		</div>
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="p-sesi">Jumlah Sesi</label>
				<input id="p-sesi" type="number" min="1" class="input input-bordered w-full text-sm" bind:value={pSesi} placeholder="Cth: 10" />
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="p-berlaku">Berlaku (hari, 0=∞)</label>
				<input id="p-berlaku" type="number" min="0" class="input input-bordered w-full text-sm" bind:value={pBerlaku} placeholder="Cth: 30" />
			</div>
		</div>
		<div>
			<label class="label text-sm" for="p-harga">Harga (Rp)</label>
			<input id="p-harga" type="number" min="0" class="input input-bordered w-full text-sm" bind:value={pHarga} placeholder="0" />
		</div>
		{#if pErr}<p class="text-sm text-[var(--danger)]">{pErr}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => (paketOpen = false)}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={simpanPaket}>Simpan</button>
		</div>
	</div>
</ModalWindow>

<!-- Modal Jual Paket -->
<ModalWindow bind:open={jualOpen} title="Jual Paket ke Pelanggan" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="j-pelanggan">Pelanggan</label>
			<select id="j-pelanggan" class="select select-bordered w-full text-sm" bind:value={jPelangganId}>
				<option value={null}>— pilih pelanggan —</option>
				{#each pelanggan as p (p.id)}<option value={p.id}>{p.nama}</option>{/each}
			</select>
		</div>
		<div>
			<label class="label text-sm" for="j-paket">Paket</label>
			<select id="j-paket" class="select select-bordered w-full text-sm" bind:value={jPaketId}>
				<option value={null}>— pilih paket —</option>
				{#each paket as p (p.id)}<option value={p.id}>{p.nama} · {p.jumlah_sesi} sesi · Rp {p.harga.toLocaleString('id-ID')}</option>{/each}
			</select>
		</div>
		{#if jErr}<p class="text-sm text-[var(--danger)]">{jErr}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => (jualOpen = false)}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={simpanJual}>Jual</button>
		</div>
	</div>
</ModalWindow>
