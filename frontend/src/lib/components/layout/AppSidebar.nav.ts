import type { Role } from '$lib/stores/auth.js';

export type SubNavItem = { key: string; label: string; href?: string };

export type NavItem = {
	href: string;
	label: string;
	roles: Role[];
	icon: string;
	sub?: SubNavItem[];
};

export type NavGroup = {
	key: string;
	label: string;
	items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
	{
		key: 'beranda',
		label: 'Beranda',
		items: [
			{
				href: '/dashboard',
				label: 'Dashboard',
				roles: ['pemilik', 'manajer'],
				icon: 'LayoutGrid',
				sub: [
					{ key: 'overview', label: 'Overview' },
					{ key: 'sales-summary', label: 'Sales Summary' }
				]
			},
			{
				href: '/analitik',
				label: 'Analitik Penggunaan',
				roles: ['pemilik', 'manajer'],
				icon: 'Activity'
			}
		]
	},
	{
		key: 'penjualan',
		label: 'Penjualan & Pelanggan',
		items: [
			{
				href: '/pelanggan',
				label: 'Pelanggan',
				roles: ['pemilik', 'manajer', 'kasir', 'sales', 'pelayanan'],
				icon: 'Users',
				sub: [
					{ key: 'pelanggan', label: 'Pelanggan', href: '/pelanggan' },
					{ key: 'kartu', label: 'Kartu' },
					{ key: 'riwayat', label: 'Riwayat' }
				]
			},
			{
				href: '/sales',
				label: 'Sales & Kunjungan',
				roles: ['pemilik', 'manajer', 'sales'],
				icon: 'Route',
				sub: [
					{ key: 'kunjungan', label: 'Kunjungan' },
					{ key: 'agenda', label: 'Agenda' },
					{ key: 'pipeline', label: 'Pipeline' }
				]
			},
			{
				href: '/crm',
				label: 'CRM',
				roles: ['pemilik', 'manajer', 'kasir', 'pelayanan'],
				icon: 'MessageCircleCode',
				sub: [
					{ key: 'permintaan', label: 'Permintaan' },
					{ key: 'komplain', label: 'Komplain' }
				]
			},
			{
				href: '/harga',
				label: 'Harga',
				roles: ['pemilik', 'manajer'],
				icon: 'Tag',
				sub: [
					{ key: 'daftar', label: 'Daftar' },
					{ key: 'massal', label: 'Massal' }
				]
			},
			{
				href: '/promo',
				label: 'Promo',
				roles: ['pemilik', 'manajer'],
				icon: 'BadgePercent'
			}
		]
	},
	{
		key: 'pengadaan',
		label: 'Pengadaan & Stok',
		items: [
			{
				href: '/gudang',
				label: 'Gudang',
				roles: ['pemilik', 'manajer', 'gudang'],
				icon: 'Warehouse',
				sub: [
					{ key: 'stok', label: 'Stok' },
					{ key: 'terima', label: 'Terima' },
					{ key: 'po', label: 'PO' },
					{ key: 'opname', label: 'Opname' },
					{ key: 'barang', label: 'Barang' },
					{ key: 'supplier', label: 'Supplier' },
					{ key: 'retur-supplier', label: 'Retur Supplier' },
					{ key: 'label', label: 'Label' },
					{ key: 'pengaturan', label: 'Pengaturan' }
				]
			}
		]
	},
	{
		key: 'ops',
		label: 'Operasional Khusus',
		items: [
			{
				href: '/fnb',
				label: 'Food & Beverages (FnB)',
				roles: ['pemilik', 'manajer'],
				icon: 'Utensils',
				sub: [
					{ key: 'meja', label: 'Meja' },
					{ key: 'modifier', label: 'Modifier' },
					{ key: 'bahan', label: 'Bahan & Resep' }
				]
			},
			{
				href: '/jasa',
				label: 'Jasa & Booking',
				roles: ['pemilik', 'manajer', 'kasir', 'pelayanan'],
				icon: 'Scissors',
				sub: [
					{ key: 'booking', label: 'Booking', href: '/jasa/booking' },
					{ key: 'jadwal', label: 'Jadwal Staf', href: '/jasa/jadwal' },
					{ key: 'layanan', label: 'Master Layanan', href: '/jasa/layanan' },
					{ key: 'membership', label: 'Membership', href: '/jasa/membership' },
					{ key: 'komisi', label: 'Komisi', href: '/jasa/komisi' }
				]
			}
		]
	},
	{
		key: 'sdm',
		label: 'SDM & Organisasi',
		items: [
			{
				href: '/karyawan',
				label: 'Karyawan',
				roles: ['pemilik', 'manajer'],
				icon: 'UserRound',
				sub: [
					{ key: 'data', label: 'Data' },
					{ key: 'absensi', label: 'Absensi' },
					{ key: 'penggajian', label: 'Penggajian' },
					{ key: 'kasbon', label: 'Kasbon' },
					{ key: 'jadwal', label: 'Jadwal' },
					{ key: 'performa', label: 'Performa' },
					{ key: 'izin', label: 'Izin' },
					{ key: 'evaluasi', label: 'Evaluasi' },
					{ key: 'sanksi', label: 'Sanksi' }
				]
			},
			{
				href: '/tugas',
				label: 'Tugas Harian',
				roles: ['pemilik', 'manajer', 'kasir', 'gudang', 'sales', 'pelayanan'],
				icon: 'ClipboardCheck',
				sub: [
					{ key: 'harian', label: 'Checklist Hari Ini' },
					{ key: 'template', label: 'Kelola Item' }
				]
			}
		]
	},
	{
		key: 'aset',
		label: 'Aset & Fasilitas',
		items: [
			{
				href: '/aset',
				label: 'Aset & Utilitas',
				roles: ['pemilik', 'manajer'],
				icon: 'Building2',
				sub: [
					{ key: 'aset', label: 'Aset' },
					{ key: 'utilitas', label: 'Utilitas' }
				]
			},
			{
				href: '/inspeksi',
				label: 'Inspeksi Toko',
				roles: ['pemilik', 'manajer'],
				icon: 'ShieldCheck'
			}
		]
	},
	{
		key: 'admin',
		label: 'Administrasi',
		items: [
			{
				href: '/hajatan',
				label: 'Acara & Hajatan',
				roles: ['pemilik', 'manajer', 'kasir'],
				icon: 'Calendar'
			},
			{
				href: '/tamu',
				label: 'Tamu Birokrasi',
				roles: ['pemilik', 'manajer'],
				icon: 'UserCheck'
			}
		]
	},
	{
		key: 'keuangan',
		label: 'Keuangan & Laporan',
		items: [
			{
				href: '/keuangan',
				label: 'Keuangan',
				roles: ['pemilik', 'manajer'],
				icon: 'DollarSign',
				sub: [
					{ key: 'hutang', label: 'Hutang' },
					{ key: 'piutang', label: 'Piutang' },
					{ key: 'jurnal', label: 'Jurnal' },
					{ key: 'kasbank', label: 'Kas & Bank' },
					{ key: 'budget', label: 'Budget' },
					{ key: 'pinjaman', label: 'Pinjaman' }
				]
			},
			{
				href: '/laporan',
				label: 'Laporan',
				roles: ['pemilik', 'manajer'],
				icon: 'ChartBar',
				sub: [
					{ key: 'laba-rugi', label: 'Laba Rugi' },
					{ key: 'arus-kas', label: 'Arus Kas' },
					{ key: 'neraca', label: 'Neraca' },
					{ key: 'aging', label: 'Aging' },
					{ key: 'budget-realisasi', label: 'Budget Realisasi' },
					{ key: 'pajak-umkm', label: 'Pajak UMKM' },
					{ key: 'margin-produk', label: 'Margin Produk' },
					{ key: 'perbandingan', label: 'Perbandingan' },
					{ key: 'persediaan', label: 'Persediaan' },
					{ key: 'top-pelanggan', label: 'Top Pelanggan' },
					{ key: 'pembelian-supplier', label: 'Pembelian Supplier' },
					{ key: 'rekap-penggajian', label: 'Rekap Penggajian' },
					{ key: 'analitik-jam', label: 'Analitik Jam' }
				]
			}
		]
	},
	{
		key: 'sistem',
		label: 'Sistem',
		items: [
			{
				href: '/profile',
				label: 'Profil & Akun',
				roles: ['pemilik', 'manajer', 'kasir', 'gudang', 'sales', 'pelayanan'],
				icon: 'CircleUserRound'
			},
			{
				href: '/pengaturan',
				label: 'Pengaturan',
				roles: ['pemilik'],
				icon: 'Settings',
				sub: [
					{ key: 'pengaturan', label: 'Pengaturan', href: '/pengaturan' },
					{ key: 'struk', label: 'Preview Struk', href: '/pengaturan/struk' },
					{ key: 'notifikasi', label: 'Notifikasi', href: '/pengaturan/notifikasi' },
					{ key: 'audit', label: 'Audit Trail', href: '/pengaturan/audit' },
					{ key: 'info-server', label: 'Info Server', href: '/pengaturan/info-server' },
					{ key: 'toko', label: 'Toko & Cabang', href: '/pengaturan/toko' }
				]
			}
		]
	}
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
