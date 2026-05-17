<script lang="ts">
	import type { Snippet } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';

	type Kolom = {
		key: string;
		label: string;
		align?: 'left' | 'center' | 'right';
		lebar?: string;
	};

	let {
		kolom,
		data,
		loading = false,
		kosongPesan = 'Tidak ada data',
		klikBaris = false,
		onklik,
		cell,
	}: {
		kolom: Kolom[];
		data: Record<string, unknown>[];
		loading?: boolean;
		kosongPesan?: string;
		klikBaris?: boolean;
		onklik?: (baris: Record<string, unknown>) => void;
		// custom render per cell: (col, baris, i) => konten
		cell?: Snippet<[Kolom, Record<string, unknown>, number]>;
	} = $props();
</script>

<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr style="background:var(--surface2)">
				{#each kolom as col (col.key)}
					<th
						class="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide"
						style="border-color:var(--border);color:var(--text-dim);text-align:{col.align ??
							'left'};{col.lebar ? `width:${col.lebar}` : ''}"
					>
						{col.label}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if loading}
				<tr>
					<td colspan={kolom.length} class="px-3 py-10 text-center">
						<Spinner />
					</td>
				</tr>
			{:else if data.length === 0}
				<tr>
					<td colspan={kolom.length}>
						<EmptyState pesan={kosongPesan} />
					</td>
				</tr>
			{:else}
				{#each data as baris, i (i)}
					<tr
						class="border-b transition-colors {klikBaris ? 'cursor-pointer' : ''}"
						style="border-color:var(--border)"
						onclick={() => klikBaris && onklik?.(baris)}
					>
						{#each kolom as col (col.key)}
							<td
								class="px-3 py-2"
								style="color:var(--text);text-align:{col.align ?? 'left'}"
							>
								{#if cell}
									{@render cell(col, baris, i)}
								{:else}
									{baris[col.key] ?? '—'}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
