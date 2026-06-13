<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { flushQueue, jumlahAntrian } from '$lib/stores/offlineQueue';
	import { toast } from '$lib/stores/ui.store';

	let isOnline = $state(true);
	let showBanner = $state(false);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	async function handleOnline() {
		showBanner = true;
		if (dismissTimer) clearTimeout(dismissTimer);
		dismissTimer = setTimeout(() => { showBanner = false }, 3000);
		const n = await flushQueue();
		if (n > 0) toast.sukses(`${n} transaksi berhasil dikirim`);
	}

	function update() {
		const wasOffline = !isOnline;
		isOnline = navigator.onLine;
		if (!isOnline) {
			showBanner = true;
			if (dismissTimer) clearTimeout(dismissTimer);
		} else if (wasOffline) {
			void handleOnline();
		}
	}

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', update);
		window.addEventListener('offline', update);

		// Flush sisa antrian dari sesi sebelumnya (setelah refresh/relaunch)
		if (navigator.onLine && get(jumlahAntrian) > 0) {
			void flushQueue().then((n) => { if (n > 0) toast.sukses(`${n} transaksi berhasil dikirim`) });
		}

		return () => {
			window.removeEventListener('online', update);
			window.removeEventListener('offline', update);
			if (dismissTimer) clearTimeout(dismissTimer);
		};
	});
</script>

{#if showBanner}
	<div
		class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all"
		style={isOnline
			? 'background:var(--accent);color:#fff'
			: 'background:var(--danger);color:#fff'}
	>
		{#if isOnline}
			✓ Koneksi pulih — data diperbarui
		{:else}
			⚡ Offline{$jumlahAntrian > 0 ? ` — ${$jumlahAntrian} transaksi dalam antrian` : ' — menampilkan data tersimpan'}
		{/if}
	</div>
{/if}
