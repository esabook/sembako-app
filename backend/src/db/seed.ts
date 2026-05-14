import { db } from './index.ts'
import { karyawan, kas_bank } from './schema.ts'

const password = process.argv[2] ?? 'admin123'
const hash = await Bun.password.hash(password)

db.insert(karyawan).values({
  kode_karyawan: 'KRY-001',
  nama: 'Pemilik',
  role: 'pemilik',
  username: 'admin',
  password_hash: hash,
  tipe_gaji: 'bulanan',
}).run()

db.insert(kas_bank).values([
  { nama: 'Kas Toko', tipe: 'kas', saldo_awal: 0 },
  { nama: 'Bank BRI', tipe: 'bank', saldo_awal: 0 },
]).run()

console.log('Seed selesai — username: admin, password:', password)
