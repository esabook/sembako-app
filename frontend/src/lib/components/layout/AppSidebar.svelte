<script lang="ts">
	import { page } from '$app/state';
	import { user, type Role } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { NAV } from './AppSidebar.nav';
	import type { SubNavItem } from './AppSidebar.nav';
	// Lucide icons
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Users from '@lucide/svelte/icons/users';
	import Route from '@lucide/svelte/icons/route';
	import MessageCircleCode from '@lucide/svelte/icons/message-circle-code';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ChartBar from '@lucide/svelte/icons/chart-bar';
	import Tag from '@lucide/svelte/icons/tag';
	import BadgePercent from '@lucide/svelte/icons/badge-percent';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Settings from '@lucide/svelte/icons/settings';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelLeftDashed from '@lucide/svelte/icons/panel-left-dashed';
	import Check from '@lucide/svelte/icons/check';
	import Utensils from '@lucide/svelte/icons/utensils';
	import type { Component } from 'svelte';

	const ICONS: Record<string, Component> = {
		LayoutGrid,
		Users,
		Route,
		MessageCircleCode,
		Warehouse,
		UserRound,
		Building2,
		ClipboardCheck,
		Calendar,
		ShieldCheck,
		UserCheck,
		DollarSign,
		ChartBar,
		Tag,
		BadgePercent,
		Scissors,
		Settings,
		Utensils
	};

	let {
		mobileOpen = $bindable(false),
		namaToko = '',
		sidebarWidth: sidebarWidthOut = $bindable(0),
		sidebarAbsolute: sidebarAbsoluteOut = $bindable(false)
	}: {
		mobileOpen?: boolean;
		namaToko?: string;
		sidebarWidth?: number;
		sidebarAbsolute?: boolean;
	} = $props();

	type SidebarState = 'expanded' | 'icon' | 'hover';
	const SIDEBAR_KEY = 'sidebar_state';
	let sidebarState = $state<SidebarState>('icon');
	let sidebarReady = $state(false);
	let isMobile = $state(true);
	let hoverExpanded = $state(false);
	let showPopup = $state(false);
	let navEl = $state<HTMLElement | null>(null);

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

	function setSidebarMode(mode: SidebarState) {
		customWidth = null;
		localStorage.removeItem(SIDEBAR_W_KEY);
		sidebarState = mode;
		localStorage.setItem(SIDEBAR_KEY, mode);
		showPopup = false;
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
		if (saved === 'expanded' || saved === 'icon' || saved === 'hover') sidebarState = saved;
		const savedW = localStorage.getItem(SIDEBAR_W_KEY);
		if (savedW) customWidth = clamp(parseFloat(savedW));
		sidebarReady = true;

		const cleanupKeys = tinykeys(window, {
			'Control+Home': (e) => {
				e.preventDefault();
				toggleSidebar();
			},
			Escape: () => {
				if (showPopup) showPopup = false;
				else if (mobileOpen) mobileOpen = false;
			}
		});

		const handleClickOutside = (e: MouseEvent) => {
			if (
				showPopup &&
				!(e.target as HTMLElement).closest('.sidebar-popup') &&
				!(e.target as HTMLElement).closest('[aria-label="Kontrol sidebar"]')
			) {
				showPopup = false;
			}
		};
		document.addEventListener('click', handleClickOutside, true);

		return () => {
			mq.removeEventListener('change', handleMq);
			document.removeEventListener('click', handleClickOutside, true);
			cleanupKeys();
		};
	});

	function bolehAkses(roles: Role[]): boolean {
		return $user !== null && roles.includes($user.role);
	}

	let visibleNav = $derived(NAV.filter((item) => bolehAkses(item.roles)));
	const showLabels = $derived(
		isMobile || sidebarState === 'expanded' || (sidebarState === 'hover' && hoverExpanded)
	);
	const activeTab = $derived(page.url.searchParams.get('tab'));
	const sidebarWidth = $derived(
		isMobile
			? 14
			: sidebarState === 'hover'
				? hoverExpanded
					? EXPANDED_W
					: ICON_W
				: (customWidth ?? (sidebarState === 'expanded' ? EXPANDED_W : ICON_W))
	);

	$effect(() => {
		sidebarWidthOut = ICON_W;
		sidebarAbsoluteOut = sidebarState === 'hover';
	});

	function handleSubClick(href: string, tab: SubNavItem) {
		if (tab.href) {
			// Jika sub-item punya href, langsung navigasi ke situ
			goto(tab.href, { replaceState: true, keepFocus: true, noScroll: true });
		} else {
			// Kalau tidak, anggap klik ini untuk set tab aktif di parent
			goto(`${href}?tab=${tab.key}`, { replaceState: true, keepFocus: true, noScroll: true });
		}
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
		? `fixed inset-0 z-50 flex h-screen flex-col rounded-r-lg border-r pt-2 shadow-xl transition-transform duration-50 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
		: `app-sidebar flex shrink-0 flex-col border-r pt-2 ${sidebarReady && !isDragging ? 'transition-all duration-50' : ''} ${isDragging ? 'is-dragging' : ''} ${sidebarState === 'hover' ? (hoverExpanded ? 'hover-mode hover-expanded' : 'hover-mode') : 'relative'}`}
	style="background:var(--surface);border-color:var(--border);width:{sidebarWidth}rem "
	onmouseenter={sidebarState === 'hover' && !isMobile
		? () => {
				hoverExpanded = true;
				if (navEl) navEl.scrollTop = 0;
			}
		: undefined}
	onmouseleave={sidebarState === 'hover' && !isMobile ? () => (hoverExpanded = false) : undefined}
>
	{#if isMobile}
		<!-- Header: logo + nama toko | tombol dismiss -->
		<header
			class="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-2"
			style="border-color:var(--border)"
		>
			<div class="flex min-w-0 items-center gap-2">
				<enhanced:img src="$lib/assets/logo.webp" alt="Logo" class="h-7 w-7 shrink-0" />
				<span class="truncate text-sm font-bold" style="color:var(--accent)">{namaToko}</span>
			</div>

			<!-- Mobile: tutup sidebar -->
			<button
				onclick={() => (mobileOpen = false)}
				aria-label="Tutup menu"
				class="flex h-[1rem] w-[1rem] items-center justify-center rounded-full transition-colors hover:bg-[var(--surface2)]"
				style="color:var(--text-dim)"
			>
				<PanelLeftClose />
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
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<nav
		bind:this={navEl}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
		style="scrollbar-gutter: stable"
	>
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
					class="absolute top-0 bottom-0 left-0 shrink-0 {isActive ? 'w-[2px]' : 'w-0'}"
					style={isActive ? 'background:var(--accent)' : ''}
				></span>

				<span class="nav-icon-wrap ml-3 shrink-0 {isActive ? 'opacity-100' : 'opacity-70'}">
					{#if ICONS[item.icon]}
						{@const Icon = ICONS[item.icon]}
						<Icon class="nav-icon" />
					{/if}
				</span>

				{#if showLabels}
					<span class="ml-2 truncate font-medium">{item.label}</span>
				{/if}
			</a>

			<!-- Sub-nav: muncul saat parent aktif & expanded -->
			{#if hasSub}
				<div class="sub-nav">
					{#each item.sub! as sub (sub.key)}
						{@const isTab = activeTab === sub.key || page.url.pathname === sub.href}
						<button
							onclick={() => handleSubClick(item.href, sub)}
							class="sub-nav-item"
							style={(isActive
								? 'border-color:color-mix(in srgb, var(--accent) 50%, transparent 50%)'
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
	<!-- Sidebar mode control -->
	{#if !isMobile}
		<div class="relative shrink-0 border-t px-2 py-1.5" style="border-color:var(--border)">
			<!-- Popup menu -->
			{#if showPopup}
				<div
					class="sidebar-popup absolute bottom-full left-0 z-20 mb-1 w-44 rounded-lg border py-1 shadow-lg"
					style="background:var(--surface);border-color:var(--border);"
				>
					<button
						onclick={() => setSidebarMode('expanded')}
						class="popup-item"
						style={sidebarState === 'expanded' ? 'color:var(--accent)' : 'color:var(--text-dim)'}
					>
						<PanelLeftOpen class="h-4 w-4 shrink-0" />
						<span class="flex-1 text-left text-xs">Diperluas</span>
						{#if sidebarState === 'expanded'}<Check class="h-3 w-3 shrink-0" />{/if}
					</button>
					<button
						onclick={() => setSidebarMode('icon')}
						class="popup-item"
						style={sidebarState === 'icon' ? 'color:var(--accent)' : 'color:var(--text-dim)'}
					>
						<PanelLeftClose class="h-4 w-4 shrink-0" />
						<span class="flex-1 text-left text-xs">Ikon</span>
						{#if sidebarState === 'icon'}<Check class="h-3 w-3 shrink-0" />{/if}
					</button>
					<button
						onclick={() => setSidebarMode('hover')}
						class="popup-item"
						style={sidebarState === 'hover' ? 'color:var(--accent)' : 'color:var(--text-dim)'}
					>
						<PanelLeftDashed class="h-4 w-4 shrink-0" />
						<span class="flex-1 text-left text-xs">Melayang</span>
						{#if sidebarState === 'hover'}<Check class="h-3 w-3 shrink-0" />{/if}
					</button>
				</div>
			{/if}

			<button
				onclick={() => (showPopup = !showPopup)}
				title="Kontrol sidebar"
				aria-label="Kontrol sidebar"
				class="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface2)]"
				style="color:var(--text-dim)"
			>
				<PanelLeft class="h-4 w-4" />
			</button>
		</div>
	{/if}

	<!-- Drag handle -->
	{#if !isMobile && sidebarState !== 'hover'}
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

	.nav-icon-wrap {
		display: inline-flex;
		align-items: center;
		transition: opacity 200ms ease;
	}

	:global(.nav-icon) {
		width: 1.2em;
		height: 1.2em;
		transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.hover-nav-item:hover :global(.nav-icon) {
		animation: icon-wiggle 0.4s ease;
	}

	@keyframes icon-wiggle {
		0% {
			transform: scale(1) rotate(0deg);
		}
		25% {
			transform: scale(1.2) rotate(-8deg);
		}
		50% {
			transform: scale(1.15) rotate(6deg);
		}
		75% {
			transform: scale(1.2) rotate(-3deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
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
		border-left: 2px solid transparent;
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

	/* Hover mode: absolute overlay, z-index above navbar (z-50) */
	.hover-mode {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		z-index: 51;
	}
	.hover-mode.hover-expanded {
		box-shadow: 4px 0 12px rgb(0 0 0 / 0.15);
	}

	/* In hover mode, nav needs explicit height to scroll (sidebar is out of flex flow) */
	.hover-mode nav {
		height: 100%;
	}

	/* Popup menu */
	.popup-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.625rem;
		background: none;
		border: none;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: background-color 150ms;
	}
	.popup-item:hover {
		background: var(--surface2);
	}
</style>
