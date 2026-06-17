<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { createKunjunganStore } from '../sales.store.svelte.js';
	import { TUJUAN_LABEL, STATUS_K_COLOR } from '../sales.logic.js';

	let { store }: { store: ReturnType<typeof createKunjunganStore> } = $props();

	const columns = [
		{ key: 'tanggal', label: 'Tanggal' },
		{ key: 'nama_warung', label: 'Nama Warung' },
		{ key: 'tujuan', label: 'Tujuan', priority: 2 as const },
		{ key: 'petugas', label: 'Petugas', priority: 2 as const },
		{ key: 'status', label: 'Status' }
	];
</script>

<div class="mb-2 flex flex-wrap items-end gap-2">
	<input
		type="month"
		bind:value={store.bulan}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	/>
	<Select
		bind:value={store.status}
		options={[
			{ value: '', label: 'Semua Status' },
			{ value: 'open', label: 'Open' },
			{ value: 'pending', label: 'Pending' },
			{ value: 'selesai', label: 'Selesai' }
		]}
	/>
	<Button onclick={() => store.bukaForm()} clasz="ml-auto">+ Catat Kunjungan</Button>
</div>

<DataTable {columns} rowCount={store.rows.length} emptyText="Belum ada catatan kunjungan.">
	{#snippet body(hidden)}
		{#each store.rows as row (row.id)}
			<tr>
				{#if !hidden.has('tanggal')}<td class="px-3 py-2 text-xs">{row.tanggal}</td>{/if}
				{#if !hidden.has('nama_warung')}
					<td class="px-3 py-2">
						<div class="font-medium">{row.nama_warung}</div>
						{#if row.alamat}<div class="text-xs" style="color:var(--text-dim)">
								{row.alamat}
							</div>{/if}
						{#if row.hasil}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
								→ {row.hasil}
							</div>{/if}
					</td>
				{/if}
				{#if !hidden.has('tujuan')}<td class="px-3 py-2 text-xs">{TUJUAN_LABEL[row.tujuan]}</td
					>{/if}
				{#if !hidden.has('petugas')}<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
						>{row.nama_petugas || '—'}</td
					>{/if}
				{#if !hidden.has('status')}
					<td class="px-3 py-2 text-center">
						<span
							class="text-xs font-semibold"
							style="color:{STATUS_K_COLOR[row.status_tindak_lanjut]}"
							>{row.status_tindak_lanjut}</span
						>
					</td>
				{/if}
				<td class="px-3 py-2 text-right whitespace-nowrap">
					<Button variant="ghost" size="xs" onclick={() => store.bukaForm(row)}>Edit</Button>
					<Button variant="danger" size="xs" onclick={() => store.hapus(row.id)}>Hapus</Button>
				</td>
			</tr>
		{/each}
	{/snippet}
</DataTable>

<SlideOver
	bind:open={store.formOpen}
	title={store.editId ? 'Edit Kunjungan' : 'Catat Kunjungan Warung'}
>
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				store.simpan();
			}}
			class="flex flex-col gap-3 text-sm"
		>
			<div class="flex flex-col gap-1">
				<label for="fk-nama" class="text-xs" style="color:var(--text-dim)">NAMA WARUNG *</label>
				<input
					id="fk-nama"
					bind:value={store.fNama}
					required
					placeholder="Warung Bu Tini, Toko XYZ,."
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fk-alamat" class="text-xs" style="color:var(--text-dim)">ALAMAT</label>
				<input
					id="fk-alamat"
					bind:value={store.fAlamat}
					placeholder="Opsional"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
					<input
						id="fk-tgl"
						type="date"
						bind:value={store.fTanggal}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fk-tujuan" class="text-xs" style="color:var(--text-dim)">TUJUAN</label>
					<Select
						id="fk-tujuan"
						bind:value={store.fTujuan}
						options={Object.entries(TUJUAN_LABEL).map(([v, lbl]) => ({ value: v, label: lbl }))}
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fk-hasil" class="text-xs" style="color:var(--text-dim)">HASIL KUNJUNGAN</label>
				<input
					id="fk-hasil"
					bind:value={store.fHasil}
					placeholder="Ringkasan hasil"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-xs" style="color:var(--text-dim)">STATUS TINDAK LANJUT</span>
				<div class="flex gap-3">
					{#each ['open', 'pending', 'selesai'] as const as s (s)}
						<label class="flex cursor-pointer items-center gap-1.5 text-sm capitalize">
							<input
								type="radio"
								bind:group={store.fStatus}
								value={s}
								class="accent-[var(--accent)]"
							/>{s}
						</label>
					{/each}
				</div>
			</div>
			{#if store.error}<p class="text-xs" style="color:var(--danger)">{store.error}</p>{/if}
			<div class="mt-1 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (store.formOpen = false)}>Batal</Button>
				<Button type="submit">Simpan</Button>
			</div>
		</form>
	{/snippet}
</SlideOver>

<ConfirmDialog
	bind:open={store.konfirmBuka}
	judul="Hapus kunjungan?"
	pesan="Data kunjungan ini akan dihapus permanen."
	labelKanan="Hapus"
	warnaKanan="var(--danger)"
	onkiri={() => (store.konfirmId = null)}
	onkanan={() => store.doHapus()}
/>
