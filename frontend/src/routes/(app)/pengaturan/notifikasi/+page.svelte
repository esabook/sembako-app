<script lang="ts">
	import { onMount } from 'svelte'
	import { user } from '$lib/stores/auth.js'
	import { toast } from '$lib/stores/ui.store.js'
	import Spinner from '$lib/components/ui/Spinner.svelte'
	import { createNotifikasiStore } from './notifikasi.store.svelte.js'
	import {
		JENIS_THRESHOLD,
		JENIS_SCHEDULED,
		HARI_LABEL,
		type NotifikasiConfig,
	} from './notifikasi.types.js'
	import { fetchPiutangReminder, type PiutangReminder } from './notifikasi.api.js'
	import { bukaWhatsApp, renderTemplate } from '$lib/utils/wa.js'
	import { api } from '$lib/utils/api.js'
	import QRCode from 'qrcode'
	import TabBar from '$lib/components/ui/TabBar.svelte'

	// Redirect non-pemilik — dibaca saat render (tidak butuh $effect)
	const currentUser = $user

	const store = createNotifikasiStore()

	let editingJenis = $state<string | null>(null)
	let editForm = $state<Partial<NotifikasiConfig>>({})
	let activeTab = $state<'config' | 'log' | 'alerts' | 'wa'>('config')

	// ── WA nomor pemilik ─────────────────────────────────────────────────────
	let waNomorPemilik = $state('')

	// ── Tab Kirim WA ─────────────────────────────────────────────────────────
	const TEMPLATE_DEFAULT = 'Halo {{nama}}, kami mengingatkan bahwa piutang Anda sebesar Rp {{jumlah}} (No: {{no_transaksi}}) akan jatuh tempo pada {{jatuh_tempo}}. Mohon segera dilunasi. Terima kasih 🙏'
	let batasHari = $state(3)
	let templatePesan = $state(TEMPLATE_DEFAULT)
	let piutangList = $state<PiutangReminder[]>([])
	let loadingWa = $state(false)
	let qrMap = $state<Record<number, string>>({})

	const fmtRp = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n))
	const fmtTgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

	function buatPesan(p: PiutangReminder) {
		return renderTemplate(templatePesan, {
			nama: p.nama_pelanggan ?? 'Pelanggan',
			jumlah: fmtRp(p.sisa_piutang),
			no_transaksi: p.no_transaksi,
			jatuh_tempo: p.tanggal_jatuh_tempo ? fmtTgl(p.tanggal_jatuh_tempo) : '-',
		})
	}

	function waUrl(p: PiutangReminder) {
		const nomor = (p.kontak ?? '').replace(/\D/g, '')
		const pesan = encodeURIComponent(buatPesan(p))
		return nomor ? `https://wa.me/${nomor}?text=${pesan}` : `https://wa.me/?text=${pesan}`
	}

	async function muatPiutangReminder() {
		loadingWa = true
		const res = await fetchPiutangReminder(batasHari)
		if (res.success) {
			piutangList = res.data
			// Generate QR untuk setiap item
			const newMap: Record<number, string> = {}
			for (const p of res.data) {
				newMap[p.id] = await QRCode.toDataURL(waUrl(p), { width: 180, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
			}
			qrMap = newMap
		}
		loadingWa = false
	}

	async function regenerasiQr() {
		const newMap: Record<number, string> = {}
		for (const p of piutangList) {
			newMap[p.id] = await QRCode.toDataURL(waUrl(p), { width: 180, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
		}
		qrMap = newMap
	}

	onMount(async () => {
		if (currentUser && currentUser.role !== 'pemilik') {
			window.location.href = '/dashboard'
			return
		}
		await store.loadConfigs()
		const settRes = await api.get<Record<string, string>>('/pengaturan')
		if (settRes.success) waNomorPemilik = settRes.data?.wa_nomor ?? ''
	})

	function kirimWaAlert() {
		if (!store.alerts.length) return
		const baris = store.alerts.map((a, i) => `${i + 1}. [${a.jenis.replace(/_/g, ' ')}] ${a.pesan}`).join('\n')
		const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
		const pesan = `*ALERT TOKO — ${tgl}*\n\n${baris}\n\n_Dikirim dari aplikasi Sembako_`
		const nomor = waNomorPemilik.replace(/\D/g, '')
		const url = nomor
			? `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`
			: `https://wa.me/?text=${encodeURIComponent(pesan)}`
		window.open(url, '_blank')
	}

	async function handleTabChange(tab: typeof activeTab) {
		activeTab = tab
		if (tab === 'log' && store.log.length === 0) await store.loadLog()
		if (tab === 'alerts') await store.loadAlerts()
		if (tab === 'wa' && piutangList.length === 0) await muatPiutangReminder()
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
		{ key: 'config', label: 'Konfigurasi' },
		{ key: 'log',    label: 'Log Terkirim' },
		{ key: 'alerts', label: 'Cek Kondisi' },
		{ key: 'wa',     label: 'Kirim WA' },
	]

	const HARI_OPTIONS = [1,2,3,4,5,6,7] as const
</script>

<div class="space-y-6">
	<TabBar
		tabs={TABS}
		active={activeTab}
		storageKey="notifikasi"
		onchange={(key) => handleTabChange(key as typeof activeTab)}
	/>

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

	<!-- ── Tab: Kirim WA ──────────────────────────────────────────────── -->
	{#if activeTab === 'wa'}
		<div class="space-y-4">
			<!-- Filter & template -->
			<div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex items-center gap-2 text-sm">
						<label for="batas-hari" style="color:var(--text-dim)">Jatuh tempo dalam</label>
						<input
							id="batas-hari"
							type="number" min="1" max="30"
							bind:value={batasHari}
							class="w-14 rounded border px-2 py-1 text-center text-sm outline-none"
							style="background:var(--surface2);border-color:var(--border);color:var(--text)"
						/>
						<span style="color:var(--text-dim)">hari</span>
					</div>
					<button
						onclick={muatPiutangReminder}
						disabled={loadingWa}
						class="rounded px-3 py-1.5 text-sm font-bold disabled:opacity-60"
						style="background:var(--accent);color:#000"
					>
						{loadingWa ? 'Memuat...' : 'Cari'}
					</button>
				</div>

				<div class="space-y-1">
					<label for="template-pesan" class="text-xs font-medium" style="color:var(--text-dim)">
						Template pesan — placeholder: <code>&#123;&#123;nama&#125;&#125;</code> <code>&#123;&#123;jumlah&#125;&#125;</code> <code>&#123;&#123;jatuh_tempo&#125;&#125;</code> <code>&#123;&#123;no_transaksi&#125;&#125;</code>
					</label>
					<textarea
						id="template-pesan"
						bind:value={templatePesan}
						rows="3"
						onchange={regenerasiQr}
						class="w-full rounded border px-3 py-2 text-sm outline-none resize-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					></textarea>
				</div>
			</div>

			<!-- List piutang -->
			{#if loadingWa}
				<div class="flex justify-center py-16"><Spinner /></div>
			{:else if piutangList.length === 0}
				<div class="rounded border p-8 text-center" style="background:var(--surface);border-color:var(--border)">
					<p class="text-2xl mb-2">✓</p>
					<p class="text-sm font-medium" style="color:var(--accent)">Tidak ada piutang jatuh tempo dalam {batasHari} hari ke depan</p>
				</div>
			{:else}
				<p class="text-xs" style="color:var(--text-dim)">{piutangList.length} piutang akan jatuh tempo dalam {batasHari} hari ke depan</p>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each piutangList as p (p.id)}
						{@const hariSisa = p.tanggal_jatuh_tempo ? Math.ceil((new Date(p.tanggal_jatuh_tempo).getTime() - Date.now()) / 86400000) : 0}
						<div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:{hariSisa <= 1 ? 'var(--danger)' : 'var(--warn)'}">
							<!-- Info -->
							<div class="flex justify-between items-start gap-2">
								<div>
									<p class="font-bold text-sm">{p.nama_pelanggan ?? '—'}</p>
									<p class="text-xs" style="color:var(--text-dim)">{p.no_transaksi}</p>
									{#if p.kontak}
										<p class="text-xs font-mono mt-0.5" style="color:var(--text-dim)">{p.kontak}</p>
									{:else}
										<p class="text-xs italic" style="color:var(--danger)">Nomor HP belum diisi</p>
									{/if}
								</div>
								<div class="text-right shrink-0">
									<p class="font-bold font-mono" style="color:var(--accent)">Rp {fmtRp(p.sisa_piutang)}</p>
									<p class="text-xs" style="color:{hariSisa <= 1 ? 'var(--danger)' : 'var(--warn)'}">
										{#if hariSisa === 0}Jatuh tempo hari ini
										{:else if hariSisa === 1}Besok
										{:else}H-{hariSisa}{/if}
									</p>
									<p class="text-xs" style="color:var(--text-dim)">{p.tanggal_jatuh_tempo ? fmtTgl(p.tanggal_jatuh_tempo) : '-'}</p>
								</div>
							</div>

							<!-- Preview pesan -->
							<div class="rounded p-2 text-xs" style="background:var(--surface2);color:var(--text-dim)">
								{buatPesan(p)}
							</div>

							<!-- QR + actions -->
							<div class="flex items-center gap-4">
								{#if qrMap[p.id]}
									<div class="shrink-0 rounded border p-1" style="background:#fff;border-color:var(--border)">
										<img src={qrMap[p.id]} alt="QR WA {p.nama_pelanggan}" width="90" height="90" />
									</div>
									<div class="space-y-1 text-xs" style="color:var(--text-dim)">
										<p>Scan QR dengan kamera HP → langsung buka WA dengan pesan terisi</p>
									</div>
								{/if}
								<div class="ml-auto">
									<button
										onclick={() => bukaWhatsApp(p.kontak, buatPesan(p))}
										class="rounded px-3 py-1.5 text-xs font-bold"
										style="background:#25D366;color:#fff"
									>
										Buka WA
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Tab: Cek Kondisi ────────────────────────────────────────────── -->
	{#if activeTab === 'alerts'}
		<div class="space-y-4">
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<p class="text-sm" style="color:var(--text-dim)">Cek kondisi terkini berdasarkan config yang aktif</p>
				<div class="flex gap-2">
					{#if store.alerts.length > 0}
						<button
							onclick={kirimWaAlert}
							class="text-sm px-3 py-1.5 rounded border font-medium"
							style="border-color:var(--accent);color:var(--accent)"
						>WA Pemilik ({store.alerts.length})</button>
					{/if}
					<button
						onclick={() => store.loadAlerts()}
						disabled={store.loadingAlerts}
						class="text-sm px-3 py-1.5 rounded border"
						style="border-color:var(--border);color:var(--text)"
					>
						{store.loadingAlerts ? 'Mengecek...' : 'Cek Sekarang'}
					</button>
				</div>
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
