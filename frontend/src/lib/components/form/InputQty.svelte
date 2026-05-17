<script lang="ts">
	let {
		value = $bindable(1),
		min = 0,
		max = 9999,
		disabled = false,
		onchange,
	}: {
		value?: number;
		min?: number;
		max?: number;
		disabled?: boolean;
		onchange?: (v: number) => void;
	} = $props();

	function set(n: number) {
		let v = Number.isFinite(n) ? Math.round(n) : min;
		if (v < min) v = min;
		if (v > max) v = max;
		value = v;
		onchange?.(v);
	}

	function handleInput(e: Event) {
		set(parseInt((e.target as HTMLInputElement).value, 10));
	}

	function selectAll(e: FocusEvent) {
		(e.target as HTMLInputElement).select();
	}
</script>

<div
	class="inline-flex items-center rounded border"
	style="border-color:var(--border)"
>
	<button
		onclick={() => set(value - 1)}
		disabled={disabled || value <= min}
		class="px-2 py-1 text-sm font-bold disabled:opacity-40"
		style="color:var(--text)"
		aria-label="Kurangi">−</button
	>
	<input
		inputmode="numeric"
		{disabled}
		value={value}
		oninput={handleInput}
		onfocus={selectAll}
		class="w-12 bg-transparent py-1 text-center text-sm outline-none disabled:opacity-50"
		style="color:var(--text);border-left:1px solid var(--border);border-right:1px solid var(--border)"
	/>
	<button
		onclick={() => set(value + 1)}
		disabled={disabled || value >= max}
		class="px-2 py-1 text-sm font-bold disabled:opacity-40"
		style="color:var(--text)"
		aria-label="Tambah">+</button
	>
</div>
