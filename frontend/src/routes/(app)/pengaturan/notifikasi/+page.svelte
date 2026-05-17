<script lang="ts">
	import { onMount } from 'svelte'
	import { user } from '$lib/stores/auth.js'
	import { toast } from '$lib/stores/ui.store.js'
	import Spinner from '$lib/components/ui/Spinner.svelte'
	import { createNotifikasiStore } from './notifikasi.store.js'
	import {
		JENIS_THRESHOLD,
		JENIS_SCHEDULED,
		HARI_LABEL,
		type NotifikasiConfig,
	} from './notifikasi.types.js'

	// Redirect non-pemilik — dibaca saat render (tidak butuh $effect)
	const currentUser = $user

	const store = createNotifikasiStore()

	let editingJenis = $state<string | null>(null)
	let editForm = $state<Partial<NotifikasiConfig>>({})
	let activeTab = $state<'config' | 'log' | 'alerts'>('config')

	onMount(async () => {
		if (currentUser && currentUser.role !== 'pemilik') {
			window.location.href = '/dashboard'
			return
		}
		await store.loadConfigs()
	})

	async function handleTabChange(tab: typeof activeTab) {
		activeTab = tab
		if (tab === 'log' && store.log.length === 0) await store.loadLog()
		if (tab === 'alerts') await store.loadAlerts()
	}

	function bukaEdit(cfg: NotifikasiConfig) {
		editingJenis = cfg.jenis
		editForm = {
			channel: cfg.channel ?? 'dashboard',
			threshold: cfg.threshold,
			jam_kirim: cfg.jam_kirim,
			hari_kirim: cfg.hari_kirim,
			penerima_wa: cfg.penerima_wa,
		}
	}

	function tutupEdit() {
		editingJenis = null
		editForm = {}
	}

	async function simpanEdit(jenis: string) {
		const res = await store.save(jenis, editForm)
		if (res.success) {
			toast.sukses('Pengaturan notifikasi disimpan')
			tutupEdit()
		} else {
			toast.error('Gagal menyimpan')
		}
	}

	function formatWaktu(waktu: string) {
		return new Date(waktu).toLocaleString('id-ID', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit',
		})
	}

	const STATUS_COLOR: Record<string, string> = {
		terkirim: 'var(--accent)',
		gagal: 'var(--danger)',
		pending: 'var(--warn)',
	}

	const CHANNEL_LABEL: Record<string, string> = {
		wa: 'WhatsApp',
		dashboard: 'Dashboard',
		keduanya: 'WA + Dashboard',
	}

	const TABS = [
		{ id: 'config', label: 'Konfigurasi' },
		{ id: 'log',    label: 'Log Terkirim' },
		{ id: 'alerts', label: 'Cek Kondisi' },
	] as const

	const HARI_OPTIONS = [1,2,3,4,5,6,7] as const
</script>

