<script lang="ts">
	import { onMount } from 'svelte';
	import { withIdle } from '$lib/utils/async';
	import { createBookingStore } from '../jasa.store.svelte';
	import { LABEL_STATUS, WARNA_STATUS, getWeekDates, formatTanggal, formatJam, groupByTanggal } from '../jasa.logic';
	import type { Booking, StatusBooking } from '../jasa.types';
	import { HARI_LABEL } from '../jasa.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import DateRangePicker from '$lib/components/form/DateRangePicker.svelte';

	const store = createBookingStore();

	// Calendar state
	let baseDate = $state(new Date());
	let weekDates = $state<Date[]>([]);
	let calendarBookings = $state<Map<string, Booking[]>>(new Map());
	let loadingCalendar = $state(false);

	$effect(() => {
		weekDates = getWeekDates(baseDate);
	});

	$effect(() => {
		if (store.viewMode === 'calendar' && store.bookings.length >= 0) {
			loadingCalendar = true;
			const snap = [...store.bookings];
			return withIdle(() => {
				calendarBookings = groupByTanggal(snap);
				loadingCalendar = false;
			});
		}
	});

	function prevWeek() { baseDate = new Date(baseDate.getTime() - 7 * 86_400_000); }
	function nextWeek() { baseDate = new Date(baseDate.getTime() + 7 * 86_400_000); }
	function thisWeek() { baseDate = new Date(); }

	const STATUS_FLOW: Partial<Record<StatusBooking, StatusBooking>> = {
		booked: 'confirmed',
		confirmed: 'in_progress',
		in_progress: 'selesai',
	};

	// Checkout
	let checkoutOpen = $state(false);
	let checkoutBkg = $state<Booking | null>(null);
	let pakaiKuota = $state(false);

	function bukaCheckout(b: Booking) {
		checkoutBkg = b;
		pakaiKuota = false;
		checkoutOpen = true;
	}

	async function prosesCheckout() {
		if (!checkoutBkg) return;
		const ok = await store.checkout(checkoutBkg.id, pakaiKuota);
		if (ok !== null) { checkoutOpen = false; checkoutBkg = null; }
	}

	const columns = [
		{ key: 'no_booking', label: 'No', width: 120 },
		{ key: 'waktu_mulai', label: 'Waktu', width: 130 },
		{ key: 'layanan_nama', label: 'Layanan' },
		{ key: 'pelanggan_nama', label: 'Pelanggan', width: 160 },
		{ key: 'karyawan_nama', label: 'Staf', width: 140 },
		{ key: 'status', label: 'Status', width: 110 },
		{ key: 'aksi', label: '', width: 120 },
	];

	onMount(() => {
		store.muat();
		store.muatMaster();
	});

	$effect(() => {
		store.dari;
		store.sampai;
		store.muat();
	});
</script>

