<script lang="ts">
	import DataTable from '$lib/components/DataTable.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { createKaryawanStore } from '../karyawan.store.svelte.js';
	import { STATUS_COLOR, hitungDurasi } from '../karyawan.logic.js';

	let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props();

	$effect(() => {
		store.filterBulan;
		store.filterKaryawanId;
		store.muatAbsensi();
	});
</script>

{#if !store.isManager}
	<div
		class="flex items-center gap-3 rounded border p-3"
		style="background:var(--surface);border-color:var(--border)"
	>
		<span class="text-sm font-medium"
			>Hari ini — {new Date().toLocaleDateString('id-ID', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			})}</span
		>
		{#if !store.absensiHariIni}
			<button
				onclick={store.clockIn}
				class="rounded px-4 py-1.5 text-sm font-bold"
				style="background:var(--accent);color:var(--bg)">Clock In</button
			>
		{:else if !store.absensiHariIni.jam_keluar}
			<span class="text-xs" style="color:var(--text-dim)"
				>Masuk: {store.absensiHariIni.jam_masuk}</span
			>
			<button
				onclick={store.clockOut}
				class="rounded px-4 py-1.5 text-sm font-bold"
				style="background:var(--warn);color:var(--bg)">Clock Out</button
			>
		{:else}
			<span class="text-xs" style="color:var(--accent)"
				>Masuk: {store.absensiHariIni.jam_masuk} — Keluar: {store.absensiHariIni.jam_keluar}</span
			>
		{/if}
	</div>
{/if}

{#if store.isManager && store.realtimeList.length > 0}
	<div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
		<p class="mb-2 text-xs font-bold" style="color:var(--text-dim)">
			SEDANG BEKERJA ({store.realtimeList.length})
		</p>
		<div class="flex flex-wrap gap-2">
			{#each store.realtimeList as r (r.karyawan_id)}
				<div
					class="flex items-center gap-2 rounded border px-2 py-1 text-xs"
					style="border-color:var(--accent)33;background:var(--surface2)"
				>
					<span class="font-medium">{r.nama_karyawan}</span>
					<span style="color:var(--accent)">{r.jam_masuk}</span>
					{#if r.terlambat_menit}
						<span class="font-bold" style="color:var(--warn)">+{r.terlambat_menit}mnt</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="flex flex-wrap items-center gap-3">
	<input
		type="month"
		bind:value={store.filterBulan}
		class="rounded border px-2 py-1 text-sm outline-none"
		style="border-color:var(--border);color:var(--text)"
	/>
	{#if store.isManager}
		<Select
			bind:value={store.filterKaryawanId}
			options={store.karyawanList.map(k => ({ value: k.id, label: k.nama }))}
			placeholder="Semua karyawan"
			standalone
		/>
		<div class="flex gap-1 text-sm">
			<button
				onclick={() => (store.viewAbsensi = 'list')}
				class="rounded px-3 py-1"
				style={store.viewAbsensi === 'list'
					? 'background:var(--surface2);color:var(--text)'
					: 'color:var(--text-dim)'}>List</button
			>
			<button
				onclick={() => (store.viewAbsensi = 'rekap')}
				class="rounded px-3 py-1"
				style={store.viewAbsensi === 'rekap'
					? 'background:var(--surface2);color:var(--text)'
					: 'color:var(--text-dim)'}>Rekap</button
			>
		</div>
		<div class="ml-auto flex gap-2">
			{#if store.viewAbsensi === 'rekap' && store.rekapList.length > 0}
				<button
					onclick={store.exportRekapCsv}
					class="rounded border px-3 py-1 text-sm"
					style="border-color:var(--border);color:var(--text-dim)">↓ CSV</button
				>
			{/if}
			<button
				onclick={() => store.bukaFormAbsensi()}
				class="rounded px-3 py-1 text-sm font-bold"
				style="background:var(--accent);color:var(--bg)">+ Tambah</button
			>
		</div>
	{/if}
</div>

{#if store.viewAbsensi === 'list'}
	<DataTable
		columns={store.kolAbsensiList}
		tableId="karyawan_absensi"
		bind:sortKey={store.sortKeyAbsensi}
		bind:sortDir={store.sortDirAbsensi}
		rowCount={store.sortedAbsensi.length}
		emptyText="Belum ada data absensi bulan ini"
		maxRows={14}
	>
		{#snippet body(hidden)}
			{#each store.sortedAbsensi as item (item.id)}
				<tr class="border-t" style="border-color:var(--border)">
					{#if !hidden.has('nama_karyawan')}
						<td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
					{/if}
					{#if !hidden.has('tanggal')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.tanggal}</td>
					{/if}
					{#if !hidden.has('jam_masuk')}
						<td class="px-3 py-2">{item.jam_masuk ?? '-'}</td>
					{/if}
					{#if !hidden.has('jam_keluar')}
						<td class="px-3 py-2">{item.jam_keluar ?? '-'}</td>
					{/if}
					{#if !hidden.has('durasi')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
							>{hitungDurasi(item.jam_masuk, item.jam_keluar)}</td
						>
					{/if}
					{#if !hidden.has('status')}
						<td class="px-3 py-2">
							<span class="text-xs font-bold" style="color:{STATUS_COLOR[item.status]}"
								>{item.status.toUpperCase()}</span
							>
						</td>
					{/if}
					{#if !hidden.has('terlambat_menit')}
						<td class="px-3 py-2 text-xs">
							{#if item.terlambat_menit == null}
								<span style="color:var(--text-dim)">—</span>
							{:else}
								<span
									class="font-bold"
									style="color:{item.terlambat_menit > 30 ? 'var(--danger)' : 'var(--warn)'}"
								>
									+{item.terlambat_menit} mnt
								</span>
							{/if}
						</td>
					{/if}
					{#if !hidden.has('aksi')}
						<td class="px-3 py-2 text-right">
							<button
								onclick={() => store.bukaFormAbsensi(item)}
								class="mr-2 text-xs"
								style="color:var(--info)">Edit</button
							>
							<button
								onclick={() => store.hapusAbsensi(item.id)}
								class="text-xs"
								style="color:var(--danger)">Hapus</button
							>
						</td>
					{/if}
				</tr>
			{/each}
		{/snippet}
	</DataTable>
{:else}
	<DataTable
		columns={store.kolAbsensiRekap}
		tableId="karyawan_rekap"
		bind:sortKey={store.sortKeyRekap}
		bind:sortDir={store.sortDirRekap}
		rowCount={store.sortedRekap.length}
		emptyText="Belum ada data"
		maxRows={14}
	>
		{#snippet body(hidden)}
			{#each store.sortedRekap as item (item.karyawan_id)}
				<tr class="border-t" style="border-color:var(--border)">
					{#if !hidden.has('nama_karyawan')}
						<td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
					{/if}
					{#if !hidden.has('hadir')}
						<td class="px-3 py-2 text-center font-bold" style="color:var(--accent)">{item.hadir}</td
						>
					{/if}
					{#if !hidden.has('izin')}
						<td class="px-3 py-2 text-center" style="color:var(--info)">{item.izin}</td>
					{/if}
					{#if !hidden.has('sakit')}
						<td class="px-3 py-2 text-center" style="color:var(--warn)">{item.sakit}</td>
					{/if}
					{#if !hidden.has('alpa')}
						<td class="px-3 py-2 text-center" style="color:var(--danger)">{item.alpa}</td>
					{/if}
					{#if !hidden.has('total')}
						<td class="px-3 py-2 text-center" style="color:var(--text-dim)">{item.total}</td>
					{/if}
					{#if !hidden.has('pct')}
						<td
							class="px-3 py-2 text-center text-xs font-bold"
							style="color:{item.total > 0 && item.hadir / item.total >= 0.8
								? 'var(--accent)'
								: 'var(--warn)'}"
						>
							{item.total > 0 ? `${((item.hadir / item.total) * 100).toFixed(0)}%` : '—'}
						</td>
					{/if}
				</tr>
			{/each}
		{/snippet}
	</DataTable>
{/if}

<!-- ── Modal: Form Absensi ──────────────────────────────────────────────────── -->
<SlideOver
	bind:open={store.modalAbsensiOpen}
	title={store.editAbsensi ? 'Edit Absensi' : 'Tambah Absensi'}
>
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				store.simpanAbsensi();
			}}
			class="flex flex-col gap-3 text-sm"
		>
			<div class="grid grid-cols-2 gap-3">
				{#if store.isManager}
					<div class="col-span-2 flex flex-col gap-1">
						<label for="fa-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
						<Select
							id="fa-karyw"
							bind:value={store.formAbsensi.karyawan_id}
							options={store.karyawanList.map(k => ({ value: String(k.id), label: k.nama }))}
							placeholder="-- Pilih --"
						/>
					</div>
				{/if}
				<div class="flex flex-col gap-1">
					<label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
					<input
						id="fa-tgl"
						type="date"
						bind:value={store.formAbsensi.tanggal}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fa-status" class="text-xs" style="color:var(--text-dim)">STATUS *</label>
					<Select
						id="fa-status"
						bind:value={store.formAbsensi.status}
						options={[
							{ value: 'hadir', label: 'Hadir' },
							{ value: 'izin', label: 'Izin' },
							{ value: 'sakit', label: 'Sakit' },
							{ value: 'alpa', label: 'Alpa' },
						]}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fa-masuk" class="text-xs" style="color:var(--text-dim)">JAM MASUK</label>
					<input
						id="fa-masuk"
						type="time"
						bind:value={store.formAbsensi.jam_masuk}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fa-keluar" class="text-xs" style="color:var(--text-dim)">JAM KELUAR</label>
					<input
						id="fa-keluar"
						type="time"
						bind:value={store.formAbsensi.jam_keluar}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fa-shift" class="text-xs" style="color:var(--text-dim)">SHIFT</label>
					<input
						id="fa-shift"
						bind:value={store.formAbsensi.shift}
						placeholder="Pagi / Sore / ..."
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>
			<div class="mt-1 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (store.modalAbsensiOpen = false)}
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
