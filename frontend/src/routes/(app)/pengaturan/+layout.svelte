<script lang="ts">
	import { page } from '$app/state'

	let { children } = $props()

	const TABS = [
		{ href: '/pengaturan',              label: 'Pengaturan' },
		{ href: '/pengaturan/notifikasi',   label: 'Notifikasi' },
		{ href: '/pengaturan/audit',        label: 'Audit Trail' },
		{ href: '/pengaturan/info-server',  label: 'Info Server' },
	]
</script>

<div class="p-4 pb-16 space-y-4">
	<!-- Header -->
	<h1 class="text-lg font-bold" style="color:var(--text)">Pengaturan</h1>

	<!-- Tab bar -->
	<div class="flex gap-1 rounded border p-1" style="background:var(--surface);border-color:var(--border)">
		{#each TABS as tab (tab.href)}
			{@const active = page.url.pathname === tab.href}
			<a
				href={tab.href}
				class="flex-1 rounded px-3 py-1.5 text-sm font-medium text-center transition-colors"
				style={active ? 'background:var(--accent);color:#000' : 'color:var(--text-dim)'}
			>
				{tab.label}
			</a>
		{/each}
	</div>

	<!-- Child content -->
	{@render children()}
</div>
