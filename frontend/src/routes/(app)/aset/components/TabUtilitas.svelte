<script lang="ts">
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { JENIS_LABEL, JENIS_ICON, rp } from '../aset.logic.js';
	import type { AsetStore } from '../aset.store.svelte.js';
	import type { TagihanRow } from '../aset.types.js';

	let { store }: { store: AsetStore } = $props();
</script>

<div class="mb-2 flex flex-wrap items-end gap-2">
	<Select
		bind:value={store.utJenisFilter}
		options={Object.entries(JENIS_LABEL).map(([v, lbl]) => ({
			value: v,
			label: (JENIS_ICON[v as TagihanRow['jenis']] ?? '') + ' ' + lbl
		}))}
		placeholder="Semua Jenis"
		standalone
	/>
	<input
		type="month"
		bind:value={store.utBulanFilter}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	/>
	<button
		onclick={() => store.bukaFormUt()}
		class="ml-auto rounded px-3 py-1 text-sm font-bold"
		style="background:var(--accent);color:var(--bg)">+ Catat Tagihan</button
	>
</div>

{#if store.utRows.length > 0}
	<div class="mb-2 flex flex-wrap gap-3">
		{#each ['listrik', 'air', 'internet', 'lainnya'] as const as j (j)}
			{@const total = store.utRows.filter((r) => r.jenis === j).reduce((s, r) => s + r.jumlah, 0)}
			{#if total > 0}
				<div
					class="rounded border px-3 py-2 text-xs"
					style="background:var(--surface);border-color:var(--border)"
				>
					<span>{JENIS_ICON[j]} {JENIS_LABEL[j]}</span>
					<span class="ml-2 font-bold">{rp(total)}</span>
				</div>
			{/if}
		{/each}
		<div
			class="rounded border px-3 py-2 text-xs font-bold"
			style="background:var(--surface2);border-color:var(--border);color:var(--accent)"
		>
			Total: {rp(store.totalUt)}
		</div>
	</div>
{/if}

{#if store.utLoading}
	<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
		<table class="min-w-full text-sm" style="border-collapse:collapse">
			<tbody>
				{#each { length: 4 } as _, i (i)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{50 + ((i * 13) % 30)}%" /></td>
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{40 + ((i * 9) % 25)}%" /></td>
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{45 + ((i * 7) % 20)}%" /></td>
						<td class="hidden px-3 py-2.5 sm:table-cell"
							><Skeleton h="0.75rem" w="{35 + ((i * 11) % 20)}%" /></td
						>
						<td class="hidden px-3 py-2.5 sm:table-cell"
							><Skeleton h="0.75rem" w="{30 + ((i * 17) % 15)}%" /></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if store.utRows.length === 0}
	<p class="py-4 text-sm" style="color:var(--text-dim)">Belum ada tagihan tercatat.</p>
{:else}
	<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
		<table class="min-w-full text-sm" style="border-collapse:collapse">
			<thead>
				<tr style="background:var(--surface2)">
					<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
						>Jenis</th
					>
					<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
						>Periode</th
					>
					<th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
						>Jumlah</th
					>
					<th
						class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Tgl Bayar</th
					>
					<th
						class="hidden px-3 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Pemakaian</th
					>
					<th
						class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Catatan</th
					>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each store.utRows as row (row.id)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2">
							<span>{JENIS_ICON[row.jenis]}</span>
							<span class="ml-1 text-sm font-medium">{JENIS_LABEL[row.jenis]}</span>
						</td>
						<td class="px-3 py-2 text-sm">{row.periode_bulan}</td>
						<td class="px-3 py-2 text-right font-mono font-semibold" style="color:var(--accent)"
							>{rp(row.jumlah)}</td
						>
						<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)"
							>{row.tanggal_bayar ?? '—'}</td
						>
						<td
							class="hidden px-3 py-2 text-right text-xs sm:table-cell"
							style="color:var(--text-dim)"
						>
							{row.meter_awal != null && row.meter_akhir != null
								? `${row.meter_akhir - row.meter_awal} kWh/m³`
								: '—'}
						</td>
						<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)"
							>{row.catatan ?? '—'}</td
						>
						<td class="px-3 py-2 text-right whitespace-nowrap">
							<button
								onclick={() => store.bukaFormUt(row)}
								class="mr-1 rounded px-2 py-0.5 text-xs"
								style="border:1px solid var(--border);color:var(--text-dim)">Edit</button
							>
							<button
								onclick={() => store.hapusUt(row.id)}
								class="rounded px-2 py-0.5 text-xs"
								style="color:var(--danger)">Hapus</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
