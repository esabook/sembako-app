const ok = (schema: object) => ({
  '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: schema } } } } },
})
const created = (schema: object) => ({
  '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: schema } } } } },
})
const noContent = {
  '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'null' } } } } } },
}
const err = (code: number, msg: string) => ({
  [code]: { description: msg, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
})
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }

const auth = [{ cookieAuth: [] }]

export const openAPISpec = {
  openapi: '3.0.3',
  info: {
    title: 'Sembako App API',
    version: '1.0.0',
    description: `API untuk aplikasi manajemen stok dan kasir.\n\n**Auth:** Login via \`POST /auth/login\` — server set cookie \`auth_token\` (httpOnly). Semua endpoint (kecuali login) butuh cookie ini.\n\n**Response format:** semua response \`{ success: boolean, data: T | null }\`\n\n**Soft delete:** master data (barang, supplier, dll) tidak dihapus fisik — di-set \`is_active = false\``,
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth_token', description: 'JWT dikirim via cookie httpOnly setelah login' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { success: { type: 'boolean', example: false }, error: { type: 'string' } },
      },
      Barang: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, kode_barang: { type: 'string' }, nama_barang: { type: 'string' },
          kategori_id: { type: 'integer', nullable: true }, satuan_dasar_id: { type: 'integer', nullable: true },
          harga_beli_terakhir: { type: 'number' }, harga_jual_eceran: { type: 'number' }, harga_jual_grosir: { type: 'number' },
          stok_sekarang: { type: 'number' }, stok_minimum: { type: 'number' }, lokasi_rak: { type: 'string', nullable: true },
          foto_path: { type: 'string', nullable: true }, is_active: { type: 'boolean' },
          nama_kategori: { type: 'string', nullable: true }, nama_satuan: { type: 'string', nullable: true },
        },
      },
      Supplier: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, kode_supplier: { type: 'string' }, nama_supplier: { type: 'string' },
          kontak: { type: 'string', nullable: true }, alamat: { type: 'string', nullable: true },
          terms_bayar: { type: 'integer' }, limit_hutang: { type: 'number' }, is_active: { type: 'boolean' },
        },
      },
      Pelanggan: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, kode_pelanggan: { type: 'string' }, nama: { type: 'string' },
          gender: { type: 'string', enum: ['pria', 'wanita'], nullable: true },
          tipe: { type: 'string', enum: ['eceran', 'grosir', 'langganan'] },
          kontak: { type: 'string', nullable: true }, alamat: { type: 'string', nullable: true },
          limit_piutang: { type: 'number' }, saldo_piutang: { type: 'number' }, is_active: { type: 'boolean' },
          no_kartu: { type: 'string', nullable: true }, tier: { type: 'string', nullable: true }, poin: { type: 'integer', nullable: true },
        },
      },
      Karyawan: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, kode_karyawan: { type: 'string' }, nama: { type: 'string' },
          role: { type: 'string', enum: ['pemilik', 'manajer', 'kasir', 'gudang'] },
          username: { type: 'string' }, gaji_pokok: { type: 'number' },
          tipe_gaji: { type: 'string', enum: ['harian', 'bulanan'] },
          kontak: { type: 'string', nullable: true }, foto_path: { type: 'string', nullable: true }, is_active: { type: 'boolean' },
        },
      },
      Penjualan: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, no_transaksi: { type: 'string' }, tanggal: { type: 'string' },
          tipe: { type: 'string', enum: ['eceran', 'grosir'] },
          metode_bayar: { type: 'string', enum: ['tunai', 'transfer', 'qris', 'hutang'] },
          subtotal: { type: 'number' }, diskon_total: { type: 'number' }, total: { type: 'number' },
          bayar: { type: 'number' }, kembalian: { type: 'number' },
          status: { type: 'string', enum: ['lunas', 'hutang', 'void'] },
          kasir_id: { type: 'integer' }, pelanggan_id: { type: 'integer', nullable: true },
        },
      },
      KartuAnggota: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, no_kartu: { type: 'string' },
          tier: { type: 'string', enum: ['reguler', 'silver', 'gold'] },
          poin: { type: 'integer' }, diskon_member: { type: 'number' },
          pelanggan_id: { type: 'integer', nullable: true }, is_active: { type: 'boolean' },
          pelanggan_nama: { type: 'string', nullable: true }, pelanggan_kode: { type: 'string', nullable: true },
        },
      },
    },
  },
  paths: {

    // ── AUTH ────────────────────────────────────────────────────────────────

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Autentikasi karyawan. Sukses → server set cookie `auth_token` (httpOnly, 12 jam).',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string', example: 'admin' }, password: { type: 'string', example: 'rahasia123' } } } } },
        },
        responses: {
          ...ok({ type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' }, role: { type: 'string', enum: ['pemilik', 'manajer', 'kasir', 'gudang'] } } }),
          ...err(400, 'Username/password kosong'), ...err(401, 'Username atau password salah'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Logout', description: 'Hapus cookie auth_token.', security: [],
        responses: { ...noContent },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Info user yang sedang login', security: auth,
        responses: { ...ok({ type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' }, role: { type: 'string' } } }), ...err(401, 'Tidak terautentikasi') },
      },
    },

    // ── BARANG ──────────────────────────────────────────────────────────────

    '/barang': {
      get: {
        tags: ['Barang'], summary: 'List barang', security: auth,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Cari nama atau kode' },
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['0', '1'], default: '1' }, description: '0 = tampilkan semua termasuk tidak aktif' },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/Barang' } }) },
      },
      post: {
        tags: ['Barang'], summary: 'Tambah barang baru', security: auth,
        description: 'Permission: `stok.edit`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['kode_barang', 'nama_barang'],
                properties: {
                  kode_barang: { type: 'string', example: 'BRG-001' },
                  nama_barang: { type: 'string', example: 'Beras Premium 5kg' },
                  kategori_id: { type: 'integer' }, satuan_dasar_id: { type: 'integer' },
                  harga_beli_terakhir: { type: 'number', example: 65000 },
                  harga_jual_eceran: { type: 'number', example: 72000 },
                  harga_jual_grosir: { type: 'number', example: 69000 },
                  stok_minimum: { type: 'number', example: 10 },
                  lokasi_rak: { type: 'string', example: 'A1' },
                },
              },
            },
          },
        },
        responses: { ...created({ $ref: '#/components/schemas/Barang' }), ...err(400, 'Kode dan nama wajib') },
      },
    },
    '/barang/{id}': {
      get: { tags: ['Barang'], summary: 'Detail barang', security: auth, parameters: [idParam], responses: { ...ok({ $ref: '#/components/schemas/Barang' }), ...err(404, 'Tidak ditemukan') } },
      put: {
        tags: ['Barang'], summary: 'Update barang', security: auth, description: 'Permission: `stok.edit`',
        parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Barang' } } } },
        responses: { ...ok({ $ref: '#/components/schemas/Barang' }), ...err(404, 'Tidak ditemukan') },
      },
      delete: { tags: ['Barang'], summary: 'Nonaktifkan barang (soft delete)', security: auth, description: 'Permission: `stok.hapus`', parameters: [idParam], responses: { ...noContent, ...err(404, 'Tidak ditemukan') } },
    },
    '/barang/{id}/foto': {
      post: {
        tags: ['Barang'], summary: 'Upload foto barang', security: auth, description: 'Permission: `stok.edit`. File diproses dengan Sharp (medium 300×300 + thumbnail 60×60).',
        parameters: [idParam],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['foto'], properties: { foto: { type: 'string', format: 'binary' } } } } } },
        responses: { ...ok({ type: 'object', properties: { foto_path: { type: 'string' } } }), ...err(400, 'File tidak valid') },
      },
    },
    '/barang/kategori': {
      get: { tags: ['Barang'], summary: 'List kategori barang', security: auth, responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' }, contoh: { type: 'string', nullable: true }, is_preset: { type: 'boolean' } } } }) } },
      post: {
        tags: ['Barang'], summary: 'Tambah kategori', security: auth, description: 'Permission: `stok.edit`',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nama'], properties: { nama: { type: 'string', example: 'Bahan Pokok' }, contoh: { type: 'string', example: 'Beras, minyak, gula' } } } } } },
        responses: { ...created({ type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' } } }) },
      },
    },
    '/barang/kategori/{id}': {
      put: { tags: ['Barang'], summary: 'Update kategori', security: auth, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nama'], properties: { nama: { type: 'string' }, contoh: { type: 'string' } } } } } }, responses: { ...ok({}) } },
      delete: { tags: ['Barang'], summary: 'Hapus kategori', security: auth, parameters: [idParam], responses: { ...noContent } },
    },
    '/barang/kategori/import-preset': {
      post: {
        tags: ['Barang'], summary: 'Import kategori preset', security: auth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { nama: { type: 'string' }, contoh: { type: 'string' } } } } } } } } },
        responses: { ...ok({ type: 'object', properties: { inserted: { type: 'integer' } } }) },
      },
    },
    '/barang/satuan': {
      get: { tags: ['Barang'], summary: 'List satuan', security: auth, responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' }, singkatan: { type: 'string' }, contoh: { type: 'string', nullable: true } } } }) } },
      post: {
        tags: ['Barang'], summary: 'Tambah satuan', security: auth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nama', 'singkatan'], properties: { nama: { type: 'string', example: 'Kilogram' }, singkatan: { type: 'string', example: 'kg' }, contoh: { type: 'string' } } } } } },
        responses: { ...created({}) },
      },
    },
    '/barang/satuan/{id}': {
      put: { tags: ['Barang'], summary: 'Update satuan', security: auth, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { nama: { type: 'string' }, singkatan: { type: 'string' }, contoh: { type: 'string' } } } } } }, responses: { ...ok({}) } },
      delete: { tags: ['Barang'], summary: 'Hapus satuan', security: auth, parameters: [idParam], responses: { ...noContent } },
    },
    '/barang/satuan/import-preset': {
      post: {
        tags: ['Barang'], summary: 'Import satuan preset', security: auth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { nama: { type: 'string' }, singkatan: { type: 'string' }, contoh: { type: 'string' } } } } } } } } },
        responses: { ...ok({ type: 'object', properties: { inserted: { type: 'integer' } } }) },
      },
    },

    // ── SUPPLIER ────────────────────────────────────────────────────────────

    '/supplier': {
      get: {
        tags: ['Supplier'], summary: 'List supplier', security: auth,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Cari nama' },
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['0', '1'], default: '1' } },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/Supplier' } }) },
      },
      post: {
        tags: ['Supplier'], summary: 'Tambah supplier', security: auth, description: 'Permission: `pembelian.buat`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['kode_supplier', 'nama_supplier'],
                properties: {
                  kode_supplier: { type: 'string', example: 'SUP-001' }, nama_supplier: { type: 'string', example: 'PT Sinar Jaya' },
                  kontak: { type: 'string' }, alamat: { type: 'string' },
                  terms_bayar: { type: 'integer', example: 30, description: 'Tempo bayar dalam hari' },
                  limit_hutang: { type: 'number', example: 5000000 },
                },
              },
            },
          },
        },
        responses: { ...created({ $ref: '#/components/schemas/Supplier' }) },
      },
    },
    '/supplier/{id}': {
      get: { tags: ['Supplier'], summary: 'Detail supplier', security: auth, parameters: [idParam], responses: { ...ok({ $ref: '#/components/schemas/Supplier' }), ...err(404, 'Tidak ditemukan') } },
      put: { tags: ['Supplier'], summary: 'Update supplier', security: auth, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Supplier' } } } }, responses: { ...ok({ $ref: '#/components/schemas/Supplier' }) } },
      delete: { tags: ['Supplier'], summary: 'Nonaktifkan supplier', security: auth, parameters: [idParam], responses: { ...noContent } },
    },

    // ── PELANGGAN ───────────────────────────────────────────────────────────

    '/pelanggan': {
      get: {
        tags: ['Pelanggan'], summary: 'List pelanggan (termasuk info kartu anggota)', security: auth,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Cari nama, kode, kontak, atau no kartu' },
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['0', '1'], default: '1' } },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/Pelanggan' } }) },
      },
      post: {
        tags: ['Pelanggan'], summary: 'Tambah pelanggan', security: auth, description: 'Permission: `penjualan.buat`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['kode_pelanggan', 'nama'],
                properties: {
                  kode_pelanggan: { type: 'string', example: 'PLG-001' }, nama: { type: 'string', example: 'Budi Santoso' },
                  gender: { type: 'string', enum: ['pria', 'wanita'] },
                  tipe: { type: 'string', enum: ['eceran', 'grosir', 'langganan'], default: 'eceran' },
                  kontak: { type: 'string' }, alamat: { type: 'string' }, limit_piutang: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { ...created({ $ref: '#/components/schemas/Pelanggan' }) },
      },
    },
    '/pelanggan/{id}': {
      get: { tags: ['Pelanggan'], summary: 'Detail pelanggan', security: auth, parameters: [idParam], responses: { ...ok({ $ref: '#/components/schemas/Pelanggan' }) } },
      put: { tags: ['Pelanggan'], summary: 'Update pelanggan', security: auth, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Pelanggan' } } } }, responses: { ...ok({ $ref: '#/components/schemas/Pelanggan' }) } },
      delete: { tags: ['Pelanggan'], summary: 'Nonaktifkan pelanggan', security: auth, parameters: [idParam], responses: { ...noContent } },
    },
    '/pelanggan/{id}/assign-kartu': {
      post: {
        tags: ['Pelanggan'], summary: 'Assign kartu anggota ke pelanggan', security: auth, parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kartu_id'], properties: { kartu_id: { type: 'integer' } } } } } },
        responses: { ...ok({}), ...err(400, 'Pelanggan sudah punya kartu atau kartu sudah di-assign') },
      },
      delete: { tags: ['Pelanggan'], summary: 'Unassign kartu dari pelanggan', security: auth, parameters: [idParam], responses: { ...noContent } },
    },

    // ── KARTU ANGGOTA ───────────────────────────────────────────────────────

    '/kartu-anggota': {
      get: {
        tags: ['Kartu Anggota'], summary: 'List kartu anggota', security: auth,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Cari no kartu' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['assigned', 'available'] }, description: 'assigned = sudah punya pelanggan, available = bebas' },
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['0', '1'], default: '1' } },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/KartuAnggota' } }) },
      },
    },
    '/kartu-anggota/generate': {
      post: {
        tags: ['Kartu Anggota'], summary: 'Generate kartu anggota (batch)', security: auth, description: 'Permission: `penjualan.buat`. Maks 50 kartu per request.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jumlah: { type: 'integer', default: 1, maximum: 50 },
                  tier: { type: 'string', enum: ['reguler', 'silver', 'gold'], default: 'reguler' },
                  diskon_member: { type: 'number', default: 0, description: 'Persentase diskon (0–100)' },
                },
              },
            },
          },
        },
        responses: { ...created({ type: 'array', items: { $ref: '#/components/schemas/KartuAnggota' } }) },
      },
    },
    '/kartu-anggota/{id}': {
      get: { tags: ['Kartu Anggota'], summary: 'Detail kartu', security: auth, parameters: [idParam], responses: { ...ok({ $ref: '#/components/schemas/KartuAnggota' }) } },
      put: { tags: ['Kartu Anggota'], summary: 'Update tier / diskon kartu', security: auth, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tier: { type: 'string', enum: ['reguler', 'silver', 'gold'] }, diskon_member: { type: 'number' } } } } } }, responses: { ...ok({ $ref: '#/components/schemas/KartuAnggota' }) } },
      delete: { tags: ['Kartu Anggota'], summary: 'Nonaktifkan kartu', security: auth, parameters: [idParam], responses: { ...noContent } },
    },
    '/kartu-anggota/{id}/poin': {
      patch: {
        tags: ['Kartu Anggota'], summary: 'Update poin kartu', security: auth, parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['delta'], properties: { delta: { type: 'integer', example: 10, description: 'Positif = tambah, negatif = kurangi' } } } } } },
        responses: { ...ok({ $ref: '#/components/schemas/KartuAnggota' }) },
      },
    },
    '/kartu-anggota/{id}/assign': {
      post: {
        tags: ['Kartu Anggota'], summary: 'Assign kartu ke pelanggan', security: auth, parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pelanggan_id'], properties: { pelanggan_id: { type: 'integer' } } } } } },
        responses: { ...ok({ $ref: '#/components/schemas/KartuAnggota' }) },
      },
      delete: { tags: ['Kartu Anggota'], summary: 'Unassign kartu dari pelanggan', security: auth, parameters: [idParam], responses: { ...noContent } },
    },

    // ── KARYAWAN ────────────────────────────────────────────────────────────

    '/karyawan': {
      get: {
        tags: ['Karyawan'], summary: 'List karyawan', security: auth, description: 'Permission: `karyawan.lihat`',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Cari nama' },
          { name: 'aktif', in: 'query', schema: { type: 'string', enum: ['0', '1'], default: '1' } },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/Karyawan' } }) },
      },
      post: {
        tags: ['Karyawan'], summary: 'Tambah karyawan / user baru', security: auth, description: 'Permission: `karyawan.edit`. Password di-hash dengan Bun.password (bcrypt).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['kode_karyawan', 'nama', 'role', 'username', 'password'],
                properties: {
                  kode_karyawan: { type: 'string', example: 'KRY-001' }, nama: { type: 'string', example: 'Siti Rahayu' },
                  role: { type: 'string', enum: ['pemilik', 'manajer', 'kasir', 'gudang'] },
                  username: { type: 'string', example: 'siti' }, password: { type: 'string', example: 'rahasia123' },
                  gaji_pokok: { type: 'number', example: 2500000 },
                  tipe_gaji: { type: 'string', enum: ['harian', 'bulanan'], default: 'bulanan' },
                  kontak: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { ...created({ $ref: '#/components/schemas/Karyawan' }) },
      },
    },
    '/karyawan/{id}': {
      get: { tags: ['Karyawan'], summary: 'Detail karyawan', security: auth, parameters: [idParam], responses: { ...ok({ $ref: '#/components/schemas/Karyawan' }) } },
      put: {
        tags: ['Karyawan'], summary: 'Update karyawan', security: auth, parameters: [idParam],
        description: 'Permission: `karyawan.edit`. Sertakan `password` hanya jika ingin menggantinya.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { nama: { type: 'string' }, role: { type: 'string', enum: ['pemilik', 'manajer', 'kasir', 'gudang'] }, username: { type: 'string' }, password: { type: 'string' }, gaji_pokok: { type: 'number' }, tipe_gaji: { type: 'string', enum: ['harian', 'bulanan'] }, kontak: { type: 'string' } } } } } },
        responses: { ...ok({ $ref: '#/components/schemas/Karyawan' }) },
      },
      delete: { tags: ['Karyawan'], summary: 'Nonaktifkan karyawan', security: auth, parameters: [idParam], description: 'Tidak bisa menonaktifkan diri sendiri.', responses: { ...noContent } },
    },

    // ── PENJUALAN ───────────────────────────────────────────────────────────

    '/penjualan': {
      get: {
        tags: ['Penjualan'], summary: 'List transaksi penjualan', security: auth, description: 'Permission: `penjualan.lihat`',
        parameters: [
          { name: 'dari', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-01-01' },
          { name: 'sampai', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-01-31' },
          { name: 'kasir_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { ...ok({ type: 'array', items: { $ref: '#/components/schemas/Penjualan' } }) },
      },
      post: {
        tags: ['Penjualan'], summary: 'Buat transaksi penjualan baru', security: auth,
        description: 'Permission: `penjualan.buat`. Operasi atomik: stok berkurang + jurnal kas terbentuk + piutang terbentuk (jika hutang).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['tipe', 'metode_bayar', 'bayar', 'items'],
                properties: {
                  pelanggan_id: { type: 'integer', nullable: true, description: 'Wajib jika metode_bayar = hutang' },
                  tipe: { type: 'string', enum: ['eceran', 'grosir'] },
                  metode_bayar: { type: 'string', enum: ['tunai', 'transfer', 'qris', 'hutang'] },
                  bayar: { type: 'number', example: 100000 },
                  diskon_total: { type: 'number', default: 0 },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object', required: ['barang_id', 'jumlah', 'harga_jual'],
                      properties: {
                        barang_id: { type: 'integer' }, satuan_id: { type: 'integer' },
                        jumlah: { type: 'number', example: 2 },
                        harga_jual: { type: 'number', example: 72000, description: 'Snapshot harga — ambil dari master sebelum dikirim' },
                        diskon_item: { type: 'number', default: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { ...created({ $ref: '#/components/schemas/Penjualan' }), ...err(400, 'Keranjang kosong / stok tidak cukup / limit piutang terlampaui') },
      },
    },
    '/penjualan/{id}': {
      get: { tags: ['Penjualan'], summary: 'Detail transaksi + item', security: auth, parameters: [idParam], responses: { ...ok({ allOf: [{ $ref: '#/components/schemas/Penjualan' }, { type: 'object', properties: { items: { type: 'array' } } }] }) } },
    },
    '/penjualan/{id}/void': {
      post: {
        tags: ['Penjualan'], summary: 'Void transaksi (batalkan)', security: auth, description: 'Permission: `penjualan.void`. Stok dikembalikan otomatis.',
        parameters: [idParam],
        responses: { ...noContent, ...err(400, 'Sudah di-void') },
      },
    },

    // ── STOK ────────────────────────────────────────────────────────────────

    '/stok': {
      get: {
        tags: ['Stok'], summary: 'List stok semua barang aktif', security: auth, description: 'Permission: `stok.lihat`. Menampilkan stok_sekarang, stok_minimum, dan status (HABIS/HAMPIR HABIS/AMAN).',
        responses: {
          ...ok({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' }, kode_barang: { type: 'string' }, nama_barang: { type: 'string' },
                stok_sekarang: { type: 'number' }, stok_minimum: { type: 'number' },
                lokasi_rak: { type: 'string', nullable: true }, nama_kategori: { type: 'string', nullable: true },
                nama_satuan: { type: 'string', nullable: true }, singkatan_satuan: { type: 'string', nullable: true },
              },
            },
          }),
        },
      },
    },
    '/stok/{id}/mutasi': {
      get: {
        tags: ['Stok'], summary: 'Riwayat mutasi stok per barang (100 terbaru)', security: auth, description: 'Permission: `stok.lihat`',
        parameters: [idParam],
        responses: {
          ...ok({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' }, tanggal: { type: 'string' },
                jenis: { type: 'string', enum: ['masuk', 'keluar', 'koreksi', 'opname'] },
                referensi_tipe: { type: 'string' }, referensi_id: { type: 'integer' },
                jumlah_sebelum: { type: 'number' }, jumlah_perubahan: { type: 'number' }, jumlah_sesudah: { type: 'number' },
              },
            },
          }),
        },
      },
    },
    '/stok/koreksi': {
      post: {
        tags: ['Stok'], summary: 'Koreksi stok manual', security: auth, description: 'Permission: `stok.edit`. Mencatat mutasi jenis `koreksi` dan update stok master.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['barang_id', 'stok_baru', 'alasan'],
                properties: {
                  barang_id: { type: 'integer' }, stok_baru: { type: 'number', minimum: 0 }, alasan: { type: 'string', example: 'Barang rusak 2 unit' },
                },
              },
            },
          },
        },
        responses: { ...ok({ type: 'object', properties: { selisih: { type: 'number' } } }) },
      },
    },

    // ── BARANG MASUK ────────────────────────────────────────────────────────

    '/barang-masuk': {
      get: {
        tags: ['Barang Masuk'], summary: 'List penerimaan barang (100 terbaru)', security: auth, description: 'Permission: `pembelian.lihat`',
        responses: {
          ...ok({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' }, no_penerimaan: { type: 'string' }, tanggal_terima: { type: 'string' },
                supplier_id: { type: 'integer' }, nama_supplier: { type: 'string', nullable: true },
                no_faktur_supplier: { type: 'string', nullable: true }, total_nilai: { type: 'number' },
              },
            },
          }),
        },
      },
      post: {
        tags: ['Barang Masuk'], summary: 'Terima barang masuk', security: auth,
        description: 'Permission: `pembelian.buat`. Operasi atomik: stok bertambah + harga beli update + hutang supplier terbentuk.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['supplier_id', 'items'],
                properties: {
                  supplier_id: { type: 'integer' }, po_id: { type: 'integer', nullable: true },
                  tanggal_terima: { type: 'string', format: 'date-time' },
                  no_faktur_supplier: { type: 'string' }, terms_bayar: { type: 'integer', description: 'Override terms dari master supplier' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object', required: ['barang_id', 'jumlah_terima', 'harga_beli'],
                      properties: {
                        barang_id: { type: 'integer' }, satuan_id: { type: 'integer' },
                        jumlah_terima: { type: 'number', example: 10 }, harga_beli: { type: 'number', example: 65000 },
                        tgl_kadaluarsa: { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { ...created({ type: 'object', properties: { id: { type: 'integer' }, no_penerimaan: { type: 'string' } } }) },
      },
    },
    '/barang-masuk/{id}': {
      get: { tags: ['Barang Masuk'], summary: 'Detail penerimaan + item', security: auth, parameters: [idParam], responses: { ...ok({}) } },
    },

    // ── PURCHASE ORDER ──────────────────────────────────────────────────────

    '/purchase-order': {
      get: { tags: ['Purchase Order'], summary: 'List PO (100 terbaru)', security: auth, description: 'Permission: `pembelian.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, no_po: { type: 'string' }, tanggal_po: { type: 'string' }, nama_supplier: { type: 'string', nullable: true }, status: { type: 'string', enum: ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'] }, total_nilai: { type: 'number' } } } }) } },
      post: {
        tags: ['Purchase Order'], summary: 'Buat PO baru', security: auth, description: 'Permission: `pembelian.buat`. Status awal: draft.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['supplier_id', 'items'],
                properties: {
                  supplier_id: { type: 'integer' }, tanggal_estimasi_datang: { type: 'string', format: 'date' },
                  items: { type: 'array', items: { type: 'object', required: ['barang_id', 'jumlah_pesan'], properties: { barang_id: { type: 'integer' }, satuan_id: { type: 'integer' }, jumlah_pesan: { type: 'number' }, harga_beli_estimasi: { type: 'number' } } } },
                },
              },
            },
          },
        },
        responses: { ...created({ type: 'object', properties: { id: { type: 'integer' }, no_po: { type: 'string' } } }) },
      },
    },
    '/purchase-order/suggest/items': {
      get: { tags: ['Purchase Order'], summary: 'Auto-suggest item PO dari stok kritis + rata penjualan', security: auth, description: 'Permission: `pembelian.buat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama_barang: { type: 'string' }, stok_sekarang: { type: 'number' }, stok_minimum: { type: 'number' }, rata_penjualan_harian: { type: 'number' }, saran_pesan: { type: 'number' } } } }) } },
    },
    '/purchase-order/{id}': {
      get: { tags: ['Purchase Order'], summary: 'Detail PO + item + info supplier', security: auth, parameters: [idParam], responses: { ...ok({}) } },
    },
    '/purchase-order/{id}/status': {
      put: {
        tags: ['Purchase Order'], summary: 'Update status PO', security: auth, parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'] } } } } } },
        responses: { ...ok({ type: 'object', properties: { status: { type: 'string' } } }) },
      },
    },

    // ── KEUANGAN ────────────────────────────────────────────────────────────

    '/keuangan/kas-bank': {
      get: { tags: ['Keuangan'], summary: 'List akun kas & bank aktif', security: auth, description: 'Permission: `hutang.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama: { type: 'string' }, tipe: { type: 'string', enum: ['kas', 'bank'] }, saldo_awal: { type: 'number' } } } }) } },
    },
    '/keuangan/hutang': {
      get: { tags: ['Keuangan'], summary: 'List hutang supplier', security: auth, description: 'Permission: `hutang.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama_supplier: { type: 'string', nullable: true }, tanggal_hutang: { type: 'string' }, tanggal_jatuh_tempo: { type: 'string', nullable: true }, total_hutang: { type: 'number' }, sisa_hutang: { type: 'number' }, status: { type: 'string', enum: ['belum', 'sebagian', 'lunas'] } } } }) } },
    },
    '/keuangan/hutang/{id}/pembayaran': {
      get: { tags: ['Keuangan'], summary: 'Riwayat pembayaran hutang', security: auth, parameters: [idParam], responses: { ...ok({ type: 'array' }) } },
    },
    '/keuangan/hutang/{id}/bayar': {
      post: {
        tags: ['Keuangan'], summary: 'Bayar hutang supplier', security: auth, description: 'Permission: `hutang.edit`. Otomatis update sisa hutang + catat jurnal kas keluar.',
        parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jumlah_bayar', 'kas_bank_id'], properties: { jumlah_bayar: { type: 'number', example: 1000000 }, kas_bank_id: { type: 'integer' }, tanggal_bayar: { type: 'string', format: 'date' } } } } } },
        responses: { ...ok({ type: 'object', properties: { sisa_hutang: { type: 'number' }, status: { type: 'string' } } }) },
      },
    },
    '/keuangan/piutang': {
      get: { tags: ['Keuangan'], summary: 'List piutang pelanggan', security: auth, description: 'Permission: `piutang.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama_pelanggan: { type: 'string', nullable: true }, no_transaksi: { type: 'string', nullable: true }, tanggal_piutang: { type: 'string' }, tanggal_jatuh_tempo: { type: 'string', nullable: true }, total_piutang: { type: 'number' }, sisa_piutang: { type: 'number' }, status: { type: 'string', enum: ['belum', 'sebagian', 'lunas'] } } } }) } },
    },
    '/keuangan/piutang/{id}/pembayaran': {
      get: { tags: ['Keuangan'], summary: 'Riwayat pembayaran piutang', security: auth, parameters: [idParam], responses: { ...ok({ type: 'array' }) } },
    },
    '/keuangan/piutang/{id}/bayar': {
      post: {
        tags: ['Keuangan'], summary: 'Terima pembayaran piutang', security: auth, description: 'Permission: `piutang.edit`. Otomatis update sisa piutang + saldo pelanggan + catat jurnal kas masuk.',
        parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jumlah_bayar', 'kas_bank_id'], properties: { jumlah_bayar: { type: 'number', example: 500000 }, kas_bank_id: { type: 'integer' }, tanggal_bayar: { type: 'string', format: 'date' } } } } } },
        responses: { ...ok({ type: 'object', properties: { sisa_piutang: { type: 'number' }, status: { type: 'string' } } }) },
      },
    },
    '/keuangan/jurnal': {
      get: { tags: ['Keuangan'], summary: 'List jurnal kas (200 terbaru)', security: auth, description: 'Permission: `hutang.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, tanggal: { type: 'string' }, nama_akun: { type: 'string', nullable: true }, jenis: { type: 'string', enum: ['masuk', 'keluar'] }, kategori: { type: 'string' }, keterangan: { type: 'string', nullable: true }, jumlah: { type: 'number' } } } }) } },
      post: {
        tags: ['Keuangan'], summary: 'Input jurnal kas manual', security: auth, description: 'Permission: `hutang.edit`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['kas_bank_id', 'jenis', 'kategori', 'jumlah'],
                properties: {
                  kas_bank_id: { type: 'integer' }, jenis: { type: 'string', enum: ['masuk', 'keluar'] },
                  kategori: { type: 'string', example: 'operasional' }, keterangan: { type: 'string' },
                  jumlah: { type: 'number', example: 50000 }, tanggal: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { ...created({}) },
      },
    },

    // ── LAPORAN ─────────────────────────────────────────────────────────────

    '/laporan/laba-rugi': {
      get: {
        tags: ['Laporan'], summary: 'Laporan laba rugi', security: auth, description: 'Permission: `laporan.lihat`. Default: bulan berjalan.',
        parameters: [
          { name: 'dari', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-01-01' },
          { name: 'sampai', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-01-31' },
        ],
        responses: {
          ...ok({
            type: 'object',
            properties: {
              periode: { type: 'object' },
              penjualan: { type: 'object', properties: { bruto: { type: 'number' }, diskon: { type: 'number' }, bersih: { type: 'number' }, jumlah_transaksi: { type: 'integer' } } },
              hpp: { type: 'number' }, laba_kotor: { type: 'number' }, margin_kotor_persen: { type: 'number' },
              biaya_operasional: { type: 'object', properties: { total: { type: 'number' }, per_kategori: { type: 'object' } } },
              laba_bersih: { type: 'number' }, margin_bersih_persen: { type: 'number' },
            },
          }),
        },
      },
    },
    '/laporan/arus-kas': {
      get: {
        tags: ['Laporan'], summary: 'Laporan arus kas', security: auth, description: 'Permission: `laporan.lihat`',
        parameters: [
          { name: 'dari', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sampai', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { ...ok({ type: 'object', properties: { periode: { type: 'object' }, per_akun: { type: 'array' }, per_kategori: { type: 'object' }, total_masuk: { type: 'number' }, total_keluar: { type: 'number' }, net: { type: 'number' } } }) },
      },
    },
    '/laporan/neraca': {
      get: {
        tags: ['Laporan'], summary: 'Laporan neraca (balance sheet)', security: auth, description: 'Permission: `laporan.lihat`. Per tanggal hari ini.',
        responses: { ...ok({ type: 'object', properties: { per_tanggal: { type: 'string' }, aset: { type: 'object' }, liabilitas: { type: 'object' }, modal: { type: 'object' }, check: { type: 'object', properties: { balanced: { type: 'boolean' } } } } }) },
      },
    },

    // ── STOK OPNAME ─────────────────────────────────────────────────────────

    '/stok-opname': {
      get: { tags: ['Stok Opname'], summary: 'List stok opname', security: auth, description: 'Permission: `stok.lihat`', responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, no_opname: { type: 'string' }, tanggal_mulai: { type: 'string' }, tanggal_selesai: { type: 'string', nullable: true }, status: { type: 'string', enum: ['draft', 'proses', 'selesai', 'approved'] } } } }) } },
      post: {
        tags: ['Stok Opname'], summary: 'Mulai opname baru (snapshot stok)', security: auth, description: 'Permission: `stok.edit`. Tidak bisa mulai jika ada opname aktif.',
        responses: { ...created({ type: 'object', properties: { id: { type: 'integer' }, no_opname: { type: 'string' } } }), ...err(400, 'Masih ada opname aktif') },
      },
    },
    '/stok-opname/{id}': {
      get: { tags: ['Stok Opname'], summary: 'Detail opname + semua item + progress', security: auth, parameters: [idParam], responses: { ...ok({}) } },
      delete: { tags: ['Stok Opname'], summary: 'Batalkan opname (hanya draft/proses)', security: auth, parameters: [idParam], responses: { ...noContent } },
    },
    '/stok-opname/{id}/item/{itemId}': {
      put: {
        tags: ['Stok Opname'], summary: 'Input stok fisik per item', security: auth, description: 'Permission: `stok.edit`. Selisih = stok_fisik - stok_sistem, dihitung otomatis.',
        parameters: [idParam, { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['stok_fisik'], properties: { stok_fisik: { type: 'number', minimum: 0 }, alasan_selisih: { type: 'string' } } } } } },
        responses: { ...ok({ type: 'object', properties: { selisih: { type: 'number' } } }) },
      },
    },
    '/stok-opname/{id}/approve': {
      post: {
        tags: ['Stok Opname'], summary: 'Approve opname — update stok sistem', security: auth, description: 'Permission: `stok.edit`. Semua item harus sudah dihitung. Stok sistem diperbarui ke hasil fisik.',
        parameters: [idParam],
        responses: { ...ok({ type: 'object', properties: { total_penyesuaian: { type: 'integer' } } }), ...err(400, 'Masih ada item belum dihitung') },
      },
    },

    // ── DASHBOARD ───────────────────────────────────────────────────────────

    '/dashboard': {
      get: {
        tags: ['Dashboard'], summary: 'Data dashboard owner', security: auth,
        description: 'Auth required (semua role). Mengembalikan:\n- Penjualan hari ini vs kemarin\n- Grafik penjualan 30 hari\n- Saldo kas & bank\n- Stok kritis (10 item)\n- Piutang macet\n- Hutang jatuh tempo 7 hari\n- Top 5 barang terlaris\n- Karyawan belum absen',
        responses: { ...ok({ type: 'object' }) },
      },
    },

    // ── ABSENSI ─────────────────────────────────────────────────────────────

    '/absensi': {
      get: {
        tags: ['Absensi'], summary: 'List absensi', security: auth,
        description: 'Role `kasir`/`gudang` hanya lihat absensi diri. `manajer`/`pemilik` lihat semua.',
        parameters: [
          { name: 'bulan', in: 'query', schema: { type: 'string' }, example: '2025-01', description: 'Format YYYY-MM' },
          { name: 'tgl_mulai', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'tgl_selesai', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'karyawan_id', in: 'query', schema: { type: 'integer' }, description: 'Hanya berlaku jika punya `absensi.semua`' },
        ],
        responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, karyawan_id: { type: 'integer' }, nama_karyawan: { type: 'string', nullable: true }, tanggal: { type: 'string' }, jam_masuk: { type: 'string', nullable: true }, jam_keluar: { type: 'string', nullable: true }, status: { type: 'string', enum: ['hadir', 'izin', 'sakit', 'alpa'] } } } }) } },
      post: {
        tags: ['Absensi'], summary: 'Catat absensi', security: auth,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['karyawan_id', 'tanggal', 'status'], properties: { karyawan_id: { type: 'integer' }, tanggal: { type: 'string', format: 'date', example: '2025-01-15' }, jam_masuk: { type: 'string', example: '08:00' }, jam_keluar: { type: 'string', example: '17:00' }, shift: { type: 'string' }, status: { type: 'string', enum: ['hadir', 'izin', 'sakit', 'alpa'] } } } } } },
        responses: { ...created({}), ...err(409, 'Absensi tanggal ini sudah ada') },
      },
    },
    '/absensi/rekap': {
      get: {
        tags: ['Absensi'], summary: 'Rekap kehadiran per karyawan dalam satu bulan', security: auth, description: 'Permission: `absensi.semua`',
        parameters: [{ name: 'bulan', in: 'query', required: true, schema: { type: 'string' }, example: '2025-01' }],
        responses: { ...ok({ type: 'array', items: { type: 'object', properties: { karyawan_id: { type: 'integer' }, nama_karyawan: { type: 'string', nullable: true }, hadir: { type: 'integer' }, izin: { type: 'integer' }, sakit: { type: 'integer' }, alpa: { type: 'integer' }, total: { type: 'integer' } } } }) } },
    },
    '/absensi/{id}': {
      put: {
        tags: ['Absensi'], summary: 'Update absensi (misal: clock out)', security: auth, parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { jam_masuk: { type: 'string' }, jam_keluar: { type: 'string', example: '17:30' }, shift: { type: 'string' }, status: { type: 'string', enum: ['hadir', 'izin', 'sakit', 'alpa'] } } } } } },
        responses: { ...ok({}) },
      },
      delete: { tags: ['Absensi'], summary: 'Hapus data absensi', security: auth, description: 'Permission: `absensi.semua`', parameters: [idParam], responses: { ...noContent } },
    },

    // ── KASBON ──────────────────────────────────────────────────────────────

    '/kasbon': {
      get: {
        tags: ['Kasbon'], summary: 'List kasbon karyawan', security: auth, description: 'Permission: `karyawan.lihat`',
        parameters: [
          { name: 'karyawan_id', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['aktif', 'lunas'] } },
        ],
        responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama_karyawan: { type: 'string', nullable: true }, tanggal_pinjam: { type: 'string' }, jumlah: { type: 'number' }, cicilan_per_bulan: { type: 'number' }, sisa_kasbon: { type: 'number' }, status: { type: 'string', enum: ['aktif', 'lunas'] } } } }) } },
      post: {
        tags: ['Kasbon'], summary: 'Catat kasbon baru', security: auth, description: 'Permission: `karyawan.edit`',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['karyawan_id', 'tanggal_pinjam', 'jumlah'], properties: { karyawan_id: { type: 'integer' }, tanggal_pinjam: { type: 'string', format: 'date' }, jumlah: { type: 'number', example: 500000 }, cicilan_per_bulan: { type: 'number', example: 100000 } } } } } },
        responses: { ...created({}) },
      },
    },
    '/kasbon/{id}/cicil': {
      put: {
        tags: ['Kasbon'], summary: 'Bayar cicilan kasbon manual', security: auth, description: 'Permission: `karyawan.edit`', parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jumlah_cicil'], properties: { jumlah_cicil: { type: 'number', minimum: 1 } } } } } },
        responses: { ...ok({}) },
      },
    },
    '/kasbon/{id}': {
      delete: { tags: ['Kasbon'], summary: 'Hapus kasbon', security: auth, parameters: [idParam], responses: { ...noContent } },
    },

    // ── PENGGAJIAN ──────────────────────────────────────────────────────────

    '/penggajian': {
      get: {
        tags: ['Penggajian'], summary: 'List penggajian', security: auth, description: 'Permission: `gaji.lihat`',
        parameters: [
          { name: 'bulan', in: 'query', schema: { type: 'string' }, example: '2025-01', description: 'Format YYYY-MM' },
          { name: 'karyawan_id', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'approved', 'dibayar'] } },
        ],
        responses: { ...ok({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nama_karyawan: { type: 'string', nullable: true }, periode_bulan: { type: 'string' }, hari_kerja: { type: 'integer' }, hari_hadir: { type: 'integer' }, gaji_pokok: { type: 'number' }, tunjangan: { type: 'number' }, potongan_kasbon: { type: 'number' }, potongan_lain: { type: 'number' }, total_gaji: { type: 'number' }, status: { type: 'string', enum: ['draft', 'approved', 'dibayar'] } } } }) } },
    },
    '/penggajian/generate': {
      post: {
        tags: ['Penggajian'], summary: 'Generate penggajian semua karyawan aktif', security: auth,
        description: 'Permission: `gaji.edit`. Otomatis hitung hari hadir dari absensi dan potongan kasbon. Skip karyawan yang sudah ada data bulan ini.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bulan'], properties: { bulan: { type: 'string', example: '2025-01' }, hari_kerja: { type: 'integer', description: 'Override jumlah hari kerja. Default: hitung Senin–Sabtu bulan tersebut.' } } } } } },
        responses: { ...ok({ type: 'object', properties: { generated: { type: 'integer' }, skipped: { type: 'integer' }, rows: { type: 'array' } } }) },
      },
    },
    '/penggajian/{id}': {
      put: {
        tags: ['Penggajian'], summary: 'Update tunjangan / potongan / status penggajian', security: auth, description: 'Permission: `gaji.edit`. Jika status = `dibayar`, cicilan kasbon otomatis dipotong dan jurnal kas dicatat.',
        parameters: [idParam],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tunjangan: { type: 'number' }, potongan_lain: { type: 'number' }, status: { type: 'string', enum: ['draft', 'approved', 'dibayar'] }, kas_bank_id: { type: 'integer', description: 'Wajib jika status = dibayar dan ingin catat jurnal' } } } } } },
        responses: { ...ok({}) },
      },
      delete: { tags: ['Penggajian'], summary: 'Hapus penggajian (hanya draft)', security: auth, parameters: [idParam], responses: { ...noContent } },
    },

    // ── SCAN RELAY ──────────────────────────────────────────────────────────

    '/scan-relay/kasir/{sessionId}': {
      get: {
        tags: ['Scan Relay'], summary: 'SSE — kasir listen scan dari HP', security: [],
        description: 'Server-Sent Events. Kasir connect ke sini dan menunggu event `scan` dari HP. Event types: `ready`, `ping`, `scan`.',
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' }, example: 'abc123', description: 'ID unik session (dihasilkan oleh frontend kasir)' }],
        responses: { '200': { description: 'SSE stream', content: { 'text/event-stream': { schema: { type: 'string', example: 'data: {"type":"scan","kode":"8991234567890","qty":1}\n\n' } } } } },
      },
    },
    '/scan-relay/scanner/{sessionId}': {
      post: {
        tags: ['Scan Relay'], summary: 'HP kirim hasil scan ke kasir', security: [],
        description: 'HP (kamera scanner) POST kode barcode ke sini. Kasir yang connect ke SSE session yang sama akan menerima event `scan`.',
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kode'], properties: { kode: { type: 'string', example: '8991234567890', description: 'Barcode / QR yang discan' }, qty: { type: 'integer', default: 1 } } } } } },
        responses: { ...ok({}), ...err(404, 'Session tidak ditemukan') },
      },
    },

    // ── HEALTH ──────────────────────────────────────────────────────────────

    '/health': {
      get: {
        tags: ['System'], summary: 'Health check', security: [],
        responses: { ...ok({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } }) },
      },
    },
  },
}
