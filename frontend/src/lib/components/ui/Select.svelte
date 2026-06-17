<script lang="ts">
	type Option = { value: string | number; label: string };
	type RawOption = string | number;

	let {
		value = $bindable<string | number | null>(null),
		options = [],
		label = null,
		placeholder = null,
		disabled = false,
		required = false,
		id = undefined,
		standalone = false,
		onchange,
	}: {
		value?: string | number | null;
		options?: Option[] | RawOption[];
		label?: string | null;
		placeholder?: string | null;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		standalone?: boolean;
		onchange?: (v: string | number) => void;
	} = $props();

	const normalizedOptions = $derived(
		(options as Array<Option | RawOption>).map((opt) =>
			typeof opt === 'object' ? opt : { value: opt, label: String(opt) }
		)
	);

	function handle(e: Event) {
		const raw = (e.target as HTMLSelectElement).value;
		const opt = normalizedOptions.find((o) => String(o.value) === raw);
		if (opt) {
			value = opt.value;
			onchange?.(opt.value);
		}
	}
</script>

{#snippet selectEl()}
	<select
		{id}
		{disabled}
		{required}
		value={value !== null && value !== undefined ? String(value) : ''}
		onchange={handle}
		class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-50"
		style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each normalizedOptions as opt (opt.value)}
			<option value={String(opt.value)}>{opt.label}</option>
		{/each}
	</select>
{/snippet}

{#if standalone}
	{@render selectEl()}
{:else}
	<label class="block">
		{#if label}
			<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
		{/if}
		{@render selectEl()}
	</label>
{/if}
