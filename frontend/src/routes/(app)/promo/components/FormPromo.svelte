<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import DatePicker from '$lib/components/ui/DatePicker2.svelte';
	import type { createPromoStore } from '../promo.store.svelte';

	let { store }: { store: ReturnType<typeof createPromoStore> } = $props();
</script>

<SlideOver bind:open={store.modalOpen} title={store.editPromo ? 'Edit Promo' : 'Buat Promo Baru'}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			store.simpan();
		}}
		class="flex flex-col gap-3 text-sm"
	>
		{#if store.error}
			<p class="rounded p-2 text-xs" style="background:var(--surface2);color:var(--danger)">
				{store.error}
			</p>
		{/if}

		<div class="grid grid-cols-2 gap-3">
			<div class="col-span-2 flex flex-col gap-1">
				<label for="pm-nama" class="text-xs" style="color:var(--text-dim)">NAMA PROMO *</label>
				<input
					id="pm-nama"
					bind:value={store.fb.nama}
					required
					placeholder="Nama promo"
					class="input input-bordered w-full text-sm"
				/>
			</div>

			<div class="col-span-2 flex flex-col gap-1">
				<label for="pm-desk" class="text-xs" style="color:var(--text-dim)">DESKRIPSI</label>
				<input
					id="pm-desk"
					bind:value={store.fb.deskripsi}
					placeholder="Opsional"
					class="input input-bordered w-full text-sm"
				/>
			</div>

			<div class="col-span-2 flex flex-col gap-1">
				<p class="text-xs" style="color:var(--text-dim)">TIPE PROMO</p>
				<div class="flex gap-1">
					{#each ['item', 'kategori', 'total'] as const as t (t)}
						<button
							type="button"
							onclick={() => (store.fb.tipe = t)}
							class="flex-1 rounded border px-2 py-1.5 text-xs font-bold transition-all"
							style={store.fb.tipe === t
								? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
								: 'border-color:var(--border);color:var(--text-dim)'}
						>
							{t === 'item' ? 'Barang' : t === 'kategori' ? 'Kategori' : 'Min. Total'}
						</button>
					{/each}
				</div>
				<p class="text-xs" style="color:var(--text-dim)">
					{store.fb.tipe === 'item'
						? 'Diskon untuk barang tertentu'
						: store.fb.tipe === 'kategori'
							? 'Diskon untuk semua barang dalam kategori'
							: 'Diskon jika total belanja mencapai jumlah tertentu'}
				</p>
			</div>

			<div class="col-span-2 flex flex-col gap-1">
				<p class="text-xs" style="color:var(--text-dim)">NILAI DISKON *</p>
				<div class="flex gap-1">
					<button
						type="button"
						onclick={() => (store.fb.tipe_nilai = 'persen')}
						class="rounded border px-2 py-1.5 text-xs"
						style={store.fb.tipe_nilai === 'persen'
							? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
							: 'border-color:var(--border);color:var(--text-dim)'}>%</button
					>
					<button
						type="button"
						onclick={() => (store.fb.tipe_nilai = 'rupiah')}
						class="rounded border px-2 py-1.5 text-xs"
						style={store.fb.tipe_nilai === 'rupiah'
							? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
							: 'border-color:var(--border);color:var(--text-dim)'}>Rp</button
					>
					<input
						type="number"
						min="0"
						bind:value={store.fb.nilai}
						placeholder={store.fb.tipe_nilai === 'persen' ? '0–100' : '0'}
						class="flex-1 rounded border px-2 py-1.5 text-right outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>

			{#if store.fb.tipe !== 'total'}
				<div class="flex flex-col gap-1">
					<label for="pm-minqty" class="text-xs" style="color:var(--text-dim)">MIN. QTY</label>
					<input
						id="pm-minqty"
						type="number"
						min="1"
						bind:value={store.fb.min_qty}
						placeholder="1"
						class="input input-bordered w-full text-sm"
					/>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<label for="pm-mintotal" class="text-xs" style="color:var(--text-dim)"
						>MIN. TOTAL (Rp)</label
					>
					<input
						id="pm-mintotal"
						type="number"
						min="0"
						step="1000"
						bind:value={store.fb.min_total}
						placeholder="0"
						class="input input-bordered w-full text-sm"
					/>
				</div>
			{/if}

			<DatePicker
				label="BERLAKU MULAI"
				bind:value={store.fb.berlaku_mulai}
				placeholder="Pilih tanggal mulai"
			/>
			<DatePicker
				label="BERLAKU SAMPAI"
				bind:value={store.fb.berlaku_sampai}
				placeholder="Pilih tanggal selesai"
			/>

			<div class="flex flex-col gap-1">
				<label for="pm-maxguna" class="text-xs" style="color:var(--text-dim)"
					>MAKS. PENGGUNAAN</label
				>
				<input
					id="pm-maxguna"
					type="number"
					min="1"
					bind:value={store.fb.max_penggunaan}
					placeholder="Tidak terbatas"
					class="rounded border px-2 py-1.5 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
		</div>

		{#if store.fb.tipe !== 'total'}
			<div class="flex flex-col gap-2">
				<p class="text-xs" style="color:var(--text-dim)">
					{store.fb.tipe === 'item' ? 'BARANG TARGET *' : 'KATEGORI TARGET *'}
				</p>

				{#if store.fbTargets.length > 0}
					<div class="mb-1 flex flex-wrap gap-1">
						{#each store.fbTargets as t, i (t.target_id)}
							<span
								class="flex items-center gap-1 rounded px-2 py-0.5 text-xs"
								style="background:var(--surface2);color:var(--text)"
							>
								{t.nama ?? t.target_id}
								<button
									type="button"
									onclick={() => store.hapusTarget(i)}
									class="ml-1"
									style="color:var(--danger)">✕</button
								>
							</span>
						{/each}
					</div>
				{/if}

				<div class="relative">
					<input
						type="text"
						placeholder="Cari {store.fb.tipe === 'item' ? 'nama/kode barang' : 'kategori'}..."
						bind:value={store.targetQuery}
						class="w-full rounded border px-2 py-1.5 text-sm outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
					{#if (store.fb.tipe === 'item' && store.filteredBarang.length > 0) || (store.fb.tipe === 'kategori' && store.filteredKategori.length > 0)}
						<div
							class="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded border shadow-lg"
							style="background:var(--surface);border-color:var(--border)"
						>
							{#if store.fb.tipe === 'item'}
								{#each store.filteredBarang as b (b.id)}
									<button
										type="button"
										onclick={() => store.tambahTarget('barang', b.id, b.nama_barang)}
										class="w-full border-t px-3 py-2 text-left text-sm hover:opacity-80"
										style="border-color:var(--border)"
									>
										<span class="mr-2 font-mono text-xs" style="color:var(--text-dim)"
											>{b.kode_barang}</span
										>
										{b.nama_barang}
									</button>
								{/each}
							{:else}
								{#each store.filteredKategori as k (k.id)}
									<button
										type="button"
										onclick={() => store.tambahTarget('kategori', k.id, k.nama)}
										class="w-full border-t px-3 py-2 text-left text-sm hover:opacity-80"
										style="border-color:var(--border)"
									>
										{k.nama}
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="rounded p-2 text-xs" style="background:var(--surface2);color:var(--text-dim)">
				Promo tipe "Min. Total" berlaku untuk semua barang. Kasir akan mendapat notifikasi saat
				total belanja memenuhi syarat.
			</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<button
				type="button"
				onclick={() => (store.modalOpen = false)}
				class="rounded px-4 py-1.5 text-sm"
				style="color:var(--text-dim)">Batal</button
			>
			<button
				type="submit"
				disabled={store.saving}
				class="rounded px-6 py-1.5 text-sm font-bold disabled:opacity-50"
				style="background:var(--accent);color:var(--bg)"
			>
				{store.saving ? 'Menyimpan...' : 'Simpan'}
			</button>
		</div>
	</form>
</SlideOver>
