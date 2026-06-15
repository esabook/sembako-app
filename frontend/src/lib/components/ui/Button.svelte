<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		shortcut = null,
		type = 'button',
		clasz = '',
		onclick,
		children
	}: {
		variant?: 'primary' | 'danger' | 'ghost' | 'dim' | 'info';
		size?: 'xs' | 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		shortcut?: string | null;
		type?: 'button' | 'submit';
		clasz?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const sizeCls = {
		xs: 'px-1.5 py-0.5 text-xs gap-1',
		sm: 'px-2 py-1 text-xs gap-1',
		md: 'px-3 py-1.5 text-sm gap-1.5',
		lg: 'px-4 py-2.5 text-base gap-2'
	} as const;

	const gaya = $derived.by(() => {
		switch (variant) {
			case 'primary':
				return 'background:var(--accent);color:var(--bg);border-color:var(--accent)';
			case 'danger':
				return 'background:var(--danger);color:var(--bg);border-color:var(--danger)';
			case 'ghost':
				return 'background:transparent;color:var(--text);border-color:var(--border)';
			case 'dim':
				return 'background:var(--surface2);color:var(--text-dim);border-color:var(--border)';
			case 'info':
				return 'background:color-mix(in srgb,var(--info) 15%,transparent);color:var(--info);border-color:var(--info)';
		}
	});
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	class="inline-flex items-center justify-center rounded border font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 {sizeCls[
		size
	]} {clasz}"
	style={gaya}
>
	{#if loading}
		<span class="spin">⟳</span>
	{/if}
	{@render children()}
	{#if shortcut}
		<kbd
			class="ml-1 rounded px-1 text-[10px] font-normal"
			style="background:rgba(0,0,0,0.2);color:inherit">{shortcut}</kbd
		>
	{/if}
</button>

<style>
	.spin {
		display: inline-block;
		animation: putar 0.8s linear infinite;
		will-change: transform;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
</style>
