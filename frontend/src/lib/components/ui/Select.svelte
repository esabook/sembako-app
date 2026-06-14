<script lang="ts">
	type Option = { value: string | number; label: string };

	let {
		value = $bindable<string | number | null>(null),
		options = [],
		label = null,
		placeholder = null,
		disabled = false,
		onchange,
	}: {
		value?: string | number | null;
		options?: Option[];
		label?: string | null;
		placeholder?: string | null;
		disabled?: boolean;
		onchange?: (v: string | number) => void;
	} = $props();

	function handle(e: Event) {
		const raw = (e.target as HTMLSelectElement).value;
		const opt = options.find((o) => String(o.value) === raw);
		if (opt) {
			value = opt.value;
			onchange?.(opt.value);
		}
	}
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<select
		{disabled}
		value={value !== null ? String(value) : ''}
		onchange={handle}
		class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-50"
		style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as opt (opt.value)}
			<option value={String(opt.value)}>{opt.label}</option>
		{/each}
	</select>
</label>
