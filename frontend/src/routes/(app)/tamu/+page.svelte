<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import { api } from '$lib/utils/api.js';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	type TamuRow = {
		id: number;
		nama_tamu: string;
		instansi: string | null;
		keperluan: string;
		tanggal: string;
		jam_masuk: string | null;
		jam_keluar: string | null;
		keterangan: string | null;
	};

	let rows = $state<TamuRow[]>([]);
	let loading = $state(false);
	let dariBulan = $state('');
	let formOpen = $state(false);
	let error = $state('');

	let fNama = $state('');
	let fInstansi = $state('');
	let fKeperluan = $state('');
	let fTanggal = $state(new Date().toISOString().slice(0, 10));
	let fJamMasuk = $state('');
	let fJamKeluar = $state('');
	let fKeterangan = $state('');

	async function muatTamu() {
		loading = true;
		const q = new URLSearchParams();
		if (dariBulan) {
			q.set('dari', dariBulan + '-01');
			q.set('sampai', dariBulan + '-31');
		}
		const r = await api.get<TamuRow[]>(`/tamu?${q}`);
		if (r.success) rows = r.data;
		loading = false;
	}

	function bukaForm() {
		fNama = '';
		fInstansi = '';
		fKeperluan = '';
		fTanggal = new Date().toISOString().slice(0, 10);
		fJamMasuk = '';
		fJamKeluar = '';
		fKeterangan = '';
		error = '';
		formOpen = true;
	}

	async function simpan() {
		error = '';
		if (!fNama.trim()) {
			error = 'Nama tamu wajib';
			return;
		}
		if (!fKeperluan.trim()) {
			error = 'Keperluan wajib';
			return;
		}
		if (!fTanggal) {
			error = 'Tanggal wajib';
			return;
		}
		const r = await api.post('/tamu', {
			nama_tamu: fNama.trim(),
			instansi: fInstansi.trim() || undefined,
			keperluan: fKeperluan.trim(),
			tanggal: fTanggal,
			jam_masuk: fJamMasuk || undefined,
			jam_keluar: fJamKeluar || undefined,
			keterangan: fKeterangan.trim() || undefined
		});
		if (!r.success) {
			error = (r as any).error;
			return;
		}
		formOpen = false;
		muatTamu();
	}

	async function hapus(id: number) {
		if (!confirm('Hapus catatan tamu ini?')) return;
		await api.delete(`/tamu/${id}`);
		muatTamu();
	}

	$effect(() => {
		dariBulan;
		muatTamu();
	});
</script>

<svelte:head><title>Tamu — Stokasir</title></svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		<h1 class="mr-2 text-base font-bold">Tamu Birokrasi</h1>
		<input
			type="month"
			bind:value={dariBulan}
			class="rounded border px-2 py-1 text-sm"
			style="background:var(--surface);border-color:var(--border);color:var(--text)"
		/>
		<Button onclick={bukaForm} clasz="ml-auto">+ Catat Tamu</Button>
	</div>

	{#if loading}
		<div class="flex justify-center py-6"><Spinner /></div>
	{:else if rows.length === 0}
		<p class="py-4 text-sm" style="color:var(--text-dim)">
			Belum ada catatan tamu{dariBulan ? ' bulan ini' : ''}.
		</p>
	{:else}
		<div class="overflow-x-auto rounded border" style="border-color:var(--border)">
			<table class="min-w-full text-sm" style="border-collapse:collapse;min-width:500px">
				<thead>
					<tr style="background:var(--surface2)">
						<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
							>Tanggal</th
						>
						<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
							>Nama Tamu</th
						>
						<th
							class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
							style="color:var(--text-dim)">Instansi</th
						>
						<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
							>Keperluan</th
						>
						<th
							class="hidden px-3 py-2 text-left text-xs font-semibold sm:table-cell"
							style="color:var(--text-dim)">Jam</th
						>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.id)}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-2 text-xs">{row.tanggal}</td>
							<td class="px-3 py-2 font-medium">{row.nama_tamu}</td>
							<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)"
								>{row.instansi ?? '—'}</td
							>
							<td class="px-3 py-2 text-sm">
								<div>{row.keperluan}</div>
								{#if row.keterangan}
									<div class="mt-0.5 text-xs" style="color:var(--text-dim)">{row.keterangan}</div>
								{/if}
							</td>
							<td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)">
								{row.jam_masuk ?? '—'}{row.jam_keluar ? ` – ${row.jam_keluar}` : ''}
							</td>
							<td class="px-3 py-2 text-right">
								<button
									onclick={() => hapus(row.id)}
									class="rounded px-2 py-0.5 text-xs"
									style="color:var(--danger)">Hapus</button
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- ── Modal: Form Tamu ──────────────────────────────────────────────────────── -->
<SlideOver bind:open={formOpen} title="Catat Tamu Birokrasi">
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				simpan();
			}}
			class="flex flex-col gap-3 text-sm"
		>
			<div class="flex flex-col gap-1">
				<label for="ft-nama" class="text-xs" style="color:var(--text-dim)">NAMA TAMU *</label>
				<input
					id="ft-nama"
					bind:value={fNama}
					required
					placeholder="Nama lengkap tamu"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="ft-inst" class="text-xs" style="color:var(--text-dim)">INSTANSI / ASAL</label>
				<input
					id="ft-inst"
					bind:value={fInstansi}
					placeholder="mis. Dinas Perdagangan, Kelurahan"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="ft-kep" class="text-xs" style="color:var(--text-dim)">KEPERLUAN *</label>
				<input
					id="ft-kep"
					bind:value={fKeperluan}
					required
					placeholder="mis. Inspeksi BPOM, Perpanjang izin"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="col-span-2 flex flex-col gap-1">
					<label for="ft-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
					<input
						id="ft-tgl"
						type="date"
						bind:value={fTanggal}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="ft-masuk" class="text-xs" style="color:var(--text-dim)">JAM MASUK</label>
					<input
						id="ft-masuk"
						type="time"
						bind:value={fJamMasuk}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="ft-keluar" class="text-xs" style="color:var(--text-dim)">JAM KELUAR</label>
					<input
						id="ft-keluar"
						type="time"
						bind:value={fJamKeluar}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<label for="ft-ket" class="text-xs" style="color:var(--text-dim)">KETERANGAN</label>
				<input
					id="ft-ket"
					bind:value={fKeterangan}
					placeholder="Catatan tambahan (opsional)"
					class="rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>
			{#if error}
				<p class="text-xs" style="color:var(--danger)">{error}</p>
			{/if}
			<div class="mt-1 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (formOpen = false)}
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
