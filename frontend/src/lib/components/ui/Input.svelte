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
		onenter
	}: {
		value?: string | number;
		label?: string | null;
		placeholder?: string;
		type?: 'text' | 'password' | 'number' | 'email' | 'tel';
		disabled?: boolean;
		autofocus?: boolean;
		oninput?: (v: string | number) => void;
		onblur?: () => void;
		onenter?: (v: string | number) => void;
	} = $props();

	function handleInput(e: Event) {
		const inputValue = (e.target as HTMLInputElement).value;
		value = inputValue;
		oninput?.(type === 'number' && inputValue !== '' ? Number(inputValue) : inputValue);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') onenter?.(value as string | number);
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
		{value}
		oninput={handleInput}
		{onblur}
		onkeydown={handleKey}
		{autofocus}
		class="input w-full text-sm"
	/>
</label>
