<script lang="ts">
	import KartuHarga from './KartuHarga.svelte';
	import KatalogFitur from './KatalogFitur.svelte';
	import BukuTamuDemo from './BukuTamuDemo.svelte';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Boxes from '@lucide/svelte/icons/boxes';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Activity from '@lucide/svelte/icons/activity';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';

	// Placeholder isi nomor Telegram, URL donasi & domain asli.
	const WA = 'https://t.me/stokasir';
	const DONASI = 'http://lynk.id/digitrait/s/xgp8gygl9xg7';
	const SITE = ''; // mis. 'https://stokasir.app' kosong = pakai URL relatif

	const DESKRIPSI =
		'Aplikasi stok & kasir ringan untuk toko kecil. Masih tahap awal tapi semua fitur gratis, dibatasi kuota penyimpanan & lalu-lintas data ke server. Butuh masukan dari pemilik toko.';

	const fitur: { ikon: typeof ShoppingCart; judul: string; teks: string }[] = [
		{
			ikon: ShoppingCart,
			judul: 'Kasir Cepat',
			teks: 'Scanner USB/Bluetooth atau ketik manual. Shortcut keyboard F1–F12.'
		},
		{
			ikon: Boxes,
			judul: 'Stok Multi-Cabang',
			teks: 'Pantau stok tiap cabang, mutasi antar gudang, stok minimum otomatis.'
		},
		{
			ikon: ChartColumn,
			judul: 'Laporan Jelas',
			teks: 'Omzet, laba, dan barang terlaris harian. Tutup buku tanpa hitung manual.'
		},
		{
			ikon: WifiOff,
			judul: 'Tetap Jalan Offline',
			teks: 'Mode LAN/lokal untuk jaringan lambat. Transaksi tak putus saat internet mati.'
		}
	];

	const ajakan: { ikon: typeof FlaskConical; judul: string; teks: string }[] = [
		{
			ikon: FlaskConical,
			judul: 'Jadi tester',
			teks: 'Pakai di toko nyata dan bantu temukan yang masih kasar.'
		},
		{
			ikon: MessageSquare,
			judul: 'Kirim feedback',
			teks: 'Ceritakan apa yang kurang. Masukanmu menentukan arah fitur.'
		},
		{
			ikon: Activity,
			judul: 'Pemakaian aktif',
			teks: 'Makin sering dipakai, makin cepat matang dan stabil.'
		},
		{
			ikon: HeartHandshake,
			judul: 'Dukungan dana',
			teks: 'Biaya server ditanggung sukarela. Dukungan kecil sangat membantu.'
		}
	];

	const fiturTier = [
		'Semua fitur terbuka tanpa kunci',
		'Kasir + manajemen stok lengkap',
		'Multi-cabang & multi-karyawan',
		'Cetak struk & barcode'
	];
</script>

