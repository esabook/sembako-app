<script lang="ts">
	import { onMount } from 'svelte';

	let isOnline = $state(true);
	let showBanner = $state(false);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	function update() {
		const wasOffline = !isOnline;
		isOnline = navigator.onLine;

		if (!isOnline) {
			showBanner = true;
			if (dismissTimer) clearTimeout(dismissTimer);
		} else if (wasOffline) {
			// Just came back online — show briefly then hide
			showBanner = true;
			dismissTimer = setTimeout(() => {
				showBanner = false;
			}, 3000);
		}
	}

	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', update);
		window.addEventListener('offline', update);
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
			⚡ Offline — menampilkan data tersimpan
		{/if}
	</div>
{/if}
