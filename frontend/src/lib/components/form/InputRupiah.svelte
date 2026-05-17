<script lang="ts">
	let {
		value = $bindable(0),
		label = null,
		placeholder = '0',
		disabled = false,
		autofocus = false,
		min = 0,
		onchange,
		onblur,
	}: {
		value?: number;
		label?: string | null;
		placeholder?: string;
		disabled?: boolean;
		autofocus?: boolean;
		min?: number;
		onchange?: (v: number) => void;
		onblur?: () => void;
	} = $props();

	const fmt = new Intl.NumberFormat('id-ID');
	const tampil = $derived(value ? fmt.format(value) : '');

	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		const bersih = el.value.replace(/\D/g, '');
		let n = bersih ? parseInt(bersih, 10) : 0;
		if (n < min) n = min;
		value = n;
		onchange?.(n);
	}

	function selectAll(e: FocusEvent) {
		(e.target as HTMLInputElement).select();
	}
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<div
		class="flex items-center rounded border px-2 py-1.5"
		style="background:var(--bg);border-color:var(--border)"
	>
		<span class="mr-1 text-xs" style="color:var(--text-dim)">Rp</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			inputmode="numeric"
			{placeholder}
			{disabled}
			value={tampil}
			oninput={handleInput}
			onfocus={selectAll}
			{onblur}
			{autofocus}
			class="min-w-0 flex-1 bg-transparent text-right text-sm outline-none disabled:opacity-50"
			style="color:var(--text)"
		/>
	</div>
</label>
