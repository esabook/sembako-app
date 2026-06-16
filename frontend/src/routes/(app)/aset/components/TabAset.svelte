<script lang="ts">
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { KONDISI_LABEL, KONDISI_COLOR, KATEGORI_LIST, rp } from '../aset.logic.js';
	import type { AsetStore } from '../aset.store.svelte.js';

	let { store }: { store: AsetStore } = $props();
</script>

<div class="mb-2 flex flex-wrap items-end gap-2">
	<select
		bind:value={store.asetKategoriFilter}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	>
		<option value="">Semua Kategori</option>
		{#each KATEGORI_LIST as k (k)}
			<option value={k}>{k}</option>
		{/each}
	</select>
	<select
		bind:value={store.asetKondisiFilter}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	>
		<option value="">Semua Kondisi</option>
		{#each Object.entries(KONDISI_LABEL) as [v, lbl] (v)}
			<option value={v}>{lbl}</option>
		{/each}
	</select>
	<button
		onclick={() => store.bukaFormAset()}
		class="ml-auto rounded px-3 py-1 text-sm font-bold"
		style="background:var(--accent);color:var(--bg)">+ Tambah Aset</button
	>
</div>

{#if store.asetLoading}
	<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
		<table class="min-w-full text-sm" style="border-collapse:collapse">
			<tbody>
				{#each { length: 5 } as _, i (i)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{55 + ((i * 13) % 30)}%" /></td>
						<td class="hidden px-3 py-2.5 sm:table-cell"
							><Skeleton h="0.75rem" w="{40 + ((i * 9) % 25)}%" /></td
						>
						<td class="hidden px-3 py-2.5 sm:table-cell"
							><Skeleton h="0.75rem" w="{35 + ((i * 7) % 20)}%" /></td
						>
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{45 + ((i * 11) % 25)}%" /></td>
						<td class="hidden px-3 py-2.5 sm:table-cell"
							><Skeleton h="0.75rem" w="{30 + ((i * 17) % 20)}%" /></td
						>
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="4rem" /></td>
						<td class="px-3 py-2.5"><Skeleton h="0.75rem" w="3rem" /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if store.asetRows.length === 0}
	<p class="py-4 text-sm" style="color:var(--text-dim)">Belum ada aset tercatat.</p>
{:else}
	<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
		<table class="min-w-full text-sm" style="border-collapse:collapse">
			<thead>
				<tr style="background:var(--surface2)">
					<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
						>Nama</th
					>
					<th
						class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Kategori</th
					>
					<th
						class="hidden px-3 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Nilai Beli</th
					>
					<th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
						>Nilai Sekarang</th
					>
					<th
						class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Lokasi</th
					>
					<th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)"
						>Kondisi</th
					>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each store.asetRows as row (row.id)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2 font-medium">{row.nama}</td>
						<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)"
							>{row.kategori}</td
						>
						<td
							class="hidden px-3 py-2 text-right font-mono text-xs sm:table-cell"
							style="color:var(--text-dim)">{rp(row.nilai_beli)}</td
						>
						<td class="px-3 py-2 text-right font-mono text-xs font-semibold"
							>{rp(row.nilai_sekarang)}</td
						>
						<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)"
							>{row.lokasi ?? '—'}</td
						>
						<td class="px-3 py-2 text-center">
							<span class="text-xs font-semibold" style="color:{KONDISI_COLOR[row.kondisi]}"
								>{KONDISI_LABEL[row.kondisi]}</span
							>
						</td>
						<td class="px-3 py-2 text-right whitespace-nowrap">
							<button
								onclick={() => store.bukaFormAset(row)}
								class="mr-1 rounded px-2 py-0.5 text-xs"
								style="border:1px solid var(--border);color:var(--text-dim)">Edit</button
							>
							<button
								onclick={() => store.hapusAset(row.id, row.nama)}
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
