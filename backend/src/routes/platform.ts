// ── Platform Route — Super-Admin lintas-tenant ────────────────────────────
// POST /platform/login                       — login operator (cookie platform_token)
// POST /platform/logout                      — hapus cookie sesi
// GET  /platform/me                          — info admin sesi
// GET  /platform/toko                        — list semua toko + status + bukti menunggu
// GET  /platform/pembayaran?status=menunggu  — antrian verifikasi bukti (join toko)
// POST /platform/pembayaran/:id/verifikasi   — setuju → toko aktif +periode×30d; tolak → ditolak
// GET  /platform/ringkasan                   — KPIs: toko per status, revenue, pertumbuhan 6 bulan
// GET  /platform/analytics                   — usage events per toko (log_aktivitas modul=analytics)
//
// Login publik; sisanya dijaga platformMiddleware. Prefix /platform di-whitelist
// langgananMiddleware sehingga tak kena gating 402.

import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { SignJWT } from 'jose';
import { env } from '../config/env.ts';
import { purgeTokoById } from '../db/demo.ts';
import { db, query } from '../db/index.ts';
import { checkRateLimit, getCache } from '../lib/cache.ts';
import {
	karyawan,
	log_aktivitas,
	pembayaran_langganan,
	platform_admin,
	toko
} from '../db/schema.ts';
import type { PlatformPayload } from '../middleware/platform.ts';
import { platformMiddleware } from '../middleware/platform.ts';
import { verifyPassword } from '../utils/password.ts';

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
);
const JWT_EXPIRY_HOURS = Number(process.env.JWT_EXPIRY_HOURS ?? 12);
const COOKIE_MAX_AGE = JWT_EXPIRY_HOURS * 60 * 60;
const COOKIE_SECURE = env.isProd;
const COOKIE_SAMESITE = env.isProd ? 'None' : 'Strict';
const COOKIE_PARTITIONED = env.isProd;

const HARI_MS = 86_400_000;

export const platformRouter = new Hono<{ Variables: { admin: PlatformPayload } }>();

// ── POST /login ───────────────────────────────────────────────────────────
platformRouter.post('/login', async (c) => {
	const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
	const kv = getCache(c.env as { KV?: unknown });
	if (!await checkRateLimit(kv, `rl:platform:${ip}`, 10, 900)) {
		throw new HTTPException(429, {
			message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'
		});
	}

	const body = await c.req.json<{ username: string; password: string }>();
	if (!body.username || !body.password) {
		throw new HTTPException(400, { message: 'Username dan password wajib diisi' });
	}

	const admin = await query.find<typeof platform_admin.$inferSelect>(
		db
			.select()
			.from(platform_admin)
			.where(eq(platform_admin.username, body.username.trim().toLowerCase()))
	);
	if (!admin?.is_active) {
		throw new HTTPException(401, { message: 'Username atau password salah' });
	}

	const valid = await verifyPassword(body.password, admin.password_hash);
	if (!valid) throw new HTTPException(401, { message: 'Username atau password salah' });

	const payload: PlatformPayload = { is_platform: true, id: admin.id!, nama: admin.nama };
	const token = await new SignJWT(payload as unknown as Record<string, unknown>)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
		.sign(JWT_SECRET);

	setCookie(c, 'platform_token', token, {
		httpOnly: true,
		secure: COOKIE_SECURE,
		sameSite: COOKIE_SAMESITE,
		partitioned: COOKIE_PARTITIONED,
		maxAge: COOKIE_MAX_AGE,
		path: '/'
	});

	return c.json({ success: true, data: { id: admin.id, nama: admin.nama } });
});

// ── POST /logout ──────────────────────────────────────────────────────────
platformRouter.post('/logout', (c) => {
	deleteCookie(c, 'platform_token', { path: '/' });
	return c.json({ success: true, data: null });
});

// ── GET /me ───────────────────────────────────────────────────────────────
platformRouter.get('/me', platformMiddleware, (c) => {
	const admin = c.get('admin') as PlatformPayload;
	return c.json({ success: true, data: { id: admin.id, nama: admin.nama } });
});

