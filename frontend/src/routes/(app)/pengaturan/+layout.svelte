<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import TabBar from '$lib/components/ui/TabBar.svelte';

	let { children } = $props();

	const TABS = [
		{ key: 'pengaturan', label: 'Pengaturan' },
		{ key: 'struk', label: 'Preview Struk' },
		{ key: 'notifikasi', label: 'Notifikasi' },
		{ key: 'audit', label: 'Audit Trail' },
		{ key: 'info-server', label: 'Info Server' },
		{ key: 'toko', label: 'Toko & Cabang' }
	];

	const HREF: Record<string, string> = {
		pengaturan: '/pengaturan',
		struk: '/pengaturan/struk',
		notifikasi: '/pengaturan/notifikasi',
		audit: '/pengaturan/audit',
		'info-server': '/pengaturan/info-server',
		toko: '/pengaturan/toko'
	};

	const activeTab = $derived(
		page.url.pathname === '/pengaturan'
			? 'pengaturan'
			: (page.url.pathname.split('/').pop() ?? 'pengaturan')
	);
</script>

<div class="space-y-4">
	<!-- Header -->
	<h1 class="font-bold" style="color:var(--text)">Pengaturan Aplikasi</h1>

	<TabBar
		tabs={TABS}
		active={activeTab}
		storageKey="pengaturan"
		onchange={(key) => goto(HREF[key] ?? '/pengaturan')}
	/>

	<!-- Child content -->
	{@render children()}
</div>
