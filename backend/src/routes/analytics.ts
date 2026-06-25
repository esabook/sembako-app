import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { db, query } from '../db/index.ts';
import { karyawan, log_aktivitas } from '../db/schema.ts';
import { authMiddleware } from '../middleware/auth.ts';
import { tenantMiddleware } from '../middleware/tenant.ts';
import type { JWTPayload } from './auth.ts';

export const analyticsRouter = new Hono<{ Variables: { user: JWTPayload } }>();
analyticsRouter.use('*', authMiddleware);
analyticsRouter.use('*', tenantMiddleware);

// GET /analytics/usage?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
// Agregasi event usage (modul='analytics') dari log_aktivitas:
//   - per_aksi: jumlah event per jenis aksi
//   - per_hari: tren harian (semua aksi digabung)
//   - total: jumlah event di rentang
// Tenant scope via karyawan.toko_id; event sistem (karyawan_id null) ikut tampil.
analyticsRouter.get('/usage', async (c) => {
	const user = c.get('user') as JWTPayload;
	const tenantId = user.tenant_id ?? 1;

	const sampai = c.req.query('sampai') ?? new Date().toISOString().slice(0, 10);
	const dari =
		c.req.query('dari') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

	// Range pada kolom waktu (ISO penuh): dari 00:00 sampai 23:59:59 inklusif
	const rows = await query.findAll<{ aksi: string; waktu: string | null }>(
		db
			.select({ aksi: log_aktivitas.aksi, waktu: log_aktivitas.waktu })
			.from(log_aktivitas)
			.leftJoin(karyawan, eq(log_aktivitas.karyawan_id, karyawan.id))
			.where(
				and(
					eq(log_aktivitas.modul, 'analytics'),
					gte(log_aktivitas.waktu, dari),
					lte(log_aktivitas.waktu, `${sampai}T23:59:59`),
					or(eq(karyawan.toko_id, tenantId), isNull(log_aktivitas.karyawan_id))
				)
			)
	);

	// Agregasi di JS — dialect-proof (tanpa date()/substr yang beda per dialect)
	const perAksiMap = new Map<string, number>();
	const perHariMap = new Map<string, number>();
	for (const r of rows) {
		perAksiMap.set(r.aksi, (perAksiMap.get(r.aksi) ?? 0) + 1);
		const hari = (r.waktu ?? '').slice(0, 10);
		if (hari) perHariMap.set(hari, (perHariMap.get(hari) ?? 0) + 1);
	}

	const per_aksi = [...perAksiMap.entries()]
		.map(([aksi, jumlah]) => ({ aksi, jumlah }))
		.sort((a, b) => b.jumlah - a.jumlah);
	const per_hari = [...perHariMap.entries()]
		.map(([tanggal, jumlah]) => ({ tanggal, jumlah }))
		.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

	return c.json({
		success: true,
		data: { dari, sampai, total: rows.length, per_aksi, per_hari }
	});
});
