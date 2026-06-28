import { join } from 'node:path';
import { Scalar } from '@scalar/hono-api-reference';
import { count, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { env } from './config/env.ts';
import { db, demoDb, dialect, prodDb, query } from './db/index.ts';
import { hashPassword } from './utils/password.ts';
import { karyawan, kas_bank, platform_admin, toko } from './db/schema.ts';
import { initAnalyticsTap } from './lib/analytics-tap.ts';
import { bus } from './lib/event-bus.ts';
import { initHooks } from './lib/hooks.ts';
import { initScheduler } from './lib/scheduler.ts';
import { langgananMiddleware } from './middleware/langganan.ts';
import { openAPISpec } from './openapi.ts';
import { absensiRouter } from './routes/absensi.ts';
import { absensiKioskRouter } from './routes/absensi-kiosk.ts';
import { akunRouter } from './routes/akun.ts';
import { analyticsRouter } from './routes/analytics.ts';
import { approvalRouter } from './routes/approval.ts';
import { asetRouter } from './routes/aset.ts';
import { auditRouter } from './routes/audit.ts';
import type { JWTPayload } from './routes/auth.ts';
import { authRouter } from './routes/auth.ts';
import { getBetterAuth } from './lib/auth-ba.ts';
import { barangRouter } from './routes/barang.ts';
import { barangMasukRouter } from './routes/barang_masuk.ts';
import { bomRouter } from './routes/bom.ts';
import { budgetTargetRouter } from './routes/budget-target.ts';
import { crmRouter } from './routes/crm.ts';
import { dashboardRouter } from './routes/dashboard.ts';
import { demoRouter } from './routes/demo.ts';
import { draftRouter } from './routes/draft.ts';
import { evaluasiRouter } from './routes/evaluasi.ts';
import { fnbRouter } from './routes/fnb.ts';
import { hajatanRouter } from './routes/hajatan.ts';
import { hargaRouter } from './routes/harga.ts';
import { inspeksiRouter } from './routes/inspeksi.ts';
import { izinRouter } from './routes/izin.ts';
import { jadwalRouter } from './routes/jadwal.ts';
import { jasaRouter } from './routes/jasa.ts';
import { kartuAnggotaRouter } from './routes/kartu_anggota.ts';
import { karyawanRouter } from './routes/karyawan.ts';
import { kasbonRouter } from './routes/kasbon.ts';
import { keuanganRouter } from './routes/keuangan.ts';
import { lampiranRouter } from './routes/lampiran.ts';
import { langgananRouter } from './routes/langganan.ts';
import { laporanRouter } from './routes/laporan.ts';
import { notifikasiRouter } from './routes/notifikasi.ts';
import { pelangganRouter } from './routes/pelanggan.ts';
import { pengaturanRouter } from './routes/pengaturan.ts';
import { penggajianRouter } from './routes/penggajian.ts';
import { penjualanRouter } from './routes/penjualan.ts';
import { pinjamanInvestasiRouter } from './routes/pinjaman-investasi.ts';
import { platformRouter } from './routes/platform.ts';
import { printerRouter } from './routes/printer.ts';
import { promoRouter } from './routes/promo.ts';
import { purchaseOrderRouter } from './routes/purchase_order.ts';
import { returPenjualanRouter } from './routes/retur-penjualan.ts';
import { returSupplierRouter } from './routes/retur-supplier.ts';
import { salesRouter } from './routes/sales.ts';
import { sanksiInsentifRouter } from './routes/sanksi-insentif.ts';
import { scanRelayRouter } from './routes/scan_relay.ts';
import { shiftRouter } from './routes/shift.ts';
import { sopRouter } from './routes/sop.ts';
import { stokRouter } from './routes/stok.ts';
import { stokOpnameRouter } from './routes/stok_opname.ts';
import { supplierRouter } from './routes/supplier.ts';
import { tamuRouter } from './routes/tamu.ts';
import { tokoRouter } from './routes/toko.ts';
import { tugasRouter } from './routes/tugas.ts';
import { utilitasRouter } from './routes/utilitas.ts';

type Variables = { user: JWTPayload; tenant_id: number; cabang_id: number | null };

const app = new Hono<{ Variables: Variables }>();

app.use('*', logger());
app.use('*', compress());
const corsOrigins = env.corsOrigins;

app.use(
	'*',
	cors({
		origin: (origin) => (corsOrigins.includes(origin ?? '') ? (origin ?? corsOrigins[0]) : null),
		credentials: true
	})
);

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ success: false, error: err.message }, err.status);
	}
	const msg = err instanceof Error ? err.message : String(err);
	if (msg.includes('UNIQUE constraint failed')) {
		const kolom = msg.match(/UNIQUE constraint failed: \w+\.(\w+)/)?.[1] ?? 'data';
		return c.json({ success: false, error: `${kolom} sudah digunakan` }, 409);
	}
	if (msg.includes('FOREIGN KEY constraint failed')) {
		return c.json({ success: false, error: 'Data terkait tidak ditemukan' }, 409);
	}
	if (msg.includes('NOT NULL constraint failed')) {
		const kolom = msg.match(/NOT NULL constraint failed: \w+\.(\w+)/)?.[1] ?? 'field';
		return c.json({ success: false, error: `${kolom} wajib diisi` }, 400);
	}
	console.error(err);
	return c.json({ success: false, error: 'Terjadi kesalahan server' }, 500);
});

