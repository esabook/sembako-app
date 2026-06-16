<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { createKaryawanStore } from '../karyawan.store.svelte.js';
	import { fmtRpK, fmtMenit } from '../karyawan.logic.js';

	let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
	<input
		type="month"
		bind:value={store.bulanPerforma}
		class="rounded border px-2 py-1 text-sm outline-none"
		style="border-color:var(--border);color:var(--text)"
	/>
	<button
		onclick={store.muatPerforma}
		class="rounded px-3 py-1 text-sm font-bold"
		style="background:var(--accent);color:var(--bg)">Tampilkan</button
	>
	{#if store.performaDetailId}
		<button
			onclick={() => {
				store.performaDetailId = null;
			}}
			class="ml-auto rounded border px-3 py-1 text-sm"
			style="border-color:var(--border);color:var(--text-dim)">← Semua Kasir</button
		>
	{/if}
</div>

{#if store.loadingPerforma}
	<div class="flex justify-center py-6"><Spinner /></div>
{:else if store.performaDetailId && store.performaDetail}
	{@const d = store.performaDetail}
	<div class="flex flex-col gap-4">
		<div>
			<p class="mb-2 text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
				{d.karyawan.nama} — {d.bulan}
			</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each [{ label: 'Total Shift', val: String(d.ringkasan.total_shift), sub: `${d.ringkasan.shift_ditutup} ditutup` }, { label: 'Total Transaksi', val: String(d.ringkasan.total_transaksi), sub: `~${d.ringkasan.avg_transaksi_per_shift}/shift` }, { label: 'Total Penjualan', val: `Rp ${fmtRpK(d.ringkasan.total_penjualan)}`, sub: `~${fmtRpK(d.ringkasan.avg_penjualan_per_shift)}/shift`, accent: true }, { label: 'Rata-rata/Trx', val: `Rp ${fmtRpK(d.ringkasan.rata_per_trx)}`, sub: `${fmtMenit(d.ringkasan.avg_durasi_menit)} avg shift` }] as c (c.label)}
					<div
						class="rounded border p-3"
						style="background:var(--surface);border-color:var(--border)"
					>
						<div class="mb-0.5 text-xs" style="color:var(--text-dim)">{c.label}</div>
						<div
							class="text-sm font-bold"
							style="color:{c.accent ? 'var(--accent)' : 'var(--text)'}"
						>
							{c.val}
						</div>
						<div class="mt-0.5 text-xs" style="color:var(--text-dim)">{c.sub}</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-wrap gap-3 text-xs">
			{#each [{ label: 'Hadir', val: d.absensi.hadir, color: 'var(--accent)' }, { label: 'Izin', val: d.absensi.izin, color: 'var(--info)' }, { label: 'Sakit', val: d.absensi.sakit, color: 'var(--warn)' }, { label: 'Alpa', val: d.absensi.alpa, color: 'var(--danger)' }, { label: 'Void', val: d.ringkasan.total_void, color: d.ringkasan.total_void > 0 ? 'var(--danger)' : 'var(--text-dim)' }, { label: 'Void rate', val: `${d.ringkasan.void_rate_pct}%`, color: d.ringkasan.void_rate_pct > 1 ? 'var(--warn)' : 'var(--text-dim)' }] as stat (stat.label)}
				<div
					class="flex items-center gap-1.5 rounded border px-2 py-1"
					style="border-color:var(--border)"
				>
					<span style="color:var(--text-dim)">{stat.label}</span>
					<span class="font-bold" style="color:{stat.color}">{stat.val}</span>
				</div>
			{/each}
		</div>

		{#if d.per_shift.length > 0}
			{@const maxPenjualan = Math.max(...d.per_shift.map((s) => s.total_penjualan), 1)}
			<div>
				<p class="mb-2 text-xs font-semibold" style="color:var(--text-dim)">Penjualan per Shift</p>
				<div
					class="flex items-end gap-0.5 overflow-x-auto"
					style="height:80px;padding-bottom:1.5rem"
				>
					{#each d.per_shift as s (s.id)}
						{@const pct = (s.total_penjualan / maxPenjualan) * 100}
						<div
							class="flex shrink-0 flex-col items-center"
							style="min-width:22px;height:100%;position:relative"
							title="{s.tanggal.slice(8)} {s.jam_buka}–{s.jam_tutup ??
								'?'} | {s.jumlah_transaksi} trx | Rp {fmtRpK(s.total_penjualan)}"
						>
							<div class="flex w-full flex-1 items-end">
								<div
									style="width:100%;height:{pct}%;min-height:{pct > 0 ? 2 : 0}px;
                  background:{s.status === 'tutup' ? 'var(--accent)' : 'var(--border)'};
                  border-radius:2px 2px 0 0;opacity:{pct === 0 ? 0.3 : 1}"
								></div>
							</div>
							<span style="position:absolute;bottom:-1.3rem;font-size:.55rem;color:var(--text-dim)"
								>{s.tanggal.slice(8)}</span
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="min-w-full" style="border-collapse:collapse;font-size:.8rem;min-width:540px">
				<thead>
					<tr style="background:var(--surface2)">
						<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
							>Tanggal</th
						>
						<th class="px-2 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
							>Jam</th
						>
						<th
							class="hidden px-2 py-2 text-left text-xs font-semibold sm:table-cell"
							style="color:var(--text-dim)">Durasi</th
						>
						<th class="px-2 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
							>Trx</th
						>
						<th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
							>Penjualan</th
						>
						<th
							class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
							style="color:var(--text-dim)">Trx/jam</th
						>
						<th
							class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
							style="color:var(--text-dim)">Selisih Kas</th
						>
						<th class="px-2 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)"
							>Status</th
						>
					</tr>
				</thead>
				<tbody>
					{#each d.per_shift as s (s.id)}
						<tr style="border-top:1px solid var(--border)">
							<td class="px-3 py-2" style="color:var(--text)">
								{new Date(s.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
									weekday: 'short',
									day: 'numeric',
									month: 'short'
								})}
							</td>
							<td class="px-2 py-2 text-xs" style="color:var(--text-dim)"
								>{s.jam_buka}–{s.jam_tutup ?? '?'}</td
							>
							<td class="hidden px-2 py-2 sm:table-cell" style="color:var(--text-dim)"
								>{fmtMenit(s.durasi_menit)}</td
							>
							<td class="px-2 py-2 text-right font-semibold" style="color:var(--text)"
								>{s.jumlah_transaksi}</td
							>
							<td class="px-3 py-2 text-right font-semibold" style="color:var(--accent)"
								>Rp {fmtRpK(s.total_penjualan)}</td
							>
							<td class="hidden px-2 py-2 text-right sm:table-cell" style="color:var(--text-dim)"
								>{s.trx_per_jam ?? '—'}</td
							>
							<td
								class="hidden px-2 py-2 text-right sm:table-cell"
								style="color:{s.selisih_kas != null && s.selisih_kas !== 0
									? s.selisih_kas > 0
										? 'var(--accent)'
										: 'var(--danger)'
									: 'var(--text-dim)'}"
							>
								{s.selisih_kas != null
									? (s.selisih_kas >= 0 ? '+' : '') +
										new Intl.NumberFormat('id-ID').format(s.selisih_kas)
									: '—'}
							</td>
							<td class="px-2 py-2 text-center">
								<span
									class="rounded px-1.5 py-0.5 text-xs"
									style="background:{s.status === 'tutup'
										? 'rgba(var(--accent-rgb,0,128,0),.15)'
										: 'var(--surface2)'};
                         color:{s.status === 'tutup' ? 'var(--accent)' : 'var(--warn)'}"
								>
									{s.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{:else if store.performaList.length === 0}
	<p class="py-4 text-sm" style="color:var(--text-dim)">
		Tidak ada kasir aktif atau belum ada shift di bulan ini.
	</p>
{:else}
	<div class="overflow-x-auto">
		<table class="min-w-full" style="border-collapse:collapse;font-size:.8rem;min-width:560px">
			<thead>
				<tr style="background:var(--surface2)">
					<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
						>Kasir</th
					>
					<th class="px-2 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
						>Shift</th
					>
					<th
						class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Trx</th
					>
					<th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
						>Penjualan</th
					>
					<th
						class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Trx/jam</th
					>
					<th
						class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Avg/Trx</th
					>
					<th
						class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Void%</th
					>
					<th
						class="hidden px-2 py-2 text-right text-xs font-semibold sm:table-cell"
						style="color:var(--text-dim)">Hadir</th
					>
					<th class="px-2 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)"
						>Detail</th
					>
				</tr>
			</thead>
			<tbody>
				{#each store.performaList.sort((a, b) => b.total_penjualan - a.total_penjualan) as p (p.id)}
					<tr style="border-top:1px solid var(--border)">
						<td class="px-3 py-2 font-semibold" style="color:var(--text)">{p.nama}</td>
						<td class="px-2 py-2 text-right" style="color:var(--text-dim)">
							{p.total_shift}
							{#if p.total_shift > p.shift_ditutup}
								<span class="text-xs" style="color:var(--warn)"
									>({p.total_shift - p.shift_ditutup}buka)</span
								>
							{/if}
						</td>
						<td
							class="hidden px-2 py-2 text-right font-semibold sm:table-cell"
							style="color:var(--text)">{p.total_transaksi}</td
						>
						<td class="px-3 py-2 text-right font-bold" style="color:var(--accent)"
							>Rp {fmtRpK(p.total_penjualan)}</td
						>
						<td class="hidden px-2 py-2 text-right sm:table-cell" style="color:var(--text-dim)">
							{p.trx_per_jam > 0 ? p.trx_per_jam : '—'}
						</td>
						<td class="hidden px-2 py-2 text-right sm:table-cell" style="color:var(--text-dim)">
							{p.rata_per_trx > 0 ? `Rp ${fmtRpK(p.rata_per_trx)}` : '—'}
						</td>
						<td
							class="hidden px-2 py-2 text-right sm:table-cell"
							style="color:{p.void_rate_pct > 1 ? 'var(--warn)' : 'var(--text-dim)'}"
						>
							{p.void_rate_pct > 0 ? `${p.void_rate_pct}%` : '—'}
						</td>
						<td
							class="hidden px-2 py-2 text-right sm:table-cell"
							style="color:{p.absensi.alpa > 0 ? 'var(--warn)' : 'var(--text-dim)'}"
						>
							{p.absensi.hadir}
							{#if p.absensi.alpa > 0}
								<span class="text-xs" style="color:var(--danger)">/{p.absensi.alpa}alpa</span>
							{/if}
						</td>
						<td class="px-2 py-2 text-center">
							<button
								onclick={() => store.muatPerformaDetail(p.id)}
								class="rounded border px-2 py-0.5 text-xs"
								style="border-color:var(--border);color:var(--info);cursor:pointer"
							>
								Detail →
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
