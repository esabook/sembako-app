<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import {
		keranjang, tipeTransaksi, metodeBayar,
		pelangganDipilih, nominalBayar, itemAktifIdx,
		subtotal, diskonMember, total, kembalian,
		resetKasir, type ItemKeranjang, type MetodeBayar,
	} from '$lib/stores/kasir.js';

	type BarangResult = {
		id: number; kode_barang: string; nama_barang: string;
		harga_jual_eceran: number; harga_jual_grosir: number;
		stok_sekarang: number; satuan_dasar_id: number | null;
		singkatan_satuan: string | null;
	};
	type PelangganResult = {
		id: number; nama: string; saldo_piutang: number
		gender: 'pria' | 'wanita' | null
		no_kartu: string | null
		tier: 'reguler' | 'silver' | 'gold' | null
		diskon_member: number | null
	};

	type ActiveWidget = 'search' | 'pelanggan' | 'metode' | 'bayar' | null;

	let searchVal = $state('');
	let searchResults = $state<BarangResult[]>([]);
	let searchLoading = $state(false);
	let searchSelectedIdx = $state(-1);
	let pelangganList = $state<PelangganResult[]>([]);
	let pelangganSelectedIdx = $state(-1);
	let prosesLoading = $state(false);
	let sukses = $state<{ no_transaksi: string } | null>(null);
	let errorMsg = $state('');
	let activeWidget = $state<ActiveWidget>(null);
	let keranjangFocused = $state(false);
	let konfirmasiHapusIdx = $state<number | null>(null);

	// Barcode scanner detection (< 50ms = scanner)
	let lastKeyTime = 0;
	let barcodeBuffer = '';

	let searchInputEl: HTMLInputElement;
	let pelangganInputEl = $state<HTMLInputElement>();
	let bayarInputEl = $state<HTMLInputElement>();

	// ── Idle timer — reset fokus ke keranjang setelah 3 detik tidak ada aktivitas ──
	let idleTimer: ReturnType<typeof setTimeout>;

	function focusKeranjang() {
		if (konfirmasiHapusIdx !== null || sukses !== null) return;
		const active = document.activeElement as HTMLElement;
		if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') active.blur();
		searchResults = [];
		pelangganList = [];
		activeWidget = null;
		keranjangFocused = true;
		if ($keranjang.length > 0 && $itemAktifIdx < 0) itemAktifIdx.set(0);
	}

	function resetIdle() {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(focusKeranjang, 5000);
	}

	// ── Cari barang ──────────────────────────────────────────────────────
	let searchTimer: ReturnType<typeof setTimeout>;
	async function cariBarang(q: string) {
		if (!q.trim()) { searchResults = []; searchSelectedIdx = -1; return; }
		clearTimeout(searchTimer);
		searchTimer = setTimeout(async () => {
			searchLoading = true;
			const res = await api.get<BarangResult[]>(`/barang?q=${encodeURIComponent(q)}`);
			searchLoading = false;
			if (res.success) {
				searchResults = res.data;
				searchSelectedIdx = res.data.length > 0 ? 0 : -1;
			}
		}, 200);
	}

	function hargaItem(br: BarangResult): number {
		return $tipeTransaksi === 'grosir' ? br.harga_jual_grosir : br.harga_jual_eceran;
	}

	function tambahKeKeranjang(br: BarangResult) {
		keranjang.update((k) => {
			const idx = k.findIndex((i) => i.barang_id === br.id);
			if (idx >= 0) {
				const updated = [...k];
				updated[idx] = { ...updated[idx]!, jumlah: updated[idx]!.jumlah + 1 };
				itemAktifIdx.set(idx);
				return updated;
			}
			const item: ItemKeranjang = {
				barang_id: br.id,
				kode_barang: br.kode_barang,
				nama_barang: br.nama_barang,
				satuan_id: br.satuan_dasar_id,
				singkatan_satuan: br.singkatan_satuan ?? '',
				jumlah: 1,
				harga_jual: hargaItem(br),
				diskon_item: 0,
				stok_sekarang: br.stok_sekarang,
			};
			itemAktifIdx.set(k.length);
			return [...k, item];
		});
		searchVal = '';
		searchResults = [];
		searchSelectedIdx = -1;
		searchInputEl?.focus();
	}

	function ubahJumlah(idx: number, delta: number) {
		keranjang.update((k) => {
			const updated = [...k];
			const item = updated[idx];
			if (!item) return k;
			const newQty = item.jumlah + delta;
			if (newQty <= 0) {
				updated.splice(idx, 1);
				itemAktifIdx.set(updated.length > 0 ? Math.min(idx, updated.length - 1) : -1);
				return updated;
			}
			updated[idx] = { ...item, jumlah: Math.min(newQty, item.stok_sekarang) };
			return updated;
		});
	}

	function hapusItem(idx: number) {
		keranjang.update((k) => { const u = [...k]; u.splice(idx, 1); return u; });
		itemAktifIdx.set(-1);
	}

	function mintaKonfirmasiHapus(idx: number) {
		konfirmasiHapusIdx = idx;
	}

	function ubahDiskon(idx: number, val: string) {
		keranjang.update((k) => {
			const u = [...k];
			if (u[idx]) u[idx] = { ...u[idx]!, diskon_item: Number(val) || 0 };
			return u;
		});
	}

	// ── Pelanggan ─────────────────────────────────────────────────────────
	async function muatPelanggan(q: string) {
		if (q.length < 3) { pelangganList = []; pelangganSelectedIdx = -1; return; }
		const res = await api.get<PelangganResult[]>(`/pelanggan?q=${encodeURIComponent(q)}`);
		if (res.success) { pelangganList = res.data; pelangganSelectedIdx = res.data.length > 0 ? 0 : -1; }
	}

	function pilihPelanggan(p: PelangganResult) {
		pelangganDipilih.set(p);
		pelangganList = [];
		pelangganSelectedIdx = -1;
		activeWidget = null;
	}

	// ── Dedicated keyboard handlers ───────────────────────────────────────
	function onSearchKeydown(e: KeyboardEvent) {
		if (searchResults.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault(); e.stopPropagation();
			searchSelectedIdx = Math.min(searchSelectedIdx + 1, Math.min(7, searchResults.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault(); e.stopPropagation();
			searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault(); e.stopPropagation();
			const sel = searchResults[searchSelectedIdx >= 0 ? searchSelectedIdx : 0];
			if (sel) tambahKeKeranjang(sel);
		} else if (e.key === 'Escape') {
			e.preventDefault(); e.stopPropagation();
			searchResults = []; searchSelectedIdx = -1;
		}
	}

	function onPelangganKeydown(e: KeyboardEvent) {
		if (pelangganList.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault(); e.stopPropagation();
			pelangganSelectedIdx = Math.min(pelangganSelectedIdx + 1, pelangganList.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault(); e.stopPropagation();
			pelangganSelectedIdx = Math.max(pelangganSelectedIdx - 1, 0);
		} else if (e.key === 'Enter' && pelangganSelectedIdx >= 0) {
			e.preventDefault(); e.stopPropagation();
			pilihPelanggan(pelangganList[pelangganSelectedIdx]!);
		} else if (e.key === 'Escape') {
			e.preventDefault(); e.stopPropagation();
			pelangganList = []; pelangganSelectedIdx = -1;
		}
	}

	function cycleMetodeBayar() {
		const idx = METODE.indexOf($metodeBayar);
		metodeBayar.set(METODE[(idx + 1) % METODE.length]);
	}

	// ── Proses bayar ──────────────────────────────────────────────────────
	async function prosesBayar() {
		if ($keranjang.length === 0) { errorMsg = 'Keranjang kosong'; return; }
		if ($metodeBayar === 'hutang' && !$pelangganDipilih) {
			errorMsg = 'Pilih pelanggan untuk transaksi hutang'; return;
		}
		if ($metodeBayar !== 'hutang' && Number($nominalBayar) < $total) {
			errorMsg = 'Nominal bayar kurang'; return;
		}

		prosesLoading = true;
		errorMsg = '';

		const res = await api.post<{ no_transaksi: string }>('/penjualan', {
			pelanggan_id: $pelangganDipilih?.id,
			tipe: $tipeTransaksi,
			metode_bayar: $metodeBayar,
			bayar: Number($nominalBayar) || $total,
			items: $keranjang.map((i) => ({
				barang_id: i.barang_id,
				satuan_id: i.satuan_id,
				jumlah: i.jumlah,
				harga_jual: i.harga_jual,
				diskon_item: i.diskon_item,
			})),
		});

		prosesLoading = false;

		if (!res.success) { errorMsg = (res as { success: false; error: string }).error; return; }
		sukses = res.data;
		resetKasir();
	}

	// ── Global keyboard handler ───────────────────────────────────────────
	function onKeydown(e: KeyboardEvent) {
		resetIdle();

		// Konfirmasi hapus modal aktif
		if (konfirmasiHapusIdx !== null) {
			if (e.key === 'Enter') {
				e.preventDefault();
				hapusItem(konfirmasiHapusIdx);
				konfirmasiHapusIdx = null;
			} else if (e.key === 'Escape') {
				e.preventDefault();
				konfirmasiHapusIdx = null;
			}
			return;
		}

		// Barcode scanner detection
		const now = Date.now();
		if (document.activeElement !== searchInputEl) {
			if (now - lastKeyTime < 50 && e.key.length === 1) {
				barcodeBuffer += e.key;
			} else if (e.key === 'Enter' && barcodeBuffer.length > 3) {
				searchVal = barcodeBuffer;
				cariBarang(barcodeBuffer);
				barcodeBuffer = '';
				lastKeyTime = 0;
				return;
			} else {
				barcodeBuffer = e.key.length === 1 ? e.key : '';
			}
			lastKeyTime = now;
		}

		const tag = (document.activeElement as HTMLElement)?.tagName;
		const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

		// ArrowLeft/Right ubah qty, ArrowUp/Down navigasi item keranjang (hanya jika tidak di input)
		if (!inInput && $keranjang.length > 0) {
			if (e.key === 'ArrowRight' && $itemAktifIdx >= 0) {
				e.preventDefault(); keranjangFocused = true; ubahJumlah($itemAktifIdx, 1); return;
			}
			if (e.key === 'ArrowLeft' && $itemAktifIdx >= 0) {
				e.preventDefault(); keranjangFocused = true;
				const cur = $keranjang[$itemAktifIdx];
				if (cur && cur.jumlah <= 1) mintaKonfirmasiHapus($itemAktifIdx);
				else ubahJumlah($itemAktifIdx, -1);
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault(); keranjangFocused = true;
				itemAktifIdx.update(i => Math.min(i < 0 ? 0 : i + 1, $keranjang.length - 1));
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault(); keranjangFocused = true;
				itemAktifIdx.update(i => Math.max(i - 1, 0));
				return;
			}
		}

		// F-key shortcuts
		switch (e.key) {
			case 'F1':
				e.preventDefault(); tipeTransaksi.set('eceran'); activeWidget = null; break;
			case 'F2':
				e.preventDefault(); tipeTransaksi.set('grosir'); activeWidget = null; break;
			case 'F3':
				e.preventDefault(); activeWidget = 'search'; keranjangFocused = false; searchInputEl?.focus(); break;
			case 'F4':
				e.preventDefault(); activeWidget = 'pelanggan'; keranjangFocused = false; setTimeout(() => pelangganInputEl?.focus(), 0); break;
			case 'F5':
				e.preventDefault(); activeWidget = 'metode'; cycleMetodeBayar(); break;
			case 'F9':
				e.preventDefault(); activeWidget = 'bayar'; keranjangFocused = false; setTimeout(() => bayarInputEl?.focus(), 0); break;
			case 'F10':
				e.preventDefault(); if ($keranjang.length > 0) prosesBayar(); break;
			case 'F12':
				e.preventDefault(); resetKasir(); activeWidget = null; break;
			case 'Escape':
				e.preventDefault();
				if (sukses !== null) { sukses = null; return; }
				searchResults = []; searchSelectedIdx = -1;
				pelangganList = []; pelangganSelectedIdx = -1;
				activeWidget = null;
				focusKeranjang();
				break;
		}
	}

	onMount(() => {
		searchInputEl?.focus();
		resetIdle();
		return () => clearTimeout(idleTimer);
	});

	// ── Widget styling ────────────────────────────────────────────────────
	function wBorder(widget: ActiveWidget): string {
		return activeWidget === widget ? 'var(--accent)' : 'var(--border)';
	}
	function wOpacity(widget: ActiveWidget): string {
		return !activeWidget || activeWidget === widget ? '1' : '0.4';
	}

	// ── Helpers ───────────────────────────────────────────────────────────
	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID').format(n);
	}

	const METODE: MetodeBayar[] = ['tunai', 'transfer', 'qris', 'hutang'];
	const METODE_LABEL: Record<MetodeBayar, string> = {
		tunai: 'TUNAI', transfer: 'TRANSFER', qris: 'QRIS', hutang: 'HUTANG',
	};

	const SHORTCUTS = [
		['F1','Eceran'],['F2','Grosir'],['F3','Cari'],['F4','Pelanggan'],
		['F5','Metode'],['F9','Nominal'],['F10','Bayar'],['F12','Reset'],
		['←→','Qty'],['↑↓','Navigasi'],['ESC','Batal'],
	];

	let shortcutsVisible = $state(false);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-col flex-1 min-h-0">

	<div class="flex gap-3 flex-1 min-h-0">

		<!-- ─── Kiri: Cari + Keranjang ────────────────────────────────────── -->
		<div class="flex flex-col flex-1 gap-2 min-w-0">

			<!-- Header: tipe + search -->
			<div class="flex gap-1.5 shrink-0">
				{#each (['eceran','grosir'] as const) as t}
					<button
						onclick={() => { tipeTransaksi.set(t); activeWidget = null; }}
						class="px-2 py-1 rounded text-xs font-bold border transition-all shrink-0"
						style="{$tipeTransaksi === t
							? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
							: 'border-color:var(--border);color:var(--text-dim)'}"
					>{t.toUpperCase()}</button>
				{/each}

				<div class="relative flex-1" style="opacity:{wOpacity('search')};transition:opacity 0.15s">
					<input
						bind:this={searchInputEl}
						type="text"
						placeholder="F3 · Cari nama / kode barang..."
						bind:value={searchVal}
						onfocus={() => activeWidget = 'search'}
						oninput={() => cariBarang(searchVal)}
						onkeydown={onSearchKeydown}
						class="w-full px-3 py-1.5 rounded border text-sm outline-none transition-all"
						style="background:var(--surface);border-color:{wBorder('search')};color:var(--text);{activeWidget === 'search' ? 'box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 25%,transparent)' : ''}"
					/>
					{#if searchResults.length > 0}
						<div class="absolute z-20 top-full left-0 right-0 mt-1 rounded border shadow-lg overflow-hidden"
							style="background:var(--surface);border-color:var(--border)">
							{#if searchLoading}
								<p class="px-3 py-2 text-sm" style="color:var(--text-dim)">Mencari...</p>
							{:else}
								{#each searchResults.slice(0, 8) as br, i}
									<button
										onclick={() => tambahKeKeranjang(br)}
										class="w-full text-left px-3 py-2 text-sm border-t flex justify-between items-center"
										style="border-color:var(--border);background:{searchSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
									>
										<span>
											<span class="text-xs mr-2" style="color:var(--text-dim)">{br.kode_barang}</span>
											{br.nama_barang}
										</span>
										<span class="text-xs ml-4 shrink-0" style="color:{br.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--text-dim)'}">
											stok {br.stok_sekarang} · Rp {rupiah(hargaItem(br))}
										</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Keranjang -->
			<div
				class="flex-1 overflow-y-auto rounded border min-h-0 transition-all"
				style="border-color:{keranjangFocused ? 'var(--accent)' : 'var(--border)'};{keranjangFocused ? 'box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 20%,transparent)' : ''}"
			>
				{#if $keranjang.length === 0}
					<div class="flex items-center justify-center h-full" style="color:var(--text-dim)">
						<p class="text-sm">Keranjang kosong — cari barang atau scan barcode</p>
					</div>
				{:else}
					<table class="w-full text-sm">
						<thead class="sticky top-0" style="background:var(--surface2)">
							<tr style="color:var(--text-dim)">
								<th class="text-left px-3 py-2 font-medium w-6">#</th>
								<th class="text-left px-3 py-2 font-medium">Barang</th>
								<th class="text-right px-3 py-2 font-medium w-28">Harga</th>
								<th class="text-center px-2 py-2 font-medium w-28">Qty</th>
								<th class="text-right px-3 py-2 font-medium w-24">Diskon</th>
								<th class="text-right px-3 py-2 font-medium w-28">Subtotal</th>
								<th class="px-2 py-2 w-8"></th>
							</tr>
						</thead>
						<tbody>
							{#each $keranjang as item, idx}
								<tr
									class="border-t cursor-pointer transition-colors"
									style="{$itemAktifIdx === idx
										? 'background:var(--surface2);outline:1px solid var(--accent);outline-offset:-1px'
										: 'border-color:var(--border)'}"
									onclick={() => { itemAktifIdx.set(idx); keranjangFocused = true; }}
								>
									<td class="px-3 py-2" style="color:var(--text-dim)">{idx + 1}</td>
									<td class="px-3 py-2">
										<div>{item.nama_barang}</div>
										<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
									</td>
									<td class="px-3 py-2 text-right">{rupiah(item.harga_jual)}</td>
									<td class="px-2 py-1">
										<div class="flex items-center justify-center gap-1">
											<button onclick={(e) => { e.stopPropagation(); if (item.jumlah <= 1) mintaKonfirmasiHapus(idx); else ubahJumlah(idx, -1); }}
												class="w-6 h-6 rounded text-center leading-none"
												style="background:var(--surface);color:var(--text-dim)">−</button>
											<span class="w-8 text-center font-mono">{item.jumlah}</span>
											<button onclick={(e) => { e.stopPropagation(); ubahJumlah(idx, 1); }}
												class="w-6 h-6 rounded text-center leading-none"
												style="background:var(--surface);color:var(--text-dim)">+</button>
										</div>
										<div class="text-xs text-center mt-0.5" style="color:var(--text-dim)">{item.singkatan_satuan}</div>
									</td>
									<td class="px-3 py-1 text-right">
										<input
											type="number" min="0" step="500"
											value={item.diskon_item}
											oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
											onclick={(e) => e.stopPropagation()}
											class="w-20 text-right px-2 py-0.5 rounded border text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										/>
									</td>
									<td class="px-3 py-2 text-right font-medium">
										{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
									</td>
									<td class="px-2 py-2 text-center">
										<button
											onclick={(e) => { e.stopPropagation(); mintaKonfirmasiHapus(idx); }}
											class="text-xs" style="color:var(--danger)">✕</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>

		<!-- ─── Kanan: Panel bayar ────────────────────────────────────────── -->
		<div class="w-64 shrink-0 flex flex-col gap-2 min-h-0">

			<!-- area scroll: pelanggan, metode, total, nominal -->
			<div class="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">

			<!-- Pelanggan -->
			<div
				class="rounded border p-3 transition-all"
				style="background:var(--surface);border-color:{wBorder('pelanggan')};opacity:{wOpacity('pelanggan')}"
				onclick={() => activeWidget = 'pelanggan'}
				role="none"
			>
				<p class="text-xs mb-2" style="color:var(--text-dim)">F4 · PELANGGAN</p>
				{#if $pelangganDipilih}
					<div class="flex items-start justify-between gap-1">
						<div class="text-sm leading-snug">
							<span>{$pelangganDipilih.nama}</span>
							{#if $pelangganDipilih.gender === 'pria'}
								<span class="ml-1 text-xs" style="color:#40c4ff">♂</span>
							{:else if $pelangganDipilih.gender === 'wanita'}
								<span class="ml-1 text-xs" style="color:#ff80ab">♀</span>
							{/if}
							{#if $pelangganDipilih.no_kartu}
								<div class="text-xs mt-0.5" style="color:var(--text-dim)">
									<span class="font-mono" style="color:var(--accent)">{$pelangganDipilih.no_kartu}</span>
									{#if $pelangganDipilih.diskon_member && $pelangganDipilih.diskon_member > 0}
										<span class="ml-1.5" style="color:var(--accent)">−{$pelangganDipilih.diskon_member}%</span>
									{/if}
								</div>
							{/if}
						</div>
						<button onclick={() => pelangganDipilih.set(null)} class="text-xs shrink-0" style="color:var(--danger)">✕</button>
					</div>
				{:else}
					<div class="relative">
						<input
							bind:this={pelangganInputEl}
							type="text"
							placeholder="Min. 3 karakter..."
							onfocus={() => activeWidget = 'pelanggan'}
							oninput={(e) => muatPelanggan((e.target as HTMLInputElement).value)}
							onkeydown={onPelangganKeydown}
							class="w-full px-2 py-1 rounded border text-sm outline-none"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
						{#if pelangganList.length > 0}
							<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border max-h-48 overflow-y-auto shadow-lg"
								style="background:var(--surface);border-color:var(--border)">
								{#each pelangganList as p, i}
									<button
										onclick={() => pilihPelanggan(p)}
										class="w-full text-left px-3 py-2 text-xs border-t"
										style="border-color:var(--border);background:{pelangganSelectedIdx === i ? 'var(--surface2)' : 'transparent'}"
									>
										<span class="font-medium text-sm" style="color:var(--text)">{p.nama}</span>
										{#if p.gender === 'pria'}
											<span class="ml-1" style="color:#40c4ff">♂</span>
										{:else if p.gender === 'wanita'}
											<span class="ml-1" style="color:#ff80ab">♀</span>
										{/if}
										{#if p.no_kartu}
											<span class="ml-2 font-mono" style="color:var(--accent)">{p.no_kartu}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Metode bayar -->
			<div
				class="rounded border p-3 transition-all"
				style="background:var(--surface);border-color:{wBorder('metode')};opacity:{wOpacity('metode')}"
				onclick={() => activeWidget = 'metode'}
				role="none"
			>
				<p class="text-xs mb-2" style="color:var(--text-dim)">F5 · METODE BAYAR</p>
				<div class="grid grid-cols-2 gap-1">
					{#each METODE as m}
						<button
							onclick={(e) => { e.stopPropagation(); metodeBayar.set(m); activeWidget = 'metode'; }}
							class="py-1.5 rounded text-xs font-bold border transition-all"
							style="{$metodeBayar === m
								? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
								: 'border-color:var(--border);color:var(--text-dim)'}"
						>{METODE_LABEL[m]}</button>
					{/each}
				</div>
			</div>

			<!-- Total -->
			<div class="rounded border p-3 flex flex-col gap-2" style="background:var(--surface);border-color:var(--border)">
				<div class="flex justify-between text-sm">
					<span style="color:var(--text-dim)">Subtotal</span>
					<span>Rp {rupiah($subtotal)}</span>
				</div>
				{#if $diskonMember > 0}
					<div class="flex justify-between text-sm">
						<span style="color:var(--accent)">Diskon member ({$pelangganDipilih?.diskon_member}%)</span>
						<span style="color:var(--accent)">− Rp {rupiah($diskonMember)}</span>
					</div>
				{/if}
				<div class="flex justify-between text-lg font-bold border-t pt-2" style="border-color:var(--border)">
					<span>TOTAL</span>
					<span style="color:var(--accent)">Rp {rupiah($total)}</span>
				</div>
			</div>

			<!-- Input bayar -->
			{#if $metodeBayar !== 'hutang'}
				<div
					class="rounded border p-3 transition-all"
					style="background:var(--surface);border-color:{wBorder('bayar')};opacity:{wOpacity('bayar')}"
					onclick={() => activeWidget = 'bayar'}
					role="none"
				>
					<label for="nominal-bayar" class="text-xs block mb-1" style="color:var(--text-dim)">F9 · NOMINAL BAYAR</label>
					<input
						id="nominal-bayar"
						bind:this={bayarInputEl}
						type="number"
						min="0"
						step="500"
						bind:value={$nominalBayar}
						placeholder="0"
						onfocus={() => activeWidget = 'bayar'}
						class="w-full px-3 py-2 rounded border text-right text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					{#if Number($nominalBayar) >= $total && $total > 0}
						<div class="flex justify-between mt-2 text-sm">
							<span style="color:var(--text-dim)">Kembalian</span>
							<span class="font-bold" style="color:var(--accent)">Rp {rupiah($kembalian)}</span>
						</div>
					{/if}
				</div>
			{/if}

			</div><!-- /scroll area -->

			<!-- sticky bottom: error + tombol aksi -->
			<div class="shrink-0 flex flex-col gap-2">
				{#if errorMsg}
					<p class="text-xs px-3 py-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorMsg}</p>
				{/if}

				<button
					onclick={() => { activeWidget = null; prosesBayar(); }}
					disabled={prosesLoading || $keranjang.length === 0}
					class="py-2.5 rounded font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
					style="background:var(--accent);color:var(--bg)"
				>
					{prosesLoading ? 'MEMPROSES...' : 'F10 · PROSES BAYAR'}
				</button>

				{#if $keranjang.length > 0}
					<button
						onclick={() => { resetKasir(); activeWidget = null; }}
						class="py-1 rounded text-xs transition-all active:scale-95"
						style="color:var(--danger)"
					>F12 · Kosongkan keranjang</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- ─── Footer: shortcut collapsible ─────────────────────────────────── -->
	<div class="shrink-0 border-t pt-1.5 select-none" style="border-color:var(--border)">
		<div class="flex items-center gap-2">
			{#if shortcutsVisible}
				<div class="flex-1 flex flex-wrap gap-x-4 gap-y-0.5">
					{#each SHORTCUTS as [k, v]}
						<span class="text-xs">
							<span class="font-mono font-bold" style="color:var(--text)">{k}</span>
							<span class="ml-1" style="color:var(--text-dim)">{v}</span>
						</span>
					{/each}
				</div>
			{:else}
				<span class="text-xs flex-1" style="color:var(--text-dim)">F1 Eceran · F3 Cari · F10 Bayar · F12 Reset</span>
			{/if}
			<button
				onclick={() => shortcutsVisible = !shortcutsVisible}
				class="text-xs shrink-0 px-1.5 py-0.5 rounded border"
				style="border-color:var(--border);color:var(--text-dim)"
			>{shortcutsVisible ? '◉' : '◎'}</button>
		</div>
	</div>

</div>

<!-- ─── Modal konfirmasi hapus ─────────────────────────────────────────── -->
{#if konfirmasiHapusIdx !== null}
	<div class="fixed inset-0 z-40 flex items-center justify-center" style="background:rgba(0,0,0,0.55)">
		<div class="rounded-lg border p-6 text-center w-72" style="background:var(--surface);border-color:var(--border)">
			<p class="font-bold mb-1">Hapus dari keranjang?</p>
			<p class="text-sm mb-5" style="color:var(--text-dim)">
				{$keranjang[konfirmasiHapusIdx]?.nama_barang ?? ''}
			</p>
			<div class="flex gap-2 justify-center">
				<button
					onclick={() => { hapusItem(konfirmasiHapusIdx!); konfirmasiHapusIdx = null; }}
					class="px-4 py-1.5 rounded font-bold text-sm active:scale-95 transition-all"
					style="background:var(--danger,#c62828);color:var(--bg,#fff)"
				>Ya (Enter)</button>
				<button
					onclick={() => konfirmasiHapusIdx = null}
					class="px-4 py-1.5 rounded text-sm border active:scale-95 transition-all"
					style="border-color:var(--border);color:var(--text-dim)"
				>Batal (ESC)</button>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Modal sukses ───────────────────────────────────────────────────── -->
{#if sukses}
	<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.7)">
		<div class="rounded-lg border p-8 text-center w-80" style="background:var(--surface);border-color:var(--border)">
			<p class="text-3xl mb-2" style="color:var(--accent)">✓</p>
			<p class="font-bold mb-1">Transaksi Berhasil</p>
			<p class="text-sm mb-4" style="color:var(--text-dim)">{sukses.no_transaksi}</p>
			<button
				onclick={() => { sukses = null; activeWidget = null; searchInputEl?.focus(); }}
				class="px-6 py-2 rounded font-bold text-sm active:scale-95 transition-all"
				style="background:var(--accent);color:var(--bg)"
			>Transaksi Baru (ESC)</button>
		</div>
	</div>
{/if}
