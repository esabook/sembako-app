<script lang="ts">
	import { toast } from '$lib/stores/ui.store';
	import Toast from '$lib/components/ui/Toast.svelte';
</script>

<div class="fixed right-3 bottom-3 z-[70] flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2">
	{#each $toast as t (t.id)}
		<Toast tipe={t.tipe} pesan={t.pesan} onhapus={() => toast.hapus(t.id)} />
	{/each}
</div>
