import { db } from './index.ts'
import { toko, cabang, karyawan, kas_bank, platform_admin } from './schema.ts'

const password = process.argv[2] ?? 'admin123'
const hash = await Bun.password.hash(password)

// 1. Toko default — LAN seed: langsung 'aktif' jauh ke depan agar tak ter-gating
db.insert(toko).values({
  id: 1,
  kode_toko: 'TOKO-1',
  nama: 'Toko Utama',
  status_langganan: 'aktif',
  aktif_sampai: '2999-12-31T00:00:00.000Z',
}).run()

// 2. Cabang default
db.insert(cabang).values({
  id: 1,
  toko_id: 1,
  kode_cabang: 'CAB-01',
  nama: 'Cabang Utama',
}).run()

// 3. Admin karyawan
db.insert(karyawan).values({
  kode_karyawan: 'KRY-001',
  nama: 'Pemilik',
  role: 'pemilik',
  username: 'admin',
  password_hash: hash,
  tipe_gaji: 'bulanan',
  toko_id: 1,
  cabang_id: null,
}).run()

// 4. Kas default
db.insert(kas_bank).values([
  { nama: 'Kas Toko', tipe: 'kas', saldo_awal: 0, tenant_id: 1, cabang_id: 1 },
  { nama: 'Bank BRI', tipe: 'bank', saldo_awal: 0, tenant_id: 1, cabang_id: 1 },
]).run()

// 5. Platform admin — operator lintas-tenant (login terpisah)
db.insert(platform_admin).values({
  username: 'superadmin',
  password_hash: hash,
  nama: 'Super Admin',
}).run()

console.log('Seed selesai — username: admin / superadmin, password:', password)
