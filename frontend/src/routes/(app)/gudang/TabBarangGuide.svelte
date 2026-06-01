<script lang="ts">
	import Panduan from '$lib/components/Panduan.svelte';
</script>

<Panduan title="Panduan — Master Barang" subtitle="Referensi lengkap pengelolaan data barang">
	{#snippet children()}

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Apa itu Master Barang?</h4>
		<p style="color:var(--text-dim)">Master Barang adalah daftar induk semua produk yang dijual atau dikelola di toko. Setiap barang harus didaftarkan di sini sebelum bisa digunakan di kasir, gudang, atau Purchase Order.</p>
		<p style="color:var(--text-dim)">Data di master barang <strong style="color:var(--text)">tidak bisa dihapus permanen</strong> — hanya bisa dinonaktifkan agar histori transaksi tetap terjaga.</p>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Kode Barang</h4>
		<p style="color:var(--text-dim)">Kode unik untuk setiap barang. Format bebas, namun disarankan singkat dan deskriptif.</p>
		<div class="rounded p-3 text-xs font-mono flex flex-col gap-1" style="background:var(--surface2);color:var(--text-dim)">
			<span>Contoh: <strong style="color:var(--text)">BRS-001</strong> → Beras item ke-1</span>
			<span>Contoh: <strong style="color:var(--text)">MNYAK-001</strong> → Minyak Goreng</span>
			<span>Contoh: <strong style="color:var(--text)">MIE-INSTAN-01</strong> → Mie Instan Goreng</span>
		</div>
		<p class="text-xs" style="color:var(--text-dim)">Kode juga bisa berisi barcode EAN-13 dari produk asli jika toko menggunakan scanner.</p>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-3">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Penjelasan Field</h4>
		<div class="flex flex-col gap-2 text-xs">
			{#each [
				{ field: 'Nama Barang', desc: 'Nama lengkap produk. Gunakan nama yang mudah dicari kasir. Contoh: "Beras Premium 5kg", "Mie Instan Goreng".' },
				{ field: 'Kategori', desc: 'Pengelompokan barang. Digunakan untuk filter dan laporan. Isi di tab Pengaturan terlebih dahulu.' },
				{ field: 'Satuan Dasar', desc: 'Satuan terkecil saat menjual eceran. Contoh: PCS, KG, BGS. Digunakan di kasir dan mutasi stok.' },
				{ field: 'Harga Beli Terakhir', desc: 'Harga beli dari supplier terakhir kali. Diperbarui otomatis saat terima barang. Digunakan untuk kalkulasi HPP dan margin.' },
				{ field: 'Harga Jual Eceran', desc: 'Harga per satuan untuk pelanggan umum / eceran. Tampil di kasir secara default.' },
				{ field: 'Harga Jual Grosir', desc: 'Harga khusus untuk pelanggan tipe grosir atau langganan. Kasir otomatis memakai harga ini jika tipe transaksi = grosir.' },
				{ field: 'Stok Minimum', desc: 'Batas stok terendah sebelum sistem memberi peringatan. Jika stok ≤ minimum, status berubah menjadi HAMPIR HABIS.' },
				{ field: 'Stok Sekarang', desc: 'Dihitung otomatis dari mutasi stok (terima barang, penjualan, koreksi, opname). Jangan diubah manual kecuali lewat koreksi stok.' },
				{ field: 'Lokasi Rak', desc: 'Posisi fisik barang di gudang. Contoh: A1, B3-ATAS. Membantu saat stok opname atau ambil barang.' },
			] as row (row.field)}
			<div class="flex gap-2">
				<span class="shrink-0 font-bold w-44" style="color:var(--text)">{row.field}</span>
				<span style="color:var(--text-dim)">{row.desc}</span>
			</div>
			{/each}
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Status Stok</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--danger)">HABIS</span>
				<span style="color:var(--text-dim)">Stok = 0. Barang tidak bisa dijual di kasir. Segera buat Purchase Order atau terima barang.</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--warn)">HAMPIR HABIS</span>
				<span style="color:var(--text-dim)">Stok ≤ stok minimum. Masih bisa dijual tapi perlu segera reorder ke supplier.</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--accent)">AMAN</span>
				<span style="color:var(--text-dim)">Stok > stok minimum. Kondisi normal, tidak perlu tindakan segera.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-3">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Cara Penggunaan</h4>
		<div class="flex flex-col gap-3 text-xs">
			<div class="flex flex-col gap-1">
				<span class="font-bold" style="color:var(--text)">Tambah Barang Baru</span>
				<ol class="list-decimal list-inside flex flex-col gap-1" style="color:var(--text-dim)">
					<li>Klik tombol <strong style="color:var(--accent)">+ Tambah</strong> di kanan atas</li>
					<li>Isi kode, nama, kategori, dan satuan (wajib)</li>
					<li>Isi harga jual dan stok minimum</li>
					<li>Klik <strong style="color:var(--accent)">Simpan</strong></li>
					<li>Stok awal diisi lewat menu <strong style="color:var(--text)">Terima Barang</strong> — bukan di form ini</li>
				</ol>
			</div>
			<div class="flex flex-col gap-1">
				<span class="font-bold" style="color:var(--text)">Nonaktifkan Barang</span>
				<ol class="list-decimal list-inside flex flex-col gap-1" style="color:var(--text-dim)">
					<li>Klik <strong style="color:var(--danger)">Nonaktif</strong> di baris barang</li>
					<li>Barang tidak akan muncul di kasir dan pencarian gudang</li>
					<li>Histori transaksi tetap tersimpan dan tidak terpengaruh</li>
					<li>Bisa diaktifkan kembali kapan saja dengan klik <strong style="color:var(--accent)">Aktifkan</strong></li>
				</ol>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tips & Perhatian</h4>
		<ul class="list-none flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Pastikan kategori dan satuan sudah diisi di tab <strong style="color:var(--text)">Pengaturan</strong> sebelum menambah barang baru.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Harga beli terakhir diperbarui <em>otomatis</em> saat melakukan penerimaan barang — tidak perlu diubah manual.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Jangan pakai kode barang yang sama untuk produk berbeda. Kode bersifat unik di seluruh sistem.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Stok tidak bisa dikurangi/ditambah langsung dari sini. Gunakan <strong style="color:var(--text)">Terima Barang</strong> (masuk) atau <strong style="color:var(--text)">Koreksi Stok</strong> (penyesuaian manual).</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Perubahan harga jual hanya berlaku untuk transaksi <em>setelah</em> disimpan. Transaksi lama tetap pakai harga snapshot saat terjadi.</span></li>
		</ul>
	</section>

	{/snippet}
</Panduan>
