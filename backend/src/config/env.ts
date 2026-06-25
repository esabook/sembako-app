// Konfigurasi env terpusat — validasi fail-fast saat boot, export config typed.
// Ganti pola `process.env.X ?? default` yang tersebar. Tanpa dependency.

function req(key: string): string {
	const v = process.env[key]
	if (!v) throw new Error(`ENV ${key} wajib diisi`)
	return v
}

const isProd = process.env.NODE_ENV === 'production'

function jwtSecret(): string {
	const s = process.env.JWT_SECRET
	// In CF Workers, JWT_SECRET comes from wrangler secret — available at request
	// time via process.env after worker.ts middleware sets it. Return placeholder
	// at module init; routes always read env.jwtSecret which is a getter below.
	if (!s) return '__cf_pending__'
	if (isProd && s.length < 32) {
		throw new Error('JWT_SECRET minimal 32 karakter di production')
	}
	return s
}

export const env = {
	isProd,

	// Auth — getter so CF Workers picks up JWT_SECRET set by middleware at request time
	get jwtSecret() { return jwtSecret() },
	jwtExpiryHours: Number(process.env.JWT_EXPIRY_HOURS ?? 12),

	// HTTP
	port: Number(process.env.PORT ?? 3000),
	// CORS origins — multi-origin via koma; sudah di-split & trim.
	corsOrigins: (process.env.FRONTEND_URL ?? 'http://localhost:5173')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean),

	// SaaS gating (no-op di mode LAN/offline)
	saasGating: process.env.SAAS_GATING === '1',

	// Database (multi-dialect — dialect dideteksi di db/index.ts dari URL ini)
	// Getter: CF Workers set process.env via middleware at request time, bukan module init
	get databaseUrl() { return req('DATABASE_URL') },
	tursoAuthToken: process.env.TURSO_AUTH_TOKEN ?? '',
	migrationsDir: process.env.MIGRATIONS_DIR ?? './src/db/migrations/sqlite',

	// Storage
	storageDriver: process.env.STORAGE_DRIVER ?? 'local',
	uploadDir: process.env.UPLOAD_DIR ?? './uploads',
	s3: {
		endpoint: process.env.S3_ENDPOINT ?? '',
		region: process.env.S3_REGION ?? 'auto',
		bucket: process.env.S3_BUCKET ?? '',
		accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
		publicUrl: process.env.S3_PUBLIC_URL ?? ''
	}
}
