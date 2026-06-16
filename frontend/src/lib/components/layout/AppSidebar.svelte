<script lang="ts">
	import { page } from '$app/state';
	import { user, type Role } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { NAV } from './AppSidebar.nav';

	let {
		mobileOpen = $bindable(false),
		namaToko = ''
	}: { mobileOpen?: boolean; namaToko?: string } = $props();

	type SidebarState = 'expanded' | 'icon';
	const SIDEBAR_KEY = 'sidebar_state';
	let sidebarState = $state<SidebarState>('icon');
	let sidebarReady = $state(false);
	let isMobile = $state(false);

	// --- Resizable sidebar ---
	const ICON_W = 2.75;
	const EXPANDED_W = 13;
	const MIN_W = ICON_W;
	const MAX_W = 20;
	const SIDEBAR_W_KEY = 'sidebar_custom_width';
	let customWidth = $state<number | null>(null);
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartW = 0;

	function clamp(v: number) {
		return Math.max(MIN_W, Math.min(MAX_W, v));
	}

	function onDragStart(e: MouseEvent) {
		if (isMobile) return;
		e.preventDefault();
		isDragging = true;
		document.body.classList.add('is-dragging-sidebar');
		dragStartX = e.clientX;
		dragStartW = sidebarWidth;
		const onMove = (ev: MouseEvent) => {
			const w = clamp(dragStartW + (ev.clientX - dragStartX) / 16);
			customWidth = w;
			// snap to icon or expanded thresholds
			if (w <= MIN_W + 0.3) customWidth = null;
			else if (Math.abs(w - EXPANDED_W) < 0.3) customWidth = EXPANDED_W;
		};
		const onUp = () => {
			isDragging = false;
			document.body.classList.remove('is-dragging-sidebar');
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			if (customWidth !== null) {
				localStorage.setItem(SIDEBAR_W_KEY, String(customWidth));
			} else {
				localStorage.removeItem(SIDEBAR_W_KEY);
			}
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	function toggleSidebar() {
		customWidth = null;
		localStorage.removeItem(SIDEBAR_W_KEY);
		sidebarState = sidebarState === 'expanded' ? 'icon' : 'expanded';
		localStorage.setItem(SIDEBAR_KEY, sidebarState);
	}

	onMount(() => {
		const mq = window.matchMedia('(max-width: 639px)');
		isMobile = mq.matches;
		const handleMq = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
			if (!e.matches) mobileOpen = false;
		};
		mq.addEventListener('change', handleMq);

		const saved = localStorage.getItem(SIDEBAR_KEY);
		if (saved === 'expanded' || saved === 'icon') sidebarState = saved;
		const savedW = localStorage.getItem(SIDEBAR_W_KEY);
		if (savedW) customWidth = clamp(parseFloat(savedW));
		sidebarReady = true;

		const cleanupKeys = tinykeys(window, {
			'Control+Home': (e) => {
				e.preventDefault();
				toggleSidebar();
			},
			Escape: () => {
				if (mobileOpen) mobileOpen = false;
			}
		});
		return () => {
			mq.removeEventListener('change', handleMq);
			cleanupKeys();
		};
	});

	function bolehAkses(roles: Role[]): boolean {
		return $user !== null && roles.includes($user.role);
	}

	let visibleNav = $derived(NAV.filter((item) => bolehAkses(item.roles)));
	const showLabels = $derived(isMobile || sidebarState === 'expanded');
	const activeTab = $derived(page.url.searchParams.get('tab'));
	const sidebarWidth = $derived(
		isMobile ? 14 : (customWidth ?? (sidebarState === 'expanded' ? EXPANDED_W : ICON_W))
	);

	function handleSubClick(href: string, tab: string) {
		goto(`${href}?tab=${tab}`, { replaceState: true, keepFocus: true, noScroll: true });
		if (isMobile) mobileOpen = false;
	}
</script>

<!-- Backdrop mobile (di bawah navbar, tidak menutupi navbar) -->
{#if isMobile && mobileOpen}
	<div
		class="fixed inset-0 z-40 h-screen bg-black/50"
		onclick={() => (mobileOpen = false)}
		role="presentation"
		aria-hidden="true"
	></div>
{/if}

<aside
	class={isMobile
		? `fixed inset-0 z-50 flex h-screen flex-col rounded-r-lg border-r shadow-xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
		: `app-sidebar relative flex shrink-0 flex-col border-r ${sidebarReady && !isDragging ? 'transition-all duration-200' : ''} ${isDragging ? 'is-dragging' : ''}`}
	style="background:var(--surface);border-color:var(--border);width:{sidebarWidth}rem"
>
	{#if isMobile}
		<!-- Header: logo + nama toko | tombol dismiss -->
		<header
			class="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-2"
			style="border-color:var(--border)"
		>
			<div class="flex min-w-0 items-center gap-2">
				<img src="/logo.png" alt="Logo" class="h-7 w-7 shrink-0" />
				<span class="truncate text-sm font-bold" style="color:var(--accent)">{namaToko}</span>
			</div>

			<!-- Mobile: tutup sidebar -->
			<button
				onclick={() => (mobileOpen = false)}
				aria-label="Tutup menu"
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface2)]"
				style="color:var(--text-dim)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-panel-left-close-icon lucide-panel-left-close"
					><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
						d="m16 15-3-3 3-3"
					/></svg
				>
			</button>
		</header>
	{/if}
	{#if !isMobile}
		<!-- Desktop: tombol toggle pojok kanan atas -->
		<button
			onclick={toggleSidebar}
			title={sidebarState === 'expanded' ? 'Ciutkan (Ctrl+Home)' : 'Perluas (Ctrl+Home)'}
			aria-label={sidebarState === 'expanded' ? 'Ciutkan menu' : 'Perluas menu'}
			class="toggle-btn absolute top-3 -right-3 z-[15] flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors"
			style="background:var(--surface);border-color:var(--border);color:var(--text-dim)"
		>
			<svg width="0.65em" height="0.65em" viewBox="0 0 24 24" fill="none">
				{#if sidebarState === 'expanded'}
					<path
						d="M15 18l-6-6 6-6"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{:else}
					<path
						d="M9 18l6-6-6-6"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/if}
			</svg>
		</button>
	{/if}

	<!-- Nav links — hanya bagian ini yang scrollable -->
	<nav class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2">
		{#each visibleNav as item (item.href)}
			{@const isActive = page.url.pathname.startsWith(item.href)}
			{@const hasSub = isActive && showLabels && item.sub?.length}
			<a
				href={item.href}
				title={!showLabels ? item.label : undefined}
				onclick={() => {
					if (isMobile) mobileOpen = false;
				}}
				class="hover-nav-item relative flex h-9 items-center text-sm transition-colors"
				style={isActive
					? 'color:var(--accent);background:var(--surface2)'
					: 'color:var(--text-dim)'}
				aria-current={isActive ? 'page' : undefined}
			>
				<span
					class="absolute top-0 bottom-0 left-0 shrink-0 {isActive ? 'w-0.5' : 'w-0'}"
					style={isActive ? 'background:var(--accent)' : ''}
				></span>

				<svg
					width="1.2em"
					height="1.2em"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="ml-3 shrink-0 {isActive ? 'opacity-100' : 'opacity-70'}"
				>
					<path d={item.icon} />
				</svg>

				{#if showLabels}
					<span class="ml-2 truncate font-medium">{item.label}</span>
				{/if}
			</a>

			<!-- Sub-nav: muncul saat parent aktif & expanded -->
			{#if hasSub}
				<div class="sub-nav">
					{#each item.sub! as sub (sub.key)}
						{@const isTab = activeTab === sub.key}
						<button
							onclick={() => handleSubClick(item.href, sub.key)}
							class="sub-nav-item"
							style={(isActive
								? 'border-color:color-mix(in srgb, var(--border) 50%, transparent 50%)'
								: '') + (isTab ? 'color:var(--accent);border-color:var(--accent)' : '')}
							aria-current={isTab ? 'page' : undefined}
						>
							{sub.label}
						</button>
					{/each}
				</div>
			{/if}
		{/each}
	</nav>
	<!-- Drag handle -->
	{#if !isMobile}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="drag-handle"
			onmousedown={onDragStart}
			role="separator"
			aria-orientation="vertical"
			tabindex="-1"
		></div>
	{/if}
</aside>

<style>
	.hover-nav-item:not([aria-current='page']):hover {
		background: var(--surface2);
		color: var(--text);
	}

	.sub-nav {
		display: flex;
		flex-direction: column;
		contain: layout style;
	}

	.sub-nav-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.25rem 0.5rem 0.25rem 2.25rem;
		font-size: 0.75rem;
		border-left: 3px solid transparent;
		color: var(--text-dim);
		background: none;
		border-top: 0;
		border-right: 0;
		border-bottom: 0;
		cursor: pointer;
	}

	.sub-nav-item:hover {
		color: var(--text);
		background: var(--surface2);
	}

	.sub-nav-item[aria-current='page'] {
		font-weight: 600;
	}

	.drag-handle {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 4px;
		cursor: col-resize;
		z-index: 10;
	}

	.drag-handle:hover,
	:global(.app-sidebar.is-dragging) .drag-handle {
		background: var(--accent);
		opacity: 0.3;
	}

	.drag-handle:hover,
	.app-sidebar.is-dragging {
		cursor: col-resize;
	}

	.toggle-btn {
		cursor: pointer;
	}

	:global(body.is-dragging-sidebar) {
		user-select: none !important;
	}
</style>
