<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import Scanner from '$lib/components/Scanner.svelte';

	type Mode = 'kasir' | 'barang' | 'stok' | null;
	let activeMode = $state<Mode>(null);

	const MODES = [
		{
			id: 'kasir' as Mode,
			label: 'Kasir',
			ikon: '🛒',
			deskripsi: 'Kirim scan ke sesi kasir yang sedang buka',
			catatan: 'Pastikan kasir sudah dibuka di komputer',
		},
		{
			id: 'barang' as Mode,
			label: 'Barang',
			ikon: '📦',
			deskripsi: 'Scan barcode untuk cari/edit data barang',
			catatan: null,
		},
	];

	function pilihMode(mode: Mode) {
		if (mode === 'kasir') {
			const sessionId = `kasir${$user?.id ?? 0}`;
			goto(`/scan?s=${sessionId}`);
			return;
		}
		activeMode = mode;
	}

	async function handleDetect(kode: string) {
		if (activeMode === 'barang') {
			const sessionId = `${activeMode}${$user?.id ?? 0}`;
			await fetch(`/api/scan-relay/scanner/${sessionId}`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kode }),
			});
		}
		activeMode = null;
	}
</script>

<svelte:head>
	<title>Mode Scanner</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-md mx-auto py-6 px-4">
	<!-- Header -->
	<div class="flex flex-col gap-1">
		<p class="text-xs tracking-widest font-bold" style="color:var(--accent)">MODE SCANNER</p>
		<p class="text-sm" style="color:var(--text-dim)">HP: <span style="color:var(--text)">{$user?.nama ?? '—'}</span></p>
	</div>

	<!-- Mode cards -->
	<div class="flex flex-col gap-3">
		{#each MODES as m}
			<button
				onclick={() => pilihMode(m.id)}
				class="flex items-start gap-4 rounded-lg border px-5 py-4 text-left transition-colors active:scale-[0.98]"
				style="background:var(--surface);border-color:var(--border)"
			>
				<span class="text-3xl shrink-0 mt-0.5">{m.ikon}</span>
				<div class="flex flex-col gap-0.5 min-w-0">
					<span class="text-base font-bold" style="color:var(--text)">{m.label}</span>
					<span class="text-xs" style="color:var(--text-dim)">{m.deskripsi}</span>
					{#if m.catatan}
						<span class="text-xs mt-1" style="color:var(--warn)">{m.catatan}</span>
					{/if}
				</div>
				<span class="ml-auto shrink-0 self-center text-lg" style="color:var(--text-dim)">›</span>
			</button>
		{/each}
	</div>

	<p class="text-xs text-center" style="color:var(--text-dim)">
		Gunakan Chrome/Chromium di HP untuk hasil terbaik.
	</p>
</div>

{#if activeMode === 'barang' || activeMode === 'stok'}
	<Scanner onDetect={handleDetect} onClose={() => activeMode = null} />
{/if}
