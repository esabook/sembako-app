import { and, eq, inArray, } from 'drizzle-orm';
import { type Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.ts';
import { db, demoDb, isoNow, prodDb, query, withTransaction } from '../db/index.ts';
import { checkRateLimit, getCache } from '../lib/cache.ts';
import { hashPassword, verifyPassword } from '../utils/password.ts';

// Evaluated per-request so CF Workers process.env (set by worker.ts middleware) is current.
// Module-level env.isProd freezes at module init before worker.ts sets process.env from c.env.
const cookieProd = () => process.env.NODE_ENV === 'production';

import { ba_session, ba_user, cabang, karyawan, toko, toko_settings } from '../db/schema.ts';
import { linkOrCreateBaUser } from '../db/backfill-ba.ts';
import { getBetterAuth } from '../lib/auth-ba.ts';
import type { Role } from '../middleware/auth.ts';
import { authMiddleware } from '../middleware/auth.ts';

const jwtSecret = () =>
	new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production');
const JWT_EXPIRY_HOURS = Number(process.env.JWT_EXPIRY_HOURS ?? 12);
const COOKIE_MAX_AGE = JWT_EXPIRY_HOURS * 60 * 60;

// Mode SaaS multi-tenant (flag terpusat env.saasGating, sama dgn gating langganan).
// Saat aktif, pemilik HANYA boleh akses toko miliknya (email_pemilik), bukan semua toko.
// Mode LAN (default): pemilik = superuser 1 instance → lihat semua toko.

const TRIAL_HARI = Number(process.env.TRIAL_HARI ?? 14);

export type JWTPayload = {
	sub: string;
	id: number;
	nama: string;
	role: Role;
	kode_karyawan: string;
	email: string; // email akun pemilik — tetap saat switch-context, dipakai untuk scope SaaS
	tenant_id: number; // toko yang diakses
	cabang_id: number | null; // null = akses semua cabang toko ini (manajer/pemilik)
	is_demo?: boolean; // true = sesi sedang di toko demo → semua query route ke DB demo
	home_toko_id?: number; // toko asli (prod) pemilik — stabil lintas switch-context, dipakai onboarding & restore identitas
	sid?: string; // id session better-auth (Fase A) → divalidasi di middleware untuk revoke/list device
	iat?: number;
	exp?: number;
};

// Tanda-tangani JWT custom (tanpa set cookie). Dipakai issueAuthCookie & jalur
// OAuth (frontend yang set cookie di domain pages.dev).
export async function signAuthToken(payload: JWTPayload): Promise<string> {
	return new SignJWT(payload as Record<string, unknown>)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
		.sign(jwtSecret());
}

// Mint JWT custom + set cookie auth_token. Dipakai login & switch-context.
// sid (bila ada) ikut diembed agar middleware bisa validasi/revoke sesi.
export async function issueAuthCookie(c: Context, payload: JWTPayload): Promise<string> {
	const token = await signAuthToken(payload);

	setCookie(c, 'auth_token', token, {
		httpOnly: true,
		secure: cookieProd(),
		sameSite: cookieProd() ? 'None' : 'Strict',
		partitioned: cookieProd(),
		maxAge: COOKIE_MAX_AGE,
		path: '/'
	});
	return token;
}

// Bridge: buat session better-auth utk karyawan ber-identity, kembalikan sid
// (ba_session.id) untuk diembed ke JWT. Gagal/akun belum dimigrasi → null
// (login tetap jalan via JWT tanpa sid, app tak berubah).
async function bridgeSession(
	c: Context,
	email: string,
	password: string
): Promise<string | null> {
	try {
		const auth = getBetterAuth(c.env as { KV?: unknown });
		const res = await auth.api.signInEmail({
			body: { email, password },
			headers: c.req.raw.headers, // rekam ip/user-agent utk device list
		});
		const token = (res as { token?: string }).token;
		if (!token) return null;
		const sess = await query.find<{ id: string }>(
			prodDb().select({ id: ba_session.id }).from(ba_session).where(eq(ba_session.token, token))
		);
		return sess?.id ?? null;
	} catch {
		return null; // password salah sudah ditangani verifyPassword; jangan gagalkan login
	}
}

// Offset id toko demo di response accessible-context — bedakan demo dari prod
// & hindari collision id (kedua DB autoincrement dari 1). Hanya encoding transport.
const DEMO_ID_OFFSET = 1_000_000_000;

export const authRouter = new Hono<{ Variables: { user: JWTPayload } }>();

authRouter.post('/login', async (c) => {
	const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
	const kv = getCache(c.env as { KV?: unknown });
	if (!await checkRateLimit(kv, `rl:login:${ip}`, 10, 900)) {
		throw new HTTPException(429, {
			message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'
		});
	}

	const body = await c.req.json<{ username: string; password: string }>();

	if (!body.username || !body.password) {
		throw new HTTPException(400, { message: 'Username / email dan password wajib diisi' });
	}

	const identifier = body.username.trim().toLowerCase();
	const isEmail = identifier.includes('@');
	const user = await query.find<typeof karyawan.$inferSelect>(
		db
			.select()
			.from(karyawan)
			.where(isEmail ? eq(karyawan.email, identifier) : eq(karyawan.username, identifier))
	);

	if (!user?.is_active) {
		throw new HTTPException(401, { message: 'Username / email atau password salah' });
	}

	const valid = await verifyPassword(body.password, user.password_hash);
	if (!valid) {
		throw new HTTPException(401, { message: 'Username atau password salah' });
	}

	if (!user.toko_id) {
		throw new HTTPException(400, { message: 'Akun tidak memiliki toko terkait. Hubungi admin.' });
	}
	const tenantId = user.toko_id;

	// Gating status toko: 'deleted' kunci semua; 'deactivated' kunci non-pemilik
	// (pemilik tetap masuk supaya bisa reaktivasi di pengaturan/profile).
	const statusToko = await query.find<{ status_langganan: string }>(
		db.select({ status_langganan: toko.status_langganan }).from(toko).where(eq(toko.id, tenantId))
	);
	if (statusToko?.status_langganan === 'deleted') {
		throw new HTTPException(403, { message: 'Toko telah dihapus. Hubungi admin.' });
	}
	if (statusToko?.status_langganan === 'deactivated' && user.role !== 'pemilik') {
		throw new HTTPException(403, { message: 'Toko dinonaktifkan. Hubungi pemilik.' });
	}

	// Bridge ke better-auth: karyawan ber-email & sudah dimigrasi (ba_user_id) →
	// buat session better-auth untuk dapat sid (revoke/list device). Belum
	// dimigrasi → sid null, login tetap jalan via JWT (app tak berubah).
	const sid = user.email && user.ba_user_id
		? await bridgeSession(c, user.email, body.password)
		: null;

	const payload: JWTPayload = {
		sub: String(user.id),
		id: user.id!,
		nama: user.nama,
		role: user.role,
		kode_karyawan: user.kode_karyawan,
		email: user.email ?? '',
		tenant_id: tenantId,
		cabang_id: user.cabang_id ?? null,
		home_toko_id: tenantId, // toko asli (prod) — stabil lintas switch-context
		is_demo: false,
		...(sid ? { sid } : {})
	};

	await issueAuthCookie(c, payload);

	return c.json({
		success: true,
		data: {
			id: user.id,
			nama: user.nama,
			role: user.role,
			kode_karyawan: user.kode_karyawan,
			tenant_id: tenantId,
			cabang_id: user.cabang_id ?? null
		}
	});
});

// ─── Registrasi mandiri (publik) — SaaS cloud ───────────────────────────────
type DaftarBody = {
	nama_toko: string;
	nama_pemilik: string;
	password: string;
	email: string;
	wa: string;
	nama_cabang?: string;
};

authRouter.post('/daftar', async (c) => {
	const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
	const kv = getCache(c.env as { KV?: unknown });
	if (!await checkRateLimit(kv, `rl:daftar:${ip}`, 5, 3600)) {
		throw new HTTPException(429, { message: 'Terlalu banyak pendaftaran. Coba lagi dalam 1 jam.' });
	}

	const b = await c.req.json<DaftarBody>();

	// Validasi field wajib
	const nama_toko = b.nama_toko?.trim();
	const nama_pemilik = b.nama_pemilik?.trim();
	const email = b.email?.trim().toLowerCase();
	const wa = b.wa?.trim();
	if (!nama_toko || !nama_pemilik || !b.password || !email || !wa) {
		throw new HTTPException(400, {
			message: 'Nama toko, nama pemilik, password, email, dan WA wajib diisi'
		});
	}
	if (b.password.length < 6) {
		throw new HTTPException(400, { message: 'Password minimal 6 karakter' });
	}
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		throw new HTTPException(400, { message: 'Format email tidak valid' });
	}
	if (!/^[0-9+\s-]{8,}$/.test(wa)) {
		throw new HTTPException(400, { message: 'Nomor WA tidak valid' });
	}

	// Cek email unik (constraint DB juga jaga race)
	const exists = await query.find(
		db.select({ id: karyawan.id }).from(karyawan).where(eq(karyawan.email, email))
	);
	if (exists) {
		throw new HTTPException(409, {
			message: 'Email sudah terdaftar, gunakan email lain atau masuk'
		});
	}

	// Auto-generate username dari prefix email + suffix waktu (dijamin unik)
	const emailPrefix = (email.split('@')[0] ?? 'user').replace(/[^a-z0-9._-]/g, '_').slice(0, 20);

	const hash = await hashPassword(b.password);
	const trialBerakhir = new Date(Date.now() + TRIAL_HARI * 24 * 60 * 60 * 1000).toISOString();
	// Kode unik berbasis waktu — hindari tabrakan tanpa query max id
	const suffix = Date.now().toString(36).toUpperCase();
	// Username auto-generated; pemilik login pakai email
	const username = `${emailPrefix}_${suffix.toLowerCase()}`;

	const result = await withTransaction(async () => {
		const tokoRow = await query.ret<{ id: number }>(
			db
				.insert(toko)
				.values({
					kode_toko: `T-${suffix}`,
					nama: nama_toko,
					status_langganan: 'trial',
					trial_berakhir: trialBerakhir,
					email_pemilik: email,
					wa_pemilik: wa,
					is_active: true
				})
				.returning()
		);
		const tid = tokoRow!.id;

		const cabangRow = await query.ret<{ id: number }>(
			db
				.insert(cabang)
				.values({
					toko_id: tid,
					kode_cabang: 'CAB-01',
					nama: b.nama_cabang?.trim() || 'Cabang Utama',
					is_active: true
				})
				.returning()
		);
		const cid = cabangRow!.id;

		await query.ret<{ id: number }>(
			db
				.insert(karyawan)
				.values({
					kode_karyawan: `KRY-${suffix}`,
					nama: nama_pemilik,
					role: 'pemilik',
					username,
					email,
					password_hash: hash,
					tipe_gaji: 'bulanan',
					toko_id: tid,
					cabang_id: null // pemilik akses semua cabang
				})
				.returning()
		);

		return { toko_id: tid, cabang_id: cid };
	});

	return c.json({ success: true, data: { toko_id: result.toko_id } }, 201);
});

