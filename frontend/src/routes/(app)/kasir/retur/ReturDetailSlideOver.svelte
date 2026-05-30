<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte'
	import type { ReturDetail } from './retur.types.js'

	let {
		open = $bindable(false),
		data,
		loading,
	}: {
		open?: boolean
		data: ReturDetail | null
		loading: boolean
	} = $props()

	function fmt(n: number) {
		return n.toLocaleString('id-ID')
	}

	function fmtTgl(s: string) {
		return new Date(s).toLocaleDateString('id-ID', {
			day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
		})
	}

	const labelMetode: Record<string, string> = {
		tunai: 'Refund Tunai',
		kurang_piutang: 'Kurangi Piutang',
		tukar_barang: 'Tukar Barang',
	}
</script>

<SlideOver bind:open title="Detail Retur">
	{#snippet children()}
		{#if loading}
			<p class="py-8 text-center text-sm" style="color:var(--text-dim)">Memuat...</p>
		{:else if data}
			<div class="space-y-3 text-xs">
				<div class="grid grid-cols-2 gap-x-4 gap-y-1 rounded border p-3"
					style="background:var(--surface2);border-color:var(--border)">
					<span style="color:var(--text-dim)">No Retur</span>
					<span class="font-mono font-bold" style="color:var(--accent)">{data.no_retur}</span>
					<span style="color:var(--text-dim)">Transaksi Asal</span>
					<span class="font-mono" style="color:var(--text)">{data.no_transaksi ?? '-'}</span>
					<span style="color:var(--text-dim)">Tanggal</span>
					<span style="color:var(--text)">{fmtTgl(data.tanggal)}</span>
					<span style="color:var(--text-dim)">Kasir</span>
					<span style="color:var(--text)">{data.kasir_nama ?? '-'}</span>
					<span style="color:var(--text-dim)">Metode Refund</span>
					<span style="color:var(--text)">{labelMetode[data.metode_refund] ?? data.metode_refund}</span>
					<span style="color:var(--text-dim)">Alasan</span>
					<span style="color:var(--text)">{data.alasan ?? '-'}</span>
					{#if data.catatan}
						<span style="color:var(--text-dim)">Catatan</span>
						<span style="color:var(--text)">{data.catatan}</span>
					{/if}
				</div>

				<!-- Item diretur -->
				<div class="rounded border" style="border-color:var(--border)">
					<table class="w-full">
						<thead>
							<tr class="border-b" style="border-color:var(--border)">
								<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Barang</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Qty</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Harga</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Subtotal</th>
							</tr>
						</thead>
						<tbody>
							{#each data.items as item (item.barang_id)}
								<tr class="border-b" style="border-color:var(--border)">
									<td class="px-3 py-2" style="color:var(--text)">
										<div class="font-bold">{item.nama_barang}</div>
										<div style="color:var(--text-dim)">{item.kode_barang}</div>
									</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text)">{item.jumlah_retur}</td>
									<td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">Rp {fmt(item.harga_jual)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--danger)">Rp {fmt(item.subtotal)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr>
								<td colspan="3" class="px-3 py-2 text-right font-bold text-xs" style="color:var(--text)">Total Retur</td>
								<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--danger)">
									-Rp {fmt(data.total_retur)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>

				<!-- Barang pengganti (tukar_barang) -->
				{#if data.tukar_items?.length > 0}
					<div>
						<p class="text-xs font-bold mb-1.5" style="color:var(--warn)">Barang Pengganti</p>
						<div class="rounded border" style="border-color:var(--border)">
							<table class="w-full">
								<thead>
									<tr class="border-b" style="border-color:var(--border)">
										<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Barang</th>
										<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Qty</th>
										<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Harga</th>
										<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Subtotal</th>
									</tr>
								</thead>
								<tbody>
									{#each data.tukar_items as ti (ti.barang_id)}
										<tr class="border-b" style="border-color:var(--border)">
											<td class="px-3 py-2" style="color:var(--text)">
												<div class="font-bold">{ti.nama_barang}</div>
												<div style="color:var(--text-dim)">{ti.kode_barang}</div>
											</td>
											<td class="px-3 py-2 text-right font-mono" style="color:var(--text)">{ti.jumlah}</td>
											<td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">Rp {fmt(ti.harga_jual)}</td>
											<td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--accent)">Rp {fmt(ti.subtotal)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/snippet}
</SlideOver>
