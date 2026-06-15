<script lang="ts">
	import { onMount } from 'svelte';
	import JsBarcode from 'jsbarcode';
	import { api } from '$lib/utils/api.js';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import { debounce } from '$lib/utils/async.js';
	import { rupiah } from '$lib/utils/format'
	import Button from '$lib/components/ui/Button.svelte';

	const kolBarang: Column[] = [
		{ key: 'pilih',            label: '',       width: 24,  sortable: false, hideable: false },
		{ key: 'nama_barang',      label: 'Nama',   minWidth: 80, sortable: false, hideable: false },
		{ key: 'harga_jual_eceran', label: 'Harga', width: 80,  sortable: false, hideable: false, align: 'right' },
	];

	let pageBarang = $state(1);
	let pageSizeBarang = $state(25);

	type Barang = {
		id: number;
		kode_barang: string;
		nama_barang: string;
		harga_jual_eceran: number;
		harga_jual_grosir: number;
		nama_satuan: string | null;
		singkatan_satuan: string | null;
		nama_kategori: string | null;
	};

	type ItemLabel = { barang: Barang; qty: number };

	let barangList = $state<Barang[]>([]);
	let query = $state('');
	let loading = $state(false);

	let antrian = $state<Map<number, ItemLabel>>(new Map());
	let ukuran = $state<'58' | '80' | 'a6'>('58');
	let tampilHargaEceran = $state(true);
	let tampilHargaGrosir = $state(false);
	let tampilNamaSatuan = $state(true);

	const UKURAN = {
		'58': { w: 219, h: 96, bw: 1.5, bh: 38, fs: 8,  fsh: 9,  pad: 4, label: '58mm (thermal kecil)' },
		'80': { w: 302, h: 120, bw: 2,   bh: 52, fs: 10, fsh: 11, pad: 6, label: '80mm (thermal sedang)' },
		a6:   { w: 397, h: 265, bw: 2.5, bh: 72, fs: 13, fsh: 15, pad: 8, label: 'A6 (printer biasa)' },
	};

	// Buat SVG barcode sebagai string HTML — tidak perlu bind:this
	function barcodeSvg(kode: string): string {
		const d = UKURAN[ukuran];
		try {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			JsBarcode(svg, kode, {
				format: 'CODE128',
				width: d.bw,
				height: d.bh,
				displayValue: true,
				fontSize: d.fs,
				margin: 0,
				background: '#ffffff',
				lineColor: '#000000',
				textMargin: 2,
			});
			return svg.outerHTML;
		} catch {
			return '<svg></svg>';
		}
	}

	// Re-compute SVG setiap kali ukuran atau antrian berubah
	const svgCache = $derived.by(() => {
		const cache: Record<number, string> = {};
		for (const [id, item] of antrian) {
			cache[id] = barcodeSvg(item.barang.kode_barang);
		}
		return cache;
	});

	async function muatBarang() {
		loading = true;
		const r = await api.get<Barang[]>(`/barang?q=${query}`);
		if (r.success) barangList = r.data;
		loading = false;
	}

	function togglePilih(b: Barang) {
		const next = new Map(antrian);
		if (next.has(b.id)) next.delete(b.id);
		else next.set(b.id, { barang: b, qty: 1 });
		antrian = next;
	}

	function ubahQty(id: number, delta: number) {
		const next = new Map(antrian);
		const item = next.get(id);
		if (!item) return;
		next.set(id, { ...item, qty: Math.max(1, Math.min(99, item.qty + delta)) });
		antrian = next;
	}

	function inputQty(id: number, val: string) {
		const next = new Map(antrian);
		const item = next.get(id);
		if (!item) return;
		next.set(id, { ...item, qty: Math.max(1, Math.min(99, parseInt(val) || 1)) });
		antrian = next;
	}

	function bersihkan() { antrian = new Map(); }

	function buatLabelHtml(item: ItemLabel, d: typeof UKURAN[keyof typeof UKURAN]): string {
		const svgStr = barcodeSvg(item.barang.kode_barang);
		const hargaEceranHtml = tampilHargaEceran
			? `<div style="font-size:${d.fsh}px;font-weight:700">
					${rupiah(item.barang.harga_jual_eceran)}
					${tampilNamaSatuan && item.barang.singkatan_satuan ? `<span style="font-size:0.8em;font-weight:400">/${item.barang.singkatan_satuan}</span>` : ''}
				</div>`
			: '';
		const hargaGrosirHtml = tampilHargaGrosir
			? `<div style="font-size:${d.fs - 1}px;color:#555">Grosir: ${rupiah(item.barang.harga_jual_grosir)}</div>`
			: '';
		return `
			<div style="
				width:${d.w}px;height:${d.h}px;
				border:1px solid #ccc;
				display:flex;flex-direction:column;
				align-items:center;justify-content:space-between;
				overflow:hidden;box-sizing:border-box;
				padding:${d.pad}px;
				font-family:'Courier New',monospace;
				background:#fff;color:#000;
				break-inside:avoid;page-break-inside:avoid;
			">
				<div style="font-size:${d.fs}px;font-weight:700;text-align:center;line-height:1.3;word-break:break-word;width:100%;max-height:${d.fs * 2.6}px;overflow:hidden">
					${item.barang.nama_barang}
				</div>
				<div style="flex-shrink:0">${svgStr}</div>
				<div style="text-align:center;width:100%">
					${hargaEceranHtml}
					${hargaGrosirHtml}
				</div>
			</div>`;
	}

	function cetak() {
		if (antrian.size === 0) return;
		const d = UKURAN[ukuran];
		let labelsHtml = '';
		for (const item of antrian.values()) {
			for (let i = 0; i < item.qty; i++) {
				labelsHtml += buatLabelHtml(item, d);
			}
		}
		const win = window.open('', '_blank', 'width=900,height=700');
		if (!win) return;
		win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Cetak Label</title>
<style>
  body { margin:0; padding:4mm; }
  .wrap { display:flex; flex-wrap:wrap; gap:2mm; }
  @page { margin:5mm; }
  @media print { body { margin:0; } }
</style>
</head>
<body>
<div class="wrap">${labelsHtml}</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
		win.document.close();
	}

	const onQueryInput = debounce(muatBarang, 150);

	onMount(() => {
		muatBarang();
		return () => onQueryInput.cancel();
	});

	const antrianItems = $derived([...antrian.values()]);
	const totalLabel = $derived(antrianItems.reduce((s, i) => s + i.qty, 0));

	let pagedBarang = $derived(
		pageSizeBarang === 0
			? barangList
			: barangList.slice((pageBarang - 1) * pageSizeBarang, pageBarang * pageSizeBarang)
	);