// ── GET /toko — semua toko + jumlah bukti menunggu ────────────────────────
platformRouter.get('/toko', platformMiddleware, async (c) => {
	const status = c.req.query('status');

	const rows = await query.findAll<{
		id: number;
		nama: string;
		kode_toko: string;
		status_langganan: string;
		trial_berakhir: string | null;
		aktif_sampai: string | null;
		email_pemilik: string | null;
		wa_pemilik: string | null;
	}>(
		db
			.select({
				id: toko.id,
				nama: toko.nama,
				kode_toko: toko.kode_toko,
				status_langganan: toko.status_langganan,
				trial_berakhir: toko.trial_berakhir,
				aktif_sampai: toko.aktif_sampai,
				email_pemilik: toko.email_pemilik,
				wa_pemilik: toko.wa_pemilik
			})
			.from(toko)
			.orderBy(desc(toko.id))
	);

	// Hitung bukti menunggu per toko (agregat dialect-proof, merge di JS).
	const counts = await query.findAll<{ toko_id: number; n: number }>(
		db
			.select({ toko_id: pembayaran_langganan.toko_id, n: count() })
			.from(pembayaran_langganan)
			.where(eq(pembayaran_langganan.status, 'menunggu'))
			.groupBy(pembayaran_langganan.toko_id)
	);
	const cmap = new Map(counts.map((r) => [r.toko_id, Number(r.n)]));

	// Alasan lifecycle terakhir per toko (dari log_aktivitas, JS-side pick latest).
	const lifeLogs = await query.findAll<{ toko_id: number | null; detail_json: unknown }>(
		db
			.select({ toko_id: log_aktivitas.referensi_id, detail_json: log_aktivitas.detail_json })
			.from(log_aktivitas)
			.where(inArray(log_aktivitas.aksi, ['toko_nonaktif', 'toko_hapus_dijadwalkan']))
			.orderBy(desc(log_aktivitas.waktu))
	);
	const amap = new Map<number, string[]>();
	for (const l of lifeLogs) {
		if (l.toko_id !== null && !amap.has(l.toko_id)) {
			const det = l.detail_json as { alasan?: string[] } | null;
			amap.set(l.toko_id, det?.alasan ?? []);
		}
	}

	let data = rows.map((t) => ({
		...t,
		bukti_menunggu: cmap.get(t.id) ?? 0,
		alasan_terakhir: amap.get(t.id) ?? []
	}));
	if (status) data = data.filter((t) => t.status_langganan === status);

	return c.json({ success: true, data });
});

// ── POST /toko/:id/status — override status langganan (admin) ──────────────
const STATUS_VALID = ['trial', 'aktif', 'suspended', 'deactivated', 'deleted'] as const;
type StatusToko = (typeof STATUS_VALID)[number];

platformRouter.post('/toko/:id/status', platformMiddleware, async (c) => {
	const id = Number(c.req.param('id'));
	const body = await c.req.json<{ status: StatusToko }>();
	if (!STATUS_VALID.includes(body.status)) {
		throw new HTTPException(400, { message: 'Status tidak valid' });
	}

	// deleted/deactivated → kunci akses; reaktivasi → buka + batal jadwal hapus.
	const dikunci = body.status === 'deleted' || body.status === 'deactivated';
	await query.exec(
		db
			.update(toko)
			.set({
				status_langganan: body.status,
				is_active: !dikunci,
				...(dikunci ? {} : { hapus_terjadwal: null })
			})
			.where(eq(toko.id, id))
	);

	return c.json({ success: true, data: { id, status: body.status } });
});

// ── DELETE /toko/:id — hard purge tenant (irreversible) ────────────────────
// Hapus toko + SELURUH data tenant via cascade. Beda dari status 'deleted'
// (soft-lock). Body { konfirmasi: kode_toko } harus cocok agar tak salah hapus.
platformRouter.delete('/toko/:id', platformMiddleware, async (c) => {
	const id = Number(c.req.param('id'));
	const body = await c.req
		.json<{ konfirmasi?: string }>()
		.catch(() => ({}) as { konfirmasi?: string });

	const t = await query.find<{ kode_toko: string; nama: string }>(
		db.select({ kode_toko: toko.kode_toko, nama: toko.nama }).from(toko).where(eq(toko.id, id))
	);
	if (!t) throw new HTTPException(404, { message: 'Toko tidak ditemukan' });
	if (body.konfirmasi !== t.kode_toko) {
		throw new HTTPException(400, { message: 'Konfirmasi kode toko tidak cocok' });
	}

	await purgeTokoById(id);
	return c.json({ success: true, data: { id, nama: t.nama } });
});

