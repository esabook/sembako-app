<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Calendar from '@lucide/svelte/icons/calendar';

	let {
		value = $bindable(''),
		label = null,
		placeholder = 'Pilih tanggal',
		disabled = false
	}: {
		value?: string;
		label?: string | null;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	let open = $state(false);
	let ready = $state(false);

	onMount(async () => {
		await import('cally');
		ready = true;
	});

	function syncValue(val: string) {
		return (node: Element) => {
			(node as any).value = val;
		};
	}

	// Attach addEventListener directly — onchange= sets element.onchange (property),
	// which doesn't catch CustomEvent dispatched by cally via dispatchEvent.
	function listenChange(node: Element) {
		const handler = (e: Event) => {
			const v = (e as CustomEvent<{ value: string }>).detail?.value ?? (e.target as any)?.value;
			if (v) value = v;
			open = false;
		};
		node.addEventListener('change', handler);
		return () => node.removeEventListener('change', handler);
	}

	function formatDisplay(iso: string): string {
		if (!iso) return '';
		try {
			return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	function toggle() {
		if (!disabled) open = !open;
	}

	function autoPosition(node: Element) {
		requestAnimationFrame(() => {
			if (window.innerWidth < 640) return;
			const el = node as HTMLElement;
			const rect = el.getBoundingClientRect();
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			if (rect.right > vw) {
				el.style.left = 'auto';
				el.style.right = '0';
			}
		});
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[99] bg-black/50 sm:bg-transparent"
		onclick={() => (open = false)}
		aria-hidden="true"
	></div>
{/if}

<div class="flex flex-col gap-1">
	{#if label}
		<span class="label-text text-xs">{label}</span>
	{/if}
	<div class="relative">
		<button
			type="button"
			{disabled}
			class="input-outline input w-full justify-between font-normal btn-sm"
			onclick={toggle}
		>
			<span class={!value ? 'text-base-content/40' : ''}>
				{value ? formatDisplay(value) : placeholder}
			</span>
			<Calendar size="1rem" aria-label="Calendar" />
		</button>

		{#if open && ready}
			<div
				class="fixed inset-0 z-100 sm:hidden"
				aria-hidden="true"
				onclick={() => (open = false)}
			></div>
			<div
				class="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center sm:pointer-events-auto sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:z-100 sm:mt-1"
				{@attach autoPosition}
			>
				<calendar-date
					locale="id-ID"
					{@attach syncValue(value)}
					{@attach listenChange}
					class="pointer-events-auto block cally rounded-box border border-base-300 bg-base-100 shadow-lg"
				>
					<span slot="previous"><ChevronLeft color="var(--text)" size="24px" aria-label="Previous" /></span>
					<span slot="next"><ChevronRight color="var(--text)" size="24px" aria-label="Next" /></span>

					<calendar-month></calendar-month>
				</calendar-date>
			</div>
		{/if}
	</div>
</div>
