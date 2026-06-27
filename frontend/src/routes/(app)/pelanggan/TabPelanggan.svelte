<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Rows3 from '@lucide/svelte/icons/rows-3';

	import PelangganGrid from './components/PelangganGrid.svelte';
	import PelangganListTable from './components/PelangganListTable.svelte';
	import ModalFormPelanggan from './components/ModalFormPelanggan.svelte';
	import ModalAssignKartu from './components/ModalAssignKartu.svelte';
	import type { Pelanggan } from './pelanggan.helpers.js';

	let { onbukariwayat }: { onbukariwayat?: (id: number, nama: string) => void } = $props();

	let plgList = $state<Pelanggan[]>([]);
	let plgQuery = $state('');
	let plgLoading = $state(false);
	let plgShowNonAktif = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');

	// Modal: tambah/edit
	let modalFormOpen = $state(false);
	let editPlg = $state<Pelanggan | null>(null);

	// Modal: assign kartu
	let modalAssignOpen = $state(false);
	let assignTarget = $state<Pelanggan | null>(null);

	// Konfirmasi toggle aktif
	let konfirmTogglePlg = $state<Pelanggan | null>(null);
	let konfirmToggleBuka = $state(false);

	// Konfirmasi lepas kartu
	let konfirmUnassignPlg = $state<Pelanggan | null>(null);
	let konfirmUnassignBuka = $state(false);

	export async function muat() {
		plgLoading = true;
		const aktifParam = plgShowNonAktif ? '0' : '1';
		const res = await api.get<Pelanggan[]>(`/pelanggan?q=${plgQuery}&aktif=${aktifParam}`);
		if (res.success) plgList = res.data;
		plgLoading = false;
	}

	onMount(muat);
	$effect(() => { plgQuery; plgShowNonAktif; muat(); });

	function bukaEdit(p: Pelanggan) { editPlg = p; modalFormOpen = true; }
	function bukaTambah() { editPlg = null; modalFormOpen = true; }
	function bukaAssign(p: Pelanggan) { assignTarget = p; modalAssignOpen = true; }

	async function doToggleAktif() {
		if (!konfirmTogglePlg) return;
		await api.put(`/pelanggan/${konfirmTogglePlg.id}`, { is_active: !konfirmTogglePlg.is_active });
		konfirmTogglePlg = null;
		muat();
	}

	async function doUnassignKartu() {
		if (!konfirmUnassignPlg) return;
		await api.delete(`/pelanggan/${konfirmUnassignPlg.id}/assign-kartu`);
		konfirmUnassignPlg = null;
		muat();
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<input
			bind:value={plgQuery}
			placeholder="Cari nama, kode, no. HP, atau no. kartu..."
			class="min-w-0 flex-1 rounded border px-3 py-1.5 text-sm outline-none"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		/>
		<div class="flex shrink-0 items-center gap-1.5">
			<label
				class="flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1.5 text-sm whitespace-nowrap"
				style="border-color:var(--border);color:var(--text-dim)"
			>
				<input type="checkbox" bind:checked={plgShowNonAktif} />
				Non-aktif
			</label>
			<button
				onclick={() => (viewMode = 'grid')}
				title="Tampilan grid"
				class="rounded border p-1.5 transition-colors"
				style={viewMode === 'grid'
					? 'background:var(--surface2);border-color:var(--accent);color:var(--accent)'
					: 'border-color:var(--border);color:var(--text-dim)'}
			>
				<LayoutGrid size="1rem" />
			</button>
			<button
				onclick={() => (viewMode = 'list')}
				title="Tampilan list"
				class="rounded border p-1.5 transition-colors"
				style={viewMode === 'list'
					? 'background:var(--surface2);border-color:var(--accent);color:var(--accent)'
					: 'border-color:var(--border);color:var(--text-dim)'}
			>
				<Rows3 size="1rem" />
			</button>
			<Button onclick={bukaTambah}>+ Tambah</Button>
		</div>
	</div>

	{#if plgLoading}
		<div class="flex justify-center py-6"><Spinner /></div>
	{:else if plgList.length === 0}
		<p class="text-sm" style="color:var(--text-dim)">Belum ada pelanggan.</p>
	{:else if viewMode === 'grid'}
		<PelangganGrid
			items={plgList}
			onedit={bukaEdit}
			onriwayat={(id, nama) => onbukariwayat?.(id, nama)}
			onassign={bukaAssign}
			onunassign={(p) => { konfirmUnassignPlg = p; konfirmUnassignBuka = true; }}
			ontoggle={(p) => { konfirmTogglePlg = p; konfirmToggleBuka = true; }}
		/>
	{:else}
		<PelangganListTable
			items={plgList}
			onedit={bukaEdit}
			onriwayat={(id, nama) => onbukariwayat?.(id, nama)}
			onassign={bukaAssign}
			onunassign={(p) => { konfirmUnassignPlg = p; konfirmUnassignBuka = true; }}
			ontoggle={(p) => { konfirmTogglePlg = p; konfirmToggleBuka = true; }}
		/>
	{/if}
</div>

<ModalFormPelanggan bind:open={modalFormOpen} pelanggan={editPlg} onSuccess={muat} />
<ModalAssignKartu bind:open={modalAssignOpen} target={assignTarget} onSuccess={muat} />

<ConfirmDialog
	bind:open={konfirmToggleBuka}
	judul={konfirmTogglePlg?.is_active ? 'Nonaktifkan pelanggan?' : 'Aktifkan pelanggan?'}
	pesan={konfirmTogglePlg?.is_active
		? `"${konfirmTogglePlg?.nama}" tidak akan bisa transaksi. Bisa diaktifkan kembali.`
		: `"${konfirmTogglePlg?.nama}" akan aktif kembali.`}
	labelKanan={konfirmTogglePlg?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
	warnaKanan={konfirmTogglePlg?.is_active ? 'var(--danger)' : 'var(--accent)'}
	onkiri={() => (konfirmTogglePlg = null)}
	onkanan={doToggleAktif}
/>

<ConfirmDialog
	bind:open={konfirmUnassignBuka}
	judul="Lepas kartu anggota?"
	pesan={`Kartu "${konfirmUnassignPlg?.no_kartu}" akan dilepas dari "${konfirmUnassignPlg?.nama}". Poin dan tier tetap tersimpan di kartu.`}
	labelKanan="Lepas Kartu"
	warnaKanan="var(--danger)"
	onkiri={() => (konfirmUnassignPlg = null)}
	onkanan={doUnassignKartu}
/>
