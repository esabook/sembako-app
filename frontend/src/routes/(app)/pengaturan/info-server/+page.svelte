<svelte:head><title>Info Server — Stokasir</title></svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import QRCode from 'qrcode';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type ServerInfo = {
		mode?: 'local' | 'cloud';
		lan_ips: string[];
		port_frontend: number | null;
		port_backend: number | null;
		bun_version: string | null;
		platform: string;
		uptime_detik: number | null;
		app_version: string;
		last_commit_date?: string;
	};

	let info = $state<ServerInfo | null>(null);
	let loading = $state(true);
	let qrDataUrl = $state('');
	let selectedIp = $state('');
	let backendStatus = $state<'checking' | 'online' | 'offline'>('checking');

	// Cloud jika backend bilang 'cloud' ATAU PUBLIC_API_URL diset (CF Pages)
	const isCloud = $derived(() => {
		if (info?.mode) return info.mode === 'cloud';
		return !!env.PUBLIC_API_URL;
	});

	const urlUntukHp = $derived(() => {
		if (!info) return '';
		const host = window.location.hostname;
		// Cloud atau akses via IP LAN → pakai URL saat ini
		if (isCloud() || (host !== 'localhost' && host !== '127.0.0.1')) return window.location.origin;
		// Local via localhost → pakai IP LAN dari backend
		if (!selectedIp) return '';
		return `http://${selectedIp}:${info.port_frontend ?? 80}`;
	});

	const infoRows = $derived(() => {
		if (!info) return [] as [string, string][];
		const cloud = isCloud();
		const origin = typeof window !== 'undefined' ? window.location.origin : '—';
		if (cloud) {
			return [
				['IP LAN Server', '— (tidak berlaku)'],
				['Status Backend', ''],
				['URL Aplikasi', origin],
				['Versi App', info.app_version],
				['Build Date', info.last_commit_date ?? '—'],
				['Runtime', info.bun_version ? `Bun ${info.bun_version}` : 'Node.js / Edge'],
				['Platform', info.platform],
			] as [string, string][];
		}
		return [
			['IP LAN Server', info.lan_ips.length ? info.lan_ips.join(', ') : '—'],
			['Port Aplikasi', info.port_frontend != null ? String(info.port_frontend) : '—'],
			['Port Backend API', info.port_backend != null ? String(info.port_backend) : '—'],
			['Status Backend', ''],
			['URL Saat Ini', origin],
			['Versi App', info.app_version],
			['Build Date', info.last_commit_date ?? '—'],
			['Runtime', info.bun_version ? `Bun ${info.bun_version}` : '—'],
			['Platform', info.platform],
			['Uptime Server', info.uptime_detik != null ? formatUptime(info.uptime_detik) : '—'],
		] as [string, string][];
	});

	function formatUptime(detik: number): string {
		const j = Math.floor(detik / 3600);
		const m = Math.floor((detik % 3600) / 60);
		const s = detik % 60;
		if (j > 0) return `${j}j ${m}m`;
		if (m > 0) return `${m}m ${s}d`;
		return `${s}d`;
	}

	async function buatQr(url: string) {
		if (!url) { qrDataUrl = ''; return; }
		qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2 });
	}

	async function cekBackend() {
		backendStatus = 'checking';
		try {
			const res = await api.get('/pengaturan/publik');
			backendStatus = res.success ? 'online' : 'offline';
		} catch {
			backendStatus = 'offline';
		}
	}

	async function salinUrl() {
		const url = urlUntukHp();
		if (!url) { toast.error('IP LAN tidak ditemukan'); return; }
		await navigator.clipboard.writeText(url);
		toast.sukses('URL disalin');
	}

	$effect(() => {
		void buatQr(urlUntukHp());
	});

	onMount(async () => {
		const res = await api.get<ServerInfo>('/pengaturan/server-info');
		if (res.success) {
			info = res.data;
			selectedIp = res.data.lan_ips[0] ?? '';
		}
		loading = false;
		void cekBackend();
	});
</script>

