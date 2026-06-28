// ── Akun — self-service profil + lifecycle toko ───────────────────────────
// GET  /akun/profil            — data diri + status toko + sisa hari hapus
// PUT  /akun/profil            — self-edit nama/email/kontak/foto (semua role)
// POST /akun/ganti-password    — verifikasi password lama → set baru
// Pemilik-only (target = seluruh toko):
// POST /akun/toko/nonaktif     — status_langganan='deactivated'
// POST /akun/toko/aktifkan     — balik aktif + clear jadwal hapus
// POST /akun/toko/hapus        — jadwalkan hapus (grace 30 hari)
// POST /akun/toko/batal-hapus  — batalkan jadwal hapus

import { and, eq, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db, query } from '../db/index.ts';
import { karyawan, toko } from '../db/schema.ts';
import { authMiddleware } from '../middleware/auth.ts';
import { catatLog } from '../utils/log.ts';
import type { JWTPayload } from './auth.ts';
import { hashPassword, verifyPassword } from '../utils/password.ts';

const GRACE_HARI = 30;

export const akunRouter = new Hono<{ Variables: { user: JWTPayload } }>();
akunRouter.use('*', authMiddleware);

// Hitung sisa hari menuju purge (dibulatkan ke atas). null bila tak terjadwal.
function sisaHari(iso: string | null): number | null {
	if (!iso) return null;
	return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

akunRouter.get('/profil', async (c) => {
	const user = c.get('user');
	const k = await query.find<{
		id: number;
		kode_karyawan: string;
		nama: string;
		role: string;
		username: string;
		email: string | null;
		kontak: string | null;
		foto_path: string | null;
		gaji_pokok: number;
		tipe_gaji: string;
		pin_absensi: string | null;
	}>(
		db
			.select({
				id: karyawan.id,
				kode_karyawan: karyawan.kode_karyawan,
				nama: karyawan.nama,
				role: karyawan.role,
				username: karyawan.username,
				email: karyawan.email,
				kontak: karyawan.kontak,
				foto_path: karyawan.foto_path,
				gaji_pokok: karyawan.gaji_pokok,
				tipe_gaji: karyawan.tipe_gaji,
				pin_absensi: karyawan.pin_absensi
			})
			.from(karyawan)
			.where(eq(karyawan.id, user.id))
	);
	if (!k) throw new HTTPException(404, { message: 'Akun tidak ditemukan' });

	const t = await query.find<{ status_langganan: string; hapus_terjadwal: string | null }>(
		db
			.select({ status_langganan: toko.status_langganan, hapus_terjadwal: toko.hapus_terjadwal })
			.from(toko)
			.where(eq(toko.id, user.tenant_id))
	);

	const { pin_absensi, ...kData } = k;
	return c.json({
		success: true,
		data: {
			...kData,
			has_pin: !!pin_absensi,
			status_toko: t?.status_langganan ?? null,
			hapus_terjadwal: t?.hapus_terjadwal ?? null,
			sisa_hari_hapus: sisaHari(t?.hapus_terjadwal ?? null)
		}
	});
});

akunRouter.put('/profil', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<{
		nama?: string;
		email?: string | null;
		kontak?: string | null;
		foto_path?: string | null;
	}>();

	const nama = body.nama?.trim();
	if (nama !== undefined && !nama) throw new HTTPException(400, { message: 'Nama wajib diisi' });

	const email = body.email?.trim() || null;
	if (email) {
		const bentrok = await query.find<{ id: number }>(
			db
				.select({ id: karyawan.id })
				.from(karyawan)
				.where(and(eq(karyawan.email, email), ne(karyawan.id, user.id)))
		);
		if (bentrok) throw new HTTPException(409, { message: 'Email sudah digunakan' });
	}

	await query.exec(
		db
			.update(karyawan)
			.set({
				...(nama !== undefined ? { nama } : {}),
				...(body.email !== undefined ? { email } : {}),
				...(body.kontak !== undefined ? { kontak: body.kontak?.trim() || null } : {}),
				...(body.foto_path !== undefined ? { foto_path: body.foto_path || null } : {})
			})
			.where(eq(karyawan.id, user.id))
	);

	return c.json({ success: true, data: { id: user.id } });
});

akunRouter.post('/ganti-password', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<{ lama: string; baru: string }>();
	if (!body.lama || !body.baru)
		throw new HTTPException(400, { message: 'Password lama & baru wajib diisi' });
	if (body.baru.length < 6)
		throw new HTTPException(400, { message: 'Password baru minimal 6 karakter' });

	const k = await query.find<{ password_hash: string }>(
		db
			.select({ password_hash: karyawan.password_hash })
			.from(karyawan)
			.where(eq(karyawan.id, user.id))
	);
	if (!k) throw new HTTPException(404, { message: 'Akun tidak ditemukan' });

	const valid = await verifyPassword(body.lama, k.password_hash);
	if (!valid) throw new HTTPException(401, { message: 'Password lama salah' });

	const hash = await hashPassword(body.baru);
	await query.exec(
		db.update(karyawan).set({ password_hash: hash }).where(eq(karyawan.id, user.id))
	);

	return c.json({ success: true, data: null });
});

