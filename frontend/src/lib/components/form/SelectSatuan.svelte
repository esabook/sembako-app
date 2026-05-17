<script lang="ts">
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

	function handle(e: Event) {
		const id = parseInt((e.target as HTMLSelectElement).value, 10);
		value = id;
		onchange?.(id);
	}
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<select
		{disabled}
		value={value}
		onchange={handle}
		class="w-full rounded border px-2 py-1.5 text-sm outline-none disabled:opacity-50"
		style="background:var(--bg);border-color:var(--border);color:var(--text)"
	>
		{#each opsi as s (s.id)}
			<option value={s.id}>{s.nama}{s.singkatan ? ` (${s.singkatan})` : ''}</option>
		{/each}
	</select>
</label>
