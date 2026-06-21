<script lang="ts">
	import { onMount } from 'svelte';
	import { withLoading } from '$lib/utils/async';
	import { fetchJadwalStaf, createJadwalStaf, deleteJadwalStaf, fetchStafAktif } from '../jasa.api';
	import type { JadwalStaf, StafAktif } from '../jasa.types';
	import { HARI_LABEL } from '../jasa.types';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let rows = $state<JadwalStaf[]>([]);
	let staf = $state<StafAktif[]>([]);
	let loading = $state(false);
	let formOpen = $state(false);
	let fKaryawanId = $state<number | null>(null);
	let fHari = $state(1);
	let fMulai = $state('08:00');
	let fSelesai = $state('17:00');
	let error = $state('');

	async function muat() {
		loading = true;
		const [j, s] = await Promise.all([fetchJadwalStaf(), fetchStafAktif()]);
		rows = j;
		staf = s;
		loading = false;
	}

	async function simpan() {
		error = '';
		if (!fKaryawanId) { error = 'Pilih staf'; return; }
		if (fMulai >= fSelesai) { error = 'Jam mulai harus sebelum jam selesai'; return; }

		const ok = await withLoading(() => createJadwalStaf({
			karyawan_id: fKaryawanId!,
			hari: fHari,
			jam_mulai: fMulai,
			jam_selesai: fSelesai,
		} as any), {
			loadingKey: 'jadwal-simpan',
			modul: 'jasa', aksi: 'buat-jadwal',
			errorPesan: 'Gagal simpan jadwal',
		});
		if (ok !== null) { formOpen = false; muat(); }
	}

	async function hapus(id: number) {
		await withLoading(() => deleteJadwalStaf(id), {
			loadingKey: `jadwal-hapus-${id}`,
			modul: 'jasa', aksi: 'hapus-jadwal',
			errorPesan: 'Gagal hapus jadwal',
		});
		muat();
	}

	// Group per staf untuk grid
	const byStaf = $derived(
		staf.map((s) => ({
			staf: s,
			jadwal: rows.filter((r) => r.karyawan_id === s.id),
		}))
	);

	onMount(() => { muat(); });
</script>

<div class="p-3 md:p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Jadwal Staf</h1>
		<button class="btn btn-primary btn-sm" onclick={() => formOpen = true}>+ Tambah Jadwal</button>
	</div>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[560px] text-sm">
				<thead>
					<tr class="border-b border-[var(--border)] text-xs text-[var(--text-dim)]">
						<th class="pb-2 text-left">Staf</th>
						{#each HARI_LABEL as h}
							<th class="pb-2 text-center">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each byStaf as { staf: s, jadwal } (s.id)}
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 pr-3 font-medium">{s.nama}</td>
							{#each [0,1,2,3,4,5,6] as hari}
								{@const slot = jadwal.filter((j) => j.hari === hari)}
								<td class="py-1 text-center">
									{#each slot as j (j.id)}
										<div class="group relative">
											<span class="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-xs"
												style="color:var(--accent)"
											>{j.jam_mulai}–{j.jam_selesai}</span>
											<button
												class="absolute -right-1 -top-1 hidden text-[var(--danger)] group-hover:block"
												onclick={() => hapus(j.id)}
												aria-label="Hapus"
											>×</button>
										</div>
									{/each}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Form modal -->
<ModalWindow bind:open={formOpen} title="Tambah Jadwal Staf" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="js-staf">Staf</label>
			<select id="js-staf" class="select select-bordered w-full text-sm" bind:value={fKaryawanId}>
				<option value={null}>— pilih staf —</option>
				{#each staf as s (s.id)}
					<option value={s.id}>{s.nama}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label text-sm" for="js-hari">Hari</label>
			<select id="js-hari" class="select select-bordered w-full text-sm" bind:value={fHari}>
				{#each HARI_LABEL as h, i}
					<option value={i}>{h}</option>
				{/each}
			</select>
		</div>
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="js-mulai">Jam Mulai</label>
				<input id="js-mulai" type="time" class="input input-bordered w-full text-sm" bind:value={fMulai} />
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="js-selesai">Jam Selesai</label>
				<input id="js-selesai" type="time" class="input input-bordered w-full text-sm" bind:value={fSelesai} />
			</div>
		</div>
		{#if error}<p class="text-sm text-[var(--danger)]">{error}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn btn-ghost flex-1" onclick={() => formOpen = false}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={simpan}>Simpan</button>
		</div>
	</div>
</ModalWindow>