// Cabut sesi better-auth by sid + bust cache validasi → langsung berlaku.
async function revokeSid(c: Context, sid: string): Promise<void> {
	await query.exec(prodDb().delete(ba_session).where(eq(ba_session.id, sid)));
	await getCache(c.env as { KV?: unknown }).delete(`sid:${sid}`);
}

authRouter.post('/logout', async (c) => {
	// JWT ber-sid → cabut sesi better-auth juga supaya device list akurat.
	const token = getCookie(c, 'auth_token');
	if (token) {
		try {
			const { payload } = await jwtVerify(token, jwtSecret());
			const sid = (payload as JWTPayload).sid;
			if (sid) await revokeSid(c, sid);
		} catch {
			// token invalid → cukup hapus cookie
		}
	}
	deleteCookie(c, 'auth_token', { path: '/' });
	return c.json({ success: true, data: null });
});

// Daftar perangkat/sesi aktif milik akun (by email → ba_user). Demo: email
// pemilik tetap → list sesi prod akun tsb. Tandai sesi current via sid.
authRouter.get('/sesi', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	if (!user.email) return c.json({ success: true, data: [] });
	const baUser = await query.find<{ id: string }>(
		prodDb().select({ id: ba_user.id }).from(ba_user).where(eq(ba_user.email, user.email))
	);
	if (!baUser) return c.json({ success: true, data: [] });

	const rows = await prodDb()
		.select({
			id: ba_session.id,
			ip_address: ba_session.ip_address,
			user_agent: ba_session.user_agent,
			created_at: ba_session.created_at,
			expires_at: ba_session.expires_at
		})
		.from(ba_session)
		.where(eq(ba_session.user_id, baUser.id));

	return c.json({
		success: true,
		data: rows.map((s) => ({
			id: s.id,
			ip: s.ip_address,
			perangkat: s.user_agent,
			dibuat: s.created_at,
			berakhir: s.expires_at,
			current: s.id === user.sid
		}))
	});
});

