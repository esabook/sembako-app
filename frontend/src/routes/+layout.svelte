<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';

	let { children } = $props();

	onMount(() => {
		const link = document.createElement('link');
		link.rel = 'manifest';
		link.href = '/manifest.webmanifest';
		document.head.appendChild(link);
	});
</script>

<LoadingBar />
{@render children()}
<ToastContainer />
<OfflineIndicator />
