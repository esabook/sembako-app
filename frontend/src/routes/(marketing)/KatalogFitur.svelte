<script lang="ts">
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import Tag from '@lucide/svelte/icons/tag';
	import Users from '@lucide/svelte/icons/users';
	import Route from '@lucide/svelte/icons/route';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import UserRound from '@lucide/svelte/icons/user-round';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Utensils from '@lucide/svelte/icons/utensils';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Calendar from '@lucide/svelte/icons/calendar';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Settings from '@lucide/svelte/icons/settings';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	let terbuka = $state<boolean[]>([]);

	function toggle(i: number) {
		const buka = !terbuka[i];
		terbuka[i] = buka;
		if (window.innerWidth >= 640) {
			const pasangan = i % 2 === 0 ? i + 1 : i - 1;
			if (pasangan >= 0 && pasangan < katalog.length) terbuka[pasangan] = buka;
		}
	}

	type Fitur = {
		ikon: typeof ShoppingCart;
		judul: string;
		ringkas: string;
		edu: string;
		poin: string[];
	};

	// Katalog fitur, istilah profesional, penjelasan untuk awam.
	const katalog: Fitur[] = [
		{
			ikon: ShoppingCart,
			judul: 'Kasir (POS)',
			ringkas: 'Titik penjualan cepat untuk eceran & grosir',
			edu: 'Point of Sale (POS) adalah layar tempat kamu mencatat penjualan. Dirancang agar transaksi selesai dalam hitungan detik, baik diketik manual maupun lewat scanner barcode.',
			poin: [
				'Scan barcode (USB/Bluetooth) atau ketik manual',
				'Shortcut keyboard F1–F12 untuk kasir lincah',
				'Banyak tingkat harga: eceran, grosir, grosir besar',
				'Diskon per item maupun per nota',
				'Pembayaran tunai, transfer, QRIS, atau hutang',
				'Tahan transaksi (hold) lalu lanjutkan',
				'Cetak struk thermal 58mm / 80mm',
				'Tetap jalan offline lewat jaringan LAN'
			]
		},
		{
			ikon: Warehouse,
			judul: 'Stok & Gudang',
			ringkas: 'Persediaan multi-cabang, akurat sampai biji terakhir',
			edu: 'Manajemen persediaan (inventory) menjaga jumlah stok tetap cocok antara catatan dan barang fisik. Setiap cabang punya kartu stok sendiri dan saling terhubung.',
			poin: [
				'Master barang dengan varian & satuan bertingkat',
				'Stok per cabang + mutasi antar gudang',
				'Penerimaan barang dari supplier',
				'Purchase Order (PO) pembelian',
				'Stok opname (stock take) berkala',
				'Retur barang ke supplier',
				'Stok minimum + peringatan otomatis',
				'Cetak label harga & barcode'
			]
		},
		{
			ikon: Tag,
			judul: 'Harga & Promo',
			ringkas: 'Atur banyak harga & diskon sekaligus',
			edu: 'Kelola struktur harga jual dan program promosi tanpa hitung manual. Cocok untuk toko yang punya harga eceran sekaligus grosir.',
			poin: [
				'Daftar harga per barang',
				'Ubah harga massal sekali klik',
				'Tingkat harga eceran & grosir',
				'Margin (selisih untung) per produk',
				'Promo & diskon berperiode'
			]
		},
		{
			ikon: Users,
			judul: 'Pelanggan & CRM',
			ringkas: 'Kenali pelanggan, kelola keluhan',
			edu: 'CRM (Customer Relationship Management) menyimpan data pelanggan dan riwayatnya agar pelayanan lebih personal dan piutang terpantau.',
			poin: [
				'Database pelanggan & kartu member',
				'Riwayat transaksi tiap pelanggan',
				'Piutang per pelanggan',
				'Permintaan & komplain dengan tindak lanjut'
			]
		},
		{
			ikon: Route,
			judul: 'Sales Lapangan',
			ringkas: 'Untuk grosir/distributor dengan tim sales keliling',
			edu: 'Modul ini membantu mengatur kunjungan sales ke toko-toko (canvassing) dan memantau peluang penjualan dari awal sampai deal.',
			poin: ['Rute & jadwal kunjungan', 'Agenda harian sales', 'Pipeline (tahapan) penjualan']
		},
		{
			ikon: Wallet,
			judul: 'Keuangan & Pembukuan',
			ringkas: 'Kas, hutang-piutang, dan jurnal dalam satu tempat',
			edu: 'Pembukuan dasar berbasis kaidah akuntansi double-entry. Setiap uang masuk/keluar tercatat rapi sehingga laporan keuangan akurat.',
			poin: [
				'Hutang & piutang',
				'Jurnal umum (general ledger)',
				'Kas & bank (mutasi saldo)',
				'Budget / anggaran',
				'Pencatatan pinjaman'
			]
		},
		{
			ikon: ChartColumn,
			judul: 'Laporan & Ekspor',
			ringkas: 'Laporan keuangan & operasional standar, siap unduh',
			edu: 'Semua laporan dihitung otomatis dari transaksi harian mengikuti format akuntansi umum dan ketentuan pajak UMKM. Tinggal pilih periode, lalu ekspor.',
			poin: [
				'Laba Rugi (profit & loss)',
				'Arus Kas (cash flow)',
				'Neraca (balance sheet)',
				'Aging (umur piutang & hutang)',
				'Budget vs Realisasi',
				'Pajak UMKM (PPh final 0,5%)',
				'Margin per produk',
				'Perbandingan antar-periode',
				'Persediaan & nilai stok',
				'Top pelanggan & pembelian supplier',
				'Rekap penggajian',
				'Analitik jam ramai',
				'Ekspor Excel / CSV / PDF'
			]
		},
		{
			ikon: UserRound,
			judul: 'Karyawan & Absensi',
			ringkas: 'Kelola tim dari absen sampai gaji',
			edu: 'Administrasi kepegawaian (HR) toko: kehadiran, penggajian (payroll), sampai catatan kinerja. Semua terhubung dengan transaksi kasir.',
			poin: [
				'Data karyawan & hak akses (role)',
				'Absensi scan atau manual',
				'Penggajian & kasbon',
				'Jadwal shift kerja',
				'Performa, izin/cuti, evaluasi, sanksi'
			]
		},
		{
			ikon: ClipboardCheck,
			judul: 'Operasional Harian',
			ringkas: 'Checklist, inspeksi, aset, dan tamu',
			edu: 'Standard Operating Procedure (SOP) toko dibuat terukur: tugas rutin dicentang, kondisi toko diinspeksi, aset dan tamu birokrasi tercatat.',
			poin: [
				'Checklist tugas harian + template',
				'Inspeksi toko terjadwal',
				'Daftar aset & tagihan utilitas',
				'Buku tamu birokrasi'
			]
		},
		{
			ikon: Utensils,
			judul: 'Food & Beverage (Resto/Kafe)',
			ringkas: 'Mode restoran, kafe, dan warung makan',
			edu: 'Untuk usaha makanan: pesanan per meja, racikan menu, dan layar dapur (Kitchen Display System) agar pesanan tak tertukar.',
			poin: [
				'Manajemen meja & pesanan',
				'Modifier menu (level pedas, topping, dll)',
				'Bahan & resep untuk hitung HPP',
				'Kitchen Display System (KDS)'
			]
		},
		{
			ikon: Scissors,
			judul: 'Jasa & Booking',
			ringkas: 'Untuk salon, bengkel, dan layanan janji',
			edu: 'Usaha berbasis layanan dengan janji temu (appointment): atur jadwal staf, layanan, sampai komisi.',
			poin: [
				'Booking & jadwal staf',
				'Master layanan',
				'Membership pelanggan',
				'Perhitungan komisi'
			]
		},
		{
			ikon: Calendar,
			judul: 'Acara & Hajatan',
			ringkas: 'Pesanan besar untuk acara & catering',
			edu: 'Mengelola pesanan musiman bervolume besar seperti hajatan, sembako paket, atau catering acara.',
			poin: ['Paket acara & hajatan', 'Pesanan terjadwal']
		},
		{
			ikon: LayoutGrid,
			judul: 'Dashboard & Analitik',
			ringkas: 'Ringkasan toko dalam sekali pandang',
			edu: 'Dashboard merangkum angka penting dari omzet, laba, hingga barang terlaris agar keputusan diambil cepat tanpa buka banyak laporan.',
			poin: ['Overview kondisi toko', 'Ringkasan penjualan (sales summary)']
		},
		{
			ikon: Settings,
			judul: 'Multi-toko & Pengaturan',
			ringkas: 'Banyak toko & cabang dalam satu akun',
			edu: 'Satu akun bisa menaungi beberapa toko/cabang (multi-tenant), lengkap dengan jejak audit untuk keamanan data.',
			poin: [
				'Multi-toko & multi-cabang',
				'Preview & atur struk',
				'Notifikasi',
				'Audit trail (jejak perubahan)',
				'Info server & status',
				'Pilihan tema & ukuran font'
			]
		}
	];