<div class="p-3 md:p-6">
	<!-- Header -->
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-base font-semibold md:text-lg">Booking Layanan</h1>
		<div class="flex items-center gap-2">
			<div class="flex overflow-hidden rounded-lg border border-[var(--border)]">
				{#each [['list', 'List'], ['calendar', 'Kalender']] as [v, l]}
					<button
						class="px-3 py-1.5 text-sm transition-colors
							{store.viewMode === v ? 'bg-[var(--accent)] text-black' : 'bg-[var(--surface)] text-[var(--text)]'}"
						onclick={() => (store.viewMode = v as 'list' | 'calendar')}
					>{l}</button>
				{/each}
			</div>
			<button class="btn btn-primary btn-sm" onclick={() => store.bukaForm()}>+ Booking</button>
		</div>
	</div>

	<div class="mb-4">
		<DateRangePicker bind:dari={store.dari} bind:sampai={store.sampai} />
	</div>

	<!-- ── LIST VIEW ── -->
	{#if store.viewMode === 'list'}
		<DataTable {columns} rowCount={store.bookings.length} loading={store.loading} pageSize={20}
			emptyText="Belum ada booking.">
			{#snippet body(hidden)}
				{#each store.bookings as b (b.id)}
					<tr>
						{#if !hidden.has('no_booking')}
							<td class="px-3 py-2 text-xs font-mono">{b.no_booking}</td>
						{/if}
						{#if !hidden.has('waktu_mulai')}
							<td class="px-3 py-2 text-sm">{formatJam(b.waktu_mulai)}</td>
						{/if}
						{#if !hidden.has('layanan_nama')}
							<td class="px-3 py-2 text-sm">{b.layanan_nama}</td>
						{/if}
						{#if !hidden.has('pelanggan_nama')}
							<td class="px-3 py-2 text-sm">{b.pelanggan_nama ?? '—'}</td>
						{/if}
						{#if !hidden.has('karyawan_nama')}
							<td class="px-3 py-2 text-sm">{b.karyawan_nama ?? '—'}</td>
						{/if}
						{#if !hidden.has('status')}
							<td class="px-3 py-2">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium text-black"
									style="background:{WARNA_STATUS[b.status]}">{LABEL_STATUS[b.status]}</span>
							</td>
						{/if}
						{#if !hidden.has('aksi')}
							<td class="px-3 py-2 text-right whitespace-nowrap">
								{#if b.status === 'selesai' && !b.penjualan_id}
									<button class="btn btn-xs btn-primary mr-1" onclick={() => bukaCheckout(b)}>Bayar</button>
								{:else if STATUS_FLOW[b.status]}
									<button class="btn btn-xs btn-outline mr-1"
										onclick={() => store.ubahStatus(b.id, STATUS_FLOW[b.status]!)}>
										→ {LABEL_STATUS[STATUS_FLOW[b.status]!]}
									</button>
								{/if}
								<button class="btn btn-xs btn-ghost" onclick={() => store.bukaForm(b)}>Edit</button>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>

	<!-- ── CALENDAR VIEW ── -->
	{:else}
		<div class="mb-3 flex items-center gap-2">
			<button class="btn btn-xs btn-outline" onclick={prevWeek}>‹</button>
			<button class="btn btn-xs btn-outline" onclick={thisWeek}>Minggu ini</button>
			<button class="btn btn-xs btn-outline" onclick={nextWeek}>›</button>
		</div>

		{#if loadingCalendar}
			<div class="flex justify-center py-8"><Spinner /></div>
		{:else}
			<div class="overflow-x-auto">
				<div class="grid min-w-[560px]"
					style="grid-template-columns: repeat(7, minmax(120px, 1fr)); gap: 4px">
					{#each weekDates as d (d.toISOString())}
						{@const tgl = formatTanggal(d)}
						{@const isToday = tgl === formatTanggal(new Date())}
						<div>
							<div class="mb-1 rounded px-2 py-1 text-center text-xs font-semibold"
								style="background:{isToday ? 'var(--accent)' : 'var(--surface2)'};color:{isToday ? 'black' : 'var(--text)'}">
								{HARI_LABEL[d.getDay()]}
								<br /><span class="text-xs font-normal opacity-80">{d.getDate()}/{d.getMonth() + 1}</span>
							</div>
							<div class="flex flex-col gap-1">
								{#each calendarBookings.get(tgl) ?? [] as b (b.id)}
									<button class="w-full rounded p-1.5 text-left text-xs"
										style="background:{WARNA_STATUS[b.status]}22;border:1px solid {WARNA_STATUS[b.status]}"
										onclick={() => store.bukaForm(b)}>
										<span class="font-semibold">{formatJam(b.waktu_mulai)}</span>
										<br /><span class="truncate">{b.layanan_nama}</span>
										{#if b.pelanggan_nama}
											<br /><span class="opacity-70">{b.pelanggan_nama}</span>
										{/if}
									</button>
								{/each}
								<button class="btn btn-xs btn-ghost w-full opacity-50 hover:opacity-100"
									onclick={() => { store.fWaktuMulai = tgl + 'T09:00'; store.bukaForm(); }}>+</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- ── FORM MODAL ── -->
<ModalWindow bind:open={store.formOpen} title="{store.editId ? 'Edit' : 'Buat'} Booking" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="b-pelanggan">Pelanggan</label>
			<select id="b-pelanggan" class="select select-bordered w-full text-sm"
				bind:value={store.fPelangganId}>
				<option value={null}>— tanpa pelanggan —</option>
				{#each store.pelanggan as p (p.id)}
					<option value={p.id}>{p.nama}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label text-sm" for="b-layanan">Layanan</label>
			<select id="b-layanan" class="select select-bordered w-full text-sm"
				bind:value={store.fBarangId}>
				<option value={null}>— pilih layanan —</option>
				{#each store.layanan as l (l.id)}
					<option value={l.id}>{l.nama_barang} · {l.durasi_menit} mnt</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label text-sm" for="b-staf">Staf</label>
			<select id="b-staf" class="select select-bordered w-full text-sm"
				bind:value={store.fKaryawanId}>
				<option value={null}>— tanpa staf —</option>
				{#each store.staf as s (s.id)}
					<option value={s.id}>{s.nama}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label text-sm" for="b-waktu">Waktu Mulai</label>
			<input id="b-waktu" type="datetime-local" class="input input-bordered w-full text-sm"
				bind:value={store.fWaktuMulai} />
		</div>
		<div>
			<label class="label text-sm" for="b-catatan">Catatan</label>
			<input id="b-catatan" type="text" class="input input-bordered w-full text-sm"
				placeholder="opsional" bind:value={store.fCatatan} />
		</div>
		{#if store.error}
			<p class="text-sm text-[var(--danger)]">{store.error}</p>
		{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => (store.formOpen = false)}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={() => store.simpan()}>Simpan</button>
		</div>
	</div>
</ModalWindow>

<!-- ── CHECKOUT MODAL ── -->
<ModalWindow bind:open={checkoutOpen} title="Bayar Booking" maxWidth="sm">
	<div class="space-y-3">
		<div class="rounded-lg border border-[var(--border)] p-3 text-sm">
			<div class="flex justify-between"><span class="text-[var(--text-dim)]">Layanan</span><span>{checkoutBkg?.layanan_nama}</span></div>
			<div class="flex justify-between"><span class="text-[var(--text-dim)]">Pelanggan</span><span>{checkoutBkg?.pelanggan_nama ?? '—'}</span></div>
			<div class="flex justify-between"><span class="text-[var(--text-dim)]">Staf</span><span>{checkoutBkg?.karyawan_nama ?? '—'}</span></div>
		</div>
		{#if checkoutBkg?.pelanggan_id}
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" class="checkbox checkbox-sm" bind:checked={pakaiKuota} />
				Pakai kuota membership (jika tersedia)
			</label>
		{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => (checkoutOpen = false)}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={prosesCheckout}>Bayar & Selesai</button>
		</div>
	</div>
</ModalWindow>