<div class="space-y-5 max-w-lg">

	<!-- QR Koneksi -->
	<div class="rounded-lg border p-5 text-center space-y-3" style="background:var(--surface);border-color:var(--border)">
		<p class="text-sm font-bold" style="color:var(--text)">Hubungkan HP ke Aplikasi Ini</p>

		{#if loading}
			<div class="h-56 flex items-center justify-center"><Spinner /></div>
		{:else if !urlUntukHp()}
			<div class="h-56 flex items-center justify-center text-sm" style="color:var(--warn)">
				IP LAN tidak terdeteksi — pastikan terhubung ke jaringan
			</div>
		{:else}
			<!-- QR code -->
			{#if qrDataUrl}
				<div class="flex justify-center">
					<div class="rounded-lg border-2 p-2 inline-block" style="background:#fff;border-color:var(--accent)">
						<img src={qrDataUrl} alt="QR koneksi" width="220" height="220" />
					</div>
				</div>
			{/if}

			<!-- URL + salin -->
			<div class="flex items-center gap-2 rounded border px-3 py-2" style="background:var(--surface2);border-color:var(--border)">
				<code class="flex-1 text-sm font-mono text-left truncate" style="color:var(--accent)">{urlUntukHp()}</code>
				<button
					onclick={salinUrl}
					class="shrink-0 rounded px-2 py-1 text-xs"
					style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim)"
				>Salin</button>
			</div>

			<!-- Pilih IP jika ada beberapa -->
			{#if (info?.lan_ips?.length ?? 0) > 1}
				<div class="flex flex-wrap justify-center gap-2">
					<span class="text-xs" style="color:var(--text-dim)">Pilih jaringan:</span>
					{#each info!.lan_ips as ip (ip)}
						<button
							onclick={() => { selectedIp = ip; }}
							class="rounded border px-2 py-0.5 text-xs font-mono"
							style={selectedIp === ip
								? 'background:var(--accent);color:#000;border-color:var(--accent)'
								: 'background:var(--surface2);color:var(--text-dim);border-color:var(--border)'}
						>{ip}</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Panduan langkah -->
	<div class="rounded-lg border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
		<p class="text-sm font-bold" style="color:var(--text)">Panduan Koneksi HP</p>
		<ol class="space-y-2">
			{#if isCloud()}
				{#each [
					['1', 'Buka URL di atas dari browser HP — tidak perlu WiFi yang sama'],
					['2', 'Atau scan QR code di atas dengan kamera HP'],
					['3', 'Login dengan akun yang diberikan pemilik'],
				] as [no, langkah] (no)}
					<li class="flex items-start gap-3 text-sm">
						<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5"
							style="background:var(--accent);color:#000">{no}</span>
						<span style="color:var(--text-dim)">{langkah}</span>
					</li>
				{/each}
			{:else}
				{#each [
					['1', 'Pastikan HP terhubung ke WiFi yang sama dengan server ini'],
					['2', 'Buka aplikasi kamera HP → arahkan ke QR di atas'],
					['3', 'Tap notifikasi yang muncul → browser akan membuka aplikasi'],
					['4', 'Atau ketik manual URL di atas ke browser HP'],
					['5', 'Login dengan akun yang diberikan pemilik'],
				] as [no, langkah] (no)}
					<li class="flex items-start gap-3 text-sm">
						<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5"
							style="background:var(--accent);color:#000">{no}</span>
						<span style="color:var(--text-dim)">{langkah}</span>
					</li>
				{/each}
			{/if}
		</ol>
	</div>

	<!-- Info jaringan & sistem -->
	{#if info}
		<div class="rounded-lg border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
			<p class="text-sm font-bold" style="color:var(--text)">Info Jaringan & Sistem</p>
			<table class="w-full text-sm">
				<tbody>
					{#each infoRows() as [label, val] (label)}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="py-1.5 pr-4 text-xs w-36" style="color:var(--text-dim)">{label}</td>
							<td class="py-1.5 font-mono text-xs">
								{#if label === 'Status Backend'}
									{#if backendStatus === 'checking'}
										<span style="color:var(--text-dim)">● Mengecek...</span>
									{:else if backendStatus === 'online'}
										<span style="color:var(--accent)">● Online</span>
									{:else}
										<span style="color:var(--danger)">● Offline</span>
									{/if}
								{:else}
									<span style="color:var(--text)">{val}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<button
				onclick={cekBackend}
				class="text-xs px-3 py-1 rounded border"
				style="border-color:var(--border);color:var(--text-dim)"
			>Cek Ulang Status</button>
		</div>
	{/if}

</div>