</script>

<section class="mx-auto max-w-5xl px-4 py-12">
	<div class="text-center">
		<h2 class="text-xl font-bold sm:text-2xl">Semua fitur, satu aplikasi</h2>
		<p class="mx-auto mt-2 max-w-2xl text-sm" style="color:var(--text-dim)">
			Ketuk tiap kartu untuk lihat penjelasan &amp; rincian fitur.
		</p>
	</div>

	<div class="mt-8 grid gap-3 sm:grid-cols-2">
		{#each katalog as f, i (f.judul)}
			<div
				class="kartu min-w-0 rounded-lg border"
				style="border-color:var(--border);background-color: var(--surface);"
			>
				<button
					class="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
					onclick={() => toggle(i)}
					aria-expanded={terbuka[i]}
				>
					<f.ikon class="size-5 shrink-0" style="color:var(--accent)" />
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-semibold">{f.judul}</span>
						<span class="block truncate text-xs" style="color:var(--text-dim)">{f.ringkas}</span>
					</span>
					<span class="chevron shrink-0" class:buka={terbuka[i]} style="color:var(--text-dim)" aria-hidden="true">
						<ChevronRight class="size-4" />
					</span>
				</button>
				{#if terbuka[i]}
					<div
						transition:slide={{ duration: 300, easing: cubicInOut }}
						class="border-t px-4 pt-3 pb-4"
						style="border-color:var(--border)"
					>
						<p class="text-xs leading-relaxed" style="color:var(--text-dim)">{f.edu}</p>
						<ul class="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
							{#each f.poin as p (p)}
								<li class="flex items-start gap-1.5">
									<span style="color:var(--accent)">•</span>
									<span>{p}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.chevron {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.chevron.buka {
		transform: rotate(90deg);
	}
</style>
