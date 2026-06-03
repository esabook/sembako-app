<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import { toast } from '$lib/stores/ui.store.js'
	import { font, FONT_LABEL, FONT_CSS, type FontPilihan } from '$lib/stores/font.js'
	import { ukuranFont, UKURAN_MIN, UKURAN_MAX } from '$lib/stores/ukuran-font.js'
	import { audioLoad, audioSave, playKasirSound, type AudioMode } from '$lib/utils/audio.js'
	import Button from '$lib/components/ui/Button.svelte'
	import Spinner from '$lib/components/ui/Spinner.svelte'

	// Hanya pemilik yang bisa akses
	$effect(() => {
		if ($user && $user.role !== 'pemilik') goto('/dashboard')
	})

	type Settings = {
		nama_toko: string
		alamat: string
		telepon: string
		email: string
		struk_header: string
		struk_footer: string
		struk_ukuran: string
		struk_copy: string
		auto_cetak: string
		wa_nomor: string
		tema_default: string
		harga_default: string
	}

	let loading = $state(true)
	let saving = $state(false)

	let form = $state<Settings>({
		nama_toko: '',
		alamat: '',
		telepon: '',
		email: '',
		struk_header: '',
		struk_footer: '',
		struk_ukuran: '80',
		struk_copy: '1',
		auto_cetak: 'false',
		wa_nomor: '',
		tema_default: 'dark',
		harga_default: 'eceran',
	})

	// ── Audio Kasir (localStorage, per-device) ──────────────────────────────────
	let audioOn       = $state(true)
	let audioMode     = $state<AudioMode>('beep')
	let audioFileName = $state('')
	let audioFileSrc  = $state('')
	let audioFileErr  = $state('')

	onMount(async () => {
		const res = await api.get<Settings>('/pengaturan')
		if (res.success) {
			form = { ...form, ...res.data }
		} else {
			toast.error('Gagal memuat pengaturan')
		}
		loading = false

		const a = audioLoad()
		audioOn       = a.on
		audioMode     = a.mode
		audioFileName = a.name
		audioFileSrc  = a.src
	})

	function simpanAudio() {
		audioSave({ on: audioOn, mode: audioMode, src: audioFileSrc, name: audioFileName })
	}

	function pilihFileAudio(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		audioFileErr = ''
		if (file.size > 2 * 1024 * 1024) {
			audioFileErr = 'File terlalu besar (maks. 2MB). Gunakan klip pendek.'
			return
		}
		const reader = new FileReader()
		reader.onload = (ev) => {
			audioFileSrc  = ev.target?.result as string
			audioFileName = file.name
			simpanAudio()
		}
		reader.readAsDataURL(file)
	}

	function hapusFileAudio() {
		audioFileSrc  = ''
		audioFileName = ''
		audioMode     = 'beep'
		simpanAudio()
	}

	async function simpan() {
		saving = true
		const res = await api.post<Settings>('/pengaturan/bulk', form)
		if (res.success) {
			toast.sukses('Pengaturan tersimpan')
		} else {
			toast.error('Gagal menyimpan pengaturan')
		}
		saving = false
	}

	// ── Backup & Restore ────────────────────────────────────────────────────────
	let restoring = $state(false)
	let restoreFile = $state<File | null>(null)
	let restoreConfirm = $state(false)

	function pilihFileRestore(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0]
		if (!f) return
		if (!f.name.endsWith('.db')) {
			toast.error('Pilih file .db hasil backup Stokasir')
			return
		}
		restoreFile = f
		restoreConfirm = false
	}

	async function jalankanRestore() {
		if (!restoreFile) return
		restoring = true
		const fd = new FormData()
		fd.append('file', restoreFile)
		const res = await fetch('/api/pengaturan/restore-db', {
			method: 'POST',
			body: fd,
			credentials: 'include',
		})
		const json = await res.json()
		if (json.success) {
			toast.sukses('Restore berhasil. Halaman akan dimuat ulang...')
			setTimeout(() => window.location.reload(), 3000)
		} else {
			toast.error(json.error ?? 'Restore gagal')
		}
		restoring = false
		restoreConfirm = false
	}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Spinner />
		</div>
	{:else}
		<!-- ── Identitas Toko ─────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Identitas Toko</h2>

			<div class="space-y-1">
				<label for="nama_toko" class="text-xs" style="color:var(--text-dim)">Nama Toko</label>
				<input
					id="nama_toko"
					type="text"
					bind:value={form.nama_toko}
					placeholder="Stokasir"
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
			</div>

			<div class="space-y-1">
				<label for="alamat" class="text-xs" style="color:var(--text-dim)">Alamat</label>
				<textarea
					id="alamat"
					bind:value={form.alamat}
					placeholder="Jl. ..."
					rows="2"
					class="w-full rounded border px-3 py-2 text-sm resize-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<label for="telepon" class="text-xs" style="color:var(--text-dim)">Telepon</label>
					<input
						id="telepon"
						type="tel"
						bind:value={form.telepon}
						placeholder="08xx..."
						class="w-full rounded border px-3 py-2 text-sm"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="space-y-1">
					<label for="email" class="text-xs" style="color:var(--text-dim)">Email</label>
					<input
						id="email"
						type="email"
						bind:value={form.email}
						placeholder="toko@email.com"
						class="w-full rounded border px-3 py-2 text-sm"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>
		</section>

		<!-- ── Struk ─────────────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Struk</h2>

			<div class="space-y-1">
				<label for="struk_header" class="text-xs" style="color:var(--text-dim)">Header Struk</label>
				<textarea
					id="struk_header"
					bind:value={form.struk_header}
					placeholder="Teks di atas struk (nama toko, alamat, dll)"
					rows="2"
					class="w-full rounded border px-3 py-2 text-sm resize-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>

			<div class="space-y-1">
				<label for="struk_footer" class="text-xs" style="color:var(--text-dim)">Footer Struk</label>
				<textarea
					id="struk_footer"
					bind:value={form.struk_footer}
					placeholder="Teks di bawah struk (ucapan terima kasih, dll)"
					rows="2"
					class="w-full rounded border px-3 py-2 text-sm resize-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>

			<div class="space-y-1">
				<span class="text-xs" style="color:var(--text-dim)">Ukuran Kertas</span>
				<div class="flex gap-3">
					{#each ([['58', '58mm'], ['80', '80mm']] as [string,string][]) as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={form.struk_ukuran}
								value={val}
								class="accent-green-500"
							/>
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="space-y-1">
				<span class="text-xs" style="color:var(--text-dim)">Jumlah Salinan (Copy)</span>
				<div class="flex gap-3">
					{#each ([['1', '1 copy'], ['2', '2 copy']] as [string,string][]) as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={form.struk_copy}
								value={val}
								class="accent-green-500"
							/>
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="flex items-center justify-between rounded border p-3" style="border-color:var(--border);background:var(--surface2)">
				<div>
					<div class="text-sm font-medium" style="color:var(--text)">Auto-cetak setelah transaksi</div>
					<div class="text-xs mt-0.5" style="color:var(--text-dim)">Struk langsung tercetak tanpa harus klik tombol Cetak Struk</div>
				</div>
				<button
					onclick={() => { form.auto_cetak = form.auto_cetak === 'true' ? 'false' : 'true' }}
					class="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
					style="background:{form.auto_cetak === 'true' ? 'var(--accent)' : 'var(--border)'}"
					aria-label="Toggle auto-cetak"
					role="switch"
					aria-checked={form.auto_cetak === 'true'}
				>
					<span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
						style="transform:translateX({form.auto_cetak === 'true' ? '1.25rem' : '0.125rem'})"></span>
				</button>
			</div>

			<div>
				<a href="/pengaturan/struk" class="text-xs underline" style="color:var(--accent)">
					Preview & test cetak struk →
				</a>
			</div>
		</section>

		<!-- ── WhatsApp ──────────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">WhatsApp</h2>

			<div class="space-y-1">
				<label for="wa_nomor" class="text-xs" style="color:var(--text-dim)">Nomor WhatsApp Toko</label>
				<input
					id="wa_nomor"
					type="tel"
					bind:value={form.wa_nomor}
					placeholder="628xx... (format internasional, tanpa +)"
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				/>
				<p class="text-xs" style="color:var(--text-dim)">Digunakan untuk alert internal (stok habis, void, tutup shift)</p>
			</div>
		</section>

		<!-- ── Preferensi ────────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-5" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Preferensi</h2>

			<div class="space-y-2">
				<span class="text-xs" style="color:var(--text-dim)">Tema Default</span>
				<div class="flex flex-wrap gap-3">
					{#each [['dark','Dark'],['light','Light'],['eye','Eye Comfort'],['bww','BW Putih'],['bwb','BW Hitam'],['island','Island'],['klasik','Klasik']] as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={form.tema_default}
								value={val}
								class="accent-green-500"
							/>
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<span class="text-xs" style="color:var(--text-dim)">Harga Default Kasir</span>
				<div class="flex gap-3">
					{#each [['eceran', 'Eceran'], ['grosir', 'Grosir']] as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={form.harga_default}
								value={val}
								class="accent-green-500"
							/>
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Font Family -->
			<div class="space-y-2">
				<span class="text-xs" style="color:var(--text-dim)">Font</span>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each Object.entries(FONT_LABEL) as [id, label] (id)}
						<button
							type="button"
							onclick={() => font.set(id as FontPilihan)}
							class="rounded border px-3 py-2 text-left transition-colors"
							style="
								background:{$font === id ? 'color-mix(in srgb,var(--accent) 12%,var(--surface2))' : 'var(--surface2)'};
								border-color:{$font === id ? 'var(--accent)' : 'var(--border)'};
								color:var(--text);
								font-family:{FONT_CSS[id as FontPilihan]}
							"
						>
							<div class="text-xs truncate" style="color:var(--text-dim)">{label}</div>
							<div class="text-base leading-tight">Aa 0123</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Font Size -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs" style="color:var(--text-dim)">Ukuran Font</span>
					<span class="text-xs font-mono" style="color:var(--accent)">{$ukuranFont}px</span>
				</div>
				<input
					type="range"
					min={UKURAN_MIN}
					max={UKURAN_MAX}
					bind:value={$ukuranFont}
					class="w-full accent-green-500"
				/>
				<p
					class="rounded border px-3 py-2 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				>
					Preview: Stokasir — Rp 1.234.567 — stok 99 pcs
				</p>
			</div>
		</section>

		<!-- ── Audio Kasir ──────────────────────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Audio Kasir</h2>
				<span class="text-xs" style="color:var(--text-dim)">Tersimpan di perangkat ini</span>
			</div>

			<label class="flex items-center gap-3 cursor-pointer select-none">
				<input
					type="checkbox"
					bind:checked={audioOn}
					onchange={simpanAudio}
					class="accent-green-500 w-4 h-4 shrink-0"
				/>
				<span class="text-sm" style="color:var(--text)">Aktifkan suara saat item ditambahkan ke keranjang</span>
			</label>

			{#if audioOn}
				<div class="flex gap-5">
					{#each [['beep', 'Beep bawaan'], ['file', 'File audio']] as const as [val, label] (val)}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={audioMode}
								value={val}
								onchange={simpanAudio}
								class="accent-green-500"
							/>
							<span class="text-sm" style="color:var(--text)">{label}</span>
						</label>
					{/each}
				</div>

				{#if audioMode === 'file'}
					<div class="space-y-2">
						<div class="flex flex-wrap items-center gap-3">
							<label
								class="cursor-pointer rounded border px-3 py-1.5 text-sm"
								style="background:var(--surface2);border-color:var(--border);color:var(--text)"
							>
								📂 Pilih file...
								<input type="file" accept="audio/*" class="hidden" onchange={pilihFileAudio} />
							</label>
							{#if audioFileName}
								<span class="text-xs truncate max-w-48 font-mono" style="color:var(--accent)">{audioFileName}</span>
								<button type="button" onclick={hapusFileAudio} class="text-xs shrink-0" style="color:var(--danger)">
									✕ hapus
								</button>
							{:else}
								<span class="text-xs" style="color:var(--text-dim)">Belum ada file dipilih</span>
							{/if}
						</div>
						{#if audioFileErr}
							<p class="text-xs" style="color:var(--danger)">{audioFileErr}</p>
						{:else}
							<p class="text-xs" style="color:var(--text-dim)">Format: MP3, WAV, OGG. Disarankan di bawah 500KB.</p>
						{/if}
					</div>
				{/if}

				<button
					type="button"
					onclick={() => playKasirSound()}
					class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				>
					▶ Preview suara
				</button>
			{/if}
		</section>

		<!-- ── Backup & Restore Database ───────────────────────────── -->
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Backup & Restore Database</h2>

			<!-- Export -->
			<div class="space-y-1">
				<p class="text-xs font-semibold" style="color:var(--text)">Export / Download Backup</p>
				<p class="text-xs" style="color:var(--text-dim)">Download salinan penuh database SQLite. Simpan di tempat aman sebagai cadangan sebelum update besar.</p>
				<a
					href="/api/pengaturan/backup-db"
					download
					class="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium mt-1"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				>
					↓ Download Backup (.db)
				</a>
			</div>

			<hr style="border-color:var(--border)" />

			<!-- Restore -->
			<div class="space-y-2">
				<p class="text-xs font-semibold" style="color:var(--text)">Restore dari Backup</p>
				<p class="text-xs" style="color:var(--text-dim)">
					Upload file <code class="font-mono">.db</code> hasil backup. <strong style="color:var(--danger)">Semua data saat ini akan diganti.</strong> Lakukan hanya jika yakin.
				</p>

				<input
					type="file"
					accept=".db"
					onchange={pilihFileRestore}
					class="text-xs"
					style="color:var(--text-dim)"
				/>

				{#if restoreFile && !restoreConfirm}
					<div class="flex items-center gap-3 rounded border px-3 py-2" style="border-color:var(--warn);background:rgba(255,193,7,.08)">
						<span class="text-xs" style="color:var(--warn)">File: <strong>{restoreFile.name}</strong> ({(restoreFile.size / 1024 / 1024).toFixed(1)} MB)</span>
						<button
							onclick={() => restoreConfirm = true}
							class="rounded px-3 py-1 text-xs font-bold"
							style="background:var(--danger);color:#fff;border:none;cursor:pointer"
						>Yakin? Restore Sekarang</button>
						<button
							onclick={() => { restoreFile = null; restoreConfirm = false }}
							class="text-xs"
							style="background:none;border:none;color:var(--text-dim);cursor:pointer"
						>Batal</button>
					</div>
				{/if}

				{#if restoreConfirm}
					<div class="rounded border px-3 py-2 space-y-2" style="border-color:var(--danger);background:rgba(255,82,82,.08)">
						<p class="text-xs font-bold" style="color:var(--danger)">⚠ Konfirmasi Restore</p>
						<p class="text-xs" style="color:var(--text-dim)">Data saat ini akan hilang dan diganti dengan isi file backup. Server akan restart otomatis.</p>
						<div class="flex gap-2">
							<button
								onclick={jalankanRestore}
								disabled={restoring}
								class="rounded px-3 py-1 text-xs font-bold"
								style="background:var(--danger);color:#fff;border:none;cursor:pointer;opacity:{restoring ? 0.6 : 1}"
							>{restoring ? 'Memproses...' : 'Restore & Restart Server'}</button>
							<button
								onclick={() => { restoreConfirm = false; restoreFile = null }}
								class="text-xs"
								style="background:none;border:none;color:var(--text-dim);cursor:pointer"
							>Batal</button>
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- ── Tombol Simpan ─────────────────────────────────────────── -->
		<div class="flex justify-end">
			<Button onclick={simpan} loading={saving}>
				Simpan Pengaturan
			</Button>
		</div>
	{/if}
</div>
