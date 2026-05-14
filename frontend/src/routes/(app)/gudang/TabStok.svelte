<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';
	import TabStokGuide from './TabStokGuide.svelte';

	type StokItem = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; lokasi_rak: string | null; nama_kategori: string | null; singkatan_satuan: string | null; };
	type MutasiItem = { id: number; tanggal: string; jenis: string; referensi_tipe: string | null; jumlah_perubahan: number; jumlah_sesudah: number; };

	let stokList = $state<StokItem[]>([]);
	let mutasiList = $state<MutasiItem[]>([]);
	let mutasiNama = $state('');
	let showMutasi = $state(false);
	let query = $state('');
	let loading = $state(false);

	async function muatStok() { loading = true; const r = await api.get<StokItem[]>('/stok'); if (r.success) stokList = r.data; loading = false; }

	async function muatMutasi(id: number, nama: string) {
		mutasiNama = nama;
		const r = await api.get<MutasiItem[]>(`/stok/${id}/mutasi`);
		if (r.success) { mutasiList = r.data; showMutasi = true; }
	}

	function statusStok(item: { stok_sekarang: number; stok_minimum: number }) { if (item.stok_sekarang <= 0) return { label: 'HABIS', color: 'var(--danger)' }; if (item.stok_sekarang <= item.stok_minimum) return { label: 'HAMPIR HABIS', color: 'var(--warn)' }; return { label: 'AMAN', color: 'var(--accent)' }; }

	onMount(muatStok);
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<input type="search" placeholder="Filter nama..." bind:value={query} class="px-3 py-1 rounded border text-sm max-w-xs outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<span class="text-xs" style="color:var(--text-dim)">{stokList.length} barang aktif</span>
	</div>
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="text-left px-3 py-2 font-medium">Kode</th>
				<th class="text-left px-3 py-2 font-medium">Nama</th>
				<th class="text-left px-3 py-2 font-medium">Kategori</th>
				<th class="text-left px-3 py-2 font-medium">Rak</th>
				<th class="text-right px-3 py-2 font-medium">Stok</th>
				<th class="text-right px-3 py-2 font-medium">Min</th>
				<th class="text-left px-3 py-2 font-medium">Status</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if loading}
					<tr><td colspan="8" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else}
					{#each stokList.filter((s) => !query || s.nama_barang.toLowerCase().includes(query.toLowerCase()) || s.kode_barang.includes(query)) as item}
						{@const st = statusStok(item)}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
							<td class="px-3 py-2">{item.nama_barang}</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.lokasi_rak ?? '-'}</td>
							<td class="px-3 py-2 text-right font-bold" style="color:{st.color}">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
							<td class="px-3 py-2 text-right text-xs" style="color:var(--text-dim)">{item.stok_minimum}</td>
							<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{st.color}">{st.label}</span></td>
							<td class="px-3 py-2 text-right">
								<button onclick={() => muatMutasi(item.id, item.nama_barang)} class="text-xs" style="color:var(--info)">Riwayat</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<Modal bind:open={showMutasi} title="Riwayat Mutasi — {mutasiNama}">
	{#snippet children()}
	<div class="max-h-80 overflow-y-auto">
		{#if mutasiList.length === 0}
			<p class="text-sm text-center py-4" style="color:var(--text-dim)">Belum ada mutasi</p>
		{:else}
			<table class="w-full text-xs">
				<thead><tr style="color:var(--text-dim)">
					<th class="text-left py-1 font-medium">Tanggal</th>
					<th class="text-left py-1 font-medium">Jenis</th>
					<th class="text-right py-1 font-medium">Δ</th>
					<th class="text-right py-1 font-medium">Sesudah</th>
				</tr></thead>
				<tbody>
					{#each mutasiList as m}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="py-1.5" style="color:var(--text-dim)">{m.tanggal.slice(0, 16)}</td>
						<td class="py-1.5">{m.jenis}</td>
						<td class="py-1.5 text-right font-bold" style="color:{m.jumlah_perubahan >= 0 ? 'var(--accent)' : 'var(--danger)'}">{m.jumlah_perubahan >= 0 ? '+' : ''}{m.jumlah_perubahan}</td>
						<td class="py-1.5 text-right">{m.jumlah_sesudah}</td>
					</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
	{/snippet}
</Modal>

<TabStokGuide />
