<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '> cari...',
		loading = false,
		autofocus = true,
		debounce = 150,
		onsearch,
		onescape,
		onenter,
		onarrowdown,
		onarrowup,
	}: {
		value?: string;
		placeholder?: string;
		loading?: boolean;
		autofocus?: boolean;
		debounce?: number;
		onsearch?: (q: string) => void;
		onescape?: () => void;
		onenter?: (q: string) => void;
		onarrowdown?: () => void;
		onarrowup?: () => void;
	} = $props();

	let timer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => () => { if (timer) clearTimeout(timer) });

	function handleInput(e: Event) {
		value = (e.target as HTMLInputElement).value;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => onsearch?.(value), debounce);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			value = '';
			if (timer) clearTimeout(timer);
			onescape?.();
		} else if (e.key === 'Enter') {
			onenter?.(value);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			onarrowdown?.();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			onarrowup?.();
		}
	}

	function kosongkan() {
		value = '';
		onsearch?.('');
	}
</script>

<div
	class="flex items-center gap-2 rounded border px-2 py-1.5"
	style="background:var(--bg);border-color:var(--border)"
>
	<span style="color:var(--text-dim)">{loading ? '⟳' : '>'}</span>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		{placeholder}
		value={value}
		oninput={handleInput}
		onkeydown={handleKey}
		{autofocus}
		class="min-w-0 flex-1 bg-transparent text-sm outline-none"
		style="color:var(--text)"
	/>
	{#if value}
		<button onclick={kosongkan} style="color:var(--text-dim)" aria-label="Kosongkan"
			>&times;</button
		>
	{/if}
</div>
