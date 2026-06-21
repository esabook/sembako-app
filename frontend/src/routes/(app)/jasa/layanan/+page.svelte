<script lang="ts">
	import { onMount } from 'svelte';
	import { withLoading } from '$lib/utils/async';
	import { fetchLayanan, updateLayanan } from '../jasa.api';
	import type { LayananBarang } from '../jasa.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let rows = $state<LayananBarang[]>([]);
	let loading = $state(false);

	let formOpen = $state(false);
	let editId = $state<number | null>(null);
	let editNama = $state('');
	let fDurasi = $state(30);
	let fBuffer = $state(0);
	let fDapatBooking = $state(true);
	let fKomisiPersen = $state(0);
	let fKomisiNominal = $state(0);
	let error = $state('');

	const columns = [
		{ key: 'nama_barang', label: 'Layanan' },
		{ key: 'durasi_menit', label: 'Durasi', width: 90 },
		{ key: 'buffer_menit', label: 'Buffer', width: 80 },
		{ key: 'komisi', label: 'Komisi', width: 130 },
		{ key: 'dapat_dibooking', label: 'Booking', width: 90 },
		{ key: 'aksi', label: '', width: 90 },
	];

	async function muat() {
		loading = true;
		rows = await fetchLayanan();
		loading = false;
	}

	function bukaForm(l: LayananBarang) {
		editId = l.id;
		editNama = l.nama_barang;
		fDurasi = l.durasi_menit;
		fBuffer = l.buffer_menit;
		fDapatBooking = l.dapat_dibooking;
		fKomisiPersen = l.komisi_persen;
		fKomisiNominal = l.komisi_nominal;
		error = '';
		formOpen = true;
	}

	async function simpan() {
		error = '';
		if (editId == null) return;
		if (fDurasi <= 0) { error = 'Durasi harus lebih dari 0'; return; }
		const ok = await withLoading(() => updateLayanan(editId!, {
			durasi_menit: fDurasi,
			buffer_menit: fBuffer,
			dapat_dibooking: fDapatBooking,
			komisi_persen: fKomisiPersen,
			komisi_nominal: fKomisiNominal,
		}), {
			loadingKey: 'layanan-simpan',
			modul: 'jasa', aksi: 'atur-layanan',
			errorPesan: 'Gagal simpan pengaturan layanan',
		});
		if (ok !== null) { formOpen = false; muat(); }
	}

	onMount(muat);
</script>

<div class="p-3 md:p-6">
	<div class="mb-2 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Master Layanan</h1>
	</div>
	<p class="mb-4 text-xs text-[var(--text-dim)]">
		Daftar barang ber-tipe <b>Layanan</b>. Atur durasi, buffer, dan komisi di sini.
		Tambah layanan baru lewat <b>Gudang → Barang</b> (set Tipe Produk = Layanan).
	</p>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else}
		<DataTable {columns} rowCount={rows.length} pageSize={25}
			emptyText="Belum ada barang tipe layanan. Buat di Gudang → Barang.">
			{#snippet body(hidden)}
				{#each rows as l (l.id)}
					<tr class={l.diatur ? '' : 'opacity-70'}>
						{#if !hidden.has('nama_barang')}
							<td class="px-3 py-2">
								{l.nama_barang}
								{#if !l.diatur}<span class="ml-1 text-xs text-[var(--warn)]">(belum diatur)</span>{/if}
							</td>
						{/if}
						{#if !hidden.has('durasi_menit')}<td class="px-3 py-2 text-center">{l.durasi_menit} mnt</td>{/if}
						{#if !hidden.has('buffer_menit')}<td class="px-3 py-2 text-center">{l.buffer_menit} mnt</td>{/if}
						{#if !hidden.has('komisi')}
							<td class="px-3 py-2 text-sm">
								{#if l.komisi_persen > 0}{l.komisi_persen}%{:else if l.komisi_nominal > 0}Rp {l.komisi_nominal.toLocaleString('id-ID')}{:else}—{/if}
							</td>
						{/if}
						{#if !hidden.has('dapat_dibooking')}
							<td class="px-3 py-2 text-center">{l.dapat_dibooking ? '✓' : '—'}</td>
						{/if}
						{#if !hidden.has('aksi')}
							<td class="px-3 py-2 text-right">
								<button class="btn btn-xs btn-ghost" onclick={() => bukaForm(l)}>Atur</button>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<ModalWindow bind:open={formOpen} title="Atur Layanan — {editNama}" maxWidth="sm">
	<div class="space-y-3">
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="l-durasi">Durasi (menit)</label>
				<input id="l-durasi" type="number" min="1" class="input input-bordered w-full text-sm" bind:value={fDurasi} />
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="l-buffer">Buffer (menit)</label>
				<input id="l-buffer" type="number" min="0" class="input input-bordered w-full text-sm" bind:value={fBuffer} />
			</div>
		</div>
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="l-kp">Komisi (%)</label>
				<input id="l-kp" type="number" min="0" class="input input-bordered w-full text-sm" bind:value={fKomisiPersen} />
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="l-kn">Komisi (Rp)</label>
				<input id="l-kn" type="number" min="0" class="input input-bordered w-full text-sm" bind:value={fKomisiNominal} />
			</div>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={fDapatBooking} />
			Dapat dibooking
		</label>
		{#if error}<p class="text-sm text-[var(--danger)]">{error}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => (formOpen = false)}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={simpan}>Simpan</button>
		</div>
	</div>
</ModalWindow>
