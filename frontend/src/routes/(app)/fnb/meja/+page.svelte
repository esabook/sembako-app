<script lang="ts">
	import { onMount } from 'svelte';
	import { withLoading } from '$lib/utils/async';
	import {
		fetchMeja,
		createMeja,
		updateMeja,
		deleteMeja
	} from '../../../(kasir)/kasir/fnb/fnb.api';
	import type { Meja } from '../../../(kasir)/kasir/fnb/fnb.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let rows = $state<Meja[]>([]);
	let loading = $state(false);

	let formOpen = $state(false);
	let editId = $state<number | null>(null);
	let fKode = $state('');
	let fNama = $state('');
	let fKapasitas = $state(2);
	let error = $state('');

	let confirmHapus = $state(false);
	let hapusTarget = $state<Meja | null>(null);

	const columns = [
		{ key: 'kode_meja', label: 'Kode', width: 120 },
		{ key: 'nama', label: 'Nama' },
		{ key: 'kapasitas', label: 'Kapasitas', width: 100 },
		{ key: 'status', label: 'Status', width: 110 },
		{ key: 'is_active', label: 'Aktif', width: 80 },
		{ key: 'aksi', label: '', width: 130 }
	];

	async function muat() {
		loading = true;
		rows = await fetchMeja(true);
		loading = false;
	}

	function bukaForm(m?: Meja) {
		editId = m?.id ?? null;
		fKode = m?.kode_meja ?? '';
		fNama = m?.nama ?? '';
		fKapasitas = m?.kapasitas ?? 2;
		error = '';
		formOpen = true;
	}

	async function simpan() {
		error = '';
		if (!fKode.trim()) {
			error = 'Kode meja wajib diisi';
			return;
		}
		const body = { kode_meja: fKode.trim(), nama: fNama.trim() || null, kapasitas: fKapasitas };
		const ok = editId
			? await withLoading(() => updateMeja(editId!, body), {
					loadingKey: 'meja-update',
					modul: 'fnb',
					aksi: 'update-meja',
					errorPesan: 'Gagal simpan meja'
				})
			: await withLoading(() => createMeja(body), {
					loadingKey: 'meja-create',
					modul: 'fnb',
					aksi: 'buat-meja',
					errorPesan: 'Gagal buat meja'
				});
		if (ok !== null) {
			formOpen = false;
			muat();
		}
	}

	function konfirmasiHapus(m: Meja) {
		hapusTarget = m;
		confirmHapus = true;
	}

	async function hapus() {
		if (!hapusTarget) return;
		await withLoading(() => deleteMeja(hapusTarget!.id), {
			loadingKey: 'meja-hapus',
			modul: 'fnb',
			aksi: 'hapus-meja',
			errorPesan: 'Gagal hapus meja'
		});
		confirmHapus = false;
		hapusTarget = null;
		muat();
	}

	async function aktifkan(m: Meja) {
		await withLoading(() => updateMeja(m.id, { is_active: true }), {
			loadingKey: `meja-aktif-${m.id}`,
			modul: 'fnb',
			aksi: 'aktifkan-meja',
			errorPesan: 'Gagal aktifkan meja'
		});
		muat();
	}

	onMount(muat);
</script>

<div>
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Meja (F&B)</h1>
		<button class="btn btn-sm btn-primary" onclick={() => bukaForm()}>+ Meja</button>
	</div>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else}
		<DataTable {columns} rowCount={rows.length} pageSize={25} emptyText="Belum ada meja.">
			{#snippet body(hidden)}
				{#each rows as m (m.id)}
					<tr class={m.is_active ? '' : 'opacity-50'}>
						{#if !hidden.has('kode_meja')}<td class="px-3 py-2 font-medium">{m.kode_meja}</td>{/if}
						{#if !hidden.has('nama')}<td class="px-3 py-2 text-sm">{m.nama ?? '—'}</td>{/if}
						{#if !hidden.has('kapasitas')}<td class="px-3 py-2 text-center">{m.kapasitas} org</td
							>{/if}
						{#if !hidden.has('status')}<td class="px-3 py-2 text-sm">{m.status}</td>{/if}
						{#if !hidden.has('is_active')}<td class="px-3 py-2 text-center"
								>{m.is_active ? '✓' : '—'}</td
							>{/if}
						{#if !hidden.has('aksi')}
							<td class="px-3 py-2 text-right whitespace-nowrap">
								{#if m.is_active}
									<button class="btn btn-ghost btn-xs" onclick={() => bukaForm(m)}>Edit</button>
									<button
										class="btn text-[var(--danger)] btn-ghost btn-xs"
										onclick={() => konfirmasiHapus(m)}>Hapus</button
									>
								{:else}
									<button class="btn btn-outline btn-xs" onclick={() => aktifkan(m)}
										>Aktifkan</button
									>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<ModalWindow bind:open={formOpen} title="{editId ? 'Edit' : 'Tambah'} Meja" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="m-kode">Kode Meja</label>
			<input
				id="m-kode"
				class="input-bordered input w-full text-sm"
				bind:value={fKode}
				placeholder="mis. A1"
			/>
		</div>
		<div>
			<label class="label text-sm" for="m-nama">Nama (opsional)</label>
			<input
				id="m-nama"
				class="input-bordered input w-full text-sm"
				bind:value={fNama}
				placeholder="mis. VIP Pojok"
			/>
		</div>
		<div>
			<label class="label text-sm" for="m-kap">Kapasitas</label>
			<input
				id="m-kap"
				type="number"
				min="1"
				class="input-bordered input w-full text-sm"
				bind:value={fKapasitas}
			/>
		</div>
		{#if error}<p class="text-sm text-[var(--danger)]">{error}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn flex-1 btn-ghost" onclick={() => (formOpen = false)}>Batal</button>
			<button class="btn flex-1 btn-primary" onclick={simpan}>Simpan</button>
		</div>
	</div>
</ModalWindow>

<ConfirmDialog
	bind:open={confirmHapus}
	judul="Nonaktifkan meja?"
	pesan="Meja {hapusTarget?.kode_meja} akan dinonaktifkan."
	labelKiri="Batal"
	labelKanan="Nonaktifkan"
	warnaKanan="var(--danger)"
	onkanan={hapus}
/>