// Cabut sesi tertentu (logout perangkat lain). Pastikan sesi milik akun pemanggil.
authRouter.post('/sesi/:id/cabut', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	const sid = c.req.param('id');
	if (!sid) throw new HTTPException(400, { message: 'sid wajib diisi' });
	if (!user.email) throw new HTTPException(403, { message: 'Akun tanpa email tak punya sesi' });

	const baUser = await query.find<{ id: string }>(
		prodDb().select({ id: ba_user.id }).from(ba_user).where(eq(ba_user.email, user.email))
	);
	const owned = baUser
		? await query.find<{ id: string }>(
				prodDb()
					.select({ id: ba_session.id })
					.from(ba_session)
					.where(and(eq(ba_session.id, sid), eq(ba_session.user_id, baUser.id)))
			)
		: null;
	if (!owned) throw new HTTPException(404, { message: 'Sesi tidak ditemukan' });

	await revokeSid(c, sid);
	return c.json({ success: true, data: { id: sid } });
});

authRouter.get('/me', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	// Konteks demo aktif bila toko yang sedang diakses ber-kode 'DEMO' (sandbox).
	const cur = await query.find<{
		kode_toko: string;
		status_langganan: string;
		hapus_terjadwal: string | null;
	}>(
		db
			.select({
				kode_toko: toko.kode_toko,
				status_langganan: toko.status_langganan,
				hapus_terjadwal: toko.hapus_terjadwal
			})
			.from(toko)
			.where(eq(toko.id, user.tenant_id))
	);
	const is_demo = (cur?.kode_toko ?? '').startsWith('DEMO');

	// Gate lengkapi-email (Fase B): karyawan tanpa email belum punya identity
	// better-auth → diarahkan isi email. Demo dilewati (ephemeral).
	const meKar = is_demo
		? null
		: await query.find<{ email: string | null }>(
				prodDb().select({ email: karyawan.email }).from(karyawan).where(eq(karyawan.id, user.id))
			);
	const perlu_email = !is_demo && !meKar?.email;
	const sisaHariHapus = cur?.hapus_terjadwal
		? Math.max(0, Math.ceil((new Date(cur.hapus_terjadwal).getTime() - Date.now()) / 86_400_000))
		: null;

	// Cek onboarding dari HOME toko (karyawan.toko_id), bukan tenant aktif (bisa demo).
	// Pemilik yang switch ke demo toko tetap dianggap sudah onboarding bila toko aslinya sudah.
	let onboarding_selesai = false;
	if (user.role === 'pemilik') {
		// Home toko & onboarding ada di PROD — pakai prodDb() walau sesi demo.
		// Di sesi demo user.id = pemilik demo → andalkan home_toko_id dari JWT.
		const pdb = prodDb();
		let homeTokoid =
			user.home_toko_id ??
			(await query.find<{ toko_id: number | null }>(
				pdb.select({ toko_id: karyawan.toko_id }).from(karyawan).where(eq(karyawan.id, user.id))
			))?.toko_id ??
			undefined;
		// Home toko bisa sudah lenyap (bersih-bersih demo lama / JWT basi) → fallback
		// ke tenant aktif agar tidak salah lempar pemilik ke loop onboarding.
		if (homeTokoid) {
			const homeAda = await query.find(
				pdb.select({ id: toko.id }).from(toko).where(eq(toko.id, homeTokoid))
			);
			if (!homeAda) homeTokoid = undefined;
		}
		if (!homeTokoid) homeTokoid = user.tenant_id;
		if (homeTokoid) {
			const setting = await query.find<{ value: string }>(
				pdb.select({ value: toko_settings.value }).from(toko_settings)
					.where(and(eq(toko_settings.toko_id, homeTokoid), eq(toko_settings.key, 'onboarding_selesai')))
			);
			onboarding_selesai = setting?.value === 'true';
		}
	}

	return c.json({
		success: true,
		data: {
			id: user.id,
			nama: user.nama,
			role: user.role,
			kode_karyawan: user.kode_karyawan,
			tenant_id: user.tenant_id,
			cabang_id: user.cabang_id,
			saas: env.saasGating,
			is_demo,
			perlu_email,
			onboarding_selesai,
			status_toko: cur?.status_langganan ?? null,
			hapus_terjadwal: cur?.hapus_terjadwal ?? null,
			sisa_hari_hapus: sisaHariHapus
		}
	});
});

