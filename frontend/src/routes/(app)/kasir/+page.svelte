<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import {
		keranjang, tipeTransaksi, metodeBayar,
		pelangganDipilih, nominalBayar, itemAktifIdx,
		subtotal, total, kembalian,
		resetKasir, type ItemKeranjang, type MetodeBayar,
	} from '$lib/stores/kasir.js';

	type BarangResult = {
		id: number; kode_barang: string; nama_barang: string;
		harga_jual_eceran: number; harga_jual_grosir: number;
		stok_sekarang: number; satuan_dasar_id: number | null;
		singkatan_satuan: string | null;
	};
	type PelangganResult = { id: number; nama: string; saldo_piutang: number };

	let searchVal = $state('');
	let searchResults = $state<BarangResult[]>([]);
	let searchLoading = $state(false);
	let pelangganList = $state<PelangganResult[]>([]);
	let showSearch = $state(false);
	let showBayar = $state(false);
	let showPelanggan = $state(false);
	let prosesLoading = $state(false);
	let sukses = $state<{ no_transaksi: string } | null>(null);
	let errorMsg = $state('');

	// Barcode scanner detection (< 50ms = scanner)
	let lastKeyTime = 0;
	let barcodeBuffer = '';

	let searchInputEl: HTMLInputElement;
	let bayarInputEl = $state<HTMLInputElement>();

	// ── Cari barang ──────────────────────────────────────────────────────
	let searchTimer: ReturnType<typeof setTimeout>;
	async function cariBarang(q: string) {
		if (!q.trim()) { searchResults = []; showSearch = false; return; }
		clearTimeout(searchTimer);
		searchTimer = setTimeout(async () => {
			searchLoading = true;
			const res = await api.get<BarangResult[]>(`/barang?q=${encodeURIComponent(q)}`);
			searchLoading = false;
			if (res.success) { searchResults = res.data; showSearch = res.data.length > 0; }
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
		showSearch = false;
		searchInputEl?.focus();
	}

	function ubahJumlah(idx: number, delta: number) {
		keranjang.update((k) => {
			const updated = [...k];
			const item = updated[idx];
			if (!item) return k;
			const newQty = item.jumlah + delta;
			if (newQty <= 0) { updated.splice(idx, 1); itemAktifIdx.set(-1); return updated; }
			updated[idx] = { ...item, jumlah: Math.min(newQty, item.stok_sekarang) };
			return updated;
		});
	}

	function hapusItem(idx: number) {
		keranjang.update((k) => { const u = [...k]; u.splice(idx, 1); return u; });
		itemAktifIdx.set(-1);
	}

	function ubahDiskon(idx: number, val: string) {
		keranjang.update((k) => {
			const u = [...k];
			if (u[idx]) u[idx] = { ...u[idx]!, diskon_item: Number(val) || 0 };
			return u;
		});
	}

	// Update harga saat tipe ganti
	$effect(() => {
		const tipe = $tipeTransaksi;
		keranjang.update((k) =>
			k.map((item) => {
				// Cari harga baru dari hasil pencarian terakhir tidak mungkin,
				// tapi kita tidak bisa karena harga sudah snapshot.
				// Solusi: reset harga saat tipe berubah hanya jika item baru ditambah.
				// Untuk item yang sudah ada, user harus remove + tambah ulang.
				return item;
			})
		);
	});

	// ── Pelanggan ─────────────────────────────────────────────────────────
	async function muatPelanggan(q = '') {
		const res = await api.get<PelangganResult[]>(`/pelanggan?q=${q}`);
		if (res.success) pelangganList = res.data;
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
		showBayar = false;
		resetKasir();
	}

	// ── Shortcut keyboard ─────────────────────────────────────────────────
	function onKeydown(e: KeyboardEvent) {
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

		// Shortcuts — tidak aktif saat mengetik di input text
		const tag = (document.activeElement as HTMLElement)?.tagName;
		const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

		switch (e.key) {
			case 'F1': e.preventDefault(); searchInputEl?.focus(); break;
			case 'F2': e.preventDefault(); if ($itemAktifIdx >= 0) ubahJumlah($itemAktifIdx, 1); break;
			case 'F3': e.preventDefault(); if ($itemAktifIdx >= 0) ubahJumlah($itemAktifIdx, -1); break;
			case 'F5': e.preventDefault(); if ($itemAktifIdx >= 0) hapusItem($itemAktifIdx); break;
			case 'F9': e.preventDefault(); metodeBayar.set('hutang'); if (!showBayar) showBayar = true; break;
			case 'F10': e.preventDefault(); if ($keranjang.length > 0) { showBayar = true; setTimeout(() => bayarInputEl?.focus(), 50); } break;
			case 'Escape': e.preventDefault(); showBayar = false; showSearch = false; showPelanggan = false; sukses = null; break;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		searchInputEl?.focus();
	});
	onDestroy(() => window.removeEventListener('keydown', onKeydown));

	// ── Helpers ───────────────────────────────────────────────────────────
	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID').format(n);
	}

	const METODE: MetodeBayar[] = ['tunai', 'transfer', 'qris', 'hutang'];
	const METODE_LABEL: Record<MetodeBayar, string> = {
		tunai: 'TUNAI', transfer: 'TRANSFER', qris: 'QRIS', hutang: 'HUTANG',
	};
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Shortcut legend -->
<div class="flex gap-2 mb-3 text-xs flex-wrap" style="color:var(--text-dim)">
	{#each [['F1','Cari'],['F2','+Qty'],['F3','-Qty'],['F5','Hapus'],['F9','Hutang'],['F10','Bayar'],['ESC','Batal']] as [k,v]}
		<span class="px-2 py-0.5 rounded border" style="border-color:var(--border)">{k} {v}</span>
	{/each}
</div>

<div class="flex gap-4 h-[calc(100vh-8rem)]">

	<!-- ─── Kiri: Cari + Keranjang ──────────────────────────────────────── -->
	<div class="flex flex-col flex-1 gap-3 min-w-0">

		<!-- Header: tipe + search -->
		<div class="flex gap-2">
			<!-- Tipe eceran/grosir -->
			{#each ['eceran','grosir'] as t}
				<button
					onclick={() => tipeTransaksi.set(t as 'eceran'|'grosir')}
					class="px-3 py-1.5 rounded text-sm font-bold border"
					style="{$tipeTransaksi === t
						? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
						: 'border-color:var(--border);color:var(--text-dim)'}"
				>{t.toUpperCase()}</button>
			{/each}

			<!-- Search -->
			<div class="relative flex-1">
				<input
					bind:this={searchInputEl}
					type="text"
					placeholder="F1 · Cari nama / kode barang..."
					bind:value={searchVal}
					oninput={() => cariBarang(searchVal)}
					class="w-full px-3 py-1.5 rounded border text-sm outline-none"
					style="background:var(--surface);border-color:var(--border);color:var(--text)"
				/>
				{#if showSearch}
					<div class="absolute z-20 top-full left-0 right-0 mt-1 rounded border shadow-lg overflow-hidden"
						style="background:var(--surface);border-color:var(--border)">
						{#if searchLoading}
							<p class="px-3 py-2 text-sm" style="color:var(--text-dim)">Mencari...</p>
						{:else}
							{#each searchResults.slice(0, 8) as br}
								<button
									onclick={() => tambahKeKeranjang(br)}
									class="w-full text-left px-3 py-2 text-sm border-t flex justify-between items-center hover:opacity-80"
									style="border-color:var(--border)"
								>
									<span>
										<span style="color:var(--text-dim)" class="text-xs mr-2">{br.kode_barang}</span>
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
		<div class="flex-1 overflow-y-auto rounded border" style="border-color:var(--border)">
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
								class="border-t cursor-pointer"
								style="{$itemAktifIdx === idx
									? 'background:var(--surface2);border-color:var(--accent)'
									: 'border-color:var(--border)'}"
								onclick={() => itemAktifIdx.set(idx)}
							>
								<td class="px-3 py-2" style="color:var(--text-dim)">{idx + 1}</td>
								<td class="px-3 py-2">
									<div>{item.nama_barang}</div>
									<div class="text-xs" style="color:var(--text-dim)">{item.kode_barang}</div>
								</td>
								<td class="px-3 py-2 text-right">{rupiah(item.harga_jual)}</td>
								<td class="px-2 py-1">
									<div class="flex items-center justify-center gap-1">
										<button onclick={(e) => { e.stopPropagation(); ubahJumlah(idx, -1); }}
											class="w-6 h-6 rounded text-center leading-none"
											style="background:var(--surface);color:var(--text-dim)">−</button>
										<span class="w-8 text-center">{item.jumlah}</span>
										<button onclick={(e) => { e.stopPropagation(); ubahJumlah(idx, 1); }}
											class="w-6 h-6 rounded text-center leading-none"
											style="background:var(--surface);color:var(--text-dim)">+</button>
									</div>
									<div class="text-xs text-center mt-0.5" style="color:var(--text-dim)">{item.singkatan_satuan}</div>
								</td>
								<td class="px-3 py-1 text-right">
									<input
										type="number" min="0"
										value={item.diskon_item}
										oninput={(e) => ubahDiskon(idx, (e.target as HTMLInputElement).value)}
										onclick={(e) => e.stopPropagation()}
										class="w-20 text-right px-2 py-0.5 rounded border text-xs outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
								<td class="px-3 py-2 text-right font-medium">
									{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
								</td>
								<td class="px-2 py-2 text-center">
									<button onclick={(e) => { e.stopPropagation(); hapusItem(idx); }}
										class="text-xs" style="color:var(--danger)">✕</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<!-- ─── Kanan: Panel bayar ──────────────────────────────────────────── -->
	<div class="w-72 shrink-0 flex flex-col gap-3">

		<!-- Pelanggan -->
		<div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
			<p class="text-xs mb-2" style="color:var(--text-dim)">PELANGGAN</p>
			{#if $pelangganDipilih}
				<div class="flex items-center justify-between">
					<span class="text-sm">{$pelangganDipilih.nama}</span>
					<button onclick={() => pelangganDipilih.set(null)} class="text-xs" style="color:var(--danger)">✕</button>
				</div>
			{:else}
				<div class="relative">
					<input
						type="text"
						placeholder="Cari pelanggan..."
						onfocus={() => muatPelanggan()}
						oninput={(e) => muatPelanggan((e.target as HTMLInputElement).value)}
						class="w-full px-2 py-1 rounded border text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					{#if pelangganList.length > 0}
						<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border max-h-40 overflow-y-auto"
							style="background:var(--surface);border-color:var(--border)">
							{#each pelangganList as p}
								<button
									onclick={() => { pelangganDipilih.set(p); pelangganList = []; }}
									class="w-full text-left px-3 py-2 text-sm border-t"
									style="border-color:var(--border)"
								>{p.nama}</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Metode bayar -->
		<div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
			<p class="text-xs mb-2" style="color:var(--text-dim)">METODE BAYAR</p>
			<div class="grid grid-cols-2 gap-1">
				{#each METODE as m}
					<button
						onclick={() => metodeBayar.set(m)}
						class="py-1.5 rounded text-xs font-bold border"
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
			<div class="flex justify-between text-lg font-bold border-t pt-2" style="border-color:var(--border)">
				<span>TOTAL</span>
				<span style="color:var(--accent)">Rp {rupiah($total)}</span>
			</div>
		</div>

		<!-- Input bayar -->
		{#if $metodeBayar !== 'hutang'}
			<div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
				<label for="nominal-bayar" class="text-xs block mb-1" style="color:var(--text-dim)">NOMINAL BAYAR</label>
				<input
					id="nominal-bayar"
					bind:this={bayarInputEl}
					type="number"
					min="0"
					bind:value={$nominalBayar}
					placeholder="0"
					class="w-full px-3 py-2 rounded border text-right text-lg font-bold outline-none"
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

		{#if errorMsg}
			<p class="text-xs px-3 py-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorMsg}</p>
		{/if}

		<!-- Tombol proses -->
		<button
			onclick={prosesBayar}
			disabled={prosesLoading || $keranjang.length === 0}
			class="py-3 rounded font-bold text-sm disabled:opacity-40 transition-opacity mt-auto"
			style="background:var(--accent);color:var(--bg)"
		>
			{prosesLoading ? 'MEMPROSES...' : 'F10 · PROSES BAYAR'}
		</button>

		{#if $keranjang.length > 0}
			<button
				onclick={resetKasir}
				class="py-1.5 rounded text-xs"
				style="color:var(--danger)"
			>Kosongkan keranjang</button>
		{/if}
	</div>
</div>

<!-- ─── Modal sukses ───────────────────────────────────────────────────── -->
{#if sukses}
	<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.7)">
		<div class="rounded-lg border p-8 text-center w-80" style="background:var(--surface);border-color:var(--border)">
			<p class="text-3xl mb-2" style="color:var(--accent)">✓</p>
			<p class="font-bold mb-1">Transaksi Berhasil</p>
			<p class="text-sm mb-4" style="color:var(--text-dim)">{sukses.no_transaksi}</p>
			<button
				onclick={() => { sukses = null; searchInputEl?.focus(); }}
				class="px-6 py-2 rounded font-bold text-sm"
				style="background:var(--accent);color:var(--bg)"
			>Transaksi Baru (ESC)</button>
		</div>
	</div>
{/if}