akunRouter.post('/ganti-pin', async (c) => {
	const user = c.get('user');
	const body = await c.req.json<{ lama?: string; baru: string }>();
	if (!body.baru || !/^\d{4}$/.test(body.baru))
		throw new HTTPException(400, { message: 'PIN baru harus 4 digit angka' });

	const k = await query.find<{ pin_absensi: string | null }>(
		db.select({ pin_absensi: karyawan.pin_absensi }).from(karyawan).where(eq(karyawan.id, user.id))
	);
	if (!k) throw new HTTPException(404, { message: 'Akun tidak ditemukan' });

	if (k.pin_absensi) {
		if (!body.lama) throw new HTTPException(400, { message: 'PIN lama wajib diisi' });
		if (!(await verifyPassword(body.lama, k.pin_absensi)))
			throw new HTTPException(401, { message: 'PIN lama salah' });
	}

	const hash = await hashPassword(body.baru);
	await query.exec(db.update(karyawan).set({ pin_absensi: hash }).where(eq(karyawan.id, user.id)));

	return c.json({ success: true, data: null });
});

// ── Lifecycle toko — pemilik saja ─────────────────────────────────────────
function pastikanPemilik(c: { get: (k: 'user') => JWTPayload }): JWTPayload {
	const user = c.get('user');
	if (user.role !== 'pemilik') throw new HTTPException(403, { message: 'Hanya pemilik' });
	return user;
}

// Verifikasi ulang password pemilik untuk aksi destruktif. Lempar 401 bila salah.
async function pastikanPassword(userId: number, password: string | undefined) {
	if (!password) throw new HTTPException(400, { message: 'Password wajib diisi' });
	const k = await query.find<{ password_hash: string }>(
		db
			.select({ password_hash: karyawan.password_hash })
			.from(karyawan)
			.where(eq(karyawan.id, userId))
	);
	if (!k || !(await verifyPassword(password, k.password_hash))) {
		throw new HTTPException(401, { message: 'Password salah' });
	}
}

type DestruktifBody = { password?: string; alasan?: string[] };

akunRouter.post('/toko/nonaktif', async (c) => {
	const user = pastikanPemilik(c);
	const body = await c.req.json<DestruktifBody>();
	await pastikanPassword(user.id, body.password);
	await query.exec(
		db
			.update(toko)
			.set({ status_langganan: 'deactivated', is_active: false })
			.where(eq(toko.id, user.tenant_id))
	);
	catatLog(user.id, 'toko_nonaktif', 'akun', user.tenant_id, { alasan: body.alasan ?? [] });
	return c.json({ success: true, data: { status: 'deactivated' } });
});

akunRouter.post('/toko/aktifkan', async (c) => {
	const user = pastikanPemilik(c);
	const t = await query.find<{ trial_berakhir: string | null }>(
		db.select({ trial_berakhir: toko.trial_berakhir }).from(toko).where(eq(toko.id, user.tenant_id))
	);
	// Trial masih berlaku → 'trial', selain itu → 'aktif'
	const status =
		t?.trial_berakhir && new Date(t.trial_berakhir).getTime() > Date.now() ? 'trial' : 'aktif';
	await query.exec(
		db
			.update(toko)
			.set({ status_langganan: status, is_active: true, hapus_terjadwal: null })
			.where(eq(toko.id, user.tenant_id))
	);
	return c.json({ success: true, data: { status } });
});

akunRouter.post('/toko/hapus', async (c) => {
	const user = pastikanPemilik(c);
	const body = await c.req.json<DestruktifBody>();
	await pastikanPassword(user.id, body.password);
	const target = new Date(Date.now() + GRACE_HARI * 86_400_000).toISOString();
	await query.exec(
		db.update(toko).set({ hapus_terjadwal: target }).where(eq(toko.id, user.tenant_id))
	);
	catatLog(user.id, 'toko_hapus_dijadwalkan', 'akun', user.tenant_id, {
		alasan: body.alasan ?? []
	});
	return c.json({ success: true, data: { hapus_terjadwal: target, sisa_hari_hapus: GRACE_HARI } });
});

akunRouter.post('/toko/batal-hapus', async (c) => {
	const user = pastikanPemilik(c);
	await query.exec(
		db.update(toko).set({ hapus_terjadwal: null }).where(eq(toko.id, user.tenant_id))
	);
	return c.json({ success: true, data: null });
});
