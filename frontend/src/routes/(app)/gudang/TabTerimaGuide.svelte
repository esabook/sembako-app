<script lang="ts">
	import Panduan from '$lib/components/Panduan.svelte';
</script>

<Panduan title="Panduan — Terima Barang" subtitle="Catat barang yang datang dari supplier dan tambah stok">
	{#snippet children()}

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tab Ini untuk Apa?</h4>
		<p style="color:var(--text-dim)">Digunakan saat barang fisik sudah tiba dari supplier. Setelah disimpan, stok otomatis bertambah dan hutang ke supplier otomatis tercatat.</p>
		<div class="rounded p-3 text-xs flex flex-col gap-1.5" style="background:var(--surface2)">
			<div class="flex gap-2 items-start">
				<span class="font-bold shrink-0" style="color:var(--text-dim)">Bedanya dengan PO:</span>
				<span style="color:var(--text-dim)">PO = surat pesanan yang dikirim ke supplier <em>sebelum</em> barang datang. Terima Barang = pencatatan saat barang <em>sudah</em> tiba secara fisik.</span>
			</div>
			<div class="flex gap-2 items-start">
				<span class="font-bold shrink-0" style="color:var(--text-dim)">Wajib pakai PO?</span>
				<span style="color:var(--text-dim)">Tidak. Bisa terima barang langsung tanpa PO — misalnya untuk pembelian tunai atau supplier baru.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-3">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Alur Penggunaan</h4>
		<ol class="list-decimal list-inside flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li><strong style="color:var(--text)">Pilih Supplier</strong> — wajib diisi agar hutang tercatat ke supplier yang benar.</li>
			<li><strong style="color:var(--text)">Isi No. Faktur</strong> — dari faktur fisik supplier. Opsional, tapi penting untuk rekonsiliasi hutang.</li>
			<li><strong style="color:var(--text)">Isi Tempo Bayar</strong> — berapa hari jatuh tempo. Jika kosong, pakai default dari data supplier.</li>
			<li><strong style="color:var(--text)">Cari & tambah barang</strong> — ketik nama atau scan barcode, klik untuk tambah ke tabel.</li>
			<li><strong style="color:var(--text)">Isi jumlah & harga beli</strong> — harga beli dari faktur ini akan memperbarui harga beli terakhir di master barang.</li>
			<li><strong style="color:var(--text)">Simpan</strong> — stok bertambah + hutang tercatat otomatis.</li>
		</ol>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Efek Setelah Simpan</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--accent)">Stok bertambah</span>
				<span style="color:var(--text-dim)">Setiap item langsung tercatat di mutasi stok dengan jenis <em>masuk</em>.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--warn)">Hutang tercatat</span>
				<span style="color:var(--text-dim)">Otomatis masuk ke modul Hutang Supplier dengan tanggal jatuh tempo sesuai tempo yang diisi.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-32 shrink-0" style="color:var(--info)">Harga diperbarui</span>
				<span style="color:var(--text-dim)">Harga beli terakhir di master barang diperbarui otomatis sesuai faktur ini.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tips & Perhatian</h4>
		<ul class="list-none flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Isi harga beli sesuai faktur fisik — ini yang dipakai untuk kalkulasi HPP dan margin.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Tanggal kadaluarsa (Exp) opsional, tapi penting untuk produk dengan umur simpan pendek.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Jika ada barang baru yang belum ada di sistem, daftarkan dulu di tab <strong style="color:var(--text)">Master Barang</strong>.</span></li>
			<li class="flex gap-2"><span style="color:var(--danger)">!</span><span>Penerimaan yang sudah disimpan <strong style="color:var(--text)">tidak bisa diedit</strong>. Pastikan jumlah dan harga sudah benar sebelum simpan.</span></li>
		</ul>
	</section>

	{/snippet}
</Panduan>
