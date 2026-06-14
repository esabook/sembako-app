<script lang="ts">
	let {
		value = $bindable(''),
		label = null,
		placeholder = '',
		type = 'text',
		disabled = false,
		autofocus = false,
		oninput,
		onblur,
		onenter,
	}: {
		value?: string;
		label?: string | null;
		placeholder?: string;
		type?: 'text' | 'password' | 'number' | 'email' | 'tel';
		disabled?: boolean;
		autofocus?: boolean;
		oninput?: (v: string) => void;
		onblur?: () => void;
		onenter?: (v: string) => void;
	} = $props();

	function handleInput(e: Event) {
		value = (e.target as HTMLInputElement).value;
		oninput?.(value);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') onenter?.(value);
	}
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
	{/if}
	<!-- svelte-ignore a11y_autofocus -->
	<input
		{type}
		{placeholder}
		{disabled}
		value={value}
		oninput={handleInput}
		{onblur}
		onkeydown={handleKey}
		{autofocus}
		class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-50"
		style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"
	/>
</label>
