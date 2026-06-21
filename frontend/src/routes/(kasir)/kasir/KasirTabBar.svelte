<script lang="ts">
	import { page } from '$app/state';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Sliders from '@lucide/svelte/icons/sliders';
	import Receipt from '@lucide/svelte/icons/receipt';
	import BellDot from '@lucide/svelte/icons/bell-dot';
	import KasirMorePanel from './KasirMorePanel.svelte';

	const TABS = [
		{ label: 'Checkout', icon: ShoppingCart, href: '/kasir', activeOn: ['/kasir'] as string[] },
		{
			label: 'Custom',
			icon: Sliders,
			href: '/kasir/custom',
			activeOn: ['/kasir/custom'] as string[]
		},
		{
			label: 'Transaksi',
			icon: Receipt,
			href: '/kasir/history',
			activeOn: ['/kasir/history', '/kasir/retur'] as string[]
		}
	] as const;

	let showPanel = $state(false);

	function isActive(tab: (typeof TABS)[number]): boolean {
		const path = page.url.pathname;
		return tab.activeOn.some((a) => path === a || (a.includes('/', 1) && path.startsWith(a + '/')));
	}
</script>

<KasirMorePanel bind:open={showPanel} />

<div
	class="flex h-[3rem] shrink-0 items-stretch border-t"
	style="background:var(--surface);border-color:var(--border)"
>
	<!-- Tab buttons -->
	<div class="flex flex-1">
		{#each TABS as tab (tab.href)}
			{@const active = isActive(tab)}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 transition-colors"
				style={active
					? `border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)`
					: `border-color:transparent;color:var(--text-dim)`}
				aria-current={active ? 'page' : undefined}
				title={tab.label}
			>
				<tab.icon size="1rem" />
				<span class="hidden text-xs leading-none min-[360px]:block">{tab.label}</span>
			</a>
		{/each}
	</div>

	<!-- Notif & More (fixed square) -->
	<button
		onclick={() => (showPanel = !showPanel)}
		class="flex w-14 shrink-0 items-center justify-center border-l transition-colors active:opacity-60 sm:w-16"
		style="border-color:var(--border);color:var(--text-dim)"
		aria-label="Notifikasi dan menu"
		title="Notifikasi & Menu"
	>
		<BellDot size={22} />
	</button>
</div>
