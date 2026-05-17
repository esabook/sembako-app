<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { connectScannerSse } from '$lib/utils/scannerSse.js';
	import TabOpnameGuide from './TabOpnameGuide.svelte';

	type OpnameRow = { id: number; no_opname: string; tanggal_mulai: string; tanggal_selesai: string | null; status: string };
	type OpnameDetail = OpnameRow & {
		progress: number; sudah_dihitung: number;
		items: { id: number; barang_id: number; kode_barang: string; nama_barang: string; nama_kategori: string | null; singkatan_satuan: string | null; lokasi_rak: string | null; stok_sistem: number; stok_fisik: number | null; selisih: number | null; alasan_selisih: string | null }[]
	};

	let opnameList = $state<OpnameRow[]>([]);
	let opnameAktif = $state<OpnameDetail | null>(null);
	let opnameSaving = $state(false);
	let opnameFilter = $state('');
	let opnameItemSaving = $state<Set<number>>(new Set());
	let error = $state('');

	async function muatOpname() { const r = await api.get<OpnameRow[]>('/stok-opname'); if (r.success) opnameList = r.data; }

	async function muatOpnameAktif() {
		const aktif = opnameList.find((o) => o.status === 'proses' || o.status === 'draft');
		if (!aktif) { opnameAktif = null; return; }
		const r = await api.get<OpnameDetail>(`/stok-opname/${aktif.id}`);
		if (r.success) opnameAktif = r.data;
	}

	async function buatOpname() {
		if (!confirm('Buat stok opname baru? Semua stok sistem akan di-snapshot sekarang.')) return;
		opnameSaving = true;
		const r = await api.post('/stok-opname', {});
		opnameSaving = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		await muatOpname(); await muatOpnameAktif();
	}

	async function inputFisik(itemId: number, stokFisik: number, alasan?: string) {
		if (!opnameAktif) return;
		opnameItemSaving = new Set([...opnameItemSaving, itemId]);
		const put = await api.put(`/stok-opname/${opnameAktif.id}/item/${itemId}`, { stok_fisik: stokFisik, alasan_selisih: alasan });
		if (!put.success) {
			opnameItemSaving = new Set([...opnameItemSaving].filter(id => id !== itemId));
			error = (put as { success: false; error: string }).error;
			return;
		}
		const r = await api.get<OpnameDetail>(`/stok-opname/${opnameAktif.id}`);
		if (r.success) opnameAktif = r.data;
		opnameItemSaving = new Set([...opnameItemSaving].filter(id => id !== itemId));
	}

	async function approveOpname() {
		if (!opnameAktif) return;
		if (!confirm('Approve opname? Stok sistem akan diperbarui sesuai stok fisik.')) return;
		opnameSaving = true;
		const r = await api.post(`/stok-opname/${opnameAktif.id}/approve`, {});
		opnameSaving = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		opnameAktif = null; await muatOpname();
	}

	async function batalOpname() {
		if (!opnameAktif) return;
		if (!confirm('Batalkan opname ini?')) return;
		await api.delete(`/stok-opname/${opnameAktif.id}`);
		opnameAktif = null; await muatOpname();
	}

	onMount(() => {
		muatOpname().then(() => muatOpnameAktif());
		return connectScannerSse(`barang${$user?.id ?? 0}`, (kode) => { opnameFilter = kode; });
	});
</script>

