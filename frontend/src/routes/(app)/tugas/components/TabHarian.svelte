<script lang="ts">
	import type { createTugasStore } from '../tugas.store.svelte';
	import { goto } from '$app/navigation';
	import DatePicker from '$lib/components/ui/DatePicker2.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let { store, isManager }: { store: ReturnType<typeof createTugasStore>; isManager: boolean } =
		$props();
</script>

<!-- Header: tanggal + progress -->
<div class="flex flex-wrap items-center gap-3">
	<DatePicker bind:value={store.tanggal} label="Tanggal" />
	<div class="flex flex-1 items-center gap-2">
		<div class="h-3 flex-1 overflow-hidden rounded-full" style="background:var(--surface2)">
			<div
				class="h-3 rounded-full transition-all"
				style="width:{store.persen}%;background:var(--accent)"
			></div>
		</div>
		<span class="text-sm font-medium whitespace-nowrap" style="color:var(--text-dim)">
			{store.totalSelesai}/{store.totalItem} ({store.persen}%)
		</span>
	</div>
</div>

{#if store.loading}
	<div class="flex justify-center py-6"><Spinner /></div>
{:else if store.logRows.length === 0}
	<EmptyState pesan="Belum ada item tugas.">
		{#snippet aksi()}
			{#if isManager}
				<Button
					variant="ghost"
					size="sm"
					onclick={() =>
						goto('?tab=template', { replaceState: true, keepFocus: true, noScroll: true })}
				>
					Tambah item di tab Kelola Item
				</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	{#each Object.entries(store.grouped) as [kat, rows] (kat)}
		<div class="space-y-2">
			<h3 class="text-xs font-semibold tracking-wider uppercase" style="color:var(--text-dim)">
				{kat}
			</h3>
			{#each rows as row (row.item_id)}
				<div
					class="flex items-center gap-3 rounded-lg border p-3"
					style="background:var(--surface);border-color:var(--border)"
				>
					<button
						onclick={() => store.tandai(row.item_id, !row.selesai)}
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition-colors"
						style={row.selesai
							? 'background:var(--accent);border-color:var(--accent)'
							: 'background:transparent;border-color:var(--border)'}
					>
						{#if row.selesai}
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
					<div class="min-w-0 flex-1">
						<p
							class="text-sm font-medium"
							style="color:var(--text);{row.selesai
								? 'text-decoration:line-through;opacity:0.6'
								: ''}"
						>
							{row.nama}
						</p>
						{#if row.nama_karyawan}
							<p class="text-xs" style="color:var(--text-dim)">oleh {row.nama_karyawan}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
{/if}
