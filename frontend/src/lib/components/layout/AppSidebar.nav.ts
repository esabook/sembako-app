import type { Role } from '$lib/stores/auth.js'

export type SubNavItem = { key: string; label: string }

export type NavItem = {
	href: string
	label: string
	roles: Role[]
	icon: string
	sub?: SubNavItem[]
}

export const NAV: NavItem[] = [
	{
		href: '/dashboard',
		label: 'Dashboard',
		roles: ['pemilik', 'manajer'],
		icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v-2h2v2h2v2h-2v2h-2v-2h-2z',
		sub: [
			{ key: 'overview', label: 'Overview' },
			{ key: 'sales-summary', label: 'Sales Summary' }
		]
	},
	{
		href: '/kasir',
		label: 'Kasir',
		roles: ['pemilik', 'manajer', 'kasir', 'gudang', 'sales', 'pelayanan'],
		icon: 'M7 4V2H5v2H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V2h-2v2H7zm-3 5h16v9H4V9zm2 2v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2z'
	},
	{
		href: '/pelanggan',
		label: 'Pelanggan',
		roles: ['pemilik', 'manajer', 'kasir', 'sales', 'pelayanan'],
		icon: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
		sub: [
			{ key: 'pelanggan', label: 'Pelanggan' },
			{ key: 'kartu', label: 'Kartu' },
			{ key: 'riwayat', label: 'Riwayat' }
		]
	},
	{
		href: '/sales',
		label: 'Sales & Kunjungan',
		roles: ['pemilik', 'manajer', 'sales'],
		icon: 'M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.06 15.94 0 13.36 0c-1.46 0-2.47.52-3.48 1.55L9 3 7.12 1.55C6.1.52 5.09 0 3.64 0 1.06 0-1 2.06-1 4.64c0 .48.11.92.18 1.36H-1v2h22V6zm-2 12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V10h12v8zm-9-2h2v-4h-2v4zm4 0h2v-4h-2v4 M3 6h18v2H3V6z M20 6H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 14H9v-2l-2-2v-3l2-2h6l2 2v3l-2 2v2z',
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
		icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z',
		sub: [
			{ key: 'permintaan', label: 'Permintaan' },
			{ key: 'komplain', label: 'Komplain' }
		]
	},
	{
		href: '/gudang',
		label: 'Gudang',
		roles: ['pemilik', 'manajer', 'gudang'],
		icon: 'M2 7l10-5 10 5v2H2V7zm1 3h18v11H3V10zm4 2v7h2v-7H7zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2z',
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
	},
	{
		href: '/karyawan',
		label: 'Karyawan',
		roles: ['pemilik', 'manajer'],
		icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
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
		href: '/aset',
		label: 'Aset & Utilitas',
		roles: ['pemilik', 'manajer'],
		icon: 'M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3zm0 2.7l5 4.5V18h-2v-5H9v5H7v-7.8l5-4.5z',
		sub: [
			{ key: 'aset', label: 'Aset' },
			{ key: 'utilitas', label: 'Utilitas' }
		]
	},
	{
		href: '/tugas',
		label: 'Tugas Harian',
		roles: ['pemilik', 'manajer', 'kasir', 'gudang', 'sales', 'pelayanan'],
		icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'
	},
	{
		href: '/hajatan',
		label: 'Acara & Hajatan',
		roles: ['pemilik', 'manajer', 'kasir'],
		icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z'
	},
	{
		href: '/inspeksi',
		label: 'Inspeksi Toko',
		roles: ['pemilik', 'manajer'],
		icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z'
	},
	{
		href: '/tamu',
		label: 'Tamu Birokrasi',
		roles: ['pemilik', 'manajer'],
		icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'
	},
	{
		href: '/keuangan',
		label: 'Keuangan',
		roles: ['pemilik', 'manajer'],
		icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
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
		icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h4v2H8z',
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
	},
	{
		href: '/harga',
		label: 'Harga',
		roles: ['pemilik', 'manajer'],
		icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4a2 2 0 0 0-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
		sub: [
			{ key: 'daftar', label: 'Daftar' },
			{ key: 'massal', label: 'Massal' }
		]
	},
	{
		href: '/promo',
		label: 'Promo',
		roles: ['pemilik', 'manajer'],
		icon: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z'
	},
	{
		href: '/pengaturan',
		label: 'Pengaturan',
		roles: ['pemilik'],
		icon: 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.06 7.06 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.477.477 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
	}
]
