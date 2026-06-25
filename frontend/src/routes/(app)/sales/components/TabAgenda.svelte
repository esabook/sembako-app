<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DatePicker2 from '$lib/components/ui/DatePicker2.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { createAgendaStore } from '../sales.store.svelte.js';
	import { STATUS_A_COLOR } from '../sales.logic.js';

	let { store }: { store: ReturnType<typeof createAgendaStore> } = $props();

	const columns = [
		{ key: 'tanggal', label: 'Tanggal' },
		{ key: 'nama_supplier', label: 'Supplier' },
		{ key: 'tipe', label: 'Tipe', priority: 2 as const },
		{ key: 'lokasi_petugas', label: 'Lokasi/Petugas', priority: 2 as const },
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
			{ value: 'dijadwalkan', label: 'Dijadwalkan' },
			{ value: 'selesai', label: 'Selesai' },
			{ value: 'dibatalkan', label: 'Dibatalkan' }
		]}
	/>
	<Button onclick={() => store.bukaForm()} clasz="ml-auto">+ Tambah Agenda</Button>
</div>

<DataTable {columns} rowCount={store.rows.length} emptyText="Belum ada agenda supplier.">
	{#snippet body(hidden)}
		{#each store.rows as row (row.id)}
			<tr>
				{#if !hidden.has('tanggal')}
					<td class="px-3 py-2 text-xs">{row.tanggal}{row.jam ? ' ' + row.jam : ''}</td>
				{/if}
				{#if !hidden.has('nama_supplier')}
					<td class="px-3 py-2 font-medium">
						<div>{row.nama_supplier}</div>
						{#if row.hasil}
							<div class="text-xs" style="color:var(--text-dim)">→ {row.hasil}</div>
						{/if}
					</td>
				{/if}
				{#if !hidden.has('tipe')}
					<td class="px-3 py-2 text-xs capitalize">{row.tipe}</td>
				{/if}
				{#if !hidden.has('lokasi_petugas')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
						{row.lokasi || ''}{row.nama_petugas ? (row.lokasi ? ' · ' : '') + row.nama_petugas : ''}
						{#if !row.lokasi && !row.nama_petugas}—{/if}
					</td>
				{/if}
				{#if !hidden.has('status')}
					<td class="px-3 py-2 text-center">
						<span class="text-xs font-semibold" style="color:{STATUS_A_COLOR[row.status]}"
							>{row.status}</span
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
	title={store.editId ? 'Edit Agenda' : 'Tambah Agenda Supplier'}
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
				<label for="fa-sup" class="text-xs" style="color:var(--text-dim)">NAMA SUPPLIER *</label>
				<input
					id="fa-sup"
					bind:value={store.fNamaSupplier}
					required
					placeholder="Nama supplier"
					class="input input-bordered w-full text-sm"
				/>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<label for="fa-tipe" class="text-xs" style="color:var(--text-dim)">TIPE</label>
					<Select
						id="fa-tipe"
						bind:value={store.fTipe}
						options={['kunjungan', 'negosiasi', 'pengiriman', 'lainnya']}
					/>
				</div>
				<DatePicker2 label="TANGGAL *" bind:value={store.fTanggal} />
				<div class="flex flex-col gap-1">
					<label for="fa-jam" class="text-xs" style="color:var(--text-dim)">JAM</label>
					<input
						id="fa-jam"
						type="time"
						bind:value={store.fJam}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fa-lok" class="text-xs" style="color:var(--text-dim)">LOKASI</label>
					<input
						id="fa-lok"
						bind:value={store.fLokasi}
						placeholder="Toko / Kantor"
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<label for="fa-hasil" class="text-xs" style="color:var(--text-dim)">HASIL</label>
				<input
					id="fa-hasil"
					bind:value={store.fHasil}
					placeholder="Hasil setelah selesai"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>

			{#if store.editId}
				<div class="flex flex-col gap-1">
					<span class="text-xs" style="color:var(--text-dim)">STATUS</span>
					<div class="flex gap-3">
						{#each ['dijadwalkan', 'selesai', 'dibatalkan'] as s (s)}
							<label class="flex cursor-pointer items-center gap-1.5 text-sm">
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
			{/if}

			{#if store.error}
				<p class="text-xs" style="color:var(--danger)">{store.error}</p>
			{/if}

			<div class="mt-1 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (store.formOpen = false)}>Batal</Button>
				<Button type="submit">Simpan</Button>
			</div>
		</form>
	{/snippet}
</SlideOver>

<ConfirmDialog
	bind:open={store.konfirmBuka}
	judul="Hapus agenda?"
	pesan="Data agenda supplier ini akan dihapus permanen."
	labelKanan="Hapus"
	warnaKanan="var(--danger)"
	onkiri={() => (store.konfirmId = null)}
	onkanan={() => store.doHapus()}
/>
