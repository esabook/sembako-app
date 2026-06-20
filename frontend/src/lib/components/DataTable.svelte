<!--
  DataTable — tabel data dengan sort, pagination, resize kolom, hide kolom, wrap mode.

  ── Props ─────────────────────────────────────────────────────────────────────
  columns      Column[]          definisi kolom (wajib)
  body         Snippet<[Set<string>]>  render <tbody> rows; menerima `effectiveHidden` (lihat contoh)
  sortKey      $bindable('')     key kolom yang aktif di-sort
  sortDir      $bindable('asc')  'asc' | 'desc'
  maxRows      7                 tinggi tabel = maxRows × 40px, lalu scroll
  rowCount     0                 jumlah baris yang dirender (untuk tampilan empty state)
  loading      false             tampilkan spinner di body
  emptyText    'Tidak ada data.' teks saat rowCount === 0
  tableId      ''                kalau diisi → simpan prefs ke localStorage (key `datatable_${tableId}`)
  totalRows    undefined         isi untuk aktifkan pagination server-side
  pageSize     $bindable(25)     baris per halaman (5/10/25/50/100/Semua)
  currentPage  $bindable(1)      halaman aktif
  wrapMode     $bindable(false)  true = teks wrap; false = 1 baris + scroll horizontal
  toolbarEnd   Snippet?          konten ekstra di ujung kanan toolbar (misal: tombol export)

  ── Column type ───────────────────────────────────────────────────────────────
  key          string    nama field (juga id sort)
  label        string    header teks
  width?       number    lebar awal px
  minWidth?    number    batas minimum resize (default 60)
  sortable?    boolean   default true (false = nonaktifkan sort di kolom ini)
  align?       'left' | 'right' | 'center'
  hideable?    boolean   default true (false = kolom ini tidak muncul di toggle-kolom)
  defaultHidden? boolean mulai tersembunyi
  priority?    1|2|3     auto-hide berdasarkan layar: 2=sembunyikan di <640px, 3=sembunyikan di <1024px

  ── Penggunaan dasar ──────────────────────────────────────────────────────────
  <script lang="ts">
    import DataTable, { type Column } from '$lib/components/DataTable.svelte'

    const cols: Column[] = [
      { key: 'nama', label: 'Nama' },
      { key: 'harga', label: 'Harga', align: 'right', priority: 2 },  // hidden di HP
      { key: 'aksi', label: '', sortable: false, hideable: false },
    ]
    let sortKey = $state('nama')
    let sortDir = $state<'asc'|'desc'>('asc')
    let items = $derived(/* sort items by sortKey/sortDir */)
  </script>

  <DataTable {columns} rowCount={items.length} bind:sortKey bind:sortDir>
    {#snippet body(hidden)}
      {#each items as row}
        <tr>
          <td>{row.nama}</td>
          {#if !hidden.has('harga')}<td class="text-right">{row.harga}</td>{/if}
          <td><button>Edit</button></td>
        </tr>
      {/each}
    {/snippet}
  </DataTable>

  ── Pagination server-side ────────────────────────────────────────────────────
  Tambah totalRows + bind:pageSize + bind:currentPage. DataTable hanya render
  baris yang dikirim — kalkulasi offset/limit di caller.

  <DataTable {columns} {totalRows} rowCount={rows.length}
             bind:pageSize bind:currentPage bind:sortKey bind:sortDir>
    {#snippet body(hidden)}...{/snippet}
  </DataTable>

  ── Notes ─────────────────────────────────────────────────────────────────────
  - body snippet WAJIB pakai `{#if !hidden.has(key)}` untuk kolom ber-priority/hideable,
    supaya <td> ikut tersembunyi saat kolom di-toggle.
  - tableId diisi string unik per halaman → prefs (kolom tersembunyi, lebar, wrapMode,
    pageSize) otomatis persist ke localStorage.
  - toolbarEnd dirender di sisi kanan toolbar (margin-left:auto).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import Rows3 from '@lucide/svelte/icons/rows-3';
	import TextWrap from '@lucide/svelte/icons/text-wrap';

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

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
		loading = false,
		body,
		tableId = '',
		totalRows = undefined as number | undefined,
		pageSize = $bindable(25),
		currentPage = $bindable(1),
		wrapMode = $bindable(false),
		toolbarEnd = undefined as Snippet | undefined
	}: {
		columns: Column[];
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		maxRows?: number;
		emptyText?: string;
		rowCount?: number;
		loading?: boolean;
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
		const h640 = (e: MediaQueryListEvent) => {
			isTablet = e.matches;
		};
		const h1024 = (e: MediaQueryListEvent) => {
			isDesktop = e.matches;
		};
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

	let autoHiddenKeys = $derived(
		new Set(
			columns
				.filter((c) => (c.priority === 2 && !isTablet) || (c.priority === 3 && !isDesktop))
				.map((c) => c.key)
		)
	);

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
			const nh = new Set(hiddenKeys);
			nh.add(key);
			hiddenKeys = nh;
			const nf = new Set(userForceShow);
			nf.delete(key);
			userForceShow = nf;
		} else {
			// user mau tampilkan
			const nh = new Set(hiddenKeys);
			nh.delete(key);
			hiddenKeys = nh;
			if (isAutoHidden) {
				const nf = new Set(userForceShow);
				nf.add(key);
				userForceShow = nf;
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
	let dropdownEl = $state<HTMLDivElement | undefined>(undefined);

	function openColDropdown(e: MouseEvent) {
		e.stopPropagation();
		if (showColDropdown) {
			showColDropdown = false;
			return;
		}
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
				maxH: openUp ? Math.min(spaceAbove, 320) : Math.min(spaceBelow, 320)
			};
		}
		showColDropdown = true;
	}

	$effect(() => {
		if (!showColDropdown) return;
		const handler = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!dropdownEl?.contains(t) && !colBtnEl?.contains(t) && t !== colBtnEl)
				showColDropdown = false;
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	});

	// ── localStorage persistence — FIX 1: tambah colWidths ──────
	let prefsLoaded = $state(false);

	$effect(() => {
		if (!tableId) {
			prefsLoaded = true;
			return;
		}
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
		} catch {
			/* ignore */
		}
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
			localStorage.setItem(
				`datatable_${tableId}`,
				JSON.stringify({
					hiddenKeys: [...hk],
					userForceShow: [...fs],
					wrapMode: wm,
					pageSize: ps,
					colWidths: cw
				})
			);
		} catch {
			/* ignore */
		}
	});
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div class="flex flex-col gap-2">
	<!-- Toolbar -->
	{#if hasToolbar}
		<div class="flex flex-wrap items-center gap-2">
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
						<Columns2 size="1em" />
						Kolom
						<span style="color:var(--text-dim);font-size:0.8em">
							{visibleColumns.length}/{columns.length}
						</span>
					</button>
				</div>
			{/if}

			<!-- Tombol Wrap Toggle -->
			<button
				onclick={() => {
					wrapMode = !wrapMode;
				}}
				title={wrapMode ? 'Mode: Wrap — klik untuk 1 baris' : 'Mode: 1 Baris — klik untuk wrap'}
				style="
					display:inline-flex;align-items:center;gap:5px;
					padding:4px 10px;border-radius:6px;border:1px solid var(--border);
					background: var(--surface2);
					color:var(--text);
					font-size:0.875em;cursor:pointer;transition:background .15s,color .15s;
				"
			>
				{#if wrapMode}
					<TextWrap size="1em" />
					Wrap
				{:else}
					<Rows3 size="1em" />
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
		<div
			style="
			max-height:{maxRows * ROW_HEIGHT}px;
			overflow-y:auto;
			overflow-x:{wrapMode ? 'hidden' : 'auto'};
		"
		>
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
						{#each visibleColumns as col, i (col.key)}
							<col
								style={i < visibleColumns.length - 1 && colWidths[col.key] !== null
									? `width:${colWidths[col.key]}px`
									: undefined}
							/>
						{/each}
					</colgroup>
				{/if}
				<thead>
					<tr>
						{#each visibleColumns as col, i (col.key)}
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
									<span
										style="margin-left:4px;font-size:0.7em;opacity:{sortKey === col.key
											? 0.8
											: 0.3}"
									>
										{sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
									</span>
								{/if}
								{#if i < visibleColumns.length - 1}
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
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
					{#if loading}
						{#each { length: 5 } as _, i (i)}
							<tr style="border-bottom:1px solid var(--border)">
								{#each visibleColumns as col (col.key)}
									<td class="px-3 py-2.5">
										<Skeleton h="0.75rem" w="{60 + ((i * 13 + col.key.length * 7) % 35)}%" />
									</td>
								{/each}
							</tr>
						{/each}
					{:else if rowCount === 0}
						<tr>
							<td
								colspan={visibleColumns.length}
								class="px-3 py-4 text-center text-xs"
								style="color:var(--text-dim);white-space:normal"
							>
								{emptyText}
							</td>
						</tr>
					{:else}
						{@render body(effectiveHidden)}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if hasPagination}
		<div
			style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:0.875em;color:var(--text-dim)"
		>
			<span>
				{#if totalRows === 0}
					Tidak ada data
				{:else}
					Menampilkan <b style="color:var(--text)">{startRow}–{endRow}</b> dari
					<b style="color:var(--text)">{totalRows}</b>
				{/if}
			</span>
			<div style="display:flex;align-items:center;gap:6px">
				<Select
					bind:value={pageSize}
					onchange={() => {
						currentPage = 1;
					}}
					options={PAGE_SIZES.map((sz) => ({
						value: sz,
						label: sz === 0 ? 'Semua' : String(sz) + ' / hal'
					}))}
				/>
				<button
					disabled={currentPage <= 1}
					onclick={() => {
						currentPage--;
					}}
					style="padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;opacity:{currentPage <=
					1
						? 0.35
						: 1};">‹</button
				>
				<div class="hidden sm:flex" style="align-items:center;gap:3px">
					{#each pageNumbers as p, i (i)}
						{#if p === '...'}
							<span style="padding:0 4px;color:var(--text-dim)">…</span>
						{:else}
							<button
								onclick={() => {
									currentPage = Number(p);
								}}
								style="
									min-width:28px;height:28px;border-radius:5px;
									border:1px solid {currentPage === Number(p) ? 'var(--accent)' : 'var(--border)'};
									background:{currentPage === Number(p) ? 'var(--accent)' : 'var(--surface2)'};
									color:{currentPage === Number(p) ? '#000' : 'var(--text)'};
									font-size:0.875em;cursor:pointer;font-weight:{currentPage === Number(p) ? '600' : '400'};
								">{p}</button
							>
						{/if}
					{/each}
				</div>
				<span class="sm:hidden" style="font-size:0.875em;color:var(--text)"
					>{currentPage}/{totalPages}</span
				>
				<button
					disabled={currentPage >= totalPages}
					onclick={() => {
						currentPage++;
					}}
					style="padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;opacity:{currentPage >=
					totalPages
						? 0.35
						: 1};">›</button
				>
			</div>
		</div>
	{/if}
</div>

<!-- FIX 2: Dropdown kolom pakai position:fixed + koordinat JS agar tidak terpotong di layar kecil -->
<!-- portal ke body supaya lepas dari transform context (SlideOver, modal, dsb) -->
{#if showColDropdown}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={dropdownEl}
		use:portal
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
		{#each hideableColumns as col (col.key)}
			{@const hidden = effectiveHidden.has(col.key)}
			{@const autoHidden = autoHiddenKeys.has(col.key)}
			{@const forceShown = userForceShow.has(col.key)}
			<label
				style="
					display:flex;align-items:center;gap:8px;
					padding:7px 8px;border-radius:5px;cursor:pointer;
				"
				onmouseenter={(e) =>
					((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
				onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
			>
				<input
					type="checkbox"
					checked={!hidden}
					onchange={() => toggleColumn(col.key)}
					style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
				/>
				<span style="font-size:0.95em;color:var(--text);flex:1;line-height:1.3"
					>{col.label || '(kolom)'}</span
				>
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
