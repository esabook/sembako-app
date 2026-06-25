<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Calendar from '@lucide/svelte/icons/calendar';

	let {
		from = $bindable(''),
		to = $bindable(''),
		label = null,
		placeholder = 'Pilih rentang tanggal',
		disabled = false,
		onchange
	}: {
		from?: string;
		to?: string;
		label?: string | null;
		placeholder?: string;
		disabled?: boolean;
		onchange?: () => void;
	} = $props();

	let open = $state(false);
	let ready = $state(false);

	onMount(async () => {
		await import('cally');
		ready = true;
	});

	// calendar-range serializes value as "YYYY-MM-DD/YYYY-MM-DD" (slash-separated)
	function syncRange(f: string, t: string) {
		return (node: Element) => {
			(node as any).value = f && t ? `${f}/${t}` : '';
		};
	}

	// Attach addEventListener directly — onchange= sets element.onchange (property),
	// which doesn't catch CustomEvent dispatched by cally via dispatchEvent.
	// Change event fires only after both dates are selected.
	function listenChange(node: Element) {
		const handler = (e: Event) => {
			const raw = String((e.target as any)?.value ?? '');
			const [start = '', end = ''] = raw.split('/');
			from = start;
			to = end;
			open = false;
			onchange?.();
		};
		node.addEventListener('change', handler);
		return () => node.removeEventListener('change', handler);
	}

	function fmt(iso: string): string {
		if (!iso) return '...';
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

	function formatDisplay(): string {
		return `${fmt(from)} — ${fmt(to)}`;
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
			<span class={!from && !to ? 'text-base-content/40' : ''}>
				{from || to ? formatDisplay() : placeholder}
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
				<calendar-range
					locale="id-ID"
					{@attach syncRange(from, to)}
					{@attach listenChange}
					class="pointer-events-auto block cally rounded-box border border-base-300 bg-base-100 shadow-lg"
				>
					<span slot="previous"><ChevronLeft color="var(--text)" size="24px" aria-label="Previous" /></span>
					<span slot="next"><ChevronRight color="var(--text)" size="24px" aria-label="Next" /></span>
					<calendar-month></calendar-month>
				</calendar-range>
			</div>
		{/if}
	</div>
</div>