// Tandai onboarding selesai pada HOME toko (karyawan.toko_id), bukan tenant aktif.
// Pemilik bisa sedang switch-context ke demo toko saat klik Selesai; tulis ke JWT
// tenant akan menulis ke demo dan home toko tidak pernah update → loop /onboarding.
authRouter.post('/selesai-onboarding', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	if (user.role !== 'pemilik') {
		throw new HTTPException(403, { message: 'Hanya pemilik yang bisa menyelesaikan onboarding' });
	}
	// Home toko ada di PROD — pakai prodDb() eksplisit walau sesi sedang demo.
	// Di sesi demo user.id = pemilik demo → andalkan home_toko_id dari JWT.
	const pdb = prodDb();
	let homeTokoId =
		user.home_toko_id ??
		(await query.find<{ toko_id: number | null }>(
			pdb.select({ toko_id: karyawan.toko_id }).from(karyawan).where(eq(karyawan.id, user.id))
		))?.toko_id;
	// Home toko bisa sudah lenyap (mis. ikut terhapus saat bersih-bersih data demo
	// lama, atau JWT basi). Jatuh ke tenant aktif yang pasti ada → cegah FK error.
	if (homeTokoId) {
		const homeAda = await query.find(
			pdb.select({ id: toko.id }).from(toko).where(eq(toko.id, homeTokoId))
		);
		if (!homeAda) homeTokoId = undefined;
	}
	if (!homeTokoId) homeTokoId = user.tenant_id;
	if (!homeTokoId) {
		throw new HTTPException(400, { message: 'Toko asli tidak ditemukan' });
	}

	const existing = await query.find(
		pdb.select({ value: toko_settings.value }).from(toko_settings)
			.where(and(eq(toko_settings.toko_id, homeTokoId), eq(toko_settings.key, 'onboarding_selesai')))
	);
	if (existing) {
		await query.exec(
			pdb.update(toko_settings).set({ value: 'true', updated_at: isoNow() })
				.where(and(eq(toko_settings.toko_id, homeTokoId), eq(toko_settings.key, 'onboarding_selesai')))
		);
	} else {
		await query.exec(
			pdb.insert(toko_settings).values({ toko_id: homeTokoId, key: 'onboarding_selesai', value: 'true' })
		);
	}

	return c.json({ success: true, data: { toko_id: homeTokoId } });
});

