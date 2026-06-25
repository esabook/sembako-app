<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SectionCard from '$lib/components/layout/SectionCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { api } from '$lib/utils/api.js';
	import { withLoading } from '$lib/utils/async.js';
	import { imgUrl } from '$lib/utils/upload.js';
	import { rupiah } from '$lib/utils/format.js';

	// Instruksi transfer statis — sesuaikan dengan rekening operator SaaS.
	const REKENING = { bank: 'BCA', nomor: '1234567890', atasNama: 'PT Stokasir Nusantara' };
	const HARGA_BULAN = 99_000;

	type Riwayat = {
		id: number;
		periode_bulan: number;
		nominal: number;
		bukti_path: string | null;
		status: 'menunggu' | 'disetujui' | 'ditolak';
		catatan_admin: string | null;
		created_at: string;
	};
	type StatusLangganan = {
		status_langganan: 'trial' | 'aktif' | 'suspended';
		trial_berakhir: string | null;
		aktif_sampai: string | null;
		sisa_hari: number | null;
		riwayat: Riwayat[];
	};

	let data = $state<StatusLangganan | null>(null);

	// Form upload bukti
	let nominal = $state<number>(HARGA_BULAN);
	let periodeBulan = $state<number>(1);
	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let mengirim = $state(false);

	const sisa = $derived(data?.sisa_hari ?? null);
	const warnaCountdown = $derived(
		sisa === null ? 'var(--text-dim)' : sisa < 0 ? 'var(--danger)' : sisa <= 7 ? 'var(--warn)' : 'var(--accent)'
	);
	const badgeStatus = $derived(
		data?.status_langganan === 'aktif' ? 'sukses' : data?.status_langganan === 'suspended' ? 'danger' : 'warn'
	);
	const badgeBukti = (s: Riwayat['status']) =>
		s === 'disetujui' ? 'sukses' : s === 'ditolak' ? 'danger' : 'warn';

	async function muat() {
		const res = await api.get<StatusLangganan>('/langganan');
		if (res.success) data = res.data;
	}

	onMount(muat);

	function pilihFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0] ?? null;
		file = f;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
	}

	async function kirimBukti() {
		if (!file) return;
		if (!nominal || nominal <= 0) return;
		mengirim = true;
		const fd = new FormData();
		fd.append('nominal', String(nominal));
		fd.append('periode_bulan', String(periodeBulan));
		fd.append('file', file);
		const hasil = await withLoading(
			async () => {
				const res = await api.upload('/langganan/bukti', fd);
				if (!res.success) throw new Error(res.error);
				return res.data;
			},
			{
				loadingKey: 'kirim-bukti',
				loadingPesan: 'Mengirim bukti…',
				suksesOtomatis: true,
				suksesPesan: 'Bukti terkirim — menunggu verifikasi',
				modul: 'pengaturan',
				aksi: 'kirim bukti langganan'
			}
		);
		mengirim = false;
		if (hasil) {
			file = null;
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			previewUrl = null;
			await muat();
		}
	}

	function tglPendek(iso: string): string {
		return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<PageHeader judul="Langganan" sub="Status berlangganan dan upload bukti transfer" />

{#if data}
	<div class="grid gap-4 md:grid-cols-2">
		<!-- Status card -->
		<SectionCard judul="Status">
			<div class="flex items-center gap-3">
				<Badge tipe={badgeStatus}>{data.status_langganan}</Badge>
				{#if sisa !== null}
					<span class="text-sm font-bold" style="color:{warnaCountdown}">
						{sisa < 0 ? `Lewat ${Math.abs(sisa)} hari` : `Sisa ${sisa} hari`}
					</span>
				{/if}
			</div>
			<p class="mt-2 text-xs" style="color:var(--text-dim)">
				{#if data.status_langganan === 'aktif'}
					Aktif sampai {data.aktif_sampai ? tglPendek(data.aktif_sampai) : '—'}
				{:else if data.status_langganan === 'trial'}
					Trial berakhir {data.trial_berakhir ? tglPendek(data.trial_berakhir) : '—'}
				{:else}
					Akun nonaktif — transaksi terkunci sampai pembayaran diverifikasi.
				{/if}
			</p>
		</SectionCard>

		<!-- Instruksi transfer -->
		<SectionCard judul="Instruksi Transfer">
			<dl class="space-y-1 text-sm">
				<div class="flex justify-between"><dt style="color:var(--text-dim)">Bank</dt><dd>{REKENING.bank}</dd></div>
				<div class="flex justify-between"><dt style="color:var(--text-dim)">No. Rekening</dt><dd class="font-mono font-bold">{REKENING.nomor}</dd></div>
				<div class="flex justify-between"><dt style="color:var(--text-dim)">Atas Nama</dt><dd>{REKENING.atasNama}</dd></div>
				<div class="flex justify-between"><dt style="color:var(--text-dim)">Harga / bulan</dt><dd class="font-bold">{rupiah(HARGA_BULAN)}</dd></div>
			</dl>
		</SectionCard>
	</div>

	<!-- Form upload bukti -->
	<div class="mt-4">
		<SectionCard judul="Upload Bukti Transfer">
			<div class="grid gap-3 sm:grid-cols-2">
				<Input label="Nominal (Rp)" type="number" bind:value={nominal} />
				<Input label="Periode (bulan)" type="number" bind:value={periodeBulan} />
			</div>
			<div class="mt-3">
				<span class="mb-1 block text-xs" style="color:var(--text-dim)">Bukti (gambar / PDF)</span>
				<input type="file" accept="image/*,application/pdf" onchange={pilihFile} class="text-sm" />
			</div>
			{#if previewUrl}
				<img src={previewUrl} alt="Preview bukti" class="mt-3 max-h-48 rounded border" style="border-color:var(--border)" />
			{/if}
			<div class="mt-3">
				<Button variant="primary" disabled={!file || mengirim} loading={mengirim} onclick={kirimBukti}>
					Kirim Bukti
				</Button>
			</div>
		</SectionCard>
	</div>

	<!-- Riwayat -->
	<div class="mt-4">
		<SectionCard judul="Riwayat Pembayaran">
			{#if data.riwayat.length === 0}
				<EmptyState pesan="Belum ada pembayaran" />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-left text-xs" style="color:var(--text-dim)">
								<th class="py-1.5 pr-2">Tanggal</th>
								<th class="py-1.5 pr-2">Periode</th>
								<th class="py-1.5 pr-2">Nominal</th>
								<th class="py-1.5 pr-2">Status</th>
								<th class="py-1.5 pr-2">Bukti</th>
								<th class="py-1.5">Catatan</th>
							</tr>
						</thead>
						<tbody>
							{#each data.riwayat as r (r.id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="py-1.5 pr-2 whitespace-nowrap">{tglPendek(r.created_at)}</td>
									<td class="py-1.5 pr-2">{r.periode_bulan} bln</td>
									<td class="py-1.5 pr-2 whitespace-nowrap">{rupiah(r.nominal)}</td>
									<td class="py-1.5 pr-2"><Badge tipe={badgeBukti(r.status)}>{r.status}</Badge></td>
									<td class="py-1.5 pr-2">
										{#if r.bukti_path}
											{@const u = imgUrl(r.bukti_path)}
											{#if u}<a href={u} target="_blank" rel="noreferrer" class="underline" style="color:var(--accent)">lihat</a>{/if}
										{:else}—{/if}
									</td>
									<td class="py-1.5" style="color:var(--text-dim)">{r.catatan_admin ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</SectionCard>
	</div>
{/if}
