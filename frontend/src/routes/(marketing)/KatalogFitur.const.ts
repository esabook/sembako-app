import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Activity from '@lucide/svelte/icons/activity';
import Users from '@lucide/svelte/icons/users';
import Route from '@lucide/svelte/icons/route';
import MessageCircleCode from '@lucide/svelte/icons/message-circle-code';
import Tag from '@lucide/svelte/icons/tag';
import BadgePercent from '@lucide/svelte/icons/badge-percent';
import Warehouse from '@lucide/svelte/icons/warehouse';
import Utensils from '@lucide/svelte/icons/utensils';
import Scissors from '@lucide/svelte/icons/scissors';
import UserRound from '@lucide/svelte/icons/user-round';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import Building2 from '@lucide/svelte/icons/building-2';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Calendar from '@lucide/svelte/icons/calendar';
import UserCheck from '@lucide/svelte/icons/user-check';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import ChartBar from '@lucide/svelte/icons/chart-bar';
import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
import Settings from '@lucide/svelte/icons/settings';

export type Fitur = {
    ikon: typeof ShoppingCart;
    judul: string;
    ringkas: string;
    edu: string;
    poin: string[];
};

// Katalog fitur, istilah profesional, penjelasan untuk awam.
export const katalog: Fitur[] = [
    {
        ikon: ShoppingCart,
        judul: 'Kasir (POS)',
        ringkas: 'Titik penjualan cepat untuk eceran & grosir',
        edu: 'Point of Sale (POS) adalah layar tempat kamu mencatat penjualan. Dirancang agar transaksi selesai dalam hitungan detik, baik diketik manual maupun lewat scanner barcode.',
        poin: [
            'Scan barcode (USB/Bluetooth) atau ketik manual',
            'Shortcut keyboard untuk transaksi kasir lebih cepat',
            'Mendukung banyak tingkat harga: eceran, grosir, grosir besar',
            'Diskon per item maupun per nota',
            'Pembayaran tunai, transfer, QRIS, atau hutang',
            'Tahan transaksi (hold) lalu lanjutkan',
            'Cetak struk thermal 58mm / 80mm',
            'Tetap jalan offline lewat jaringan LAN'
        ]
    },
    {
        ikon: LayoutGrid,
        judul: 'Dashboard',
        ringkas: 'Ringkasan toko dalam sekali pandang',
        edu: 'Dashboard merangkum angka penting dari omzet, laba, hingga barang terlaris agar keputusan diambil cepat tanpa buka banyak laporan.',
        poin: ['Overview kondisi toko', 'Ringkasan penjualan (Sales Summary)']
    },
    {
        ikon: Activity,
        judul: 'Analitik Penggunaan',
        ringkas: 'Pantau aktivitas & pola pakai aplikasi',
        edu: 'Melihat bagaimana tim menggunakan aplikasi: siapa login kapan, fitur apa yang paling sering dipakai, dan tren aktivitas harian.',
        poin: ['Grafik aktivitas pengguna', 'Log akses per peran', 'Tren penggunaan fitur']
    },
    {
        ikon: Users,
        judul: 'Pelanggan',
        ringkas: 'Database pelanggan & riwayat transaksi',
        edu: 'Menyimpan data pelanggan dan riwayatnya agar pelayanan lebih personal dan piutang terpantau.',
        poin: ['Database pelanggan', 'Kartu member', 'Riwayat transaksi tiap pelanggan']
    },
    {
        ikon: Route,
        judul: 'Sales & Kunjungan',
        ringkas: 'Untuk grosir/distributor dengan tim sales keliling',
        edu: 'Modul ini membantu mengatur kunjungan sales ke toko-toko (canvassing) dan memantau peluang penjualan dari awal sampai deal.',
        poin: ['Rute & jadwal kunjungan', 'Agenda harian sales', 'Pipeline (tahapan) penjualan']
    },
    {
        ikon: MessageCircleCode,
        judul: 'CRM',
        ringkas: 'Kelola permintaan & komplain pelanggan',
        edu: 'CRM (Customer Relationship Management) mencatat permintaan dan komplain pelanggan agar setiap keluhan tertangani dengan tindak lanjut yang jelas.',
        poin: ['Permintaan pelanggan', 'Komplain dengan tindak lanjut']
    },
    {
        ikon: Tag,
        judul: 'Harga',
        ringkas: 'Atur struktur harga jual per barang',
        edu: 'Kelola daftar harga jual dan ubah harga massal tanpa hitung manual. Cocok untuk toko yang punya harga eceran sekaligus grosir.',
        poin: ['Daftar harga per barang', 'Ubah harga massal sekali klik', 'Tingkat harga eceran & grosir', 'Margin (selisih untung) per produk', "Kalkulator HPP per produk"]
    },
    {
        ikon: BadgePercent,
        judul: 'Promo',
        ringkas: 'Diskon & program promosi berperiode',
        edu: 'Buat program diskon dan promosi dengan periode waktu tertentu agar harga normal tidak tercampur dengan harga promo.',
        poin: ['Promo & diskon berperiode', 'Diskon per item maupun per nota']
    },
    {
        ikon: Warehouse,
        judul: 'Gudang',
        ringkas: 'Persediaan multi-cabang, akurat sampai barang terakhir',
        edu: 'Manajemen persediaan (inventory) menjaga jumlah stok tetap cocok antara catatan dan barang fisik. Setiap cabang punya kartu stok sendiri dan saling terhubung.',
        poin: [
            'Stok per cabang & mutasi antar gudang',
            'Penerimaan barang dari supplier',
            'Purchase Order (PO) pembelian',
            'Stok opname (stock take) berkala',
            'Master barang dengan varian & satuan bertingkat',
            'Database supplier',
            'Retur barang ke supplier',
            'Cetak label harga & barcode',
            'Pengaturan stok minimum & peringatan otomatis'
        ]
    },
    {
        ikon: Utensils,
        judul: 'Food & Beverages (FnB)',
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
        ikon: UserRound,
        judul: 'Karyawan',
        ringkas: 'Kelola tim dari absen sampai gaji',
        edu: 'Administrasi kepegawaian (HR) toko: kehadiran, penggajian (payroll), sampai catatan kinerja. Semua terhubung dengan transaksi kasir.',
        poin: [
            'Data karyawan & hak akses (role)',
            'Absensi scan atau manual',
            'Penggajian & kasbon',
            'Jadwal shift kerja',
            'Performa & evaluasi kinerja',
            'Izin & cuti',
            'Data Sanksi'
        ]
    },
    {
        ikon: ClipboardCheck,
        judul: 'Tugas Harian',
        ringkas: 'Checklist & SOP toko terukur',
        edu: 'Standard Operating Procedure (SOP) toko dibuat terukur: tugas rutin dicentang setiap hari dan template checklist bisa disesuaikan per toko.',
        poin: ['Checklist hari ini', 'Kelola item & template tugas']
    },
    {
        ikon: Building2,
        judul: 'Aset & Utilitas',
        ringkas: 'Pantau aset fisik dan tagihan operasional',
        edu: 'Mencatat aset toko (peralatan, kendaraan, inventaris) dan tagihan utilitas (listrik, air, internet) agar tidak ada yang luput dari pemantauan.',
        poin: ['Daftar aset toko', 'Tagihan utilitas berkala']
    },
    {
        ikon: ShieldCheck,
        judul: 'Inspeksi Toko',
        ringkas: 'Cek kondisi toko secara terjadwal',
        edu: 'Inspeksi rutin toko menggunakan form terstandar agar kondisi kebersihan, keamanan, dan kepatuhan SOP selalu terpantau.',
        poin: ['Inspeksi toko terjadwal', 'Form inspeksi terstandar', 'Rekap temuan & tindak lanjut']
    },
    {
        ikon: Calendar,
        judul: 'Acara & Hajatan',
        ringkas: 'Pesanan besar untuk acara & catering',
        edu: 'Mengelola pesanan musiman bervolume besar seperti hajatan, sembako paket, atau catering acara.',
        poin: ['Paket acara & hajatan', 'Pesanan terjadwal']
    },
    {
        ikon: UserCheck,
        judul: 'Tamu Birokrasi',
        ringkas: 'Catat kunjungan tamu & petugas resmi',
        edu: 'Buku tamu digital untuk mencatat kunjungan dari petugas pajak, dinas, atau mitra bisnis agar ada jejak kunjungan yang rapi.',
        poin: ['Buku tamu birokrasi', 'Log kunjungan resmi']
    },
    {
        ikon: DollarSign,
        judul: 'Keuangan',
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
        ikon: ChartBar,
        judul: 'Laporan',
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
        ikon: CircleUserRound,
        judul: 'Profil & Akun',
        ringkas: 'Kelola data pribadi dan keamanan akun',
        edu: 'Setiap pengguna bisa mengatur profil sendiri, ganti password, dan melihat aktivitas akunnya tanpa perlu bantuan admin.',
        poin: ['Data profil pengguna', 'Ganti password mandiri', 'Riwayat aktivitas akun']
    },
    {
        ikon: Settings,
        judul: 'Pengaturan',
        ringkas: 'Banyak toko & cabang dalam satu akun',
        edu: 'Satu akun bisa menaungi beberapa toko/cabang (multi-tenant), lengkap dengan jejak audit untuk keamanan data.',
        poin: [
            'Pengaturan umum toko',
            'Preview & atur struk',
            'Notifikasi',
            'Audit trail (jejak perubahan)',
            'Info server & status',
            'Toko & cabang'
        ]
    }
];