<div class="flex flex-col gap-4">

	{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}
		<button onclick={() => error = ''} class="float-right" style="background:none;border:none;color:var(--danger);cursor:pointer">✕</button>
	</p>{/if}

	{#if !opnameAktif}
		<div class="flex items-center justify-between">
			<p class="text-sm" style="color:var(--text-dim)">
				{opnameList.filter(o => o.status === 'approved').length} opname selesai
			</p>
			<button onclick={buatOpname} disabled={opnameSaving}
				class="px-3 py-1 rounded text-sm font-bold"
				style="background:var(--accent);color:var(--bg);opacity:{opnameSaving ? .6 : 1}">
				{opnameSaving ? 'Membuat...' : '+ Buat Opname Baru'}
			</button>
		</div>

		{#if opnameList.length > 0}
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">No Opname</th>
					<th class="text-left px-3 py-2 font-medium">Tanggal Mulai</th>
					<th class="text-left px-3 py-2 font-medium">Selesai</th>
					<th class="text-left px-3 py-2 font-medium">Status</th>
				</tr></thead>
				<tbody>
					{#each opnameList as op}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2 text-xs font-mono">{op.no_opname}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{op.tanggal_mulai.slice(0,10)}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{op.tanggal_selesai?.slice(0,10) ?? '—'}</td>
						<td class="px-3 py-2">
							<span class="text-xs font-bold uppercase" style="color:{op.status === 'approved' ? 'var(--accent)' : op.status === 'proses' ? 'var(--warn)' : 'var(--text-dim)'}">
								{op.status}
							</span>
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}

	{:else}
		<div class="rounded border p-3 flex items-center justify-between gap-3" style="border-color:var(--border);background:var(--surface)">
			<div>
				<div class="text-xs font-bold" style="color:var(--text)">{opnameAktif.no_opname}</div>
				<div class="text-xs" style="color:var(--text-dim)">
					Mulai: {opnameAktif.tanggal_mulai.slice(0,16)} &nbsp;|&nbsp;
					{opnameAktif.sudah_dihitung}/{opnameAktif.items.length} item dihitung
				</div>
				<div class="mt-1 rounded-full overflow-hidden" style="height:4px;background:var(--surface2);width:200px">
					<div style="height:100%;width:{opnameAktif.progress}%;background:var(--accent);transition:width .3s"></div>
				</div>
			</div>
			<div class="flex flex-col items-end gap-1">
				{#if opnameAktif.sudah_dihitung === opnameAktif.items.length && opnameAktif.items.length > 0}
					<button onclick={approveOpname} disabled={opnameSaving}
						class="px-3 py-1 rounded text-xs font-bold"
						style="background:var(--accent);color:var(--bg);opacity:{opnameSaving ? .6 : 1}">
						{opnameSaving ? '...' : 'Approve & Perbarui Stok'}
					</button>
				{:else}
					<div class="text-xs" style="color:var(--text-dim)">Isi semua item untuk Approve</div>
				{/if}
				<button onclick={batalOpname} class="px-2 py-1 rounded text-xs border" style="border-color:var(--danger);color:var(--danger)">
					Batalkan Opname
				</button>
			</div>
		</div>

		<input type="text" bind:value={opnameFilter} placeholder="Cari nama/kode barang..."
			class="px-3 py-1.5 rounded border outline-none text-sm w-full"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)" />

		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-xs">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">Kode</th>
					<th class="text-left px-3 py-2 font-medium">Nama Barang</th>
					<th class="text-left px-3 py-2 font-medium">Rak</th>
					<th class="text-right px-3 py-2 font-medium">Sistem</th>
					<th class="text-right px-3 py-2 font-medium">Fisik</th>
					<th class="text-right px-3 py-2 font-medium">Selisih</th>
				</tr></thead>
				<tbody>
					{#each opnameAktif.items.filter(i =>
						!opnameFilter || i.nama_barang.toLowerCase().includes(opnameFilter.toLowerCase()) || i.kode_barang.toLowerCase().includes(opnameFilter.toLowerCase())
					) as item}
					<tr class="border-t" style="border-color:var(--border);background:{item.stok_fisik !== null ? 'transparent' : 'rgba(255,179,0,.04)'}">
						<td class="px-3 py-2 font-mono" style="color:var(--text-dim)">{item.kode_barang}</td>
						<td class="px-3 py-2">
							<div>{item.nama_barang}</div>
							{#if item.nama_kategori}<div class="text-xs" style="color:var(--text-dim)">{item.nama_kategori}</div>{/if}
						</td>
						<td class="px-3 py-2" style="color:var(--text-dim)">{item.lokasi_rak ?? '—'}</td>
						<td class="px-3 py-2 text-right font-bold">{item.stok_sistem} {item.singkatan_satuan ?? ''}</td>
						<td class="px-3 py-2 text-right">
							<input
								type="number" min="0"
								value={item.stok_fisik ?? ''}
								disabled={opnameItemSaving.has(item.id)}
								onkeydown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
								onchange={(e) => {
									const v = Number((e.target as HTMLInputElement).value);
									const selisih = v - item.stok_sistem;
									const alasan = selisih !== 0 ? (item.alasan_selisih ?? '') : undefined;
									if (selisih !== 0 && !alasan) {
										const a = prompt(`Selisih ${selisih > 0 ? '+' : ''}${selisih}. Alasan koreksi?`);
										inputFisik(item.id, v, a ?? '');
									} else {
										inputFisik(item.id, v, alasan);
									}
								}}
								class="w-20 px-2 py-0.5 rounded border outline-none text-right"
								style="background:var(--surface2);border-color:{item.stok_fisik !== null ? 'var(--border)' : 'var(--warn)'};color:var(--text);opacity:{opnameItemSaving.has(item.id) ? .5 : 1}"
							/>
						</td>
						<td class="px-3 py-2 text-right font-bold" style="color:{item.selisih === null ? 'var(--text-dim)' : item.selisih === 0 ? 'var(--accent)' : item.selisih! > 0 ? 'var(--info)' : 'var(--danger)'}">
							{#if opnameItemSaving.has(item.id)}
								<span style="color:var(--text-dim)">...</span>
							{:else if item.selisih !== null}
								{item.selisih > 0 ? '+' : ''}{item.selisih}
							{:else}—{/if}
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<TabOpnameGuide />
