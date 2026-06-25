<script lang="ts">
	import { onMount } from 'svelte';
	import { qrDataUrl, qrLarge, scannerStatus, scanSessionId, scanUrl } from './kasir.store';

	let hostname = $state('');
	onMount(() => {
		hostname = location.hostname;
	});
</script>

<!-- QR panel: scan dari HP — disembunyikan di layar HP (< sm) -->
<div
	class="hidden shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 shadow-2xl select-none sm:flex"
	style="background:var(--surface);border-color:var(--border)"
	onclick={() => {
		if ($qrDataUrl) qrLarge.set(true);
	}}
	role="none"
	title="Klik untuk perbesar QR"
>
	{#if $qrDataUrl}
		<img
			src={$qrDataUrl}
			alt="Scan dari HP"
			class="h-24 w-24 rounded"
			style="image-rendering:pixelated"
		/>
	{:else}
		<div class="h-24 w-24 animate-pulse rounded" style="background:var(--surface2)"></div>
	{/if}
	<div class="flex items-center gap-1.5">
		<span
			class="h-1.5 w-1.5 shrink-0 rounded-full"
			style="background:{$scannerStatus === 'connected'
				? 'var(--accent)'
				: $scannerStatus === 'disconnected'
					? 'var(--warn)'
					: 'var(--border)'}"
		></span>
		<p class="text-xs" style="color:var(--text-dim)">
			{$scannerStatus === 'connected'
				? 'HP terhubung'
				: $scannerStatus === 'disconnected'
					? 'HP terputus'
					: 'HP scanner'}
		</p>
	</div>
	{#if $scanSessionId}
		<p class="font-mono text-xs tracking-widest" style="color:var(--accent)">
			{$scanSessionId}
		</p>
	{/if}
	<p class="text-xs" style="color:var(--text-dim)">↗ klik perbesar</p>
</div>

<!-- Large QR overlay -->
{#if $qrLarge}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center"
		style="background:rgba(0,0,0,0.88)"
		onclick={() => qrLarge.set(false)}
		role="none"
	>
		<div
			class="flex w-full max-w-xs flex-col items-center gap-3 overflow-y-auto px-4 py-6 sm:max-w-sm sm:gap-4"
			style="max-height:100dvh"
			onclick={(e) => e.stopPropagation()}
			role="none"
		>
			<img
				src={$qrDataUrl}
				alt="Scan dari HP"
				class="w-full shrink-0 rounded-xl"
				style="image-rendering:pixelated;max-width:min(20rem,55vh);aspect-ratio:1/1"
			/>
			<p class="text-sm" style="color:var(--text-dim)">Arahkan HP ke QR · atau ketik manual:</p>
			<div
				class="rounded-lg border px-2 py-1 text-center"
				style="background:var(--surface);border-color:var(--border)"
			>
				<p class="mb-1 text-xs" style="color:var(--text-dim)">Buka di browser HP</p>
				<p class="font-mono text-sm tracking-wide" style="color:var(--accent)">
					{$scanUrl}
				</p>
			</div>
			<div class="flex gap-6 text-center">
				<div>
					<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Alamat server</p>
					<p class="font-mono text-sm" style="color:var(--text)">{hostname}</p>
				</div>
				<div style="color:var(--border)">·</div>
				<div>
					<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Halaman</p>
					<p class="font-mono text-sm" style="color:var(--text)">/scan</p>
				</div>
				<div style="color:var(--border)">·</div>
				<div>
					<p class="mb-0.5 text-xs" style="color:var(--text-dim)">Kode sesi</p>
					<p class="font-mono text-lg font-bold tracking-widest" style="color:var(--accent)">
						{$scanSessionId}
					</p>
				</div>
			</div>
			<p class="text-xs" style="color:var(--text-dim)">klik luar / ESC untuk tutup</p>
		</div>
	</div>
{/if}