// Helper: ambil list toko+cabang yang boleh diakses user berdasarkan role
// email = email akun pemilik dari JWT (bukan dari toko aktif saat ini — hindari scope pollution saat switch-context)
async function getAccessibleContext(role: Role, tokoId: number, email: string) {
	if (role !== 'pemilik' && role !== 'manajer') return [];

	// Bangun entri {id, nama, cabang} dari satu koneksi DB + daftar toko-nya.
	// idOffset & is_demo dipakai untuk toko demo (DB terpisah) agar bedakan + hindari collision id.
	async function buildEntries(
		conn: typeof db,
		tokoList: { id: number | null; nama: string }[],
		idOffset: number,
		is_demo: boolean
	) {
		const tokoIds = tokoList.map((t) => t.id).filter((id): id is number => id !== null);
		const allCabang = tokoIds.length
			? await conn
					.select({ id: cabang.id, nama: cabang.nama, toko_id: cabang.toko_id })
					.from(cabang)
					.where(and(inArray(cabang.toko_id, tokoIds), eq(cabang.is_active, true)))
			: [];
		const cabangByToko = new Map<number, { id: number; nama: string }[]>();
		for (const c of allCabang) {
			if (c.toko_id === null) continue;
			const l = cabangByToko.get(c.toko_id) ?? [];
			l.push({ id: c.id!, nama: c.nama });
			cabangByToko.set(c.toko_id, l);
		}
		return tokoIds.map((id) => {
			const t = tokoList.find((t) => t.id === id)!;
			return { id: id + idOffset, nama: t.nama, cabang: cabangByToko.get(id) ?? [], is_demo };
		});
	}

	// Pakai prodDb()/demoDb() eksplisit — JANGAN proxy `db`. Saat sesi demo aktif,
	// selector middleware bungkus request dalam konteks demo → `db` akan salah arah.
	const pdb = prodDb();

	// ── Toko prod (DB utama) ──────────────────────────────────────────────────
	let prodList: { id: number | null; nama: string; kode_toko: string }[];
	if (role === 'manajer') {
		// Manajer: selalu cuma toko sendiri.
		prodList = await pdb
			.select({ id: toko.id, nama: toko.nama, kode_toko: toko.kode_toko })
			.from(toko)
			.where(and(eq(toko.id, tokoId), eq(toko.is_active, true)));
	} else if (env.saasGating) {
		// SaaS: scope pakai email dari JWT (bukan email_pemilik toko aktif) agar switch-context
		// ke demo/toko lain tidak mencemari scope pemilik.
		prodList = email
			? await pdb
					.select({ id: toko.id, nama: toko.nama, kode_toko: toko.kode_toko })
					.from(toko)
					.where(and(eq(toko.email_pemilik, email), eq(toko.is_active, true)))
			: await pdb
					.select({ id: toko.id, nama: toko.nama, kode_toko: toko.kode_toko })
					.from(toko)
					.where(and(eq(toko.id, tokoId), eq(toko.is_active, true)));
	} else {
		// LAN: pemilik = superuser → semua toko.
		prodList = await pdb
			.select({ id: toko.id, nama: toko.nama, kode_toko: toko.kode_toko })
			.from(toko)
			.where(eq(toko.is_active, true));
	}
	// Buang orphan demo lama yang masih nyangkut di prod (kode 'DEMO' / 'DEMO-<id>',
	// dibuat sebelum split DB). Bukan toko asli → jangan muncul di switcher; data demo
	// aktif datang dari demoDb di bawah. Bersihkan via Pengaturan › Demo.
	prodList = prodList.filter((t) => !t.kode_toko?.startsWith('DEMO'));
	const entries = await buildEntries(pdb, prodList, 0, false);

	// ── Toko demo (DB terpisah) — hanya pemilik ───────────────────────────────
	// Linkage owner→demo via email_pemilik (SaaS) / semua toko demo (LAN).
	if (role === 'pemilik') {
		const ddb = demoDb();
		const demoList = env.saasGating
			? email
				? await ddb
						.select({ id: toko.id, nama: toko.nama })
						.from(toko)
						.where(and(eq(toko.email_pemilik, email), eq(toko.is_active, true)))
				: []
			: await ddb.select({ id: toko.id, nama: toko.nama }).from(toko).where(eq(toko.is_active, true));
		entries.push(...(await buildEntries(ddb, demoList, DEMO_ID_OFFSET, true)));
	}

	return entries;
}

