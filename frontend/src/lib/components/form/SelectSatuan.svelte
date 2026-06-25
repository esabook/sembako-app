<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';

	type Satuan = { id: number; nama: string; singkatan?: string | null };

	let {
		value = $bindable<number | null>(null),
		opsi = [],
		disabled = false,
		label = null,
		onchange,
	}: {
		value?: number | null;
		opsi?: Satuan[];
		disabled?: boolean;
		label?: string | null;
		onchange?: (id: number) => void;
	} = $props();

	let options = $derived(opsi.map(s => ({ value: s.id, label: s.nama + (s.singkatan ? ` (${s.singkatan})` : '') })));

	function handle(v: string | number) {
		onchange?.(v as number);
	}
</script>

<Select
	bind:value
	{options}
	{label}
	{disabled}
	onchange={handle}
/>
