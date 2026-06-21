<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Receipt from '@lucide/svelte/icons/receipt';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	const TABS = [
		{ label: 'Riwayat Transaksi', icon: Receipt, href: '/kasir/history' },
		{ label: 'Retur Penjualan', icon: RotateCcw, href: '/kasir/retur' }
	] as const;

	let tab = $derived(page.url.searchParams.get('tab') ?? 'ringkasan');

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	let { children } = $props();
</script>

<div class="flex h-full flex-col">
	<div
		style="display:flex; border:1px solid var(--border);
         overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none"
		class="tabbar-scroll rounded border"
	>
		{#each TABS as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<button
				onclick={() => goto(tab.href)}
				class="flex items-center gap-1.5 border-b-2 px-2 py-1 text-sm font-medium transition-colors"
				style={active
					? `border-color:var(--accent);color:var(--accent)`
					: `border-color:transparent;color:var(--text-dim)`}
				aria-current={active ? 'page' : undefined}
			>
				<tab.icon size="0.875rem" />
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
		{@render children()}
	</div>
</div>