authRouter.get('/accessible-context', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	const list = await getAccessibleContext(user.role, user.tenant_id, user.email);
	return c.json({ success: true, data: list });
});

authRouter.post('/switch-context', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	const body = await c.req.json<{ toko_id: number; cabang_id: number | null }>();

	if (!body.toko_id) throw new HTTPException(400, { message: 'toko_id wajib diisi' });

	const accessible = await getAccessibleContext(user.role, user.tenant_id, user.email);
	const targetToko = accessible.find((t) => t.id === body.toko_id);
	if (!targetToko) throw new HTTPException(403, { message: 'Tidak punya akses ke toko ini' });

	if (body.cabang_id !== null && body.cabang_id !== undefined) {
		const validCabang = targetToko.cabang.find((c) => c.id === body.cabang_id);
		if (!validCabang)
			throw new HTTPException(403, { message: 'Cabang tidak ditemukan di toko ini' });
	}

	const newCabangId = body.cabang_id ?? null;

	// Toko demo: id di-offset di accessible-context → decode ke id asli demoDb.
	// JWT.is_demo=true → middleware route semua query ke DB demo.
	const isDemo = !!targetToko.is_demo;
	const realTenantId = isDemo ? body.toko_id - DEMO_ID_OFFSET : body.toko_id;
	const homeTokoId = user.home_toko_id ?? user.tenant_id;

	// Identitas karyawan harus ADA di DB target (FK kasir_id/dicatat_oleh).
	// - Masuk demo: bertindak sebagai 'Pemilik Demo' (karyawan di demo DB).
	// - Keluar demo → prod: pulihkan pemilik asli (karyawan home toko di prod DB).
	// - prod→prod tanpa demo: identitas tetap (manajer/pemilik di prod DB).
	let identity = { id: user.id, nama: user.nama, kode_karyawan: user.kode_karyawan, role: user.role };
	if (isDemo) {
		const dk = await query.find<{ id: number; nama: string; kode_karyawan: string; role: Role }>(
			demoDb()
				.select({ id: karyawan.id, nama: karyawan.nama, kode_karyawan: karyawan.kode_karyawan, role: karyawan.role })
				.from(karyawan)
				.where(and(eq(karyawan.toko_id, realTenantId), eq(karyawan.role, 'pemilik')))
		);
		if (!dk) throw new HTTPException(500, { message: 'Pemilik demo tidak ditemukan di DB demo' });
		identity = { id: dk.id, nama: dk.nama, kode_karyawan: dk.kode_karyawan, role: dk.role };
	} else if (user.is_demo) {
		const pk = await query.find<{ id: number; nama: string; kode_karyawan: string; role: Role }>(
			prodDb()
				.select({ id: karyawan.id, nama: karyawan.nama, kode_karyawan: karyawan.kode_karyawan, role: karyawan.role })
				.from(karyawan)
				.where(and(eq(karyawan.toko_id, homeTokoId), eq(karyawan.role, 'pemilik')))
		);
		if (pk) identity = { id: pk.id, nama: pk.nama, kode_karyawan: pk.kode_karyawan, role: pk.role };
	}

	const payload: JWTPayload = {
		sub: String(identity.id),
		id: identity.id,
		nama: identity.nama,
		role: identity.role,
		kode_karyawan: identity.kode_karyawan,
		email: user.email,
		tenant_id: realTenantId,
		cabang_id: newCabangId,
		is_demo: isDemo,
		home_toko_id: homeTokoId,
		// Sesi fisik tak berubah saat switch-context (device sama) → bawa sid lama.
		...(user.sid ? { sid: user.sid } : {})
	};

	await issueAuthCookie(c, payload);

	return c.json({ success: true, data: { tenant_id: body.toko_id, cabang_id: newCabangId } });
});