<div class="mx-auto max-w-2xl space-y-6 p-4 pb-16">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/pengaturan" class="text-sm" style="color:var(--text-dim)">← Pengaturan</a>
		<h1 class="text-lg font-bold" style="color:var(--text)">Notifikasi Terpusat</h1>
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 rounded border p-1" style="background:var(--surface);border-color:var(--border)">
		{#each TABS as tab (tab.id)}
			<button
				onclick={() => handleTabChange(tab.id)}
				class="flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors"
				style={activeTab === tab.id ? 'background:var(--accent);color:#000' : 'color:var(--text-dim)'}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- ── Tab: Konfigurasi ────────────────────────────────────────────── -->
	{#if activeTab === 'config'}
		{#if store.loading}
			<div class="flex justify-center py-16"><Spinner /></div>
		{:else if store.error}
			<p class="text-center py-8 text-sm" style="color:var(--danger)">{store.error}</p>
		{:else}
			<div class="space-y-2">
				{#each store.configs as cfg (cfg.jenis)}
					<div
						class="rounded border"
						style="background:var(--surface);border-color:{cfg.aktif ? 'var(--accent)' : 'var(--border)'}"
					>
						<!-- Baris utama -->
						<div class="flex items-center gap-3 p-3">
							<!-- Toggle aktif -->
							<button
								onclick={() => store.toggleAktif(cfg.jenis, !cfg.aktif)}
								disabled={store.savingJenis === cfg.jenis}
								class="relative h-6 w-10 shrink-0 rounded-full transition-colors"
								style="background:{cfg.aktif ? 'var(--accent)' : 'var(--surface2)'}"
								aria-label="Toggle {cfg.label}"
							>
								<span
									class="absolute top-0.5 h-5 w-5 rounded-full transition-all"
									style="background:#fff;left:{cfg.aktif ? '1.25rem' : '0.125rem'}"
								></span>
							</button>

							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium" style="color:var(--text)">{cfg.label}</p>
								<p class="text-xs truncate" style="color:var(--text-dim)">{cfg.deskripsi}</p>
							</div>

							{#if cfg.aktif}
								<span class="text-xs px-1.5 py-0.5 rounded" style="background:var(--surface2);color:var(--text-dim)">
									{CHANNEL_LABEL[cfg.channel ?? 'dashboard']}
								</span>
								<button
									onclick={() => editingJenis === cfg.jenis ? tutupEdit() : bukaEdit(cfg)}
									class="text-xs px-2 py-1 rounded"
									style="color:var(--info)"
								>
									{editingJenis === cfg.jenis ? 'Batal' : 'Atur'}
								</button>
							{/if}
						</div>

						<!-- Panel edit -->
						{#if editingJenis === cfg.jenis}
							<div class="border-t p-3 space-y-3" style="border-color:var(--border);background:var(--surface2)">
								<!-- Channel -->
								<div class="space-y-1">
									<label for="channel-{cfg.jenis}" class="text-xs font-medium" style="color:var(--text-dim)">Kirim via</label>
									<select
										id="channel-{cfg.jenis}"
										bind:value={editForm.channel}
										class="w-full rounded border px-2 py-1.5 text-sm"
										style="background:var(--surface);border-color:var(--border);color:var(--text)"
									>
										<option value="dashboard">Dashboard saja</option>
										<option value="wa">WhatsApp saja</option>
										<option value="keduanya">WA + Dashboard</option>
									</select>
								</div>

								<!-- Nomor WA -->
								{#if editForm.channel === 'wa' || editForm.channel === 'keduanya'}
									<div class="space-y-1">
										<label for="wa-{cfg.jenis}" class="text-xs font-medium" style="color:var(--text-dim)">Nomor WhatsApp penerima</label>
										<input
											id="wa-{cfg.jenis}"
											type="text"
											bind:value={editForm.penerima_wa}
											placeholder="08xx atau +628xx"
											class="w-full rounded border px-2 py-1.5 text-sm"
											style="background:var(--surface);border-color:var(--border);color:var(--text)"
										/>
									</div>
								{/if}

								<!-- Threshold -->
								{#if cfg.jenis in JENIS_THRESHOLD}
									<div class="space-y-1">
										<label for="threshold-{cfg.jenis}" class="text-xs font-medium" style="color:var(--text-dim)">
											Batas ({JENIS_THRESHOLD[cfg.jenis]})
										</label>
										<input
											id="threshold-{cfg.jenis}"
											type="number"
											bind:value={editForm.threshold}
											min="1"
											class="w-full rounded border px-2 py-1.5 text-sm"
											style="background:var(--surface);border-color:var(--border);color:var(--text)"
										/>
									</div>
								{/if}

								<!-- Jam kirim -->
								{#if JENIS_SCHEDULED.includes(cfg.jenis as any)}
									<div class="space-y-1">
										<label for="jam-{cfg.jenis}" class="text-xs font-medium" style="color:var(--text-dim)">Jam kirim (HH:MM)</label>
										<input
											id="jam-{cfg.jenis}"
											type="time"
											bind:value={editForm.jam_kirim}
											class="w-full rounded border px-2 py-1.5 text-sm"
											style="background:var(--surface);border-color:var(--border);color:var(--text)"
										/>
									</div>
								{/if}

								<!-- Hari kirim -->
								{#if cfg.jenis === 'ringkasan_mingguan'}
									<div class="space-y-1">
										<label for="hari-{cfg.jenis}" class="text-xs font-medium" style="color:var(--text-dim)">Hari pengiriman</label>
										<select
											id="hari-{cfg.jenis}"
											bind:value={editForm.hari_kirim}
											class="w-full rounded border px-2 py-1.5 text-sm"
											style="background:var(--surface);border-color:var(--border);color:var(--text)"
										>
											{#each HARI_OPTIONS as h (h)}
												<option value={h}>{HARI_LABEL[h]}</option>
											{/each}
										</select>
									</div>
								{/if}

								{#if cfg.terakhir_dikirim}
									<p class="text-xs" style="color:var(--text-dim)">
										Terakhir: {formatWaktu(cfg.terakhir_dikirim)}
									</p>
								{/if}

								<button
									onclick={() => simpanEdit(cfg.jenis)}
									disabled={store.savingJenis === cfg.jenis}
									class="w-full rounded px-3 py-1.5 text-sm font-medium"
									style="background:var(--accent);color:#000"
								>
									{store.savingJenis === cfg.jenis ? 'Menyimpan...' : 'Simpan'}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- ── Tab: Log Terkirim ───────────────────────────────────────────── -->
	{#if activeTab === 'log'}
		{#if store.loadingLog}
			<div class="flex justify-center py-16"><Spinner /></div>
		{:else if store.log.length === 0}
			<p class="text-center py-16 text-sm" style="color:var(--text-dim)">Belum ada log notifikasi</p>
		{:else}
			<div class="space-y-2">
				{#each store.log as item (item.id)}
					<div class="rounded border p-3 space-y-1" style="background:var(--surface);border-color:var(--border)">
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-mono px-1.5 py-0.5 rounded" style="background:var(--surface2);color:var(--text-dim)">{item.jenis}</span>
							<span class="text-xs font-medium" style="color:{STATUS_COLOR[item.status] ?? 'var(--text-dim)'}">{item.status}</span>
						</div>
						<p class="text-sm" style="color:var(--text)">{item.pesan}</p>
						<div class="flex justify-between text-xs" style="color:var(--text-dim)">
							<span>{CHANNEL_LABEL[item.channel] ?? item.channel}{item.penerima ? ` → ${item.penerima}` : ''}</span>
							<span>{formatWaktu(item.waktu)}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- ── Tab: Cek Kondisi ────────────────────────────────────────────── -->
	{#if activeTab === 'alerts'}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<p class="text-sm" style="color:var(--text-dim)">Cek kondisi terkini berdasarkan config yang aktif</p>
				<button
					onclick={() => store.loadAlerts()}
					disabled={store.loadingAlerts}
					class="text-sm px-3 py-1.5 rounded border"
					style="border-color:var(--border);color:var(--text)"
				>
					{store.loadingAlerts ? 'Mengecek...' : 'Cek Sekarang'}
				</button>
			</div>

			{#if store.loadingAlerts}
				<div class="flex justify-center py-16"><Spinner /></div>
			{:else if store.alerts.length === 0}
				<div class="rounded border p-6 text-center" style="background:var(--surface);border-color:var(--border)">
					<p class="text-2xl mb-2">✓</p>
					<p class="text-sm font-medium" style="color:var(--accent)">Semua kondisi aman</p>
					<p class="text-xs mt-1" style="color:var(--text-dim)">Tidak ada alert yang perlu diperhatikan</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each store.alerts as alert, i (i)}
						<div class="rounded p-3" style="background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--warn)">
							<p class="text-xs font-mono mb-1" style="color:var(--text-dim)">{alert.jenis}</p>
							<p class="text-sm" style="color:var(--text)">{alert.pesan}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