</script>

<div class="flex flex-col gap-3 lg:flex-row" style="min-height:64vh">

	<!-- Panel kiri: Pilih Barang -->
	<div class="flex flex-col gap-2 lg:w-[300px] lg:shrink-0">
		<div class="text-xs font-bold" style="color:var(--text-dim)">PILIH BARANG</div>

		<div class="relative">
			<input
				type="text"
				bind:value={query}
				oninput={onQueryInput}
				placeholder="> cari barang..."
				class="w-full px-3 py-1.5 text-xs rounded border outline-none font-mono"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
			{#if loading}
				<span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style="color:var(--text-dim)">⟳</span>
			{/if}
		</div>

		<DataTable
			columns={kolBarang}
			bind:currentPage={pageBarang}
			bind:pageSize={pageSizeBarang}
			totalRows={barangList.length}
			rowCount={pagedBarang.length}
			emptyText="Tidak ada barang"
			maxRows={12}
		>
			{#snippet body(_hidden)}
				{#each pagedBarang as b (b.id)}
					{@const dipilih = antrian.has(b.id)}
					<tr
						onclick={() => togglePilih(b)}
						class="border-t cursor-pointer"
						style="border-color:var(--border);background:{dipilih ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent'}"
					>
						<td class="px-2 py-2 text-xs" style="color:{dipilih ? 'var(--accent)' : 'var(--text-dim)'}">
							{dipilih ? '☑' : '☐'}
						</td>
						<td class="px-2 py-2">
							<div class="font-mono text-xs truncate" style="color:var(--text)">{b.nama_barang}</div>
							<div class="font-mono" style="color:var(--text-dim);font-size:10px">{b.kode_barang}</div>
						</td>
						<td class="px-2 py-2 text-right font-mono text-xs" style="color:{dipilih ? 'var(--accent)' : 'var(--text-dim)'}">
							{rupiah(b.harga_jual_eceran)}
						</td>
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	</div>

	<!-- Panel tengah: Antrian + Pengaturan -->
	<div class="flex flex-col gap-3 lg:w-[210px] lg:shrink-0">

		<div class="text-xs font-bold" style="color:var(--text-dim)">
			ANTRIAN
			{#if totalLabel > 0}
				<span style="color:var(--accent)">({totalLabel} label)</span>
			{/if}
		</div>

		<div class="overflow-y-auto rounded border" style="border-color:var(--border);max-height:220px">
			{#each antrianItems as item (item.barang.id)}
				<div class="flex items-center gap-1 px-2 py-1.5 border-b text-xs" style="border-color:var(--border)">
					<div class="flex-1 min-w-0 font-mono truncate" style="color:var(--text)">{item.barang.nama_barang}</div>
					<Button variant="dim" size="xs" onclick={() => ubahQty(item.barang.id, -1)}>−</Button>
					<input
						type="number" min="1" max="99"
						value={item.qty}
						oninput={(e) => inputQty(item.barang.id, (e.target as HTMLInputElement).value)}
						class="w-9 text-center rounded border outline-none text-xs font-mono"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					<Button variant="dim" size="xs" onclick={() => ubahQty(item.barang.id, 1)}>+</Button>
					<Button variant="danger" size="xs" onclick={() => togglePilih(item.barang)}>×</Button>
				</div>
			{:else}
				<div class="p-3 text-center text-xs" style="color:var(--text-dim)">Pilih barang dulu</div>
			{/each}
		</div>

		<!-- Pengaturan -->
		<div class="text-xs font-bold" style="color:var(--text-dim)">PENGATURAN</div>
		<div class="p-3 rounded border flex flex-col gap-2" style="border-color:var(--border);background:var(--surface)">
			<div>
				<div class="text-xs mb-1" style="color:var(--text-dim)">Ukuran label</div>
				{#each Object.entries(UKURAN) as [key, val] (key)}
					<label class="flex items-center gap-2 cursor-pointer py-0.5">
						<input type="radio" bind:group={ukuran} value={key} style="accent-color:var(--accent)" />
						<span class="text-xs" style="color:var(--text)">{val.label}</span>
					</label>
				{/each}
			</div>
			<div>
				<div class="text-xs mb-1" style="color:var(--text-dim)">Tampilkan</div>
				<label class="flex items-center gap-2 cursor-pointer py-0.5">
					<input type="checkbox" bind:checked={tampilHargaEceran} style="accent-color:var(--accent)" />
					<span class="text-xs" style="color:var(--text)">Harga eceran</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer py-0.5">
					<input type="checkbox" bind:checked={tampilHargaGrosir} style="accent-color:var(--accent)" />
					<span class="text-xs" style="color:var(--text)">Harga grosir</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer py-0.5">
					<input type="checkbox" bind:checked={tampilNamaSatuan} style="accent-color:var(--accent)" />
					<span class="text-xs" style="color:var(--text)">Satuan</span>
				</label>
			</div>
		</div>

		<!-- Tombol -->
		<div class="flex flex-col gap-2 mt-auto pt-2">
			<Button onclick={cetak} disabled={antrian.size === 0} size="sm">
				{antrian.size > 0 ? `CETAK ${totalLabel} LABEL` : 'CETAK'}
			</Button>
			{#if antrian.size > 0}
				<Button variant="danger" size="xs" onclick={bersihkan}>Bersihkan antrian</Button>
			{/if}
		</div>
	</div>

	<!-- Panel kanan: Preview -->
	<div class="flex-1 flex flex-col gap-2 overflow-hidden">
		<div class="text-xs font-bold" style="color:var(--text-dim)">PREVIEW LABEL</div>

		<div
			class="overflow-auto flex-1 rounded border p-3"
			style="border-color:var(--border);background:var(--surface)"
		>
			{#if antrian.size === 0}
				<div class="flex items-center justify-center h-full" style="color:var(--text-dim)">
					<div class="text-center text-xs">
						<div class="text-2xl mb-2">⬡</div>
						Pilih barang dari daftar kiri,<br>lalu atur jumlah label yang dibutuhkan.
					</div>
				</div>
			{:else}
				<div class="flex flex-wrap gap-3">
					{#each antrianItems as item (item.barang.id)}
						{@const d = UKURAN[ukuran]}
						<!-- Satu preview per barang -->
						<div class="flex flex-col items-center gap-1">
							<div
								class="rounded border flex flex-col items-center justify-between overflow-hidden flex-shrink-0"
								style="
									width:{d.w}px;height:{d.h}px;
									border-color:#aaa;
									background:#fff;color:#000;
									padding:{d.pad}px;
									font-family:'Courier New',monospace;
									box-sizing:border-box;
								"
							>
								<div style="font-size:{d.fs}px;font-weight:700;text-align:center;line-height:1.3;word-break:break-word;width:100%;max-height:{d.fs * 2.6}px;overflow:hidden">
									{item.barang.nama_barang}
								</div>
								<div style="flex-shrink:0">
									{@html svgCache[item.barang.id] ?? ''}
								</div>
								<div style="text-align:center;width:100%">
									{#if tampilHargaEceran}
										<div style="font-size:{d.fsh}px;font-weight:700">
											{rupiah(item.barang.harga_jual_eceran)}{tampilNamaSatuan && item.barang.singkatan_satuan ? `/${item.barang.singkatan_satuan}` : ''}
										</div>
									{/if}
									{#if tampilHargaGrosir}
										<div style="font-size:{d.fs - 1}px;color:#555">
											Grosir: {rupiah(item.barang.harga_jual_grosir)}
										</div>
									{/if}
								</div>
							</div>
							<div class="text-xs" style="color:var(--text-dim)">
								× {item.qty} label
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if antrian.size > 0}
			<div class="text-xs" style="color:var(--text-dim)">
				Preview menampilkan 1 template per barang. Klik <strong>CETAK</strong> untuk membuka dialog print dengan semua {totalLabel} label.
			</div>
		{/if}
	</div>
</div>
