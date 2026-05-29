<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';

	export type Column = {
		key: string;
		label: string;
		width?: number;
		minWidth?: number;
		sortable?: boolean;
		align?: 'left' | 'right' | 'center';
		hideable?: boolean;
		defaultHidden?: boolean;
		priority?: 1 | 2 | 3;
	};

	const PAGE_SIZES = [5, 10, 25, 50, 100, 0];
	const ROW_HEIGHT = 40;

	let {
		columns,
		sortKey = $bindable(''),
		sortDir = $bindable<'asc' | 'desc'>('asc'),
		maxRows = 7,
		emptyText = 'Tidak ada data.',
		rowCount = 0,
		body,
		tableId = '',
		totalRows = undefined as number | undefined,
		pageSize = $bindable(25),
		currentPage = $bindable(1),
		wrapMode = $bindable(false),
		toolbarEnd = undefined as Snippet | undefined,
	}: {
		columns: Column[];
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		maxRows?: number;
		emptyText?: string;
		rowCount?: number;
		body: Snippet<[Set<string>]>;
		tableId?: string;
		totalRows?: number;
		pageSize?: number;
		currentPage?: number;
		wrapMode?: boolean;
		toolbarEnd?: Snippet;
	} = $props();

	// ── Responsive ───────────────────────────────────────────────
	let isTablet = $state(false);
	let isDesktop = $state(false);

	$effect(() => {
		const mq640 = window.matchMedia('(min-width: 640px)');
		const mq1024 = window.matchMedia('(min-width: 1024px)');
		isTablet = mq640.matches;
		isDesktop = mq1024.matches;
		const h640 = (e: MediaQueryListEvent) => { isTablet = e.matches; };
		const h1024 = (e: MediaQueryListEvent) => { isDesktop = e.matches; };
		mq640.addEventListener('change', h640);
		mq1024.addEventListener('change', h1024);
		return () => {
			mq640.removeEventListener('change', h640);
			mq1024.removeEventListener('change', h1024);
		};
	});

	// ── Hidden columns ───────────────────────────────────────────
	let hiddenKeys = $state<Set<string>>(
		untrack(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)))
	);
	// Kolom yang user eksplisit paksa-tampil meski layar kecil (override auto-hide priority)
	let userForceShow = $state<Set<string>>(new Set());

	let autoHiddenKeys = $derived(new Set(
		columns
			.filter((c) => (c.priority === 2 && !isTablet) || (c.priority === 3 && !isDesktop))
			.map((c) => c.key)
	));

	let effectiveHidden = $derived.by(() => {
		const result = new Set<string>();
		// auto-hide berdasarkan priority, KECUALI user paksa-tampil
		for (const key of autoHiddenKeys) {
			if (!userForceShow.has(key)) result.add(key);
		}
		// user manual-hide selalu berlaku
		for (const key of hiddenKeys) result.add(key);
		return result;
	});

	let visibleColumns = $derived(columns.filter((c) => !effectiveHidden.has(c.key)));
	let hideableColumns = $derived(columns.filter((c) => c.hideable !== false));
	let hasToolbar = $derived(hideableColumns.length > 0 || !!toolbarEnd);

	function toggleColumn(key: string) {
		const isVisible = !effectiveHidden.has(key);
		const isAutoHidden = autoHiddenKeys.has(key);

		if (isVisible) {
			// user mau sembunyikan
			const nh = new Set(hiddenKeys); nh.add(key); hiddenKeys = nh;
			const nf = new Set(userForceShow); nf.delete(key); userForceShow = nf;
		} else {
			// user mau tampilkan
			const nh = new Set(hiddenKeys); nh.delete(key); hiddenKeys = nh;
			if (isAutoHidden) {
				const nf = new Set(userForceShow); nf.add(key); userForceShow = nf;
			}
		}
		currentPage = 1;
	}

	// ── Column resize — key-based ────────────────────────────────
	// FIX 1: colWidths disimpan per key, tidak pernah di-reset saat wrap/hide toggle
	let colWidths = $state<Record<string, number | null>>(
		untrack(() => Object.fromEntries(columns.map((c) => [c.key, c.width ?? null])))
	);
	let resizing = $state<{ key: string; startX: number; startW: number } | null>(null);

	function onResizeStart(e: MouseEvent, key: string) {
		e.preventDefault();
		e.stopPropagation();
		const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
		resizing = { key, startX: e.clientX, startW: th.getBoundingClientRect().width };
	}

	function onMouseMove(e: MouseEvent) {
		if (!resizing) return;
		const col = columns.find((c) => c.key === resizing!.key);
		const min = col?.minWidth ?? 60;
		colWidths[resizing.key] = Math.max(min, resizing.startW + e.clientX - resizing.startX);
	}

	function onMouseUp() {
		resizing = null;
	}

	// ── Sort ─────────────────────────────────────────────────────
	function clickSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	// ── Pagination ───────────────────────────────────────────────
	let hasPagination = $derived(totalRows !== undefined);
	let totalPages = $derived(
		!hasPagination ? 1 : pageSize === 0 ? 1 : Math.ceil((totalRows ?? 0) / pageSize)
	);
	let startRow = $derived(
		!hasPagination ? 1 : pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1
	);
	let endRow = $derived(
		!hasPagination
			? (totalRows ?? 0)
			: pageSize === 0
				? (totalRows ?? 0)
				: Math.min(currentPage * pageSize, totalRows ?? 0)
	);

	let pageNumbers = $derived.by((): (number | '...')[] => {
		if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
		const cp = currentPage;
		const pages: (number | '...')[] = [1];
		if (cp > 3) pages.push('...');
		for (let p = Math.max(2, cp - 1); p <= Math.min(totalPages - 1, cp + 1); p++) pages.push(p);
		if (cp < totalPages - 2) pages.push('...');
		pages.push(totalPages);
		return pages;
	});

	// ── Dropdown — FIX 2: position:fixed agar tidak terpotong di layar kecil ──
	let showColDropdown = $state(false);
	let dropdownPos = $state({ top: 0, left: 0, maxH: 300 });
	let colBtnEl = $state<HTMLButtonElement | undefined>(undefined);

	function openColDropdown(e: MouseEvent) {
		e.stopPropagation();
		if (showColDropdown) { showColDropdown = false; return; }
		if (colBtnEl) {
			const r = colBtnEl.getBoundingClientRect();
			const dropW = 210;
			const spaceBelow = window.innerHeight - r.bottom - 8;
			const spaceAbove = r.top - 8;
			const openUp = spaceBelow < 150 && spaceAbove > spaceBelow;
			const left = Math.min(r.left, window.innerWidth - dropW - 8);
			dropdownPos = {
				top: openUp ? r.top - Math.min(spaceAbove, 320) : r.bottom + 4,
				left: Math.max(8, left),
				maxH: openUp ? Math.min(spaceAbove, 320) : Math.min(spaceBelow, 320),
			};
		}
		showColDropdown = true;
	}

	$effect(() => {
		if (!showColDropdown) return;
		const handler = (e: MouseEvent) => {
			if (colBtnEl && !colBtnEl.closest('[data-col-dropdown]')?.contains(e.target as Node))
				showColDropdown = false;
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	});

	// ── localStorage persistence — FIX 1: tambah colWidths ──────
	let prefsLoaded = $state(false);

	$effect(() => {
		if (!tableId) { prefsLoaded = true; return; }
		try {
			const raw = localStorage.getItem(`datatable_${tableId}`);
			if (raw) {
				const p = JSON.parse(raw);
				if (Array.isArray(p.hiddenKeys)) hiddenKeys = new Set(p.hiddenKeys);
				if (Array.isArray(p.userForceShow)) userForceShow = new Set(p.userForceShow);
				if (typeof p.wrapMode === 'boolean') wrapMode = p.wrapMode;
				if (typeof p.pageSize === 'number') pageSize = p.pageSize;
				if (p.colWidths && typeof p.colWidths === 'object') {
					colWidths = { ...untrack(() => colWidths), ...p.colWidths };
				}
			}
		} catch { /* ignore */ }
		prefsLoaded = true;
	});

	$effect(() => {
		const hk = hiddenKeys;
		const fs = userForceShow;
		const wm = wrapMode;
		const ps = pageSize;
		const cw = { ...colWidths };
		if (!tableId || !prefsLoaded) return;
		try {
			localStorage.setItem(`datatable_${tableId}`, JSON.stringify({
				hiddenKeys: [...hk],
				userForceShow: [...fs],
				wrapMode: wm,
				pageSize: ps,
				colWidths: cw,
			}));
		} catch { /* ignore */ }
	});
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<!--
	FIX 3: CSS :global untuk apply white-space ke <td> dari caller's body snippet.
	- wrap mode  → white-space: normal  + table-layout: fixed  (kolom lebar tetap)
	- 1 baris    → white-space: nowrap  + table-layout: auto   (kolom ikut konten, scroll horizontal)
	FIX 4: kolom terakhir tidak diberi width di colgroup → otomatis expand ke sisa ruang (wrap mode).
-->
<style>
	.dt-tbody-wrap :global(td) {
		white-space: normal;
		word-break: break-word;
	}
	.dt-tbody-nowrap :global(td) {
		white-space: nowrap;
	}
</style>

<div class="flex flex-col gap-2">
	<!-- Toolbar -->
	{#if hasToolbar}
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Tombol Kolom -->
			{#if hideableColumns.length > 0}
				<div data-col-dropdown>
					<button
						bind:this={colBtnEl}
						onclick={openColDropdown}
						style="
							display:inline-flex;align-items:center;gap:5px;
							padding:4px 10px;border-radius:6px;border:1px solid var(--border);
							background:var(--surface2);color:var(--text);font-size:0.875em;cursor:pointer;
						"
					>
						<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/>
						</svg>
						Kolom
						<span style="color:var(--text-dim);font-size:0.8em">
							{visibleColumns.length}/{columns.length}
						</span>
					</button>
				</div>
			{/if}

			<!-- Tombol Wrap Toggle -->
			<button
				onclick={() => { wrapMode = !wrapMode; }}
				title={wrapMode ? 'Mode: Wrap — klik untuk 1 baris' : 'Mode: 1 Baris — klik untuk wrap'}
				style="
					display:inline-flex;align-items:center;gap:5px;
					padding:4px 10px;border-radius:6px;border:1px solid var(--border);
					background:{wrapMode ? 'var(--accent)' : 'var(--surface2)'};
					color:{wrapMode ? '#000' : 'var(--text)'};
					font-size:0.875em;cursor:pointer;transition:background .15s,color .15s;
				"
			>
				{#if wrapMode}
					<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="17 10 21 10"/><polyline points="3 10 3 3 21 3"/>
						<path d="M21 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
						<polyline points="7 14 3 10 7 6"/>
					</svg>
					Wrap
				{:else}
					<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="6" x2="21" y2="6"/>
						<line x1="3" y1="14" x2="21" y2="14"/>
					</svg>
					1 Baris
				{/if}
			</button>

			<!-- Slot toolbar kanan -->
			{#if toolbarEnd}
				<div style="margin-left:auto">
					{@render toolbarEnd()}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Table -->
	<div class="rounded border" style="border-color:var(--border);overflow:hidden">
		<!--
			FIX 3: overflow-x hanya aktif di mode 1-baris.
			Wrap mode: overflow hidden (teks wrap di dalam kolom).
		-->
		<div style="
			max-height:{maxRows * ROW_HEIGHT}px;
			overflow-y:auto;
			overflow-x:{wrapMode ? 'hidden' : 'auto'};
		">
			<table
				class="w-full text-sm"
				style="
					border-collapse:separate;border-spacing:0;
					table-layout:{wrapMode ? 'fixed' : 'auto'};
					{wrapMode ? 'min-width:100%' : 'width:max-content;min-width:100%'};
				"
			>
				<!-- FIX 4: kolom terakhir tidak diberi width → auto-expand di wrap mode -->
				{#if wrapMode}
					<colgroup>
						{#each visibleColumns as col, i}
							<col style={
								i < visibleColumns.length - 1 && colWidths[col.key] !== null
									? `width:${colWidths[col.key]}px`
									: undefined
							} />
						{/each}
					</colgroup>
				{/if}
				<thead>
					<tr>
						{#each visibleColumns as col, i}
							{@const sortable = col.sortable !== false && Boolean(col.key)}
							<th
								style="
									text-align:{col.align ?? 'left'};
									padding:8px 12px;
									font-weight:500;
									color:var(--text-dim);
									background:var(--surface2);
									border-bottom:1px solid var(--border);
									{i < visibleColumns.length - 1 ? 'border-right:1px solid var(--border);' : ''}
									position:sticky;top:0;z-index:2;
									user-select:none;
									white-space:nowrap;
									cursor:{sortable ? 'pointer' : 'default'};
								"
								onclick={sortable ? () => clickSort(col.key) : undefined}
							>
								{col.label}
								{#if sortable}
									<span style="margin-left:4px;font-size:0.7em;opacity:{sortKey === col.key ? 0.8 : 0.3}">
										{sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
									</span>
								{/if}
								{#if i < visibleColumns.length - 1}
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
									<div
										role="separator"
										aria-orientation="vertical"
										style="
											position:absolute;top:0;right:-3px;width:6px;height:100%;
											cursor:col-resize;z-index:3;
											background:{resizing?.key === col.key ? 'var(--accent)' : 'transparent'};
										"
										onmousedown={(e) => onResizeStart(e, col.key)}
										onclick={(e) => e.stopPropagation()}
										onkeydown={() => {}}
									></div>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<!-- FIX 3: class dt-tbody-wrap/nowrap mengaktifkan CSS :global di atas -->
				<tbody class={wrapMode ? 'dt-tbody-wrap' : 'dt-tbody-nowrap'}>
					{#if rowCount === 0}
						<tr>
							<td
								colspan={visibleColumns.length}
								class="px-3 py-4 text-center text-xs"
								style="color:var(--text-dim);white-space:normal"
							>
								{emptyText}
							</td>
						</tr>
					{/if}
					{@render body(effectiveHidden)}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if hasPagination}
		<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:0.875em;color:var(--text-dim)">
			<span>
				{#if totalRows === 0}
					Tidak ada data
				{:else}
					Menampilkan <b style="color:var(--text)">{startRow}–{endRow}</b> dari
					<b style="color:var(--text)">{totalRows}</b>
				{/if}
			</span>
			<div style="display:flex;align-items:center;gap:6px">
				<select
					bind:value={pageSize}
					onchange={() => { currentPage = 1; }}
					style="font-size:0.875em;padding:3px 6px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;"
				>
					{#each PAGE_SIZES as sz}
						<option value={sz}>{sz === 0 ? 'Semua' : sz} / hal</option>
					{/each}
				</select>
				<button
					disabled={currentPage <= 1}
					onclick={() => { currentPage--; }}
					style="padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;opacity:{currentPage <= 1 ? 0.35 : 1};"
				>‹</button>
				<div class="hidden sm:flex" style="align-items:center;gap:3px">
					{#each pageNumbers as p}
						{#if p === '...'}
							<span style="padding:0 4px;color:var(--text-dim)">…</span>
						{:else}
							<button
								onclick={() => { currentPage = Number(p); }}
								style="
									min-width:28px;height:28px;border-radius:5px;
									border:1px solid {currentPage === Number(p) ? 'var(--accent)' : 'var(--border)'};
									background:{currentPage === Number(p) ? 'var(--accent)' : 'var(--surface2)'};
									color:{currentPage === Number(p) ? '#000' : 'var(--text)'};
									font-size:0.875em;cursor:pointer;font-weight:{currentPage === Number(p) ? '600' : '400'};
								"
							>{p}</button>
						{/if}
					{/each}
				</div>
				<span class="sm:hidden" style="font-size:0.875em;color:var(--text)">{currentPage}/{totalPages}</span>
				<button
					disabled={currentPage >= totalPages}
					onclick={() => { currentPage++; }}
					style="padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;opacity:{currentPage >= totalPages ? 0.35 : 1};"
				>›</button>
			</div>
		</div>
	{/if}
</div>

<!-- FIX 2: Dropdown kolom pakai position:fixed + koordinat JS agar tidak terpotong di layar kecil -->
{#if showColDropdown}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		data-col-dropdown
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
		style="
			position:fixed;
			top:{dropdownPos.top}px;
			left:{dropdownPos.left}px;
			z-index:9999;
			width:210px;
			max-height:{dropdownPos.maxH}px;
			overflow-y:auto;
			border-radius:8px;
			border:1px solid var(--border);
			background:var(--surface);
			box-shadow:0 4px 20px rgba(0,0,0,.4);
			padding:6px;
		"
	>
		{#each hideableColumns as col}
			{@const hidden = effectiveHidden.has(col.key)}
			{@const autoHidden = autoHiddenKeys.has(col.key)}
			{@const forceShown = userForceShow.has(col.key)}
			<label
				style="
					display:flex;align-items:center;gap:8px;
					padding:7px 8px;border-radius:5px;cursor:pointer;
				"
				onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
				onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
			>
				<input
					type="checkbox"
					checked={!hidden}
					onchange={() => toggleColumn(col.key)}
					style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
				/>
				<span style="font-size:0.95em;color:var(--text);flex:1;line-height:1.3">{col.label || '(kolom)'}</span>
				{#if autoHidden && !forceShown}
					<span style="font-size:0.7em;color:var(--text-dim);flex-shrink:0">
						{col.priority === 2 ? 'tablet+' : 'desktop'}
					</span>
				{:else if autoHidden && forceShown}
					<span style="font-size:0.7em;color:var(--accent);flex-shrink:0">paksa</span>
				{/if}
			</label>
		{/each}
	</div>
{/if}