// Gate lengkapi-email (Fase B): karyawan tanpa email mengisi sendiri → dibuatkan
// identity better-auth (pakai hash existing). Verifikasi email ditunda sampai
// domain siap (P1) → email_verified tetap false. sid menyusul di login berikut.
authRouter.post('/lengkapi-email', authMiddleware, async (c) => {
	const user = c.get('user') as JWTPayload;
	if (user.is_demo) throw new HTTPException(400, { message: 'Tidak tersedia di sesi demo' });

	const body = await c.req.json<{ email: string }>();
	const email = body.email?.trim().toLowerCase();
	if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		throw new HTTPException(400, { message: 'Format email tidak valid' });
	}

	const pdb = prodDb();
	// Email harus unik lintas karyawan.
	const dipakai = await query.find<{ id: number }>(
		pdb.select({ id: karyawan.id }).from(karyawan).where(eq(karyawan.email, email))
	);
	if (dipakai && dipakai.id !== user.id) {
		throw new HTTPException(409, { message: 'Email sudah dipakai akun lain' });
	}

	const k = await query.find<{ id: number; nama: string; password_hash: string | null }>(
		pdb
			.select({ id: karyawan.id, nama: karyawan.nama, password_hash: karyawan.password_hash })
			.from(karyawan)
			.where(eq(karyawan.id, user.id))
	);
	if (!k) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' });

	await query.exec(pdb.update(karyawan).set({ email }).where(eq(karyawan.id, user.id)));
	const link = await linkOrCreateBaUser(pdb, {
		id: k.id,
		nama: k.nama,
		email,
		password_hash: k.password_hash
	});
	if (!link) throw new HTTPException(500, { message: 'Gagal membuat identity better-auth' });

	return c.json({ success: true, data: { email } });
});

