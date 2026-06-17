<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const saved = localStorage.getItem('tema') ?? 'dark';
		document.documentElement.setAttribute('data-theme', saved);
	});

	type DeviceKey =
		| 'prasyarat'
		| 'apa-itu'
		| 'android'
		| 'iphone'
		| 'windows-chrome'
		| 'windows-edge'
		| 'mac'
		| 'faq';

	const TOC: { key: DeviceKey; ikon: string; label: string }[] = [
		{ key: 'prasyarat', ikon: '📶', label: 'Prasyarat' },
		{ key: 'apa-itu', ikon: '💡', label: 'Apa itu "Install"?' },
		{ key: 'android', ikon: '📱', label: 'Android (Chrome)' },
		{ key: 'iphone', ikon: '🍎', label: 'iPhone / iPad' },
		{ key: 'windows-chrome', ikon: '🪟', label: 'Windows — Chrome' },
		{ key: 'windows-edge', ikon: '🪟', label: 'Windows — Edge' },
		{ key: 'mac', ikon: '💻', label: 'Mac — Chrome' },
		{ key: 'faq', ikon: '❓', label: 'Pertanyaan Umum' }
	];
</script>

<svelte:head>
	<title>Panduan Instalasi — Stokasir</title>
</svelte:head>

<!-- Header -->
<header
	class="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3"
	style="background:var(--surface);border-color:var(--border)"
>
	<div class="flex items-center gap-3">
		<img src="/logo.webp" alt="Logo" class="h-7 w-7" />
		<div>
			<div class="text-sm font-bold" style="color:var(--accent)">Panduan Instalasi</div>
			<div class="text-[10px]" style="color:var(--text-dim)">
				Stokasir — Cara Pasang di HP & Laptop
			</div>
		</div>
	</div>
	<div class="flex items-center gap-2">
		<a
			href="/panduan"
			class="hidden rounded border px-3 py-1.5 text-xs transition-colors sm:block"
			style="border-color:var(--border);color:var(--text-dim)"
		>
			← Panduan
		</a>
		<button
			onclick={() => window.close()}
			class="rounded border px-3 py-1.5 text-xs transition-colors"
			style="border-color:var(--border);color:var(--text-dim)"
		>
			✕ Tutup
		</button>
	</div>
</header>

