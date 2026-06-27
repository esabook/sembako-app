<script lang="ts">
	// Self-service profil + lifecycle toko. Semua role: edit info + ganti password + ganti PIN.
	// Pemilik: zona bahaya (nonaktif / hapus toko 30 hari) dgn konfirmasi password + survei.
	// Saat toko nonaktif / dijadwalkan hapus (isReadonly): form dikunci, zona bahaya disembunyikan,
	// hanya banner pemulihan (aktifkan / batalkan) yang aktif.
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { user } from '$lib/stores/auth';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import { rupiah } from '$lib/utils/format';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	type Profil = {
		id: number;
		kode_karyawan: string;
		nama: string;
		role: string;
		username: string;
		email: string | null;
		kontak: string | null;
		foto_path: string | null;
		gaji_pokok: number;
		tipe_gaji: string;
		has_pin: boolean;
		status_toko: string | null;
		hapus_terjadwal: string | null;
		sisa_hari_hapus: number | null;
	};

	const ALASAN_OPSI = [
		'Tidak dipakai lagi',
		'Pindah ke aplikasi lain',
		'Terlalu susah',
		'Fitur kurang lengkap',
		'Ada kendala teknis',
		'Lainnya'
	];

	let loading = $state(true);
	let profil = $state<Profil | null>(null);

	// Form info akun
	let nama = $state('');
	let simpanInfo = $state(false);

	// Form password
	let pwTampil = $state(false);
	let pwLama = $state('');
	let pwBaru = $state('');
	let pwKonfirmasi = $state('');
	let simpanPw = $state(false);

	// Form PIN
	let pinLama = $state('');
	let pinBaru = $state('');
	let pinKonfirmasi = $state('');
	let simpanPin = $state(false);

	// Modal destruktif
	let dlgMode = $state<null | 'hapus' | 'nonaktif'>(null);
	let konfirmasiPw = $state('');
	let alasan = $state<string[]>([]);
	let prosesToko = $state(false);

	const isPemilik = $derived($user?.role === 'pemilik');
	// Terkunci bila toko nonaktif ATAU dijadwalkan dihapus → form read-only.
	const isReadonly = $derived(
		!!profil && (profil.status_toko === 'deactivated' || profil.sisa_hari_hapus !== null)
	);

	function inisial(nama: string) {
		return nama
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}

	async function muat() {
		loading = true;
		const res = await api.get<Profil>('/akun/profil');
		if (res.success) {
			profil = res.data;
			nama = res.data.nama;
		} else {
			toast.error(res.error || 'Gagal memuat profil');
		}
		loading = false;
	}

	async function simpanInfoAkun(e: Event) {
		e.preventDefault();
		simpanInfo = true;
		const res = await api.put('/akun/profil', { nama: nama.trim() });
		simpanInfo = false;
		if (res.success) {
			toast.sukses('Profil diperbarui.');
			await muat();
		} else {
			toast.error(res.error || 'Gagal menyimpan');
		}
	}

	async function gantiPassword(e: Event) {
		e.preventDefault();
		if (pwBaru.length < 6) return toast.error('Password baru minimal 6 karakter');
		if (pwBaru !== pwKonfirmasi) return toast.error('Konfirmasi password tidak cocok');
		simpanPw = true;
		const res = await api.post('/akun/ganti-password', { lama: pwLama, baru: pwBaru });
		simpanPw = false;
		if (res.success) {
			toast.sukses('Password diubah.');
			pwLama = pwBaru = pwKonfirmasi = '';
			pwTampil = false;
		} else {
			toast.error(res.error || 'Gagal mengubah password');
		}
	}

	async function gantiPin(e: Event) {
		e.preventDefault();
		if (!/^\d{4}$/.test(pinBaru)) return toast.error('PIN harus 4 digit angka');
		if (pinBaru !== pinKonfirmasi) return toast.error('Konfirmasi PIN tidak cocok');
		simpanPin = true;
		const body: Record<string, string> = { baru: pinBaru };
		if (profil?.has_pin) body.lama = pinLama;
		const res = await api.post('/akun/ganti-pin', body);
		simpanPin = false;
		if (res.success) {
			toast.sukses('PIN absensi diubah.');
			pinLama = pinBaru = pinKonfirmasi = '';
			await muat();
		} else {
			toast.error(res.error || 'Gagal mengubah PIN');
		}
	}

	// Aksi pemulihan tanpa password (low-risk): aktifkan / batalkan hapus.
	async function aksiPemulihan(path: string, sukses: string) {
		prosesToko = true;
		const res = await api.post(`/akun/toko/${path}`, {});
		prosesToko = false;
		if (res.success) {
			toast.sukses(sukses);
			await muat();
		} else {
			toast.error(res.error || 'Gagal memproses');
		}
	}

	function bukaModal(mode: 'hapus' | 'nonaktif') {
		dlgMode = mode;
		konfirmasiPw = '';
		alasan = [];
	}

	function toggleAlasan(a: string) {
		alasan = alasan.includes(a) ? alasan.filter((x) => x !== a) : [...alasan, a];
	}

	// Konfirmasi destruktif: kirim password + alasan. Keduanya → paksa logout.
	async function submitDestruktif() {
		if (!dlgMode || !konfirmasiPw) return;
		const mode = dlgMode;
		prosesToko = true;
		const res = await api.post(`/akun/toko/${mode}`, { password: konfirmasiPw, alasan });
		prosesToko = false;
		if (!res.success) {
			toast.error(res.error || 'Gagal memproses');
			return;
		}
		dlgMode = null;
		if (mode === 'nonaktif') {
			toast.sukses('Toko dinonaktifkan. Kamu akan keluar.');
		} else {
			toast.sukses('Penghapusan dijadwalkan (30 hari). Kamu akan keluar.');
		}
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		await invalidateAll();
		goto('/');
	}

	onMount(muat);
