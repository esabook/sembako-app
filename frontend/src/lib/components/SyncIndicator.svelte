<script lang="ts">
	import { syncStatus, jumlahAntrian } from '$lib/stores/offlineQueue';
</script>

{#if $syncStatus === 'unsynced' && $jumlahAntrian > 0}
	<div
		class="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
		style="background:var(--danger);color:#fff"
		title="{$jumlahAntrian} transaksi belum terkirim"
	>
		<span class="inline-block h-1.5 w-1.5 rounded-full bg-white opacity-80"></span>
		{$jumlahAntrian} antrian
	</div>
{:else if $syncStatus === 'syncing'}
	<div
		class="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
		style="background:var(--accent);color:#fff"
	>
		<svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
		Menyinkronkan...
	</div>
{/if}
