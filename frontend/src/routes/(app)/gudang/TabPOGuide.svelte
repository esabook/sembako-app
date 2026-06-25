<script lang="ts">
	import Panduan from '$lib/components/Panduan.svelte';
</script>

<Panduan title="Panduan — Purchase Order" subtitle="Buat surat pesanan ke supplier sebelum barang datang">
	{#snippet children()}

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tab Ini untuk Apa?</h4>
		<p style="color:var(--text-dim)">PO adalah <strong style="color:var(--text)">surat pesanan resmi ke supplier</strong> — dibuat sebelum barang dikirim. PO sendiri tidak menambah stok.</p>
		<div class="rounded p-3 text-xs flex flex-col gap-1.5" style="background:var(--surface2)">
			<div class="flex gap-2 items-start">
				<span class="font-bold shrink-0" style="color:var(--text-dim)">Bedanya dengan Terima Barang:</span>
				<span style="color:var(--text-dim)">PO = pesanan yang <em>dikirim</em> ke supplier. Stok baru bertambah saat barang tiba dan dicatat di tab <strong style="color:var(--text)">Terima Barang</strong>.</span>
			</div>
			<div class="flex gap-2 items-start">
				<span class="font-bold shrink-0" style="color:var(--text-dim)">Wajib buat PO?</span>
				<span style="color:var(--text-dim)">Tidak. Untuk pembelian tunai atau mendadak, bisa langsung ke Terima Barang tanpa PO.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-3">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Alur Lengkap PO → Stok</h4>
		<div class="flex flex-col gap-2 text-xs">
			{#each [
				{ step: '1', label: 'Buat PO', desc: 'Pilih supplier, tentukan item & jumlah. Status: draft.' },
				{ step: '2', label: 'Kirim ke Supplier', desc: 'Ubah status ke "dikirim". Bisa kirim via WhatsApp dari PO.' },
				{ step: '3', label: 'Barang Datang', desc: 'Catat di tab Terima Barang. Stok baru bertambah di sini.' },
				{ step: '4', label: 'PO Lunas', desc: 'Ubah status ke "lunas" setelah hutang dibayar.' },
			] as row (row.step)}
			<div class="flex gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-4 shrink-0 text-center" style="color:var(--accent)">{row.step}</span>
				<div>
					<div class="font-bold" style="color:var(--text)">{row.label}</div>
					<div style="color:var(--text-dim)">{row.desc}</div>
				</div>
			</div>
			{/each}
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Status PO</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--text-dim)">draft</span>
				<span style="color:var(--text-dim)">Baru dibuat, belum dikirim ke supplier.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--info)">dikirim</span>
				<span style="color:var(--text-dim)">Sudah dikirim ke supplier, menunggu barang datang.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--warn)">sebagian</span>
				<span style="color:var(--text-dim)">Barang datang sebagian. Masih menunggu sisa kiriman.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--accent)">lunas</span>
				<span style="color:var(--text-dim)">Semua barang diterima dan hutang sudah dibayar.</span>
			</div>
			<div class="flex items-start gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-20 shrink-0" style="color:var(--danger)">batal</span>
				<span style="color:var(--text-dim)">PO dibatalkan. Stok tidak berubah.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Fitur Stok Kritis</h4>
		<p style="color:var(--text-dim)">Tombol <strong style="color:var(--warn)">Isi dari Stok Kritis</strong> akan otomatis mengisi daftar item PO dengan barang yang stoknya di bawah minimum, beserta saran jumlah pesan berdasarkan rata-rata penjualan 7 hari terakhir.</p>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tips</h4>
		<ul class="list-none flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Harga di PO adalah <em>estimasi</em> — harga final diinput saat Terima Barang sesuai faktur asli.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Perbarui status PO secara rutin agar laporan hutang dan stok akurat.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Satu PO bisa untuk banyak item dari satu supplier. Buat PO terpisah untuk supplier berbeda.</span></li>
		</ul>
	</section>

	{/snippet}
</Panduan>