// ── GET /pembayaran — antrian verifikasi bukti ────────────────────────────
platformRouter.get('/pembayaran', platformMiddleware, async (c) => {
	const status = (c.req.query('status') ?? 'menunggu') as 'menunggu' | 'disetujui' | 'ditolak';

	const rows = await query.findAll(
		db
			.select({
				id: pembayaran_langganan.id,
				toko_id: pembayaran_langganan.toko_id,
				nama_toko: toko.nama,
				periode_bulan: pembayaran_langganan.periode_bulan,
				nominal: pembayaran_langganan.nominal,
				bukti_path: pembayaran_langganan.bukti_path,
				status: pembayaran_langganan.status,
				catatan_admin: pembayaran_langganan.catatan_admin,
				created_at: pembayaran_langganan.created_at
			})
			.from(pembayaran_langganan)
			.innerJoin(toko, eq(pembayaran_langganan.toko_id, toko.id))
			.where(eq(pembayaran_langganan.status, status))
			.orderBy(desc(pembayaran_langganan.id))
	);

	return c.json({ success: true, data: rows });
});

// ── POST /pembayaran/:id/verifikasi — setuju / tolak ──────────────────────
platformRouter.post('/pembayaran/:id/verifikasi', platformMiddleware, async (c) => {
	const admin = c.get('admin') as PlatformPayload;
	const id = Number(c.req.param('id'));
	const body = await c.req.json<{ aksi: 'setuju' | 'tolak'; catatan?: string }>();

	if (body.aksi !== 'setuju' && body.aksi !== 'tolak') {
		throw new HTTPException(400, { message: 'aksi tidak valid' });
	}

	const bayar = await query.find<typeof pembayaran_langganan.$inferSelect>(
		db.select().from(pembayaran_langganan).where(eq(pembayaran_langganan.id, id))
	);
	if (!bayar) throw new HTTPException(404, { message: 'Pembayaran tidak ditemukan' });
	if (bayar.status !== 'menunggu') {
		throw new HTTPException(409, { message: 'Pembayaran sudah diverifikasi' });
	}

	const catatan = body.catatan?.trim() || null;

	if (body.aksi === 'tolak') {
		await query.exec(
			db
				.update(pembayaran_langganan)
				.set({ status: 'ditolak', catatan_admin: catatan, diverifikasi_oleh: admin.id })
				.where(eq(pembayaran_langganan.id, id))
		);
		return c.json({ success: true, data: { status: 'ditolak' } });
	}

	// Setuju → perpanjang langganan. Basis = aktif_sampai bila masih di depan, else now.
	const tokoRow = await query.find<{ aktif_sampai: string | null }>(
		db.select({ aktif_sampai: toko.aktif_sampai }).from(toko).where(eq(toko.id, bayar.toko_id))
	);
	const now = Date.now();
	const existing = tokoRow?.aktif_sampai ? new Date(tokoRow.aktif_sampai).getTime() : 0;
	const base = existing > now ? existing : now;
	const aktifSampai = new Date(base + bayar.periode_bulan * 30 * HARI_MS).toISOString();

	await query.exec(
		db
			.update(pembayaran_langganan)
			.set({ status: 'disetujui', catatan_admin: catatan, diverifikasi_oleh: admin.id })
			.where(eq(pembayaran_langganan.id, id))
	);
	await query.exec(
		db
			.update(toko)
			.set({ status_langganan: 'aktif', aktif_sampai: aktifSampai })
			.where(eq(toko.id, bayar.toko_id))
	);

	return c.json({ success: true, data: { status: 'disetujui', aktif_sampai: aktifSampai } });
});

