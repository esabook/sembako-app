<!--
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  TabBar.svelte                                                               ║
  ║  Komponen tab bar yang bisa dikustomisasi per pengguna.                      ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  DESKRIPSI                                                                   ║
  ║  Tab bar horizontal dengan urutan dan favorit yang tersimpan ke backend.     ║
  ║  Setiap pengguna punya preferensi sendiri, tersinkron lintas device.         ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  FITUR                                                                       ║
  ║  • Horizontal scroll — tab tidak wrap, bisa swipe/drag di HP                 ║
  ║  • Drag & drop       — seret tab untuk mengubah urutan                       ║
  ║  • Klik kanan        — context menu: favorit, geser kiri/kanan, pindah       ║
  ║                        ke awal/akhir                                         ║
  ║  • Badge favorit     — bintang kuning ★ di kiri label tab yang ditandai      ║
  ║  • Tombol ⋮          — muncul saat hover, membuka menu yang sama              ║
  ║  • Tombol ↺ Reset    — setelah tab terakhir, reset urutan & favorit          ║
  ║  • Sync backend      — auto-save debounce 800ms ke                           ║
  ║                        PUT /pengaturan/preferensi/tab_{storageKey}           ║
  ║  • Tab baru          — otomatis muncul di akhir jika belum ada di order      ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  PROPS                                                                       ║
  ║  tabs        Tab[]     Daftar tab: { key: string; label: string }[]          ║
  ║  active      string    Key tab yang sedang aktif                             ║
  ║  storageKey  string    ID unik untuk namespace preferensi backend            ║
  ║                        → disimpan sebagai "tab_{storageKey}"                 ║
  ║  onchange?   function  Callback saat tab diklik: (key: string) => void       ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  BACKEND                                                                     ║
  ║  GET/PUT /pengaturan/preferensi/tab_{storageKey}                             ║
  ║  Payload: { order: string[], favorites: string[] }                           ║
  ║  Tabel DB: preferensi_pengguna (karyawan_id + modul + nilai_json)            ║
  ╠══════════════════════════════════════════════════════════════════════════════╣
  ║  CONTOH PENGGUNAAN                                                           ║
  ║                                                                              ║
  ║  <script>                                                                    ║
  ║    import TabBar from '$lib/components/ui/TabBar.svelte'                     ║
  ║    import { goto } from '$app/navigation'                                    ║
  ║    import { page } from '$app/state'                                         ║
  ║                                                                              ║
  ║    const TABS = [                                                             ║
  ║      { key: 'ringkasan', label: 'Ringkasan' },                               ║
  ║      { key: 'detail',    label: 'Detail' },                                  ║
  ║      { key: 'ekspor',    label: 'Ekspor' },                                  ║
  ║    ]                                                                         ║
  ║    let tab = $derived(page.url.searchParams.get('tab') ?? 'ringkasan')       ║
  ║  </script>                                                                   ║
  ║                                                                              ║
  ║  <TabBar                                                                     ║
  ║    tabs={TABS}                                                               ║
  ║    active={tab}                                                              ║
  ║    storageKey="nama-modul"                                                   ║
  ║    onchange={(key) => goto(`?tab=${key}`, { replaceState: true })}           ║
  ║  />                                                                          ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';

	type Tab = { key: string; label: string };

	let {
		tabs,
		active,
		storageKey,
		onchange
	}: {
		tabs: Tab[];
		active: string;
		storageKey: string;
		onchange?: (key: string) => void;
	} = $props();

	// ── State ─────────────────────────────────────────────────────────────────

	let order = $state<string[]>([]);
	const orderChanged = $derived(
		order.length > 0 && !order.every((k, i) => k === tabKeys[i])
	);
	let favorites = $state<Set<string>>(new Set());
	let dragKey = $state<string | null>(null);
	let dragOver = $state<string | null>(null);
	let hoverTab = $state<string | null>(null);
	let ctx = $state<{ x: number; y: number; key: string } | null>(null);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	// Tab yang tampil = urutan dari order, hanya yang ada di tabs saat ini
	const tabKeys = $derived(tabs.map((t) => t.key));
	const orderedTabs = $derived(() => {
		const known = new Set(tabKeys);
		// Dari order: hanya yang masih ada
		const fromOrder = order.filter((k) => known.has(k));
		// Tambahkan tab baru (belum di order) di akhir
		const inOrder = new Set(fromOrder);
		const newKeys = tabKeys.filter((k) => !inOrder.has(k));
		return [...fromOrder, ...newKeys].map((k) => tabs.find((t) => t.key === k)!);
	});

	// ── Backend sync ──────────────────────────────────────────────────────────

	async function muatPreferensi() {
		const res = await api.get<{ order: string[]; favorites: string[] } | null>(
			`/pengaturan/preferensi/tab_${storageKey}`
		);
		if (res.success && res.data) {
			order = res.data.order ?? [];
			favorites = new Set(res.data.favorites ?? []);
		} else {
			order = tabKeys.slice();
		}
	}

	function simpanPreferensi() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			api.put(`/pengaturan/preferensi/tab_${storageKey}`, {
				order: order.length ? order : tabKeys,
				favorites: [...favorites]
			});
		}, 800);
	}

	onMount(() => {
		muatPreferensi();
		return () => {
			if (saveTimer) clearTimeout(saveTimer);
		};
	});

	// ── Drag & Drop ───────────────────────────────────────────────────────────

	function onDragStart(key: string) {
		dragKey = key;
	}

	function onDragOver(e: DragEvent, key: string) {
		e.preventDefault();
		dragOver = key;
	}

	function onDrop(targetKey: string) {
		if (!dragKey || dragKey === targetKey) {
			dragKey = null;
			dragOver = null;
			return;
		}
		const current = orderedTabs().map((t) => t.key);
		const from = current.indexOf(dragKey);
		const to = current.indexOf(targetKey);
		current.splice(from, 1);
		current.splice(to, 0, dragKey);
		order = current;
		dragKey = null;
		dragOver = null;
		simpanPreferensi();
	}

	function onDragEnd() {
		dragKey = null;
		dragOver = null;
	}

	// ── Context menu ──────────────────────────────────────────────────────────

	function openCtx(e: MouseEvent, key: string) {
		e.preventDefault();
		ctx = { x: e.clientX, y: e.clientY, key };
	}

	function closeCtx() {
		ctx = null;
	}

	function ctxPindah(key: string, posisi: 'awal' | 'akhir') {
		const current = orderedTabs().map((t) => t.key);
		const idx = current.indexOf(key);
		current.splice(idx, 1);
		if (posisi === 'awal') current.unshift(key);
		else current.push(key);
		order = current;
		simpanPreferensi();
		closeCtx();
	}

	function ctxGeser(key: string, arah: -1 | 1) {
		const current = orderedTabs().map((t) => t.key);
		const idx = current.indexOf(key);
		const newIdx = idx + arah;
		if (newIdx < 0 || newIdx >= current.length) {
			closeCtx();
			return;
		}
		[current[idx], current[newIdx]] = [current[newIdx]!, current[idx]!];
		order = current;
		simpanPreferensi();
		closeCtx();
	}

	function ctxFavorit(key: string) {
		const next = new Set(favorites);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		favorites = next;
		simpanPreferensi();
		closeCtx();
	}

	// ── Reset urutan & favorit ke default ────────────────────────────────────

	function reset() {
		order = tabKeys.slice();
		favorites = new Set();
		simpanPreferensi();
	}

	// ── Tutup context menu saat klik luar ─────────────────────────────────────

	function onWindowClick(e: MouseEvent) {
		if (ctx && !(e.target as Element)?.closest?.('.tabbar-ctx')) closeCtx();
	}