</script>

<svelte:head><title>Profil & Akun — Stokasir</title></svelte:head>

<div class="flex max-w-2xl flex-col gap-6">
	<div>
		<h2 class="text-base font-bold">Profil & Akun</h2>
		<p class="mt-0.5 text-xs" style="color:var(--text-dim)">Kelola data diri & keamanan akun</p>
	</div>

	<!-- Banner privasi akun -->
	<div
		class="flex items-start gap-3 rounded border p-3 text-xs"
		style="background:color-mix(in srgb,var(--info,#3b82f6) 8%,transparent);border-color:color-mix(in srgb,var(--info,#3b82f6) 30%,transparent);color:var(--text-dim)"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="mt-0.5 shrink-0"
			style="color:var(--info,#3b82f6)"
		>
			<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
				x1="12"
				y1="16"
				x2="12.01"
				y2="16"
			/>
		</svg>
		<span>
			<strong style="color:var(--text)">Akun ini bersifat rahasia pribadi.</strong>
			Jangan bagikan username, password, atau PIN kepada orang lain — termasuk sesama karyawan.
		</span>
	</div>

	{#if loading}
		<div
			class="space-y-3 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			<Skeleton w="40%" h="0.9rem" />
			<Skeleton w="100%" h="2.2rem" />
			<Skeleton w="100%" h="2.2rem" />
		</div>
	{:else if profil}
		<!-- Banner grace hapus (escape: batalkan) -->
		{#if profil.sisa_hari_hapus !== null}
			<div
				class="flex flex-col gap-2 rounded border p-4 sm:flex-row sm:items-center sm:justify-between"
				style="background:color-mix(in srgb,var(--danger) 10%,transparent);border-color:var(--danger)"
			>
				<div>
					<p class="text-sm font-bold" style="color:var(--danger)">
						Toko dijadwalkan dihapus dalam {profil.sisa_hari_hapus} hari
					</p>
					<p class="text-xs" style="color:var(--text-dim)">
						Akun terkunci. Semua data dikunci setelah masa tenggang. Bisa dibatalkan kapan saja.
					</p>
				</div>
				<button
					class="btn btn-sm"
					disabled={prosesToko}
					onclick={() => aksiPemulihan('batal-hapus', 'Penghapusan dibatalkan.')}
				>
					Batalkan Penghapusan
				</button>
			</div>
		{:else if profil.status_toko === 'deactivated'}
			<!-- Banner nonaktif (escape: aktifkan) -->
			<div
				class="flex flex-col gap-2 rounded border p-4 sm:flex-row sm:items-center sm:justify-between"
				style="background:color-mix(in srgb,var(--warn) 12%,transparent);border-color:var(--warn)"
			>
				<div>
					<p class="text-sm font-bold" style="color:var(--warn)">Toko sedang nonaktif</p>
					<p class="text-xs" style="color:var(--text-dim)">
						Akun terkunci. Aktifkan kembali untuk membuka akses.
					</p>
				</div>
				<button
					class="btn btn-sm btn-success"
					disabled={prosesToko}
					onclick={() => aksiPemulihan('aktifkan', 'Toko diaktifkan kembali.')}
				>
					Aktifkan Toko
				</button>
			</div>
		{/if}

		<!-- Foto + identitas ringkas -->
		<div
			class="flex items-center gap-4 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			{#if profil.foto_path}
				<img
					src={profil.foto_path}
					alt={profil.nama}
					class="h-16 w-16 shrink-0 rounded-full object-cover"
					style="border:2px solid var(--border)"
				/>
			{:else}
				<div
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold"
					style="background:color-mix(in srgb,var(--primary) 15%,transparent);color:var(--primary)"
				>
					{inisial(profil.nama)}
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold">{profil.nama}</p>
				<p class="text-xs capitalize" style="color:var(--text-dim)">{profil.role}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">
					Gaji pokok:
					<strong style="color:var(--text)"
						>{rupiah(profil.gaji_pokok)} / {profil.tipe_gaji}</strong
					>
				</p>
			</div>
		</div>

		<!-- Info Akun -->
		<form
			onsubmit={simpanInfoAkun}
			class="flex flex-col gap-3 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			<fieldset disabled={isReadonly} class="contents">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Info Akun
				</h3>
				<div class="grid gap-1 text-xs" style="color:var(--text-dim)">
					<span>Username: <strong style="color:var(--text)">{profil.username}</strong></span>
					<span>Kode: {profil.kode_karyawan} · Role: {profil.role}</span>
				</div>
				<label class="flex flex-col gap-1 text-sm">
					<span style="color:var(--text-dim)">Nama</span>
					<input bind:value={nama} class="input input-sm w-full" required />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span style="color:var(--text-dim)">Email</span>
					<input
						value={profil.email ?? ''}
						type="email"
						class="input input-sm w-full"
						placeholder="—"
						readonly
						tabindex="-1"
						style="opacity:0.6;cursor:not-allowed"
					/>
					<span class="text-xs" style="color:var(--text-dim)">
						Hubungi admin untuk mengubah email.
					</span>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span style="color:var(--text-dim)">Kontak</span>
					<input
						value={profil.kontak ?? ''}
						class="input input-sm w-full"
						placeholder="—"
						readonly
						tabindex="-1"
						style="opacity:0.6;cursor:not-allowed"
					/>
					<span class="text-xs" style="color:var(--text-dim)">
						Hubungi admin untuk mengubah kontak.
					</span>
				</label>
				<div>
					<button type="submit" class="btn btn-sm btn-primary" disabled={simpanInfo}>
						Simpan Perubahan
					</button>
				</div>
			</fieldset>
		</form>

		<!-- Ganti PIN Absensi -->
		<form
			onsubmit={gantiPin}
			class="flex flex-col gap-3 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			<fieldset disabled={isReadonly} class="contents">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					PIN Absensi
				</h3>
				<p class="text-xs" style="color:var(--text-dim)">
					{profil.has_pin ? 'PIN sudah diatur. Masukkan PIN lama untuk mengubah.' : 'Belum ada PIN. Buat PIN 4 digit untuk absensi kiosk.'}
				</p>
				{#if profil.has_pin}
					<input
						bind:value={pinLama}
						type="password"
						inputmode="numeric"
						maxlength="4"
						class="input input-sm w-full"
						placeholder="PIN lama (4 digit)"
						required
					/>
				{/if}
				<input
					bind:value={pinBaru}
					type="password"
					inputmode="numeric"
					maxlength="4"
					class="input input-sm w-full"
					placeholder="PIN baru (4 digit)"
					required
				/>
				<input
					bind:value={pinKonfirmasi}
					type="password"
					inputmode="numeric"
					maxlength="4"
					class="input input-sm w-full"
					placeholder="Ulangi PIN baru"
					required
				/>
				<div>
					<button type="submit" class="btn btn-sm btn-primary" disabled={simpanPin}>
						{profil.has_pin ? 'Ubah PIN' : 'Buat PIN'}
					</button>
				</div>
			</fieldset>
		</form>

		<!-- Ganti Password (collapsed) -->
		<div
			class="flex flex-col rounded border"
			style="background:var(--surface);border-color:var(--border)"
		>
			<button
				type="button"
				class="flex items-center justify-between p-4 text-left"
				onclick={() => (pwTampil = !pwTampil)}
			>
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Ganti Password
				</h3>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					style="color:var(--text-dim);transition:transform .2s;transform:rotate({pwTampil ? 180 : 0}deg)"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>
			{#if pwTampil}
				<form onsubmit={gantiPassword} class="flex flex-col gap-3 border-t p-4" style="border-color:var(--border)">
					<fieldset disabled={isReadonly} class="contents">
						<input
							bind:value={pwLama}
							type="password"
							class="input input-sm w-full"
							placeholder="Password lama"
							required
						/>
						<input
							bind:value={pwBaru}
							type="password"
							class="input input-sm w-full"
							placeholder="Password baru (min 6)"
							required
						/>
						<input
							bind:value={pwKonfirmasi}
							type="password"
							class="input input-sm w-full"
							placeholder="Ulangi password baru"
							required
						/>
						<div>
							<button type="submit" class="btn btn-sm btn-primary" disabled={simpanPw}
								>Ubah Password</button
							>
						</div>
					</fieldset>
				</form>
			{/if}
		</div>

		<!-- Zona Bahaya — pemilik only, disembunyikan saat terkunci -->
		{#if isPemilik && !isReadonly}
			<div class="flex flex-col gap-3 rounded border p-4" style="border-color:var(--danger)">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--danger)">
					Zona Bahaya
				</h3>
				<div class="flex items-center justify-between gap-2">
					<div>
						<p class="text-sm font-medium">Nonaktifkan toko</p>
						<p class="text-xs" style="color:var(--text-dim)">
							Jeda akses. Bisa diaktifkan lagi kapan saja.
						</p>
					</div>
					<button class="btn btn-sm" onclick={() => bukaModal('nonaktif')}>Nonaktifkan</button>
				</div>
				<div
					class="flex items-center justify-between gap-2 border-t pt-3"
					style="border-color:var(--border)"
				>
					<div>
						<p class="text-sm font-medium" style="color:var(--danger)">Hapus toko</p>
						<p class="text-xs" style="color:var(--text-dim)">
							Masa tenggang 30 hari sebelum dikunci.
						</p>
					</div>
					<button class="btn btn-sm btn-error" onclick={() => bukaModal('hapus')}>Hapus Toko</button
					>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Modal konfirmasi destruktif: survei + password -->
{#if dlgMode}
	{@const isHapus = dlgMode === 'hapus'}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,.55)"
	>
		<div
			class="flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5"
			style="background:var(--surface);border-color:var(--border)"
		>
			<h3 class="text-base font-bold" style="color:var(--danger)">
				{isHapus ? 'Hapus Toko' : 'Nonaktifkan Toko'}
			</h3>

			<div
				class="rounded border p-3 text-xs"
				style="background:color-mix(in srgb,var(--danger) 8%,transparent);border-color:var(--danger);color:var(--text-dim)"
			>
				{#if isHapus}
					Toko dijadwalkan seegra dihapus dalam <strong style="color:var(--danger)">30 hari</strong
					>. Selama masa tenggang akun yang terhapus bisa dibatalkan. Setelah itu seluruh data
					dihapus permanen.
				{:else}
					Akses semua karyawan akan dihentikan sampai toko diaktifkan kembali. Kamu akan keluar
					setelah ini.
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<p class="text-xs font-semibold" style="color:var(--text-dim)">
					Bantu kami kenapa {isHapus ? 'menghapus' : 'menonaktifkan'}? (opsional)
				</p>
				{#each ALASAN_OPSI as a (a)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							checked={alasan.includes(a)}
							onchange={() => toggleAlasan(a)}
						/>
						{a}
					</label>
				{/each}
			</div>

			<label class="flex flex-col gap-1 text-sm">
				<span style="color:var(--text-dim)">Konfirmasi dengan password kamu</span>
				<input
					bind:value={konfirmasiPw}
					type="password"
					class="input input-sm w-full"
					placeholder="Password"
				/>
			</label>

			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost btn-sm" disabled={prosesToko} onclick={() => (dlgMode = null)}>
					Batal
				</button>
				<button
					class="btn btn-sm btn-error"
					disabled={prosesToko || !konfirmasiPw}
					onclick={submitDestruktif}
				>
					{isHapus ? 'Jadwalkan Hapus' : 'Nonaktifkan'}
				</button>
			</div>
		</div>
	</div>
{/if}
