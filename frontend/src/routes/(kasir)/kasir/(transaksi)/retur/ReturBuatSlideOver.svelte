<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import Select from '$lib/components/ui/Select.svelte'
	import { fmt, fmtTgl, hitungHargaNet } from './retur.logic.js'
	import type { createReturStore } from './retur.store.svelte.js'

	let { s }: { s: ReturnType<typeof createReturStore> } = $props()
</script>

<SlideOver bind:open={s.modalBuat} title="Buat Retur Penjualan">
	{#snippet children()}
		<div class="flex flex-col gap-4">
			<!-- Step indicator -->
			<div class="mb-4 flex flex-wrap gap-x-2 gap-y-1 text-xs">
				{#each [['1', 'Cari Transaksi'], ['2', 'Pilih Item'], ['3', 'Konfirmasi']] as [n, label] (n)}
					<div class="flex items-center gap-1">
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
							style={Number(n) <= s.step
								? 'background:var(--accent);color:var(--bg)'
								: 'background:var(--surface2);color:var(--text-dim)'}
						>
							{n}
						</span>
						<span style={Number(n) === s.step ? 'color:var(--text)' : 'color:var(--text-dim)'}>{label}</span>
						{#if Number(n) < 3}<span style="color:var(--border)">→</span>{/if}
					</div>
				{/each}
			</div>

			<!-- Step 1: Cari transaksi -->
			{#if s.step === 1}
				<div class="space-y-3">
					<p class="text-xs" style="color:var(--text-dim)">
						Masukkan nomor transaksi asal (format: TRX-YYYYMMDD-XXXXX)
					</p>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={s.cariNo}
							placeholder="TRX-20250517-12345"
							onkeydown={(e) => e.key === 'Enter' && s.cariTransaksi()}
							class="flex-1 rounded border px-3 py-2 font-mono text-sm"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
						<Button variant="primary" size="sm" loading={s.loadingCari} onclick={s.cariTransaksi}>
							Cari
						</Button>
					</div>

					{#if s.errorCari}
						<p class="text-xs" style="color:var(--danger)">{s.errorCari}</p>
					{/if}

					{#if s.trxAsal}
						<div
							class="space-y-1 rounded border p-3 text-xs"
							style="background:var(--surface2);border-color:var(--border)"
						>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">No Transaksi</span>
								<span class="font-mono font-bold" style="color:var(--accent)">{s.trxAsal.no_transaksi}</span>
							</div>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">Tanggal</span>
								<span style="color:var(--text)">{fmtTgl(s.trxAsal.tanggal)}</span>
							</div>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">Total</span>
								<span class="font-bold" style="color:var(--text)">Rp {fmt(s.trxAsal.total)}</span>
							</div>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">Metode Bayar</span>
								<span style="color:var(--text)">{s.trxAsal.metode_bayar}</span>
							</div>
							<div class="flex justify-between">
								<span style="color:var(--text-dim)">Jumlah Item</span>
								<span style="color:var(--text)">{s.trxAsal.items.length} item</span>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 2: Pilih item -->
			{#if s.step === 2}
				<div class="space-y-3">
					<p class="text-xs" style="color:var(--text-dim)">
						Centang item yang diretur dan sesuaikan jumlahnya.
					</p>
					<div class="max-h-72 space-y-2 overflow-y-auto">
						{#each s.itemsRetur as item, idx (item.barang_id)}
							{@const sisaEntry = s.sisaMap.get(item.barang_id)}
							{@const sisaQty = sisaEntry ? sisaEntry.sisa : item.jumlah}
							{@const sudahDiretur = sisaEntry ? sisaEntry.sudah_diretur : 0}
							{@const sudahSemua = sisaQty <= 0}
							<label
								class="flex cursor-pointer items-start gap-3 rounded border p-2.5 transition-colors"
								style={sudahSemua
									? 'border-color:var(--border);background:var(--surface2);opacity:0.5;cursor:not-allowed'
									: item.dipilih
										? 'border-color:var(--accent);background:rgba(0,230,118,0.05)'
										: 'border-color:var(--border);background:var(--surface2)'}
							>
								<input
									type="checkbox"
									bind:checked={s.itemsRetur[idx].dipilih}
									disabled={sudahSemua}
									onchange={() => s.onItemCheck(idx)}
									class="mt-0.5"
									style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
								/>
								<div class="min-w-0 flex-1">
									<div class="truncate text-xs font-bold" style="color:var(--text)">
										{item.nama_barang}
									</div>
									<div class="text-[10px]" style="color:var(--text-dim)">
										{item.kode_barang} · Harga: Rp {fmt(item.harga_jual)}
										{#if item.diskon_item > 0}
											<span style="color:var(--warn)"> (-Rp {fmt(item.diskon_item)})</span>
										{/if}
										· Dibeli: {sisaEntry ? sisaEntry.jumlah_asal : item.jumlah}
									</div>
									{#if sudahDiretur > 0}
										<div class="mt-0.5 flex items-center gap-1">
											{#if sudahSemua}
												<span
													class="rounded px-1.5 py-0.5 text-[10px] font-bold"
													style="background:rgba(255,68,68,0.12);color:var(--danger)"
												>
													Sudah diretur semua ({sudahDiretur})
												</span>
											{:else}
												<span
													class="rounded px-1.5 py-0.5 text-[10px] font-bold"
													style="background:rgba(255,179,0,0.12);color:var(--warn)"
												>
													Sudah diretur {sudahDiretur} · Sisa {sisaQty}
												</span>
											{/if}
										</div>
									{/if}
								</div>
								{#if item.dipilih && !sudahSemua}
									<div class="flex items-center gap-1">
										<span class="text-[10px]" style="color:var(--text-dim)">Qty:</span>
										<input
											type="number"
											min="1"
											max={sisaQty}
											bind:value={s.itemsRetur[idx].jumlah_retur}
											onclick={(e) => e.stopPropagation()}
											placeholder="1"
											class="input input-bordered w-16 text-center font-mono text-xs"
										/>
										<span class="text-[10px]" style="color:var(--text-dim)">/ {sisaQty}</span>
									</div>
								{/if}
							</label>
						{/each}
					</div>

					{#if s.itemsDipilih.length > 0}
						<div
							class="flex justify-between rounded border px-3 py-2 text-xs font-bold"
							style="border-color:var(--accent);background:rgba(0,230,118,0.06);color:var(--accent)"
						>
							<span>{s.itemsDipilih.length} item dipilih</span>
							<span>Total: Rp {fmt(s.totalRetur)}</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 3: Konfirmasi -->
			{#if s.step === 3}
				<div class="space-y-3 text-sm">
					<!-- Ringkasan item -->
					<div
						class="space-y-1 rounded border p-3 text-xs"
						style="background:var(--surface2);border-color:var(--border)"
					>
						<p class="mb-1.5 font-bold" style="color:var(--text)">Item yang diretur:</p>
						{#each s.itemsDipilih as i (i.barang_id)}
							<div class="flex justify-between">
								<span style="color:var(--text)">{i.nama_barang} × {i.jumlah_retur}</span>
								<span class="font-mono" style="color:var(--text-dim)">
									Rp {fmt(hitungHargaNet(i) * i.jumlah_retur)}
								</span>
							</div>
						{/each}
						<div
							class="mt-2 flex justify-between border-t pt-2 font-bold"
							style="border-color:var(--border)"
						>
							<span style="color:var(--text)">Total Retur</span>
							<span style="color:var(--danger)">-Rp {fmt(s.totalRetur)}</span>
						</div>
					</div>

					<!-- Alasan -->
					<div>
						<label for="alasan" class="mb-1 block text-xs" style="color:var(--text-dim)">Alasan Retur</label>
						<input
							id="alasan"
							type="text"
							bind:value={s.alasan}
							placeholder="Barang rusak, salah item, dll"
							class="w-full rounded border px-3 py-2 text-xs"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
					</div>

					<!-- Metode Refund -->
					<div>
						<p class="mb-1 block text-xs" style="color:var(--text-dim)">Metode Refund</p>
						<div class="flex gap-2">
							{#each [['tunai', 'Refund Tunai'], ['kurang_piutang', 'Kurangi Piutang'], ['tukar_barang', 'Tukar Barang']] as [val, label] (val)}
								<label
									class="flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs"
									style={s.metodeRefund === val
										? 'border-color:var(--accent);background:rgba(0,230,118,0.08);color:var(--text)'
										: 'border-color:var(--border);color:var(--text-dim)'}
								>
									<input
										type="radio"
										bind:group={s.metodeRefund}
										value={val}
										disabled={val === 'kurang_piutang' && s.trxAsal?.metode_bayar !== 'hutang'}
									/>
									{label}
								</label>
							{/each}
						</div>
						{#if s.metodeRefund === 'kurang_piutang' && s.trxAsal?.metode_bayar !== 'hutang'}
							<p class="mt-1 text-[10px]" style="color:var(--warn)">
								Kurangi piutang hanya tersedia untuk transaksi hutang.
							</p>
						{/if}
					</div>

					<!-- Pilih Kas/Bank (jika tunai) -->
					{#if s.metodeRefund === 'tunai'}
						<div>
							<Select
								id="kas-bank"
								label="Akun Kas / Bank"
								bind:value={s.kasBankId}
								options={s.kasBankList.map((kb) => ({
									value: kb.id,
									label: `${kb.nama} (${kb.tipe})`,
								}))}
							/>
						</div>
					{/if}

					<!-- Barang Pengganti (hanya untuk tukar_barang) -->
					{#if s.metodeRefund === 'tukar_barang'}
						<div
							class="space-y-2 rounded border p-3"
							style="border-color:var(--warn);background:rgba(255,179,0,0.04)"
						>
							<p class="text-xs font-bold" style="color:var(--warn)">Barang Pengganti</p>
							<p class="text-[10px]" style="color:var(--text-dim)">
								Cari dan tambahkan barang yang diberikan sebagai pengganti. Bisa dikosongkan jika
								barang pengganti belum ditentukan.
							</p>

							<div class="flex gap-2">
								<input
									type="text"
									bind:value={s.cariTukar}
									placeholder="Nama atau kode barang pengganti..."
									onkeydown={(e) => e.key === 'Enter' && s.cariBarangTukar()}
									class="flex-1 rounded border px-2 py-1.5 text-xs"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
								/>
								<Button variant="ghost" size="sm" loading={s.loadingTukar} onclick={s.cariBarangTukar}>
									Cari
								</Button>
							</div>

							{#if s.showHasilTukar && s.hasilCariTukar.length > 0}
								<div class="overflow-hidden rounded border" style="border-color:var(--border)">
									{#each s.hasilCariTukar as br (br.id)}
										<button
											onclick={() => s.tambahItemTukar(br)}
											class="flex w-full items-center justify-between border-b px-3 py-2 text-xs transition-colors last:border-0 hover:bg-[var(--surface2)]"
											style="border-color:var(--border);color:var(--text)"
										>
											<span>
												<span class="font-bold">{br.nama_barang}</span>
												<span class="ml-1" style="color:var(--text-dim)">{br.kode_barang}</span>
											</span>
											<span class="font-mono" style="color:var(--accent)">Rp {fmt(br.harga_jual_eceran)}</span>
										</button>
									{/each}
								</div>
							{:else if s.showHasilTukar}
								<p class="text-[10px]" style="color:var(--text-dim)">Barang tidak ditemukan.</p>
							{/if}

							{#if s.tukarItems.length > 0}
								<div class="space-y-1.5">
									{#each s.tukarItems as ti, idx (ti.barang_id)}
										<div
											class="flex items-center gap-2 rounded border px-2.5 py-2 text-xs"
											style="border-color:var(--border);background:var(--surface2)"
										>
											<div class="min-w-0 flex-1">
												<span class="truncate font-bold" style="color:var(--text)">{ti.nama_barang}</span>
											</div>
											<div class="flex shrink-0 items-center gap-1">
												<span class="text-[10px]" style="color:var(--text-dim)">Qty:</span>
												<input
													type="number"
													min="1"
													bind:value={s.tukarItems[idx].jumlah}
													placeholder="1"
													class="input input-bordered w-12 text-center font-mono text-xs"
												/>
												<span class="text-[10px]" style="color:var(--text-dim)">× Rp</span>
												<input
													type="number"
													min="0"
													bind:value={s.tukarItems[idx].harga_jual}
													placeholder="0"
													class="input input-bordered w-20 font-mono text-xs"
												/>
											</div>
											<button
												onclick={() => s.hapusItemTukar(idx)}
												class="rounded px-1.5 py-0.5 text-[10px] font-bold"
												style="color:var(--danger);background:rgba(255,68,68,0.1)"
											>
												✕
											</button>
										</div>
									{/each}
								</div>

								<div class="grid grid-cols-2 gap-2 text-xs">
									<div
										class="rounded border px-2.5 py-2 text-center"
										style="border-color:var(--border);background:var(--surface2)"
									>
										<div style="color:var(--text-dim)">Nilai Retur</div>
										<div class="font-mono font-bold" style="color:var(--danger)">
											Rp {fmt(s.totalRetur)}
										</div>
									</div>
									<div
										class="rounded border px-2.5 py-2 text-center"
										style="border-color:var(--border);background:var(--surface2)"
									>
										<div style="color:var(--text-dim)">Nilai Pengganti</div>
										<div class="font-mono font-bold" style="color:var(--accent)">
											Rp {fmt(s.totalTukar)}
										</div>
									</div>
								</div>
								{#if s.totalRetur !== s.totalTukar}
									<p class="text-center text-[10px]" style="color:var(--warn)">
										{#if s.totalRetur > s.totalTukar}
											Selisih Rp {fmt(s.totalRetur - s.totalTukar)} — kembalikan ke pelanggan secara manual.
										{:else}
											Selisih Rp {fmt(s.totalTukar - s.totalRetur)} — pelanggan perlu membayar kekurangannya.
										{/if}
									</p>
								{/if}
							{/if}
						</div>
					{/if}

					<!-- Catatan -->
					<div>
						<label for="catatan" class="mb-1 block text-xs" style="color:var(--text-dim)">Catatan (opsional)</label>
						<textarea
							id="catatan"
							bind:value={s.catatan}
							rows="2"
							placeholder="Catatan tambahan..."
							class="w-full resize-none rounded border px-3 py-2 text-xs"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						></textarea>
					</div>

					{#if s.errorCari}
						<p class="text-xs" style="color:var(--danger)">{s.errorCari}</p>
					{/if}
				</div>
			{/if}

			<!-- Navigasi step (sticky bottom) -->
			<div
				class="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t px-4 py-3"
				style="border-color:var(--border);background:var(--surface)"
			>
				{#if s.step === 1}
					<Button variant="ghost" size="sm" onclick={s.tutupModalBuat}>Batal</Button>
					<Button variant="primary" size="sm" disabled={!s.trxAsal} onclick={s.lanjutStep2}>
						Lanjut →
					</Button>
				{:else if s.step === 2}
					<Button variant="ghost" size="sm" onclick={() => { s.step = 1 }}>← Kembali</Button>
					<Button
						variant="primary"
						size="sm"
						disabled={s.itemsDipilih.length === 0}
						onclick={s.lanjutStep3}
					>
						Lanjut →
					</Button>
				{:else if s.step === 3}
					<Button variant="ghost" size="sm" onclick={() => { s.step = 2 }}>← Kembali</Button>
					<Button variant="danger" size="sm" loading={s.saving} onclick={s.submitRetur}>
						Proses Retur
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</SlideOver>