</script>

<svelte:window onclick={onWindowClick} />

<div
	style="display:flex; gap:.5rem; border-bottom:1px solid var(--border);
         overflow-x:auto; white-space:nowrap; scrollbar-width:none; -ms-overflow-style:none"
	class="tabbar-scroll"
>
	{#each orderedTabs() as t (t.key)}
		{@const isActive = active === t.key}
		{@const isFav = favorites.has(t.key)}
		{@const isDragTarget = dragOver === t.key && dragKey !== t.key}
		<div
			style="position:relative; display:inline-flex; align-items:center"
			role="none"
			draggable="true"
			ondragstart={() => onDragStart(t.key)}
			ondragover={(e) => onDragOver(e, t.key)}
			ondrop={() => onDrop(t.key)}
			ondragend={onDragEnd}
			onmouseenter={() => (hoverTab = t.key)}
			onmouseleave={() => (hoverTab = null)}
			oncontextmenu={(e) => openCtx(e, t.key)}
		>
			<!-- Indikator drop -->
			{#if isDragTarget}
				<div
					style="position:absolute; left:0; top:0; bottom:0; width:2px; background:var(--accent); border-radius:2px"
				></div>
			{/if}

			<button
				onclick={() => onchange?.(t.key)}
				style="display:inline-flex; align-items:center; gap:.3rem; padding:.2rem .75rem;
               background:none; border:none; border-bottom:2px solid {isActive
					? 'var(--accent)'
					: 'transparent'};
               color:{isActive
					? 'var(--accent)'
					: 'var(--text-dim)'}; font-family:inherit; font-size:.8rem;
               font-weight:600; cursor:pointer; text-transform:uppercase; letter-spacing:.05em;
               user-select:none; opacity:{dragKey === t.key ? 0.4 : 1};
               transition:color .15s, border-color .15s"
			>
				{#if isFav}
					<span style="color:var(--warn); font-size:auto;">★</span>
				{/if}
				{t.label}
			</button>

			<!-- 3-dot menu (muncul saat hover) -->
			{#if hoverTab === t.key || ctx?.key === t.key}
				<button
					onclick={(e) => {
						e.stopPropagation();
						openCtx(e, t.key);
					}}
					style="position:absolute; ml-2; right:0; top:50%; transform:translateY(-50%);
                 padding:.15rem; background:var(--surface2); border:1px solid var(--border);
                 border-radius:50%; color:var(--text-dim); cursor:pointer; font-size:.7rem;
                 line-height:1; z-index:1"
					title="Opsi tab">⋮</button
				>
			{/if}
		</div>
	{/each}

	<!-- Tombol reset setelah tab terakhir -->
	{#if orderChanged || favorites.size > 0}
		<button
			onclick={reset}
			title="Reset urutan & favorit ke default"
			style="flex-shrink:0; align-self:center; margin-left:.25rem; padding:.25rem .5rem;
           background:none; border:1px solid var(--border); border-radius:4px;
           color:var(--text-dim); cursor:pointer; font-size:.7rem; line-height:1;
           white-space:nowrap; transition:color .15s, border-color .15s"
			onmouseenter={(e) => {
				(e.currentTarget as HTMLElement).style.color = 'var(--danger)';
				(e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)';
			}}
			onmouseleave={(e) => {
				(e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
				(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
			}}>↺ Reset</button
		>
	{/if}
</div>

<!-- Context Menu -->
{#if ctx}
	{@const ordered = orderedTabs()}
	{@const idx = ordered.findIndex((t) => t.key === ctx!.key)}
	{@const label = ordered[idx]?.label ?? ''}
	{@const isFav = favorites.has(ctx.key)}
	<div
		class="tabbar-ctx"
		style="position:fixed; z-index:9999; top:{ctx.y}px; left:{ctx.x}px;
           background:var(--surface); border:1px solid var(--border); border-radius:6px;
           box-shadow:0 4px 16px rgba(0,0,0,.3); min-width:200px; padding:.25rem 0; font-size:.82rem"
		role="menu"
	>
		<div
			style="padding:.35rem .85rem .2rem; font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.04em"
		>
			{label}
		</div>
		<div style="height:1px; background:var(--border); margin:.2rem 0"></div>

		<button
			onclick={() => ctxFavorit(ctx!.key)}
			style="display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .85rem;
             background:none; border:none; color:var(--text); cursor:pointer; text-align:left; font-family:inherit; font-size:.82rem"
			onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
			onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
		>
			<span style="color:var(--warn)">{isFav ? '★' : '☆'}</span>
			{isFav ? 'Hapus favorit' : 'Tandai favorit'}
		</button>

		<div style="height:1px; background:var(--border); margin:.2rem 0"></div>

		<button
			onclick={() => ctxGeser(ctx!.key, -1)}
			disabled={idx === 0}
			style="display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .85rem;
             background:none; border:none; color:{idx === 0
				? 'var(--text-dim)'
				: 'var(--text)'}; cursor:{idx === 0
				? 'default'
				: 'pointer'}; text-align:left; font-family:inherit; font-size:.82rem; opacity:{idx === 0
				? 0.4
				: 1}"
			onmouseenter={(e) => {
				if (idx > 0) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
			}}
			onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
		>
			← Geser kiri
		</button>

		<button
			onclick={() => ctxGeser(ctx!.key, 1)}
			disabled={idx === ordered.length - 1}
			style="display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .85rem;
             background:none; border:none; color:{idx === ordered.length - 1
				? 'var(--text-dim)'
				: 'var(--text)'}; cursor:{idx === ordered.length - 1
				? 'default'
				: 'pointer'}; text-align:left; font-family:inherit; font-size:.82rem; opacity:{idx ===
			ordered.length - 1
				? 0.4
				: 1}"
			onmouseenter={(e) => {
				if (idx < ordered.length - 1)
					(e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
			}}
			onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
		>
			→ Geser kanan
		</button>

		<div style="height:1px; background:var(--border); margin:.2rem 0"></div>

		<button
			onclick={() => ctxPindah(ctx!.key, 'awal')}
			disabled={idx === 0}
			style="display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .85rem;
             background:none; border:none; color:{idx === 0
				? 'var(--text-dim)'
				: 'var(--text)'}; cursor:{idx === 0
				? 'default'
				: 'pointer'}; text-align:left; font-family:inherit; font-size:.82rem; opacity:{idx === 0
				? 0.4
				: 1}"
			onmouseenter={(e) => {
				if (idx > 0) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
			}}
			onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
		>
			⇤ Pindah ke awal
		</button>

		<button
			onclick={() => ctxPindah(ctx!.key, 'akhir')}
			disabled={idx === ordered.length - 1}
			style="display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .85rem;
             background:none; border:none; color:{idx === ordered.length - 1
				? 'var(--text-dim)'
				: 'var(--text)'}; cursor:{idx === ordered.length - 1
				? 'default'
				: 'pointer'}; text-align:left; font-family:inherit; font-size:.82rem; opacity:{idx ===
			ordered.length - 1
				? 0.4
				: 1}"
			onmouseenter={(e) => {
				if (idx < ordered.length - 1)
					(e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
			}}
			onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
		>
			⇥ Pindah ke akhir
		</button>
	</div>
{/if}

<style>
	.tabbar-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
