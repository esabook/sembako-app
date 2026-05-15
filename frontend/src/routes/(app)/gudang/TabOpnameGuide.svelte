<script lang="ts">
	import Panduan from '$lib/components/Panduan.svelte';
</script>

<Panduan title="Panduan — Stok Opname" subtitle="Cara menghitung dan menyelaraskan stok fisik dengan sistem">
	{#snippet children()}

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Apa itu Stok Opname?</h4>
		<p style="color:var(--text-dim)">Stok opname adalah proses menghitung stok fisik barang di gudang dan membandingkannya dengan catatan sistem. Jika ada selisih, sistem akan diperbarui sesuai kondisi nyata.</p>
		<p style="color:var(--text-dim)">Lakukan opname secara rutin (mingguan atau bulanan) untuk menjaga akurasi stok dan mendeteksi kehilangan barang sejak dini.</p>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-3">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Alur Kerja Opname</h4>
		<ol class="list-decimal list-inside flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li><strong style="color:var(--text)">Buat Opname Baru</strong> — sistem meng-snapshot stok saat ini sebagai acuan hitung.</li>
			<li><strong style="color:var(--text)">Hitung Fisik</strong> — masukkan jumlah stok nyata di kolom <em>Fisik</em> per baris barang.</li>
			<li><strong style="color:var(--text)">Isi Alasan Selisih</strong> — jika ada selisih, sistem akan meminta keterangan (rusak, hilang, salah hitung, dll).</li>
			<li><strong style="color:var(--text)">Approve</strong> — setelah semua item dihitung, klik Approve untuk memperbarui stok sistem.</li>
		</ol>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Status Opname</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--text-dim)">draft</span>
				<span style="color:var(--text-dim)">Baru dibuat, belum ada item yang dihitung.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--warn)">proses</span>
				<span style="color:var(--text-dim)">Sedang berjalan, sebagian item sudah dihitung. Bisa dilanjutkan kapan saja.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--accent)">approved</span>
				<span style="color:var(--text-dim)">Selesai dan stok sistem sudah diperbarui. Tidak bisa diubah lagi.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Warna Baris & Indikator</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="w-3 h-3 rounded-sm shrink-0" style="background:rgba(255,179,0,.15);border:1px solid var(--warn)"></span>
				<span style="color:var(--text-dim)">Latar kuning samar — item belum dihitung (kolom Fisik masih kosong).</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold text-xs shrink-0" style="color:var(--accent)">+N</span>
				<span style="color:var(--text-dim)">Selisih positif — stok fisik lebih banyak dari sistem (kelebihan stok).</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold text-xs shrink-0" style="color:var(--danger)">−N</span>
				<span style="color:var(--text-dim)">Selisih negatif — stok fisik lebih sedikit dari sistem (kehilangan/kerusakan).</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold text-xs shrink-0" style="color:var(--accent)">0</span>
				<span style="color:var(--text-dim)">Tidak ada selisih — stok fisik sesuai sistem.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tips & Perhatian</h4>
		<ul class="list-none flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Hanya boleh ada <strong style="color:var(--text)">satu opname aktif</strong> dalam satu waktu. Selesaikan atau batalkan opname lama sebelum membuat yang baru.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Gunakan kolom <strong style="color:var(--text)">Cari</strong> untuk menemukan barang berdasarkan nama atau kode — sangat membantu jika stok banyak.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Tekan <strong style="color:var(--text)">Enter</strong> setelah input angka fisik untuk pindah ke baris berikutnya.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Selisih wajib diberi alasan agar ada catatan audit. Contoh alasan: <em>barang rusak</em>, <em>salah hitung sebelumnya</em>, <em>hilang</em>.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Tombol <strong style="color:var(--accent)">Approve</strong> baru aktif setelah <em>semua</em> item diisi stok fisiknya.</span></li>
			<li class="flex gap-2"><span style="color:var(--danger)">!</span><span><strong style="color:var(--text)">Approve tidak bisa dibatalkan.</strong> Pastikan semua angka sudah benar sebelum approve.</span></li>
		</ul>
	</section>

	{/snippet}
</Panduan>