// ─── OAuth Google (Fase B) — bridge cross-origin via one-time-code ──────────
// Alur: /auth/google (302 ke Google, set state cookie domain backend) → Google →
// /auth/ba/callback/google (better-auth bikin session) → callbackURL
// /auth/google/bridge (mint one-time-code di KV) → frontend /auth/oauth-callback
// menukar code → token (set cookie pages.dev). OAuth = login-only: email WAJIB
// cocok karyawan existing (tak ada signup tenant via OAuth — non-goal).

// Origin frontend utama untuk redirect balik (pages.dev / localhost dev).
const frontendOrigin = () => env.corsOrigins[0] ?? '';

authRouter.get('/google', async (c) => {
	if (!env.oauthEnabled) throw new HTTPException(404, { message: 'OAuth Google tidak aktif' });
	const auth = getBetterAuth(c.env as { KV?: unknown });
	// asResponse → Response 302 ke Google + set state/PKCE cookie (domain backend).
	return auth.api.signInSocial({
		body: {
			provider: 'google',
			callbackURL: `${env.betterAuthUrl}/auth/google/bridge`,
			errorCallbackURL: `${frontendOrigin()}/login?oauth=error`
		},
		headers: c.req.raw.headers,
		asResponse: true
	});
});

authRouter.get('/google/bridge', async (c) => {
	const auth = getBetterAuth(c.env as { KV?: unknown });
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user?.email) return c.redirect(`${frontendOrigin()}/login?oauth=error`);
	const email = session.user.email.trim().toLowerCase();

	// Login-only: email harus = karyawan aktif existing.
	const k = await query.find<{
		id: number;
		nama: string;
		role: Role;
		kode_karyawan: string;
		toko_id: number | null;
		cabang_id: number | null;
		is_active: boolean;
		ba_user_id: string | null;
	}>(
		prodDb()
			.select({
				id: karyawan.id,
				nama: karyawan.nama,
				role: karyawan.role,
				kode_karyawan: karyawan.kode_karyawan,
				toko_id: karyawan.toko_id,
				cabang_id: karyawan.cabang_id,
				is_active: karyawan.is_active,
				ba_user_id: karyawan.ba_user_id
			})
			.from(karyawan)
			.where(eq(karyawan.email, email))
	);
	if (!k || !k.is_active) return c.redirect(`${frontendOrigin()}/login?oauth=notfound`);
	if (!k.toko_id) return c.redirect(`${frontendOrigin()}/login?oauth=notoko`);

	// Tautkan ba_user_id bila belum (akun Google jadi identity karyawan).
	if (!k.ba_user_id && session.user.id) {
		await query.exec(
			prodDb().update(karyawan).set({ ba_user_id: session.user.id }).where(eq(karyawan.id, k.id))
		);
	}

	const payload: JWTPayload = {
		sub: String(k.id),
		id: k.id,
		nama: k.nama,
		role: k.role,
		kode_karyawan: k.kode_karyawan,
		email,
		tenant_id: k.toko_id,
		cabang_id: k.cabang_id ?? null,
		home_toko_id: k.toko_id,
		is_demo: false,
		...(session.session?.id ? { sid: session.session.id } : {})
	};

	// One-time-code (TTL 60s) → frontend menukar jadi token. Cross-origin: cookie
	// backend tak terkirim ke pages.dev, jadi token dipindah via code, bukan cookie.
	const code = crypto.randomUUID().replace(/-/g, '');
	await getCache(c.env as { KV?: unknown }).put(`oauth:code:${code}`, JSON.stringify(payload), {
		expirationTtl: 60
	});
	return c.redirect(`${frontendOrigin()}/auth/oauth-callback?code=${code}`);
});

// Tukar one-time-code → JWT (sekali pakai). Frontend +server set cookie pages.dev.
authRouter.post('/oauth-exchange', async (c) => {
	const { code } = await c.req.json<{ code: string }>();
	if (!code) throw new HTTPException(400, { message: 'code wajib diisi' });
	const kv = getCache(c.env as { KV?: unknown });
	const raw = await kv.get(`oauth:code:${code}`);
	if (!raw) throw new HTTPException(400, { message: 'Kode kadaluarsa atau tidak valid' });
	await kv.delete(`oauth:code:${code}`); // sekali pakai

	const payload = JSON.parse(raw) as JWTPayload;
	const token = await signAuthToken(payload);
	return c.json({
		success: true,
		data: {
			token,
			user: { id: payload.id, nama: payload.nama, role: payload.role, tenant_id: payload.tenant_id }
		}
	});
});