<svelte:head>
	<title>Stokasir - Aplikasi Stok &amp; Kasir Toko Grosir &amp; Eceran</title>
	<meta name="description" content={DESKRIPSI} />
	{#if SITE}
		<link rel="canonical" href="{SITE}/" />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Stokasir - Aplikasi Stok &amp; Kasir Toko" />
	<meta property="og:description" content={DESKRIPSI} />
	{#if SITE}
		<meta property="og:url" content="{SITE}/" />
	{/if}
	{#if SITE}<meta property="og:image" content="{SITE}/logo.webp" />{/if}
	<meta property="og:locale" content="id_ID" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Stokasir - Aplikasi Stok &amp; Kasir Toko" />
	<meta name="twitter:description" content={DESKRIPSI} />
	<meta name="twitter:image" content="{SITE}/logo.webp" />
</svelte:head>

<!-- Hero -->
<section class="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
	<span
		class="inline-block rounded-full border px-3 py-1 text-xs font-medium"
		style="border-color:var(--accent);color:var(--accent)"
	>
		Tahap awal · early access
	</span>
	<h1 class="mx-auto mt-4 max-w-3xl text-2xl leading-tight font-bold sm:text-3xl">
		Stok &amp; kasir toko, dibangun <span style="color:var(--accent)">pelan-pelan</span>
	</h1>
	<p class="mx-auto mt-4 max-w-xl text-sm sm:text-base" style="color:var(--text-dim)">
		Masih tahap awal. <strong style="color:var(--text)">Semua fitur terbuka gratis</strong>, yang
		membatasi hanya kuota penyimpanan &amp; lalu-lintas baca/tulis ke server. Ini bukan produk
		jualan; kami butuh pengguna untuk uji coba, beri saran-masukan, dan dukungan.
	</p>
	<div class="mt-8 flex flex-col items-center justify-center gap-3">
		<a
			href="/daftar"
			class="btn"
			style="background:var(--accent);color:var(--bg);border-color:var(--accent)"
			data-sveltekit-preload-data="off"
		>
			Mulai Gratis
		</a>
		<a href="/login" class="btn btn-ghost" data-sveltekit-preload-data="off">
			Sudah punya akun? <span style="color:var(--accent)">Masuk</span>
		</a>
	</div>
</section>

<!-- Fitur -->
<section class="mx-auto max-w-5xl px-4 py-8">
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each fitur as f (f.judul)}
			<div class="rounded-2xl border p-4" style="border-color:var(--border)">
				<f.ikon class="size-6" style="color:var(--accent)" />
				<h2 class="mt-3 text-sm font-semibold">{f.judul}</h2>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{f.teks}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Katalog fitur lengkap -->
<KatalogFitur />

<!-- Harga / kuota-tier -->
<section class="mx-auto max-w-5xl px-4 py-12">
	<div class="text-center">
		<h2 class="text-xl font-bold sm:text-2xl">Gratis, dibatasi kuota</h2>
		<p class="mx-auto mt-2 max-w-2xl text-sm" style="color:var(--text-dim)">
			Semua fitur terbuka di semua tier. Yang membatasi hanya kuota penyimpanan &amp; operasi
			baca/tulis server. <strong style="color:var(--text)">Tidak ada fitur yang dikunci.</strong>
		</p>
	</div>
	<div class="mt-8 grid justify-items-center gap-4 sm:grid-cols-3">
		<KartuHarga
			nama="Starter"
			harga="Gratis"
			fitur={[
				'Penyimpanan ±500 MB',
				'Operasi server ±50rb/bln',
				...fiturTier,
				'Cocok untuk 1 toko'
			]}
			catatan="Gratis selamanya, tanpa batas waktu."
		/>
		<KartuHarga
			nama="Pro"
			harga="Gratis"
			fitur={[
				'Penyimpanan ±5 GB',
				'Operasi server lebih besar',
				...fiturTier,
				'Untuk multi-cabang'
			]}
			catatan="Gratis selama early access."
			highlight
		/>
		<KartuHarga
			nama="Custom"
			harga="Hubungi"
			fitur={['Kuota disesuaikan kebutuhan', ...fiturTier, 'Diskusi langsung']}
			cta="Hubungi via Telegram"
			href={WA}
		/>
	</div>
</section>

<!-- Butuh bantuanmu -->
<section class="mx-auto max-w-5xl px-4 py-12">
	<div
		class="rounded-2xl border p-6 sm:p-8"
		style="border-color:var(--border);background:var(--surface, var(--bg))"
	>
		<div class="text-center">
			<h2 class="text-xl font-bold sm:text-2xl">Masih tahap awal. Butuh bantuanmu</h2>
			<p class="mx-auto mt-2 max-w-2xl text-sm" style="color:var(--text-dim)">
				Aplikasi ini dibangun sebagai explorasi dan masih terus dirapikan. Daripada mengejar
				pelanggan, sekarang yang dibutuhkan adalah pemilik toko yang mau coba dan kasih masukan.
			</p>
		</div>
		<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each ajakan as a (a.judul)}
				<div>
					<a.ikon class="size-6" style="color:var(--accent)" />
					<h3 class="mt-3 text-sm font-semibold">{a.judul}</h3>
					<p class="mt-1 text-xs" style="color:var(--text-dim)">{a.teks}</p>
				</div>
			{/each}
		</div>
		<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
			<a
				href={WA}
				class="btn"
				style="background:var(--accent);color:var(--bg);border-color:var(--accent)"
			>
				Beritahu feedback
			</a>
			<a href={DONASI} class="btn btn-ghost">Donasi</a>
		</div>
	</div>
</section>

<BukuTamuDemo />
