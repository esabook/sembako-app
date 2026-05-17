<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { api } from '$lib/utils/api.js'
	import { user } from '$lib/stores/auth.js'
	import { toast } from '$lib/stores/ui.store.js'
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
		wa_nomor: '',
		tema_default: 'dark',
		harga_default: 'eceran',
	})

	onMount(async () => {
		const res = await api.get<Settings>('/pengaturan')
		if (res.success) {
			form = { ...form, ...res.data }
		} else {
			toast.error('Gagal memuat pengaturan')
		}
		loading = false
	})

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
</script>

<div class="mx-auto max-w-2xl space-y-6 p-4 pb-16">
	<div class="flex items-center justify-between">
		<h1 class="text-lg font-bold" style="color:var(--text)">Pengaturan Toko</h1>
	</div>

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
					placeholder="Toko Sembako"
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
					{#each [['58', '58mm'], ['80', '80mm']] as [val, label]}
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
		<section class="rounded border p-4 space-y-4" style="background:var(--surface);border-color:var(--border)">
			<h2 class="text-sm font-bold uppercase tracking-widest" style="color:var(--text-dim)">Preferensi</h2>

			<div class="space-y-1">
				<span class="text-xs" style="color:var(--text-dim)">Tema Default</span>
				<div class="flex gap-3">
					{#each [['dark', 'Dark'], ['light', 'Light'], ['eye', 'Eye Comfort']] as [val, label]}
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

			<div class="space-y-1">
				<span class="text-xs" style="color:var(--text-dim)">Harga Default Kasir</span>
				<div class="flex gap-3">
					{#each [['eceran', 'Eceran'], ['grosir', 'Grosir']] as [val, label]}
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
		</section>

		<!-- ── Tombol Simpan ─────────────────────────────────────────── -->
		<div class="flex justify-end">
			<Button onclick={simpan} loading={saving}>
				Simpan Pengaturan
			</Button>
		</div>
	{/if}
</div>
