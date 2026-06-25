import type { RequestHandler } from '@sveltejs/kit';

type Route = { path: string; priority: string; changefreq: string };

function tabs(base: string, priority: string, changefreq: string, keys: string[]): Route[] {
	return keys.map((key) => ({ path: `${base}?tab=${key}`, priority, changefreq }));
}

const routes: Route[] = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/login', priority: '0.8', changefreq: 'monthly' },
	{ path: '/absensi', priority: '0.6', changefreq: 'monthly' },
	{ path: '/scan', priority: '0.6', changefreq: 'monthly' },
	{ path: '/panduan', priority: '0.7', changefreq: 'monthly' },
	{ path: '/panduan/instalasi', priority: '0.6', changefreq: 'monthly' },

	{ path: '/dashboard', priority: '0.9', changefreq: 'daily' },
	...tabs('/dashboard', '0.8', 'daily', ['overview', 'sales-summary']),

	{ path: '/kasir', priority: '0.9', changefreq: 'daily' },
	{ path: '/kasir/history', priority: '0.7', changefreq: 'daily' },
	{ path: '/kasir/retur', priority: '0.7', changefreq: 'weekly' },

	{ path: '/gudang', priority: '0.8', changefreq: 'daily' },
	...tabs('/gudang', '0.7', 'daily', [
		'stok', 'terima', 'po', 'opname', 'barang', 'supplier', 'retur-supplier', 'label', 'pengaturan'
	]),
	{ path: '/gudang/import', priority: '0.6', changefreq: 'weekly' },

	{ path: '/harga', priority: '0.8', changefreq: 'weekly' },
	...tabs('/harga', '0.7', 'weekly', ['daftar', 'massal']),

	{ path: '/pelanggan', priority: '0.8', changefreq: 'weekly' },
	...tabs('/pelanggan', '0.7', 'weekly', ['pelanggan', 'kartu', 'riwayat']),

	{ path: '/keuangan', priority: '0.8', changefreq: 'weekly' },
	...tabs('/keuangan', '0.7', 'weekly', ['hutang', 'piutang', 'jurnal', 'kasbank', 'budget', 'pinjaman']),
	{ path: '/keuangan/budget', priority: '0.7', changefreq: 'weekly' },

	{ path: '/laporan', priority: '0.8', changefreq: 'weekly' },
	...tabs('/laporan', '0.7', 'weekly', [
		'laba-rugi', 'arus-kas', 'neraca', 'aging', 'budget-realisasi',
		'pajak-umkm', 'margin-produk', 'perbandingan', 'persediaan',
		'top-pelanggan', 'pembelian-supplier', 'rekap-penggajian', 'analitik-jam'
	]),

	{ path: '/karyawan', priority: '0.7', changefreq: 'monthly' },
	...tabs('/karyawan', '0.6', 'monthly', [
		'data', 'absensi', 'penggajian', 'kasbon', 'jadwal', 'performa', 'izin', 'evaluasi', 'sanksi'
	]),

	{ path: '/sales', priority: '0.7', changefreq: 'weekly' },
	...tabs('/sales', '0.6', 'weekly', ['kunjungan', 'agenda', 'pipeline']),

	{ path: '/aset', priority: '0.6', changefreq: 'monthly' },
	...tabs('/aset', '0.5', 'monthly', ['aset', 'utilitas']),

	{ path: '/crm', priority: '0.6', changefreq: 'weekly' },
	...tabs('/crm', '0.5', 'weekly', ['permintaan', 'komplain']),

	{ path: '/tugas', priority: '0.6', changefreq: 'daily' },
	...tabs('/tugas', '0.5', 'daily', ['harian', 'template']),

	{ path: '/promo', priority: '0.7', changefreq: 'weekly' },
	{ path: '/inspeksi', priority: '0.6', changefreq: 'weekly' },
	{ path: '/scanner', priority: '0.6', changefreq: 'monthly' },
	{ path: '/tamu', priority: '0.5', changefreq: 'monthly' },
	{ path: '/hajatan', priority: '0.5', changefreq: 'monthly' },

	{ path: '/pengaturan', priority: '0.7', changefreq: 'monthly' },
	{ path: '/pengaturan/toko', priority: '0.6', changefreq: 'monthly' },
	{ path: '/pengaturan/struk', priority: '0.6', changefreq: 'monthly' },
	{ path: '/pengaturan/notifikasi', priority: '0.5', changefreq: 'monthly' },
	{ path: '/pengaturan/audit', priority: '0.5', changefreq: 'monthly' },
	{ path: '/pengaturan/info-server', priority: '0.5', changefreq: 'monthly' },
];

export const GET: RequestHandler = ({ url }) => {
	const base = url.origin;
	const today = new Date().toISOString().split('T')[0];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
	.map(
		(r) => `  <url>
    <loc>${base}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