// ── GET /ringkasan — business KPIs: toko per status, revenue, pertumbuhan ───
platformRouter.get('/ringkasan', platformMiddleware, async (c) => {
	const now = new Date();
	const ago7d = new Date(now.getTime() - 7 * HARI_MS).toISOString().slice(0, 10);
	const ago30d = new Date(now.getTime() - 30 * HARI_MS).toISOString().slice(0, 10);

	const [tokoRows, bayarRows] = await Promise.all([
		query.findAll<{ status_langganan: string; created_at: string | null }>(
			db.select({ status_langganan: toko.status_langganan, created_at: toko.created_at }).from(toko)
		),
		query.findAll<{ nominal: number; created_at: string | null }>(
			db
				.select({ nominal: pembayaran_langganan.nominal, created_at: pembayaran_langganan.created_at })
				.from(pembayaran_langganan)
				.where(eq(pembayaran_langganan.status, 'disetujui'))
		),
	]);

	const per_status: Record<string, number> = {};
	let toko_baru_7d = 0;
	let toko_baru_30d = 0;
	const tokoPerBulan = new Map<string, number>();

	for (const t of tokoRows) {
		per_status[t.status_langganan] = (per_status[t.status_langganan] ?? 0) + 1;
		const hari = (t.created_at ?? '').slice(0, 10);
		if (hari >= ago7d) toko_baru_7d++;
		if (hari >= ago30d) toko_baru_30d++;
		const bulan = (t.created_at ?? '').slice(0, 7);
		if (bulan) tokoPerBulan.set(bulan, (tokoPerBulan.get(bulan) ?? 0) + 1);
	}

	let pendapatan_bulan_ini = 0;
	let pendapatan_total = 0;
	const bulanIni = now.toISOString().slice(0, 7);
	const revPerBulan = new Map<string, number>();

	for (const b of bayarRows) {
		pendapatan_total += b.nominal;
		const bulan = (b.created_at ?? '').slice(0, 7);
		if (bulan === bulanIni) pendapatan_bulan_ini += b.nominal;
		if (bulan) revPerBulan.set(bulan, (revPerBulan.get(bulan) ?? 0) + b.nominal);
	}

	const per_bulan = Array.from({ length: 6 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
		const bulan = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		return { bulan, pendapatan: revPerBulan.get(bulan) ?? 0, toko_baru: tokoPerBulan.get(bulan) ?? 0 };
	});

	return c.json({
		success: true,
		data: { total_toko: tokoRows.length, per_status, toko_baru_7d, toko_baru_30d, pendapatan_bulan_ini, pendapatan_total, per_bulan },
	});
});

// ── GET /analytics — usage analytics lintas-tenant, agregat per toko ───────
// Join log_aktivitas → karyawan → toko (toko_id), modul='analytics'.
// Event sistem (karyawan_id null) tak punya toko → masuk total_global saja.
platformRouter.get('/analytics', platformMiddleware, async (c) => {
	const sampai = c.req.query('sampai') ?? new Date().toISOString().slice(0, 10);
	const dari =
		c.req.query('dari') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

	const rows = await query.findAll<{
		toko_id: number | null;
		nama: string | null;
		kode_toko: string | null;
		aksi: string;
		waktu: string | null;
	}>(
		db
			.select({
				toko_id: karyawan.toko_id,
				nama: toko.nama,
				kode_toko: toko.kode_toko,
				aksi: log_aktivitas.aksi,
				waktu: log_aktivitas.waktu
			})
			.from(log_aktivitas)
			.leftJoin(karyawan, eq(log_aktivitas.karyawan_id, karyawan.id))
			.leftJoin(toko, eq(karyawan.toko_id, toko.id))
			.where(
				and(
					eq(log_aktivitas.modul, 'analytics'),
					gte(log_aktivitas.waktu, dari),
					lte(log_aktivitas.waktu, `${sampai}T23:59:59`)
				)
			)
	);

	// Agregat di JS — dialect-proof
	const tokoMap = new Map<
		number,
		{ toko_id: number; nama: string; kode_toko: string; total: number; terakhir: string }
	>();
	const perHariMap = new Map<string, number>();
	for (const r of rows) {
		const hari = (r.waktu ?? '').slice(0, 10);
		if (hari) perHariMap.set(hari, (perHariMap.get(hari) ?? 0) + 1);
		if (r.toko_id == null) continue;
		const cur = tokoMap.get(r.toko_id) ?? {
			toko_id: r.toko_id,
			nama: r.nama ?? `Toko #${r.toko_id}`,
			kode_toko: r.kode_toko ?? '',
			total: 0,
			terakhir: ''
		};
		cur.total += 1;
		if ((r.waktu ?? '') > cur.terakhir) cur.terakhir = r.waktu ?? '';
		tokoMap.set(r.toko_id, cur);
	}

	const per_toko = [...tokoMap.values()].sort((a, b) => b.total - a.total);
	const per_hari = [...perHariMap.entries()]
		.map(([tanggal, jumlah]) => ({ tanggal, jumlah }))
		.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

	return c.json({
		success: true,
		data: { dari, sampai, total_global: rows.length, per_toko, per_hari }
	});
});
