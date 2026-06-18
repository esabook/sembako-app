<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DatePicker2 from '$lib/components/ui/DatePicker2.svelte';
	import type { createPipelineStore } from '../sales.store.svelte.js';
	import { TAHAP_ORDER, TAHAP_COLOR } from '../sales.logic.js';

	let { store }: { store: ReturnType<typeof createPipelineStore> } = $props();
</script>

<div class="mb-2 flex flex-wrap items-end gap-2">
	<Select
		bind:value={store.tahap}
		options={[
			{ value: '', label: 'Semua Tahap' },
			...TAHAP_ORDER.map((t) => ({
				value: t,
				label: t.charAt(0).toUpperCase() + t.slice(1)
			}))
		]}
	/>
	<Button onclick={() => store.bukaForm()} clasz="ml-auto">+ Tambah Prospek</Button>
</div>

{#if store.rows.length > 0}
	<div class="flex gap-2 overflow-x-auto pb-1">
		{#each TAHAP_ORDER as t (t)}
			{@const cnt = store.rows.filter((r) => r.tahap === t).length}
			{@const total = store.rows
				.filter((r) => r.tahap === t)
				.reduce((s, r) => s + r.nilai_estimasi, 0)}
			{#if cnt > 0}
				<div
					class="flex-shrink-0 rounded-lg border px-3 py-2 text-center"
					style="background:var(--surface);border-color:{TAHAP_COLOR[t]}33;min-width:80px"
				>
					<p class="text-xs font-semibold" style="color:{TAHAP_COLOR[t]}">{t}</p>
					<p class="text-lg font-bold" style="color:var(--text)">{cnt}</p>
					{#if total > 0}
						<p class="text-xs" style="color:var(--text-dim)">{(total / 1e6).toFixed(1)}jt</p>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{/if}

{#if store.rows.length === 0}
	<p class="py-12 text-center text-sm" style="color:var(--text-dim)">Belum ada pipeline grosir.</p>
{:else}
	<div class="space-y-2">
		{#each store.rows as row (row.id)}
			<div
				class="rounded-lg border p-3"
				style="background:var(--surface);border-color:var(--border)"
			>
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<p class="text-sm font-semibold" style="color:var(--text)">{row.nama_pelanggan}</p>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium text-white"
								style="background:{TAHAP_COLOR[row.tahap]}">{row.tahap}</span
							>
						</div>
						{#if row.nilai_estimasi > 0}
							<p class="mt-0.5 text-xs font-medium" style="color:var(--accent)">
								Estimasi: Rp {row.nilai_estimasi.toLocaleString('id-ID')}
							</p>
						{/if}
						{#if row.produk_minat}
							<p class="mt-0.5 text-xs" style="color:var(--text-dim)">Minat: {row.produk_minat}</p>
						{/if}
						{#if row.catatan}
							<p class="mt-0.5 text-xs italic" style="color:var(--text-dim)">{row.catatan}</p>
						{/if}
						<p class="mt-1 text-xs" style="color:var(--text-dim)">
							Masuk: {new Date(row.tanggal_masuk).toLocaleDateString('id-ID', {
								day: 'numeric',
								month: 'short'
							})}
							{#if row.nama_petugas}
								· {row.nama_petugas}{/if}
						</p>
					</div>
					<div class="flex flex-shrink-0 flex-wrap gap-1">
						{#each TAHAP_ORDER as t (t)}
							{#if t !== row.tahap && t !== 'batal'}
								<button
									onclick={() => store.ubahTahap(row.id, t)}
									class="rounded border px-2 py-0.5 text-xs"
									style="color:{TAHAP_COLOR[t]};border-color:{TAHAP_COLOR[t]}44">→ {t}</button
								>
							{/if}
						{/each}
						<Button variant="ghost" size="xs" onclick={() => store.bukaForm(row)}>Edit</Button>
						<Button variant="danger" size="xs" onclick={() => store.hapus(row.id)}>Hapus</Button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<SlideOver
	bind:open={store.formOpen}
	title={store.editId ? 'Edit Pipeline' : 'Tambah Prospek Grosir'}
>
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				store.simpan();
			}}
			class="flex flex-col gap-3"
		>
			<div class="flex flex-col gap-1">
				<label for="fp-nama" class="text-xs" style="color:var(--text-dim)"
					>NAMA PELANGGAN/WARUNG *</label
				>
				<input
					id="fp-nama"
					bind:value={store.fNama}
					required
					placeholder="Nama toko/warung grosir"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fp-nilai" class="text-xs" style="color:var(--text-dim)"
					>ESTIMASI NILAI ORDER (Rp)</label
				>
				<input
					id="fp-nilai"
					type="number"
					min="0"
					bind:value={store.fNilai}
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<DatePicker2 label="TANGGAL MASUK *" bind:value={store.fTanggal} />
			<div class="flex flex-col gap-1">
				<span class="text-xs" style="color:var(--text-dim)">TAHAP</span>
				<div class="flex flex-wrap gap-1">
					{#each TAHAP_ORDER as t (t)}
						<button
							type="button"
							onclick={() => (store.fTahap = t)}
							class="rounded border px-2 py-1 text-xs transition-colors"
							style={store.fTahap === t
								? `background:${TAHAP_COLOR[t]};color:white;border-color:${TAHAP_COLOR[t]}`
								: 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}
						>
							{t}
						</button>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fp-produk" class="text-xs" style="color:var(--text-dim)"
					>PRODUK YANG DIMINATI</label
				>
				<input
					id="fp-produk"
					bind:value={store.fProduk}
					placeholder="Beras, Minyak, dll"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fp-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
				<textarea
					id="fp-catatan"
					bind:value={store.fCatatan}
					rows="2"
					class="resize-none rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>
			{#if store.error}
				<p class="text-xs" style="color:var(--danger)">{store.error}</p>
			{/if}
			<div class="mt-1 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (store.formOpen = false)}>Batal</Button>
				<Button type="submit">Simpan</Button>
			</div>
		</form>
	{/snippet}
</SlideOver>

<ConfirmDialog
	bind:open={store.konfirmBuka}
	judul="Hapus pipeline?"
	pesan="Data pipeline grosir ini akan dihapus permanen."
	labelKanan="Hapus"
	warnaKanan="var(--danger)"
	onkiri={() => (store.konfirmId = null)}
	onkanan={() => store.doHapus()}
/>
