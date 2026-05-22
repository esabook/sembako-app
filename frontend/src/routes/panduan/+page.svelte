<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const saved = localStorage.getItem('tema') ?? 'dark';
		document.documentElement.setAttribute('data-theme', saved);
	});

	type SeksiKey =
		| 'mulai' | 'kasir' | 'gudang' | 'pelanggan'
		| 'karyawan' | 'keuangan' | 'laporan' | 'harga'
		| 'promo' | 'pengaturan' | 'faq';

	let terbuka = $state<Record<SeksiKey, boolean>>({
		mulai: true,
		kasir: false,
		gudang: false,
		pelanggan: false,
		karyawan: false,
		keuangan: false,
		laporan: false,
		harga: false,
		promo: false,
		pengaturan: false,
		faq: false,
	});

	function toggle(key: SeksiKey) {
		terbuka[key] = !terbuka[key];
	}

	function bukaSemuaSeksi() {
		(Object.keys(terbuka) as SeksiKey[]).forEach((k) => (terbuka[k] = true));
	}

	const SEKSI = [
		{ key: 'mulai' as SeksiKey,      ikon: '🚀', label: 'Memulai Aplikasi' },
		{ key: 'kasir' as SeksiKey,      ikon: '🛒', label: 'Kasir (Transaksi)' },
		{ key: 'gudang' as SeksiKey,     ikon: '📦', label: 'Gudang & Stok' },
		{ key: 'pelanggan' as SeksiKey,  ikon: '👥', label: 'Pelanggan' },
		{ key: 'karyawan' as SeksiKey,   ikon: '👷', label: 'Karyawan' },
		{ key: 'keuangan' as SeksiKey,   ikon: '💰', label: 'Keuangan' },
		{ key: 'laporan' as SeksiKey,    ikon: '📊', label: 'Laporan' },
		{ key: 'harga' as SeksiKey,      ikon: '🏷️', label: 'Kelola Harga' },
		{ key: 'promo' as SeksiKey,      ikon: '🎁', label: 'Promo & Diskon' },
		{ key: 'pengaturan' as SeksiKey, ikon: '⚙️', label: 'Pengaturan' },
		{ key: 'faq' as SeksiKey,        ikon: '❓', label: 'Pertanyaan Umum' },
	];
</script>

<svelte:head>
	<title>Panduan Penggunaan — Stokasir</title>
</svelte:head>

<!-- Top bar -->
<header class="sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between"
	style="background:var(--surface);border-color:var(--border)">
	<div class="flex items-center gap-3">
		<img src="/logo.png" alt="Logo" class="h-7 w-7" />
		<div>
			<div class="text-sm font-bold" style="color:var(--accent)">Panduan Penggunaan</div>
			<div class="text-[10px]" style="color:var(--text-dim)">Stokasir — Petunjuk Lengkap</div>
		</div>
	</div>
	<div class="flex items-center gap-2">
		<button onclick={bukaSemuaSeksi}
			class="text-xs px-3 py-1.5 rounded border transition-colors hidden sm:block"
			style="border-color:var(--border);color:var(--text-dim)">
			Buka Semua
		</button>
		<button onclick={() => window.close()}
			class="text-xs px-3 py-1.5 rounded border transition-colors"
			style="border-color:var(--border);color:var(--text-dim)">
			✕ Tutup
		</button>
	</div>
</header>

