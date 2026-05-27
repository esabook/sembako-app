<script lang="ts">
	import type { StrukData } from '$lib/utils/struk'
	import { formatWaktuStruk, METODE_LABEL_STRUK } from '$lib/utils/struk'

	type Props = { data: StrukData; width?: string }
	let { data, width }: Props = $props()

	const totalQty  = $derived(data.items.reduce((s, i) => s + i.qty, 0))
	const waktuStr  = $derived(formatWaktuStruk(data.waktu))
	const DASH      = $derived(data.ukuran === '58'
		? '--------------------------------'
		: '------------------------------------------')

	function rp(n: number) {
		return new Intl.NumberFormat('id-ID').format(Math.round(n))
	}
</script>

<!--
  Render visual thermal receipt. Styling menggunakan inline style agar
  konsisten dengan HTML string yang dicetak ke popup print window.
-->
<div
	class="inline-block rounded border p-4 text-left"
	style="
		background:#fff;
		border-color:#ccc;
		color:#000;
		font-family:'Courier New',Courier,monospace;
		font-size:{data.ukuran === '58' ? '8.5pt' : '9.5pt'};
		width:{width ?? (data.ukuran === '58' ? '200px' : '260px')};
		box-shadow:0 2px 8px rgba(0,0,0,.15);
	"
>
	<!-- 1. Header: nama toko + alamat + struk_header + no. transaksi ───────── -->
	<div style="text-align:center;font-weight:bold;font-size:1.1em;margin-bottom:2px">{data.namaToko}</div>

	{#if data.alamat}
		<div style="text-align:center;font-size:0.85em;color:#555;margin-bottom:2px">{data.alamat}</div>
	{/if}

	{#if data.header}
		{#each data.header.split('\n') as baris, i (i)}
			<div style="text-align:center;font-size:0.85em">{baris}</div>
		{/each}
	{/if}

	{#if data.noTransaksi}
		<div style="text-align:center;font-size:0.8em;color:#666;margin-top:2px">{data.noTransaksi}</div>
	{/if}

	<!-- 2. Dash ──────────────────────────────────────────────────────────── -->
	<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

	<!-- 3. Tanggal, kasir, pelanggan ───────────────────────────────────── -->
	<div style="font-size:0.85em">Tgl : {waktuStr}</div>
	{#if data.kasirNama}
		<div style="font-size:0.85em">Ksr : {data.kasirNama}</div>
	{/if}
	{#if data.pelangganNama}
		<div style="font-size:0.85em">Pelanggan: <strong>{data.pelangganNama}</strong></div>
	{/if}

	<!-- 4. Dash ──────────────────────────────────────────────────────────── -->
	<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

	<!-- 5. Barang ──────────────────────────────────────────────────────── -->
	{#each data.items as item (item.nama)}
		<div style="display:flex;justify-content:space-between;">
		<span>{item.nama.slice(0, 20)}</span>
		<span>{item.qty}</span>
		<span>{rp(item.harga)}</span>
		<span>{rp(item.qty * item.harga - item.diskon_item)}</span>
		</div>
	{/each}

	<!-- 6. Dash ──────────────────────────────────────────────────────────── -->
	<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>

	<!-- 7. Ringkasan ───────────────────────────────────────────────────── -->
	<div style="display:flex;justify-content:space-between;font-size:0.88em">
		<span>Total Qty</span><span>{totalQty}</span>
	</div>
	<div style="display:flex;justify-content:space-between;font-size:0.88em">
		<span>Subtotal</span><span>{rp(data.subtotalKotor)}</span>
	</div>

	{#if data.diskonItem > 0}
		<div style="display:flex;justify-content:space-between;font-size:0.88em;">
			<span>Diskon item</span><span>&minus;{rp(data.diskonItem)}</span>
		</div>
	{/if}

	{#if data.diskonLain > 0}
		<div style="display:flex;justify-content:space-between;font-size:0.88em;">
			<span>Diskon</span><span>&minus;{rp(data.diskonLain)}</span>
		</div>
	{/if}

	{#if data.ppn > 0}
		<div style="display:flex;justify-content:space-between;font-size:0.88em">
			<span>PPN 10%</span><span>{rp(data.ppn)}</span>
		</div>
	{/if}

	<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.1em;margin-top:2px">
		<span>TOTAL</span><span>Rp {rp(data.total)}</span>
	</div>

	<div style="display:flex;justify-content:space-between;font-size:0.88em;margin-top:2px">
		<span>{METODE_LABEL_STRUK[data.metode] ?? data.metode}</span>
		<span>{rp(data.nominal)}</span>
	</div>

	<div style="display:flex;justify-content:space-between;font-size:0.88em">
		<span>Kembali</span><span>{rp(data.kembali)}</span>
	</div>

	{#if data.metode === 'hutang'}
		<div style="text-align:center;font-weight:bold;font-size:0.85em;margin-top:3px">[ TRANSAKSI HUTANG ]</div>
	{/if}

	<!-- 8. Footer ──────────────────────────────────────────────────────── -->
	{#if data.footer}
		<div style="margin:4px 0;white-space:pre;overflow:hidden">{DASH}</div>
		{#each data.footer.split('\n') as baris, i (i)}
			<div style="text-align:center;font-size:0.85em">{baris}</div>
		{/each}
	{/if}
</div>
