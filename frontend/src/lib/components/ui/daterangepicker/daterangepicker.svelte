<script lang="ts">
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { displayRange } from './daterangepicker.js';

	let {
		from = $bindable(''),
		to = $bindable(''),
		onchange
	}: {
		from?: string;
		to?: string;
		onchange?: () => void;
	} = $props();

	let open = $state(false);
	let selectedTemplate = $state<string | null>(null);
	let PopupComp = $state<any>(null);

	async function toggle() {
		if (!open && !PopupComp) {
			const mod = await import('./daterangepickerpopup.svelte');
			PopupComp = mod.default;
		}
		open = !open;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[99] bg-black/50 sm:bg-transparent"
		onclick={() => (open = false)}
		aria-hidden="true"
	></div>
{/if}

<div class="relative inline-block">
	<button
		type="button"
		class="flex min-w-36 items-center gap-2 rounded border-base-300 bg-base-100 px-2 py-1 text-left transition-colors hover:bg-base-200"
		onclick={toggle}
	>
		<Calendar size="1rem" class="shrink-0 text-base-content/60" aria-hidden="true" />
		<div class="flex min-w-0 flex-1 flex-col">
			<span class="truncate text-[0.7rem] leading-tight font-medium">
				{selectedTemplate ?? 'Pilih rentang'}
			</span>
			<span class="text-[0.5rem] leading-tight text-base-content/60"
				>{from && to ? displayRange(from, to) : 'Tanggal'}</span
			>
		</div>
		<ChevronDown
			size="1rem"
			class="shrink-0 text-base-content/60 transition-transform {open ? 'rotate-180' : ''}"
			aria-hidden="true"
		/>
	</button>

	{#if open && PopupComp}
		<PopupComp bind:from bind:to bind:selectedTemplate {onchange} onclose={() => (open = false)} />
	{/if}
</div>