app.get('/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

app.get('/openapi.json', (c) => c.json(openAPISpec));
app.get('/doc', Scalar({ spec: { url: '/openapi.json' }, pageTitle: 'Stokasir API' }));

// Serve uploaded files — Bun only (LAN). CF Workers uses R2/S3, served elsewhere.
app.get('/uploads/*', async (c) => {
	if (typeof Bun === 'undefined') return c.notFound();
	const relativePath = c.req.path.replace(/^\/uploads\//, '');
	const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../uploads');
	const file = Bun.file(join(uploadDir, relativePath));
	if (!(await file.exists())) return c.notFound();
	return new Response(file);
});

// Gating langganan SaaS — kunci mutasi saat trial habis/suspended (no-op di mode LAN).
// Dipasang sebelum router bisnis; whitelist /auth, /langganan, /platform & semua GET.
app.use('*', langgananMiddleware);

// Drain event-bus pending promises ke executionCtx.waitUntil setelah response dikirim.
// Mencegah analytics/SOP handler di-cut off oleh CF Workers saat request lifecycle selesai.
app.use('*', async (c, next) => {
  await next();
  try {
    const ctx = c.executionCtx;
    if (ctx?.waitUntil) bus.flushPending((p) => ctx.waitUntil(p));
  } catch {
    // No ExecutionContext in local Bun/Node dev — skip waitUntil
  }
});

// better-auth handler (Bun lokal/LAN) — KV in-memory fallback (c.env undefined).
app.on(['GET', 'POST'], '/api/auth/*', (c) => getBetterAuth((c.env ?? {}) as { KV?: unknown }).handler(c.req.raw));

app.route('/auth', authRouter);
app.route('/langganan', langgananRouter);
app.route('/platform', platformRouter);
app.route('/barang', barangRouter);
app.route('/supplier', supplierRouter);
app.route('/pelanggan', pelangganRouter);
app.route('/kartu-anggota', kartuAnggotaRouter);
app.route('/karyawan', karyawanRouter);
app.route('/penjualan', penjualanRouter);
app.route('/stok', stokRouter);
app.route('/barang-masuk', barangMasukRouter);
app.route('/purchase-order', purchaseOrderRouter);
app.route('/keuangan', keuanganRouter);
app.route('/laporan', laporanRouter);
app.route('/stok-opname', stokOpnameRouter);
app.route('/dashboard', dashboardRouter);
app.route('/analytics', analyticsRouter);
app.route('/akun', akunRouter);
app.route('/absensi', absensiRouter);
app.route('/kasbon', kasbonRouter);
app.route('/penggajian', penggajianRouter);
app.route('/scan-relay', scanRelayRouter);
app.route('/shift', shiftRouter);
app.route('/pengaturan', pengaturanRouter);
app.route('/harga', hargaRouter);
app.route('/retur-penjualan', returPenjualanRouter);
app.route('/retur-supplier', returSupplierRouter);
app.route('/izin', izinRouter);
app.route('/evaluasi', evaluasiRouter);
app.route('/sanksi-insentif', sanksiInsentifRouter);
app.route('/notifikasi', notifikasiRouter);
app.route('/audit', auditRouter);
app.route('/budget-target', budgetTargetRouter);
app.route('/promo', promoRouter);
app.route('/jadwal', jadwalRouter);
app.route('/draft', draftRouter);
app.route('/absensi-kiosk', absensiKioskRouter);
app.route('/sop', sopRouter);
app.route('/approval', approvalRouter);
app.route('/lampiran', lampiranRouter);
app.route('/aset', asetRouter);
app.route('/utilitas', utilitasRouter);
app.route('/pinjaman-investasi', pinjamanInvestasiRouter);
app.route('/tamu', tamuRouter);
app.route('/sales', salesRouter);
app.route('/crm', crmRouter);
app.route('/tugas', tugasRouter);
app.route('/hajatan', hajatanRouter);
app.route('/inspeksi', inspeksiRouter);
app.route('/printer', printerRouter);
app.route('/toko', tokoRouter);
app.route('/fnb', fnbRouter);
app.route('/jasa', jasaRouter);
app.route('/bom', bomRouter);
app.route('/demo', demoRouter);

// Auto-migrate saat startup — aman dijalankan berulang, hanya apply yang belum
if (dialect === 'sqlite') {
	const migrationsFolder = env.migrationsDir;
	migrate(prodDb() as any, { migrationsFolder });
	// DB demo terpisah — migrate juga agar sandbox siap pakai.
	migrate(demoDb() as any, { migrationsFolder });
}
console.log('Database migrations OK');

// Daftarkan semua SOP hooks ke event bus
initHooks();
// Tap event bus → log_aktivitas untuk product/usage analytics
initAnalyticsTap();
// Jalankan alert scheduler (cek setiap menit berdasarkan notifikasi_config)
initScheduler();

// Auto-seed: buat admin default hanya jika belum ada karyawan sama sekali (db segar)
const seedCheck = await query.find<{ total: number }>(db.select({ total: count() }).from(karyawan));
if ((seedCheck?.total ?? 0) === 0) {
	const hash = await hashPassword('admin123');
	// Toko default wajib ada dulu — karyawan.toko_id FK ke toko.id
	await query.exec(
		db.insert(toko).values({
			kode_toko: 'TOKO-001',
			nama: 'Toko Saya'
		}).onConflictDoNothing()
	);
	const tokoSeed = await query.find<{ id: number }>(
		db.select({ id: toko.id }).from(toko).where(eq(toko.kode_toko, 'TOKO-001'))
	);
	await query.exec(
		db.insert(karyawan).values({
			kode_karyawan: 'KRY-001',
			nama: 'Pemilik',
			role: 'pemilik',
			username: 'admin',
			password_hash: hash,
			tipe_gaji: 'bulanan',
			toko_id: tokoSeed!.id
		})
	);
	await query.exec(
		db.insert(kas_bank).values([
			{ nama: 'Kas Toko', tipe: 'kas', saldo_awal: 0 },
			{ nama: 'Bank BRI', tipe: 'bank', saldo_awal: 0 }
		])
	);
	console.log('Seed awal OK — login: admin / admin123');
}

// Auto-seed platform admin — idempoten, dicek terpisah dari karyawan supaya
// db lama (yang sudah punya karyawan tapi belum punya admin platform) ikut
// dapat baris ini saat restart. Cegah human-error "Username/password salah"
// di /platform/login karena seed.ts manual tak pernah dijalankan.
const platformCheck = await query.find<{ total: number }>(
	db.select({ total: count() }).from(platform_admin)
);
if ((platformCheck?.total ?? 0) === 0) {
	const padminUser = (process.env.PLATFORM_ADMIN_USER ?? 'superadmin').toLowerCase();
	const padminPass = process.env.PLATFORM_ADMIN_PASSWORD ?? 'admin123';
	await query.exec(
		db.insert(platform_admin).values({
			username: padminUser,
			password_hash: await hashPassword(padminPass),
			nama: 'Super Admin'
		})
	);
	console.log(`Seed platform admin OK — login /platform: ${padminUser} / ${padminPass}`);
}

const PORT = env.port;
console.log(`Backend berjalan di http://localhost:${PORT}`);

export default {
	port: PORT,
	fetch: app.fetch
};
