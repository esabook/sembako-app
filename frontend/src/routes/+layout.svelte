<script lang="ts">
	import './layout.css';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';

	let { children } = $props();
</script>

<LoadingBar />
{@render children()}
<ToastContainer />
<OfflineIndicator />
