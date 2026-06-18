<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DatePicker2 from '$lib/components/ui/DatePicker2.svelte';
	import { user } from '$lib/stores/auth.js';
	import type { createKaryawanStore } from '../karyawan.store.svelte.js';
	import { rp } from '../karyawan.logic.js';

	let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props();
	let isManager = $derived($user && ['pemilik', 'manajer'].includes($user.role));

	$effect(() => {
		store.siKaryawanId;
		store.siBulan;
		store.siTipe;
		store.muatSI();
	});
</script>

<div class="mb-3 flex flex-wrap items-end gap-2">
	<Select
		bind:value={store.siKaryawanId}
		options={store.karyawanList.map(k => ({ value: String(k.id), label: k.nama }))}
		placeholder="Semua Karyawan"
		standalone
	/>
	<input
		type="month"
		bind:value={store.siBulan}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	/>
	<Select
		bind:value={store.siTipe}
		options={[
			{ value: 'sanksi', label: 'Sanksi' },
			{ value: 'insentif', label: 'Insentif' }
		]}
		placeholder="Semua Tipe"
		standalone
	/>
	{#if isManager}
		<button
			onclick={() => store.bukaFormSI()}
			class="ml-auto rounded px-3 py-1 text-sm font-bold"
			style="background:var(--accent);color:var(--bg)">+ Catat</button
		>
	{/if}
</div>
<div class="overflow-x-auto">
	<table class="min-w-full text-sm">
		<thead
			><tr class="text-xs" style="color:var(--text-dim)">
				<th class="py-2 pr-3 text-left">Karyawan</th>
				<th class="py-2 pr-3 text-left">Tipe</th>
				<th class="py-2 pr-3 text-left">Jenis</th>
				<th class="py-2 pr-3 text-right">Jumlah</th>
				<th class="py-2 pr-3 text-left">Periode</th>
				<th class="py-2 pr-3 text-left">Keterangan</th>
				<th class="py-2"></th>
			</tr></thead
		>
		<tbody>
			{#each store.siRows as row (row.id)}
				<tr class="border-t text-sm" style="border-color:var(--border)">
					<td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
					<td class="py-2 pr-3">
						{#if row.tipe === 'insentif'}
							<span
								class="rounded-full px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)"
								>Insentif</span
							>
						{:else}
							<span
								class="rounded-full px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)"
								>Sanksi</span
							>
						{/if}
					</td>
					<td class="py-2 pr-3">{row.jenis}</td>
					<td class="py-2 pr-3 text-right font-mono">{rp(row.jumlah)}</td>
					<td class="py-2 pr-3 text-xs">{row.periode_bulan}</td>
					<td class="py-2 pr-3 text-xs" style="color:var(--text-dim)">{row.keterangan ?? '-'}</td>
					<td class="py-2 text-right">
						{#if isManager}
							<button
								onclick={() => store.hapusSI(row.id)}
								class="rounded px-2 py-0.5 text-xs"
								style="color:var(--danger)">Hapus</button
							>
						{/if}
					</td>
				</tr>
			{/each}
			{#if !store.siRows.length}
				<tr
					><td colspan="7" class="py-6 text-center text-sm" style="color:var(--text-dim)"
						>Belum ada data</td
					></tr
				>
			{/if}
		</tbody>
	</table>
</div>

<!-- ── Modal: Form Sanksi & Insentif ────────────────────────────────────────── -->
<SlideOver bind:open={store.siFormOpen} title="Catat Sanksi / Insentif">
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				store.simpanSI();
			}}
			class="flex flex-col gap-3 text-sm"
		>
			<div class="flex flex-col gap-1">
				<label for="fsi-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
				<Select
					id="fsi-karyw"
					bind:value={store.fSiKaryawanId}
					options={store.karyawanList.map(k => ({ value: String(k.id), label: k.nama }))}
					placeholder="-- Pilih --"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-xs" style="color:var(--text-dim)">TIPE *</span>
				<div class="flex gap-4">
					{#each [['insentif', 'Insentif'], ['sanksi', 'Sanksi']] as const as [v, lbl] (v)}
						<label class="flex cursor-pointer items-center gap-1.5">
							<input
								type="radio"
								bind:group={store.fSiTipe}
								value={v}
								class="accent-[var(--accent)]"
							/>
							<span style="color:{v === 'insentif' ? 'var(--accent)' : 'var(--danger)'}">{lbl}</span
							>
						</label>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fsi-jenis" class="text-xs" style="color:var(--text-dim)">JENIS *</label>
				<input
					id="fsi-jenis"
					bind:value={store.fSiJenis}
					required
					placeholder="mis. Bonus penjualan, Keterlambatan, ..."
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<label for="fsi-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH (Rp) *</label>
					<input
						id="fsi-jml"
						type="number"
						min="1"
						bind:value={store.fSiJumlah}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<DatePicker2 label="TANGGAL *" bind:value={store.fSiTanggal} />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fsi-bulan" class="text-xs" style="color:var(--text-dim)">PERIODE BULAN *</label>
				<input
					id="fsi-bulan"
					type="month"
					bind:value={store.fSiBulan}
					required
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fsi-ket" class="text-xs" style="color:var(--text-dim)">KETERANGAN</label>
				<input
					id="fsi-ket"
					bind:value={store.fSiKet}
					placeholder="Opsional"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			{#if store.siError}
				<p class="text-xs" style="color:var(--danger)">{store.siError}</p>
			{/if}
			<div class="mt-1 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (store.siFormOpen = false)}
					class="rounded px-3 py-1 text-sm"
					style="color:var(--text-dim)">Batal</button
				>
				<button
					type="submit"
					class="rounded px-3 py-1 text-sm font-bold"
					style="background:var(--accent);color:var(--bg)">Simpan</button
				>
			</div>
		</form>
	{/snippet}
</SlideOver>

<ConfirmDialog
	bind:open={store.konfirmSIBuka}
	judul="Hapus sanksi/insentif?"
	pesan="Data ini akan dihapus permanen."
	labelKanan="Hapus"
	warnaKanan="var(--danger)"
	onkiri={() => store.resetKonfirmSI()}
	onkanan={() => store.doHapusSI()}
/>