<div class="flex min-h-screen" style="background:var(--bg);color:var(--text)">
	<!-- Sidebar TOC (desktop) -->
	<aside
		class="sticky top-14 hidden w-52 shrink-0 flex-col gap-0.5 self-start border-r px-3 py-4 md:flex"
		style="background:var(--surface);border-color:var(--border);max-height:calc(100vh - 3.5rem);overflow-y:auto"
	>
		<div class="mb-2 px-2 text-[10px] tracking-widest uppercase" style="color:var(--text-dim)">
			Daftar Isi
		</div>
		{#each TOC as item (item.key)}
			<a
				href="#{item.key}"
				class="flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors"
				style="color:var(--text-dim)"
			>
				<span>{item.ikon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
		<div class="mt-4 border-t pt-3" style="border-color:var(--border)">
			<a
				href="/panduan"
				class="flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors"
				style="color:var(--accent)"
			>
				← Kembali ke Panduan
			</a>
		</div>
	</aside>

	<!-- Konten utama -->
	<main class="mx-auto max-w-3xl flex-1 px-4 py-6 pb-20">
		<!-- Intro -->
		<div
			class="mb-6 rounded-lg border p-5"
			style="background:var(--surface);border-color:var(--border)"
		>
			<h1 class="font-bold" style="color:var(--accent)">Instalasi di HP & Laptop</h1>
			<p class="mb-4 text-sm leading-relaxed" style="color:var(--text-dim)">
				Stokasir berjalan di browser — tidak perlu download dari App Store atau Play Store. Cukup
				sambungkan ke WiFi toko, buka alamat yang diberikan pemilik, lalu "install" agar muncul
				sebagai ikon di layar utama seperti aplikasi biasa.
			</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each [{ label: 'Android', href: '#android', ikon: '📱' }, { label: 'iPhone', href: '#iphone', ikon: '🍎' }, { label: 'Windows', href: '#windows-chrome', ikon: '🪟' }, { label: 'Mac', href: '#mac', ikon: '💻' }, { label: 'Prasyarat', href: '#prasyarat', ikon: '📶' }, { label: 'FAQ', href: '#faq', ikon: '❓' }] as link (link.href)}
					<a
						href={link.href}
						class="flex items-center gap-2 rounded border p-3 text-xs font-medium transition-colors"
						style="border-color:var(--border);background:var(--surface2);color:var(--text-dim)"
					>
						<span class="text-base">{link.ikon}</span>
						<span>{link.label}</span>
					</a>
				{/each}
			</div>
		</div>

		<!-- ─── PRASYARAT ─── -->
		<section id="prasyarat" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">📶</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Prasyarat
				</h2>
			</div>
			<div
				class="space-y-3 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<p class="text-sm" style="color:var(--text-dim)">
					Sebelum menginstall, pastikan kondisi berikut terpenuhi:
				</p>
				<div class="space-y-2">
					{#each [{ ikon: '📡', judul: 'WiFi yang sama', desc: 'HP atau laptop Anda harus tersambung ke jaringan WiFi yang sama dengan server (komputer/Raspberry Pi tempat aplikasi berjalan). Tidak bisa diakses dari luar toko.' }, { ikon: '🔗', judul: 'Alamat IP server', desc: 'Minta pemilik membuka menu Pengaturan → Info Server. Di sana ada alamat IP (contoh: 192.168.1.10) dan kode QR yang bisa di-scan.' }, { ikon: '🌐', judul: 'Browser modern', desc: 'Android: Chrome atau Samsung Internet. iPhone/iPad: Safari (wajib Safari untuk bisa "Add to Home Screen"). Laptop: Chrome atau Edge.' }] as item (item.judul)}
						<div
							class="flex gap-3 rounded border p-3"
							style="border-color:var(--border);background:var(--bg)"
						>
							<span class="mt-0.5 shrink-0 text-xl">{item.ikon}</span>
							<div>
								<div class="mb-1 text-xs font-semibold" style="color:var(--text)">{item.judul}</div>
								<div class="text-xs leading-relaxed" style="color:var(--text-dim)">{item.desc}</div>
							</div>
						</div>
					{/each}
				</div>
				<div class="rounded p-3 text-xs" style="background:var(--surface2);color:var(--text-dim)">
					💡 Tidak punya alamat IP-nya? Buka browser dan ketik <strong style="color:var(--text)"
						>192.168.1.10</strong
					>
					(angka bisa berbeda — tanya pemilik), atau minta pemilik scan QR di
					<strong style="color:var(--text)">Pengaturan → Info Server</strong>.
				</div>
			</div>
		</section>

		<!-- ─── APA ITU INSTALL ─── -->
		<section id="apa-itu" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">💡</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Apa itu "Install"?
				</h2>
			</div>
			<div
				class="space-y-3 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<p class="text-sm leading-relaxed" style="color:var(--text-dim)">
					Stokasir adalah aplikasi web yang bisa "diinstall" tanpa App Store atau Play Store.
					Teknologinya disebut <strong style="color:var(--text)">PWA (Progressive Web App)</strong>.
				</p>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each [{ label: 'Buka di browser biasa', desc: 'Ketik alamat IP setiap kali ingin membuka app. Bisa, tapi kurang praktis.', ikon: '🌐', ok: false }, { label: 'Install (Add to Home Screen)', desc: 'Muncul sebagai ikon di layar utama. Satu ketuk langsung masuk app, tanpa address bar.', ikon: '📲', ok: true }] as opt (opt.label)}
						<div
							class="rounded border p-3"
							style="border-color:{opt.ok ? 'var(--accent)' : 'var(--border)'};background:var(--bg)"
						>
							<div class="mb-1 flex items-center gap-2">
								<span>{opt.ikon}</span>
								<span
									class="text-xs font-semibold"
									style="color:{opt.ok ? 'var(--accent)' : 'var(--text)'}">{opt.label}</span
								>
								{#if opt.ok}<span
										class="rounded px-1.5 py-0.5 text-[10px]"
										style="background:var(--accent);color:var(--bg)">REKOMENDASI</span
									>{/if}
							</div>
							<p class="text-xs" style="color:var(--text-dim)">{opt.desc}</p>
						</div>
					{/each}
				</div>
				<p class="text-xs" style="color:var(--text-dim)">
					Data tetap tersimpan di server toko — bukan di HP. Menghapus ikon dari layar utama tidak
					menghapus data apapun.
				</p>
			</div>
		</section>

		<!-- ─── ANDROID ─── -->
		<section id="android" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">📱</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Android — Chrome / Samsung Internet
				</h2>
			</div>
			<div
				class="space-y-4 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<ol class="space-y-3">
					{#each [{ step: 'Sambungkan HP ke WiFi toko.', sub: '' }, { step: 'Buka Chrome (atau Samsung Internet), ketik alamat IP di address bar.', sub: 'Contoh: http://192.168.1.10/ — tekan Enter.' }, { step: 'Login dengan username dan password yang diberikan pemilik.', sub: '' }, { step: 'Ketuk menu tiga titik ⋮ di pojok kanan atas browser.', sub: 'Di Samsung Internet, tombolnya berupa tiga garis.' }, { step: 'Pilih "Tambahkan ke layar utama" atau "Add to Home Screen".', sub: '' }, { step: 'Konfirmasi nama (biarkan "Stokasir") → ketuk Tambah.', sub: '' }, { step: 'Ikon Stokasir muncul di layar utama. Ketuk untuk membuka.', sub: '' }] as item, i (i)}
						<li class="flex gap-3 text-sm">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--accent)">{i + 1}</span
							>
							<div>
								<div style="color:var(--text)">{item.step}</div>
								{#if item.sub}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
										{item.sub}
									</div>{/if}
							</div>
						</li>
					{/each}
				</ol>
				<div
					class="space-y-1 rounded p-3 text-xs"
					style="background:var(--surface2);color:var(--text-dim)"
				>
					<div>
						📌 Jika menu "Tambahkan ke layar utama" tidak muncul, coba buka halaman dan tunggu
						beberapa detik — Chrome terkadang menampilkan banner install otomatis di bagian bawah
						layar.
					</div>
					<div>
						📌 App akan terbuka dalam mode fullscreen (tanpa address bar) seperti aplikasi native.
					</div>
				</div>
			</div>
		</section>

		<!-- ─── IPHONE / IPAD ─── -->
		<section id="iphone" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">🍎</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					iPhone / iPad — Safari
				</h2>
			</div>
			<div
				class="space-y-4 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<div
					class="rounded border p-3 text-xs"
					style="background:var(--surface2);border-color:var(--warn);color:var(--text-dim)"
				>
					⚠️ <strong style="color:var(--warn)">Wajib pakai Safari.</strong> Chrome di iPhone tidak mendukung
					fitur "Tambahkan ke Layar Utama" untuk PWA. Pastikan Anda membuka dengan Safari.
				</div>
				<ol class="space-y-3">
					{#each [{ step: 'Sambungkan iPhone/iPad ke WiFi toko.', sub: '' }, { step: 'Buka Safari, ketik alamat IP di address bar.', sub: 'Contoh: http://192.168.1.10/ — tekan Go.' }, { step: 'Login ke aplikasi Stokasir.', sub: '' }, { step: 'Ketuk ikon Share (kotak dengan panah ke atas) di bagian bawah layar.', sub: 'Di iPad, ikon ini ada di pojok kanan atas address bar.' }, { step: 'Gulir daftar ke bawah, ketuk "Tambahkan ke Layar Utama" (Add to Home Screen).', sub: '' }, { step: 'Konfirmasi nama → ketuk Tambah di pojok kanan atas.', sub: '' }, { step: 'Ikon Stokasir muncul di Home Screen. Ketuk untuk membuka.', sub: 'App terbuka tanpa address bar Safari.' }] as item, i (i)}
						<li class="flex gap-3 text-sm">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--accent)">{i + 1}</span
							>
							<div>
								<div style="color:var(--text)">{item.step}</div>
								{#if item.sub}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
										{item.sub}
									</div>{/if}
							</div>
						</li>
					{/each}
				</ol>
				<div class="rounded p-3 text-xs" style="background:var(--surface2);color:var(--text-dim)">
					📌 iOS 16.4 ke atas diperlukan untuk dukungan PWA penuh. Jika iPhone belum update, fitur
					offline mungkin terbatas, tapi tetap bisa digunakan via browser.
				</div>
			</div>
		</section>

		<!-- ─── WINDOWS CHROME ─── -->
		<section id="windows-chrome" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">🪟</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Windows — Google Chrome
				</h2>
			</div>
			<div
				class="space-y-4 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<ol class="space-y-3">
					{#each [{ step: 'Sambungkan laptop ke WiFi toko.', sub: '' }, { step: 'Buka Chrome, ketik alamat IP di address bar.', sub: 'Contoh: http://192.168.1.10/ — tekan Enter.' }, { step: 'Login ke Stokasir.', sub: '' }, { step: 'Perhatikan ikon install (⊕) yang muncul di ujung kanan address bar.', sub: 'Jika belum muncul, klik menu tiga titik ⋮ → "Pasang Stokasir..." atau "Install Stokasir...".' }, { step: 'Klik ikon tersebut → klik tombol Pasang / Install.', sub: '' }, { step: 'Stokasir terbuka sebagai jendela terpisah, tanpa address bar Chrome.', sub: 'Ikon juga tersimpan di Start Menu dan Desktop.' }] as item, i (i)}
						<li class="flex gap-3 text-sm">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--accent)">{i + 1}</span
							>
							<div>
								<div style="color:var(--text)">{item.step}</div>
								{#if item.sub}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
										{item.sub}
									</div>{/if}
							</div>
						</li>
					{/each}
				</ol>
				<div class="rounded p-3 text-xs" style="background:var(--surface2);color:var(--text-dim)">
					📌 Untuk membuka kembali setelah diinstall: cari "Stokasir" di Start Menu, atau klik
					shortcut di Desktop.
				</div>
			</div>
		</section>

		<!-- ─── WINDOWS EDGE ─── -->
		<section id="windows-edge" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">🪟</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Windows — Microsoft Edge
				</h2>
			</div>
			<div
				class="space-y-4 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<ol class="space-y-3">
					{#each [{ step: 'Sambungkan laptop ke WiFi toko.', sub: '' }, { step: 'Buka Edge, ketik alamat IP di address bar.', sub: 'Contoh: http://192.168.1.10/' }, { step: 'Login ke Stokasir.', sub: '' }, { step: 'Perhatikan ikon install yang muncul di address bar (gambar kotak dengan tanda +).', sub: '' }, { step: 'Klik ikon tersebut → klik Instal / Install.', sub: 'Alternatif: klik menu tiga titik ⋯ → Aplikasi → "Instal situs ini sebagai aplikasi".' }, { step: 'Stokasir terbuka sebagai aplikasi mandiri.', sub: 'Shortcut tersimpan di Start Menu dan Taskbar.' }] as item, i (i)}
						<li class="flex gap-3 text-sm">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--accent)">{i + 1}</span
							>
							<div>
								<div style="color:var(--text)">{item.step}</div>
								{#if item.sub}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
										{item.sub}
									</div>{/if}
							</div>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<!-- ─── MAC CHROME ─── -->
		<section id="mac" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">💻</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Mac — Google Chrome
				</h2>
			</div>
			<div
				class="space-y-4 rounded-lg border p-4"
				style="border-color:var(--border);background:var(--surface)"
			>
				<ol class="space-y-3">
					{#each [{ step: 'Sambungkan Mac ke WiFi toko.', sub: '' }, { step: 'Buka Chrome (bukan Safari), ketik alamat IP di address bar.', sub: '' }, { step: 'Login ke Stokasir.', sub: '' }, { step: 'Klik ikon install (⊕) di pojok kanan address bar.', sub: 'Atau: menu tiga titik ⋮ → "Pasang Stokasir...".' }, { step: 'Klik Pasang / Install.', sub: '' }, { step: 'Stokasir terbuka sebagai jendela mandiri tanpa address bar.', sub: 'Ikon tersimpan di Applications folder dan Dock.' }] as item, i (i)}
						<li class="flex gap-3 text-sm">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
								style="background:var(--surface2);color:var(--accent)">{i + 1}</span
							>
							<div>
								<div style="color:var(--text)">{item.step}</div>
								{#if item.sub}<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
										{item.sub}
									</div>{/if}
							</div>
						</li>
					{/each}
				</ol>
				<div
					class="rounded border p-3 text-xs"
					style="background:var(--surface2);border-color:var(--border);color:var(--text-dim)"
				>
					📌 <strong style="color:var(--text)">Safari di Mac</strong> tidak mendukung install PWA. Jika
					hanya punya Safari, cukup buka via browser biasa dan bookmark halaman agar mudah diakses kembali.
				</div>
			</div>
		</section>

		<!-- ─── FAQ ─── -->
		<section id="faq" class="mb-6 scroll-mt-16">
			<div class="mb-3 flex items-center gap-2">
				<span class="text-lg">❓</span>
				<h2 class="text-sm font-bold tracking-wider uppercase" style="color:var(--accent)">
					Pertanyaan Umum
				</h2>
			</div>
			<div
				class="divide-y rounded-lg border"
				style="border-color:var(--border);background:var(--surface)"
			>
				{#each [{ q: 'Apakah perlu koneksi internet?', a: 'Tidak. Stokasir berjalan di jaringan WiFi lokal toko — tidak butuh internet sama sekali. Pastikan HP/laptop terhubung ke WiFi yang sama dengan server.' }, { q: 'Bisa dipakai saat WiFi mati?', a: 'Tampilan terakhir masih bisa dilihat (berkat cache service worker), tapi untuk transaksi baru tetap butuh koneksi ke server. Pastikan server (komputer/Raspberry Pi) menyala.' }, { q: 'Apakah data aman?', a: 'Ya. Data tersimpan di server lokal toko dan tidak pernah keluar jaringan WiFi. Tidak ada koneksi ke cloud atau server luar.' }, { q: 'Apakah menghapus ikon menghapus data?', a: 'Tidak. Menghapus ikon dari Home Screen hanya menghapus shortcutnya. Semua data tetap ada di server toko.' }, { q: 'Bisa dipakai di beberapa HP sekaligus?', a: 'Ya. Boleh install di banyak perangkat sekaligus. Semua HP akan melihat data yang sama dari server.' }, { q: 'Gambar install tidak muncul di browser?', a: 'Beberapa browser atau versi lama tidak mendukung PWA install. Solusinya: cukup buka via browser biasa dan bookmark halaman. Fungsi aplikasi tetap 100% sama.' }] as item, i (i)}
					<div class="p-4">
						<div class="mb-1 text-xs font-semibold" style="color:var(--text)">Q: {item.q}</div>
						<div class="text-xs leading-relaxed" style="color:var(--text-dim)">A: {item.a}</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Nav bawah -->
		<div class="flex items-center justify-between pt-2">
			<a
				href="/panduan"
				class="rounded border px-4 py-2 text-xs transition-colors"
				style="border-color:var(--border);color:var(--text-dim)"
			>
				← Kembali ke Panduan
			</a>
			<a
				href="/pengaturan/info-server"
				class="rounded border px-4 py-2 text-xs transition-colors"
				style="border-color:var(--accent);color:var(--accent)"
			>
				Info Server & QR →
			</a>
		</div>
	</main>
</div>
