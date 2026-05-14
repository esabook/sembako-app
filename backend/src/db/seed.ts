import { db } from './index.ts'
import { karyawan } from './schema.ts'

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

console.log('Seed selesai — username: admin, password:', password)
