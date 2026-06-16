<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import { KATEGORI_LABEL, STATUS_K_COLOR } from '../crm.logic.js';
	import type { CrmStore } from '../crm.store.svelte.js';

	let { store }: { store: CrmStore } = $props();

	const columns = [
		{ key: 'tanggal', label: 'Tanggal' },
		{ key: 'deskripsi', label: 'Komplain' },
		{ key: 'kategori', label: 'Kategori', priority: 2 as const },
		{ key: 'status', label: 'Status' }
	];
</script>

<div class="mb-2 flex flex-wrap items-end gap-2">
	<input
		type="month"
		bind:value={store.kBulan}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	/>
	<Select
		bind:value={store.kStatus}
		options={[
			{ value: '', label: 'Semua Status' },
			{ value: 'masuk', label: 'Masuk' },
			{ value: 'diproses', label: 'Diproses' },
			{ value: 'selesai', label: 'Selesai' },
			{ value: 'ditolak', label: 'Ditolak' }
		]}
	/>
	<Button onclick={() => store.bukaFormKomplain()} size="sm">+ Catat Komplain</Button>
</div>

<DataTable {columns} rowCount={store.kRows.length} emptyText="Belum ada komplain tercatat.">
	{#snippet body(hidden)}
		{#each store.kRows as row (row.id)}
			<tr>
				{#if !hidden.has('tanggal')}
					<td class="px-3 py-2 text-xs">{row.tanggal}</td>
				{/if}
				{#if !hidden.has('deskripsi')}
					<td class="px-3 py-2">
						<div class="text-sm">{row.deskripsi}</div>
						{#if row.nama_pelanggan}
							<div class="text-xs" style="color:var(--text-dim)">{row.nama_pelanggan}</div>
						{/if}
						{#if row.resolusi}
							<div class="mt-0.5 text-xs" style="color:var(--accent)">→ {row.resolusi}</div>
						{/if}
					</td>
				{/if}
				{#if !hidden.has('kategori')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
						>{KATEGORI_LABEL[row.kategori] ?? row.kategori}</td
					>
				{/if}
				{#if !hidden.has('status')}
					<td class="px-3 py-2 text-center">
						<span class="text-xs font-semibold" style="color:{STATUS_K_COLOR[row.status]}"
							>{row.status}</span
						>
					</td>
				{/if}
				<td class="px-3 py-2 text-right whitespace-nowrap">
					{#if row.status === 'masuk' || row.status === 'diproses'}
						<Button variant="ghost" size="xs" onclick={() => store.bukaDetailKomplain(row)}
							>Proses</Button
						>
					{/if}
					<Button variant="ghost" size="xs" onclick={() => store.hapusK(row.id)}>×</Button>
				</td>
			</tr>
		{/each}
	{/snippet}
</DataTable>