<div class="flex min-h-screen" style="background:var(--bg);color:var(--text)">

	<!-- Sidebar TOC (desktop) -->
	<aside class="hidden md:flex flex-col w-52 shrink-0 sticky top-14 self-start border-r py-4 px-3 gap-0.5"
		style="background:var(--surface);border-color:var(--border);max-height:calc(100vh - 3.5rem);overflow-y:auto">
		<div class="text-[10px] uppercase tracking-widest mb-2 px-2" style="color:var(--text-dim)">Daftar Isi</div>
		<a href="/panduan/instalasi"
				class="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
				style="color:var(--text-dim)">
				<span>📲</span>
				<span>Panduan Instalasi</span>
			</a>
		{#each SEKSI as s (s.key)}
			<a href="#{s.key}"
				onclick={() => (terbuka[s.key] = true)}
				class="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
				style="color:var(--text-dim)">
				<span>{s.ikon}</span>
				<span>{s.label}</span>
			</a>
		{/each}
	</aside>

	<!-- Konten utama -->
	<main class="flex-1 max-w-3xl mx-auto px-4 py-6 pb-20">

		<!-- Intro -->
		<div class="rounded-lg p-5 mb-6 border" style="background:var(--surface);border-color:var(--border)">
			<h1 class="text-lg font-bold mb-2" style="color:var(--accent)">Selamat Datang di Panduan Toko</h1>
			<p class="text-sm leading-relaxed mb-3" style="color:var(--text-dim)">
				Panduan ini menjelaskan cara menggunakan setiap fitur aplikasi secara langkah demi langkah,
				mulai dari transaksi di kasir hingga laporan keuangan. Tidak perlu keahlian teknis —
				ikuti langkah-langkahnya satu per satu.
			</p>
			<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
				{#each [
					{ label: 'Kasir', href: '#kasir', ikon: '🛒', warna: 'var(--accent)' },
					{ label: 'Gudang', href: '#gudang', ikon: '📦', warna: 'var(--info)' },
					{ label: 'Laporan', href: '#laporan', ikon: '📊', warna: 'var(--warn)' },
					{ label: 'Bantuan', href: '#faq', ikon: '❓', warna: 'var(--text-dim)' },
				] as link (link.href)}
					<a href={link.href}
						onclick={() => { const k = link.href.slice(1) as SeksiKey; terbuka[k] = true; }}
						class="flex flex-col items-center gap-1 p-3 rounded border text-center transition-colors"
						style="border-color:var(--border);background:var(--surface2)">
						<span class="text-xl">{link.ikon}</span>
						<span class="text-xs font-medium" style="color:{link.warna}">{link.label}</span>
					</a>
				{/each}
				<a href="/panduan/instalasi" target="_blank"
					class="flex flex-col items-center gap-1 p-3 rounded border text-center transition-colors"
					style="border-color:var(--border);background:var(--surface2)">
					<span class="text-xl">📲</span>
					<span class="text-xs font-medium" style="color:var(--info)">Instalasi</span>
				</a>
			</div>
		</div>

		<!-- ─── SEKSI: MEMULAI ─── -->
		<section id="mulai" class="mb-4">
			<button onclick={() => toggle('mulai')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">🚀 Memulai Aplikasi</span>
				<span style="color:var(--text-dim)">{terbuka.mulai ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.mulai}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Cara Login</h3>
					<ol class="space-y-2">
						{#each [
							'Buka browser di HP atau komputer, lalu ketik alamat yang diberikan (biasanya diawali dengan angka IP seperti 192.168.x.x).',
							'Halaman login akan muncul. Isi kolom Nama Pengguna dan Kata Sandi yang sudah diberikan oleh pemilik toko.',
							'Klik tombol Masuk. Jika berhasil, Anda akan masuk ke halaman utama.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
						💡 <strong>Lupa kata sandi?</strong> Minta pemilik toko untuk reset kata sandi Anda melalui menu Pengaturan → Karyawan.
					</div>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mengenal Tampilan Utama</h3>
					<div class="space-y-2 text-sm" style="color:var(--text-dim)">
						<p>Setelah login, ada <strong style="color:var(--text)">3 bagian utama</strong> yang perlu dikenal:</p>
						<div class="grid gap-2">
							{#each [
								{ nama: 'Bar Atas (Navbar)', desc: 'Berisi logo toko, jam, dan nama pengguna Anda. Klik nama Anda untuk ganti tema, fullscreen, atau keluar.' },
								{ nama: 'Menu Samping (Sidebar)', desc: 'Daftar halaman yang bisa diakses sesuai peran Anda (Kasir, Gudang, Laporan, dll). Klik ikon untuk membuka halaman.' },
								{ nama: 'Area Konten', desc: 'Bagian utama di tengah layar — tempat semua pekerjaan dilakukan.' },
							] as bagian (bagian.nama)}
								<div class="p-3 rounded border" style="border-color:var(--border);background:var(--bg)">
									<div class="font-medium text-xs mb-1" style="color:var(--text)">{bagian.nama}</div>
									<div class="text-xs">{bagian.desc}</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Ganti Tema Warna</h3>
					<ol class="space-y-2">
						{#each [
							'Klik nama Anda di pojok kanan atas layar.',
							'Di bawah bagian "Tema", pilih salah satu: DARK (gelap), LIGHT (terang), EYE (nyaman malam), atau BW (hitam-putih).',
							'Tema langsung berubah tanpa perlu refresh halaman.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Cara Keluar (Logout)</h3>
					<ol class="space-y-2">
						{#each [
							'Klik nama Anda di pojok kanan atas.',
							'Klik tombol Keluar (berwarna merah) di bagian bawah menu.',
							'Anda akan kembali ke halaman login.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--warn)">
						⚠️ Selalu keluar setelah selesai menggunakan aplikasi, terutama di HP yang dipakai bersama.
					</div>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: KASIR ─── -->
		<section id="kasir" class="mb-4">
			<button onclick={() => toggle('kasir')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">🛒 Kasir (Transaksi Penjualan)</span>
				<span style="color:var(--text-dim)">{terbuka.kasir ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.kasir}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Kasir, Gudang, Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Melakukan Transaksi Penjualan</h3>
					<ol class="space-y-3">
						{#each [
							{ step: 'Pastikan shift sudah dibuka. Jika belum, klik tombol "Buka Shift" yang muncul di bagian atas layar kasir.', tip: '' },
							{ step: 'Klik kolom pencarian di tengah layar (atau tekan tombol F3 di keyboard). Ketik nama barang atau scan barcode.', tip: '' },
							{ step: 'Pilih barang yang muncul dari daftar. Barang otomatis masuk ke keranjang.', tip: '' },
							{ step: 'Atur jumlah barang dengan klik tombol + atau − di sebelah jumlah. Atau langsung ketik angkanya.', tip: 'Untuk menghapus barang dari keranjang, klik tombol ✕ di baris barang tersebut.' },
							{ step: 'Ulangi langkah 2–4 untuk menambah barang lain.', tip: '' },
							{ step: 'Setelah semua barang masuk, klik tombol Checkout (atau tekan F10).', tip: '' },
							{ step: 'Di popup checkout: pilih metode bayar (Tunai / Transfer / QRIS / Hutang), masukkan nominal uang jika tunai.', tip: 'Kembalian dihitung otomatis.' },
							{ step: 'Klik Proses Bayar. Transaksi selesai dan struk siap dicetak.', tip: '' },
						] as item, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<div>
									<div style="color:var(--text-dim)">{item.step}</div>
									{#if item.tip}
										<div class="mt-1 text-xs" style="color:var(--info)">💡 {item.tip}</div>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Memberikan Diskon Member</h3>
					<ol class="space-y-2">
						{#each [
							'Klik tombol Checkout (F10).',
							'Di popup checkout, klik kolom Pelanggan dan ketik nama pelanggan.',
							'Pilih pelanggan dari daftar. Jika pelanggan adalah member, diskon member otomatis diterapkan.',
							'Lanjutkan proses pembayaran seperti biasa.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Melihat Riwayat Transaksi Hari Ini</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman kasir, klik tab atau tombol Riwayat (biasanya di bagian bawah atau pojok kanan).',
							'Daftar transaksi hari ini akan muncul.',
							'Klik salah satu transaksi untuk melihat detailnya.',
							'Klik Cetak Ulang jika perlu mencetak struk lagi.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Retur / Pengembalian Barang</h3>
					<ol class="space-y-2">
						{#each [
							'Tekan F8 atau klik tombol Retur di halaman kasir.',
							'Cari nomor transaksi yang akan diretur.',
							'Pilih barang yang dikembalikan dan masukkan jumlahnya.',
							'Klik Proses Retur. Stok barang akan otomatis bertambah kembali.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Pintasan Keyboard (Shortcut)</h3>
					<div class="grid grid-cols-2 gap-2">
						{#each [
							{ key: 'F3', fungsi: 'Cari barang' },
							{ key: 'F8', fungsi: 'Halaman retur' },
							{ key: 'F10', fungsi: 'Checkout / bayar' },
							{ key: 'F11', fungsi: 'Buka/tutup shift' },
							{ key: 'F12', fungsi: 'Reset keranjang' },
							{ key: 'F1', fungsi: 'Bantuan shortcut' },
							{ key: 'Ctrl+Home', fungsi: 'Sembunyikan/tampilkan menu' },
							{ key: '↑ ↓ Enter', fungsi: 'Navigasi daftar barang' },
						] as sc (sc.key)}
							<div class="flex items-center gap-2 p-2 rounded text-xs" style="background:var(--bg);border:1px solid var(--border)">
								<kbd class="px-2 py-0.5 rounded font-mono text-[11px]"
									style="background:var(--surface2);border:1px solid var(--border);color:var(--accent)">{sc.key}</kbd>
								<span style="color:var(--text-dim)">{sc.fungsi}</span>
							</div>
						{/each}
					</div>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mode Scanner (Barcode HP)</h3>
					<ol class="space-y-2">
						{#each [
							'Klik nama Anda di pojok kanan atas, lalu pilih Mode Scanner.',
							'Halaman scanner terbuka di tab yang sama.',
							'Arahkan kamera HP ke barcode barang — barang otomatis ditambahkan ke keranjang kasir.',
							'Untuk kembali ke kasir, gunakan tombol kembali browser.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: GUDANG ─── -->
		<section id="gudang" class="mb-4">
			<button onclick={() => toggle('gudang')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">📦 Gudang & Stok</span>
				<span style="color:var(--text-dim)">{terbuka.gudang ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.gudang}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Gudang, Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Melihat Stok Barang</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Gudang dari menu di sebelah kiri.',
							'Klik tab STOK. Daftar semua barang beserta jumlah stok saat ini akan muncul.',
							'Barang dengan stok menipis ditandai warna kuning. Stok habis ditandai merah.',
							'Klik nama barang untuk melihat riwayat perubahan stok (masuk/keluar).',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menerima Barang dari Supplier</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Gudang, klik tab TERIMA BARANG.',
							'Klik tombol + Terima Barang.',
							'Pilih nama supplier, isi nomor faktur dari surat jalan supplier.',
							'Tambahkan setiap barang yang diterima: cari nama barang, isi jumlah yang diterima dan harga beli.',
							'Upload foto faktur jika ada (opsional, tapi disarankan untuk arsip).',
							'Klik Simpan. Stok barang otomatis bertambah.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Membuat Purchase Order (PO) ke Supplier</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Gudang, klik tab PO (Purchase Order).',
							'Klik + Buat PO Baru.',
							'Pilih supplier yang dituju.',
							'Tambahkan barang yang dipesan beserta jumlahnya. Sistem akan memberi saran barang yang stoknya sudah menipis.',
							'Klik Simpan. PO akan berstatus Draft.',
							'Setelah siap dikirim ke supplier, ubah status PO menjadi Dikirim.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Stok Opname (Hitung Fisik Barang)</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Gudang, klik tab STOK OPNAME.',
							'Klik + Opname Baru dan beri judul (contoh: "Opname Juni 2025").',
							'Untuk setiap barang, masukkan jumlah fisik yang Anda hitung langsung.',
							'Sistem akan menampilkan selisih antara stok sistem dan fisik.',
							'Isi alasan selisih jika ada (contoh: barang rusak, hilang).',
							'Klik Selesai & Terapkan untuk menyimpan hasil opname. Stok sistem akan diperbarui.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--warn)">
						⚠️ Lakukan stok opname saat toko tutup atau saat transaksi sedang tidak berlangsung untuk hasil yang akurat.
					</div>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menambah Barang Baru</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Gudang, klik tab MASTER BARANG.',
							'Klik tombol + Tambah Barang.',
							'Isi data barang: kode barcode, nama, kategori, satuan, harga beli, dan harga jual.',
							'Atur stok minimum (batas stok yang dianggap menipis).',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: PELANGGAN ─── -->
		<section id="pelanggan" class="mb-4">
			<button onclick={() => toggle('pelanggan')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">👥 Pelanggan</span>
				<span style="color:var(--text-dim)">{terbuka.pelanggan ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.pelanggan}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Kasir, Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menambah Pelanggan Baru</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Pelanggan dari menu samping.',
							'Klik tombol + Tambah Pelanggan.',
							'Isi nama pelanggan, nomor HP, dan alamat (opsional).',
							'Tentukan tipe pelanggan: Eceran atau Grosir. Tipe Grosir mendapat harga lebih murah.',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Melihat Riwayat Belanja & Piutang</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Pelanggan, cari nama pelanggan di kolom pencarian.',
							'Klik nama pelanggan untuk membuka detailnya.',
							'Tab Riwayat menampilkan semua transaksi pelanggan ini.',
							'Tab Piutang menampilkan tagihan yang belum dibayar.',
							'Untuk mengirim tagihan via WhatsApp, klik tombol WA di sebelah tagihan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: KARYAWAN ─── -->
		<section id="karyawan" class="mb-4">
			<button onclick={() => toggle('karyawan')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">👷 Karyawan</span>
				<span style="color:var(--text-dim)">{terbuka.karyawan ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.karyawan}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mencatat Absensi</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Karyawan dari menu samping.',
							'Klik tab ABSENSI.',
							'Pilih tanggal absensi yang ingin dicatat.',
							'Klik Tambah Absensi, pilih nama karyawan, tentukan status (Hadir/Izin/Sakit/Alpha), dan jam masuk/keluar.',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Memproses Penggajian</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Karyawan, klik tab PENGGAJIAN.',
							'Klik + Proses Gaji untuk memilih periode (bulan/tahun).',
							'Sistem akan menghitung gaji otomatis berdasarkan absensi dan gaji pokok.',
							'Periksa perhitungan, tambahkan tunjangan atau potongan jika ada.',
							'Klik Bayar Gaji untuk mengonfirmasi pembayaran. Otomatis dicatat di jurnal keuangan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menambah Karyawan Baru</h3>
					<ol class="space-y-2">
						{#each [
							'Di tab DATA KARYAWAN, klik + Tambah Karyawan.',
							'Isi nama lengkap, username (untuk login), dan buat kata sandi awal.',
							'Pilih peran: Kasir, Gudang, Manajer, atau Pemilik.',
							'Isi gaji pokok dan tipe gaji (bulanan atau harian).',
							'Klik Simpan. Karyawan bisa langsung login dengan username dan kata sandi tersebut.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: KEUANGAN ─── -->
		<section id="keuangan" class="mb-4">
			<button onclick={() => toggle('keuangan')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">💰 Keuangan</span>
				<span style="color:var(--text-dim)">{terbuka.keuangan ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.keuangan}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mencatat Pengeluaran / Pemasukan Manual</h3>
					<p class="text-xs mb-3" style="color:var(--text-dim)">
						Transaksi penjualan dan pembelian barang dicatat otomatis. Gunakan jurnal manual untuk pengeluaran lain seperti listrik, sewa, atau pemasukan selain penjualan.
					</p>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Keuangan dari menu samping.',
							'Klik tab JURNAL KAS.',
							'Klik + Tambah Transaksi.',
							'Pilih jenis: Pemasukan atau Pengeluaran.',
							'Isi keterangan, jumlah, tanggal, dan pilih akun kas yang digunakan.',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Melunasi Hutang ke Supplier</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Keuangan, klik tab HUTANG.',
							'Cari supplier yang hutangnya akan dibayar.',
							'Klik Bayar di sebelah tagihan.',
							'Masukkan jumlah yang dibayarkan dan pilih akun kas.',
							'Klik Simpan. Saldo hutang berkurang otomatis.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menerima Pembayaran Piutang dari Pelanggan</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Keuangan, klik tab PIUTANG.',
							'Cari nama pelanggan.',
							'Klik Terima Bayar di sebelah tagihan.',
							'Masukkan jumlah yang diterima.',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: LAPORAN ─── -->
		<section id="laporan" class="mb-4">
			<button onclick={() => toggle('laporan')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">📊 Laporan</span>
				<span style="color:var(--text-dim)">{terbuka.laporan ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.laporan}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Manajer, Pemilik</strong>
				</div>

				<div class="grid gap-3">
					{#each [
						{ nama: 'Laporan Laba Rugi', desc: 'Menampilkan total pendapatan, biaya, dan laba bersih toko dalam periode tertentu. Gunakan ini untuk mengetahui apakah toko untung atau rugi.' },
						{ nama: 'Laporan Arus Kas', desc: 'Menampilkan semua uang masuk dan keluar. Berguna untuk memantau kondisi keuangan kas toko setiap hari.' },
						{ nama: 'Neraca', desc: 'Ringkasan aset (harta), kewajiban (hutang), dan modal toko. Laporan ini menunjukkan posisi keuangan secara keseluruhan.' },
						{ nama: 'Aging Piutang', desc: 'Daftar pelanggan yang punya hutang, dikelompokkan berdasarkan berapa lama sudah menunggak. Membantu mengetahui tagihan mana yang paling mendesak.' },
					] as lap (lap.nama)}
						<div class="p-3 rounded border" style="border-color:var(--border);background:var(--bg)">
							<div class="text-xs font-semibold mb-1" style="color:var(--text)">{lap.nama}</div>
							<div class="text-xs" style="color:var(--text-dim)">{lap.desc}</div>
						</div>
					{/each}
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Cara Melihat Laporan</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Laporan dari menu samping.',
							'Pilih jenis laporan dari tab yang tersedia.',
							'Atur periode (pilih tanggal mulai dan tanggal akhir).',
							'Klik Tampilkan atau Generate.',
							'Laporan muncul di layar. Klik Cetak atau Export untuk menyimpan sebagai PDF.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: HARGA ─── -->
		<section id="harga" class="mb-4">
			<button onclick={() => toggle('harga')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">🏷️ Kelola Harga</span>
				<span style="color:var(--text-dim)">{terbuka.harga ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.harga}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mengubah Harga Jual Barang</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Harga dari menu samping.',
							'Cari barang yang harganya ingin diubah.',
							'Klik Edit di baris barang tersebut.',
							'Ubah harga jual eceran, harga jual grosir, atau keduanya.',
							'Klik Simpan. Harga baru langsung berlaku untuk transaksi berikutnya.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--info)">
						💡 Harga lama di transaksi yang sudah selesai tidak terpengaruh. Perubahan hanya berlaku untuk transaksi baru.
					</div>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: PROMO ─── -->
		<section id="promo" class="mb-4">
			<button onclick={() => toggle('promo')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">🎁 Promo & Diskon</span>
				<span style="color:var(--text-dim)">{terbuka.promo ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.promo}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini bisa digunakan oleh: <strong style="color:var(--text)">Manajer, Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Membuat Promo Baru</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Promo dari menu samping.',
							'Klik + Tambah Promo.',
							'Isi nama promo (contoh: "Diskon Lebaran"), pilih jenis diskon (persen atau nominal).',
							'Tentukan apakah promo berlaku untuk semua barang atau barang tertentu saja.',
							'Atur tanggal mulai dan tanggal berakhir promo.',
							'Klik Simpan & Aktifkan. Promo langsung berlaku di kasir.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--info)">
						💡 Kasir tidak perlu melakukan apa-apa — promo aktif diterapkan otomatis saat checkout.
					</div>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: PENGATURAN ─── -->
		<section id="pengaturan" class="mb-4">
			<button onclick={() => toggle('pengaturan')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">⚙️ Pengaturan</span>
				<span style="color:var(--text-dim)">{terbuka.pengaturan ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.pengaturan}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-5" style="border-color:var(--border);background:var(--surface)">

				<div class="p-3 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
					👤 Fitur ini hanya bisa digunakan oleh: <strong style="color:var(--text)">Pemilik</strong>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Mengubah Data Toko</h3>
					<ol class="space-y-2">
						{#each [
							'Buka halaman Pengaturan dari menu samping.',
							'Di tab TOKO, ubah nama toko, alamat, nomor HP, atau logo.',
							'Klik Simpan.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Backup Database</h3>
					<ol class="space-y-2">
						{#each [
							'Di halaman Pengaturan, cari tab atau bagian INFO SERVER.',
							'Klik tombol Download Backup Database.',
							'File database (.sqlite) akan otomatis terunduh ke HP/komputer Anda.',
							'Simpan file backup ini di tempat aman (Google Drive, USB, dll).',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
					<div class="mt-3 p-3 rounded text-xs" style="background:var(--surface2);color:var(--warn)">
						⚠️ Lakukan backup secara rutin — minimal seminggu sekali — untuk melindungi data toko dari kehilangan yang tidak terduga.
					</div>
				</div>

				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--accent)">Menghubungkan HP Lain ke Aplikasi</h3>
					<ol class="space-y-2">
						{#each [
							'Di Pengaturan → INFO SERVER, akan muncul QR code dan alamat IP server.',
							'Pastikan HP baru terhubung ke WiFi yang sama dengan server (Raspberry Pi).',
							'Scan QR code dari HP baru, atau ketik alamat IP di browser HP tersebut.',
							'Login dengan akun karyawan yang sesuai.',
						] as step, i (i)}
							<li class="flex gap-3 text-sm">
								<span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
									style="background:var(--surface2);color:var(--accent)">{i + 1}</span>
								<span style="color:var(--text-dim)">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

			</div>
			{/if}
		</section>

		<!-- ─── SEKSI: FAQ ─── -->
		<section id="faq" class="mb-4">
			<button onclick={() => toggle('faq')} class="w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors"
				style="background:var(--surface);border-color:var(--border)">
				<span class="flex items-center gap-2 font-semibold text-sm">❓ Pertanyaan yang Sering Ditanyakan</span>
				<span style="color:var(--text-dim)">{terbuka.faq ? '▲' : '▼'}</span>
			</button>
			{#if terbuka.faq}
			<div class="border border-t-0 rounded-b-lg p-4 space-y-4" style="border-color:var(--border);background:var(--surface)">
				{#each [
					{
						tanya: 'Aplikasi tidak bisa dibuka di HP — apa yang harus dilakukan?',
						jawab: 'Pastikan HP Anda terhubung ke WiFi yang sama dengan server toko. Coba refresh halaman browser. Jika masih tidak bisa, tanyakan ke pemilik toko apakah server (Raspberry Pi) sudah dinyalakan.',
					},
					{
						tanya: 'Transaksi sudah selesai tapi struk tidak keluar/tercetak.',
						jawab: 'Pastikan printer struk sudah terhubung dan dalam kondisi menyala. Coba klik Cetak Ulang dari tab Riwayat di halaman kasir. Jika printer thermal, pastikan kertas struk masih ada.',
					},
					{
						tanya: 'Stok barang di aplikasi tidak sama dengan fisik di gudang.',
						jawab: 'Lakukan Stok Opname (lihat panduan Gudang) untuk menyesuaikan stok sistem dengan fisik. Catat alasan selisih untuk referensi.',
					},
					{
						tanya: 'Saya tidak bisa masuk (login) — password salah terus.',
						jawab: 'Pastikan Caps Lock tidak aktif. Jika masih salah, minta pemilik toko untuk reset kata sandi Anda melalui Pengaturan → Karyawan → Edit → Reset Password.',
					},
					{
						tanya: 'Kenapa menu tertentu tidak muncul untuk saya?',
						jawab: 'Menu yang tampil disesuaikan dengan peran Anda. Kasir hanya melihat menu Kasir dan Pelanggan. Gudang melihat menu Gudang. Hanya Pemilik/Manajer yang melihat semua menu.',
					},
					{
						tanya: 'Apakah data hilang jika listrik mati atau server mati tiba-tiba?',
						jawab: 'Transaksi yang sudah selesai (klik Proses Bayar) tersimpan secara permanen. Transaksi yang sedang berjalan di keranjang akan disimpan sebagai draft dan bisa dipulihkan saat aplikasi dibuka lagi.',
					},
					{
						tanya: 'Bagaimana cara melihat laporan penjualan hari ini?',
						jawab: 'Buka halaman Dashboard untuk ringkasan cepat hari ini. Untuk laporan lengkap, buka halaman Laporan → pilih periode hari ini.',
					},
				] as item (item.tanya)}
					<div class="pb-4 border-b last:border-b-0" style="border-color:var(--border)">
						<div class="text-sm font-medium mb-2" style="color:var(--text)">Q: {item.tanya}</div>
						<div class="text-sm" style="color:var(--text-dim)">A: {item.jawab}</div>
					</div>
				{/each}
			</div>
			{/if}
		</section>

		<!-- Footer -->
		<div class="mt-8 text-center text-xs py-4" style="color:var(--text-dim);border-top:1px solid var(--border)">
			Panduan Penggunaan Stokasir — Hubungi pemilik toko jika ada pertanyaan yang belum terjawab.
		</div>

	</main>
</div>
