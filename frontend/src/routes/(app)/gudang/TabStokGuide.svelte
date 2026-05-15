<script lang="ts">
	import Panduan from '$lib/components/Panduan.svelte';
</script>

<Panduan title="Panduan — Stok" subtitle="Monitor kondisi stok barang secara real-time">
	{#snippet children()}

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tab Stok untuk Apa?</h4>
		<p style="color:var(--text-dim)">Tab ini adalah <strong style="color:var(--text)">tampilan baca saja</strong> — untuk memantau kondisi stok semua barang sekarang. Stok tidak bisa diubah langsung dari sini.</p>
		<div class="rounded p-3 text-xs flex flex-col gap-1.5" style="background:var(--surface2);color:var(--text-dim)">
			<div class="flex gap-2"><span style="color:var(--accent)">Tambah stok</span><span>→ pakai tab <strong style="color:var(--text)">Terima Barang</strong></span></div>
			<div class="flex gap-2"><span style="color:var(--accent)">Order ke supplier</span><span>→ pakai tab <strong style="color:var(--text)">Purchase Order</strong></span></div>
			<div class="flex gap-2"><span style="color:var(--accent)">Koreksi selisih</span><span>→ pakai tab <strong style="color:var(--text)">Stok Opname</strong></span></div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Status Stok</h4>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-28 shrink-0" style="color:var(--danger)">HABIS</span>
				<span style="color:var(--text-dim)">Stok = 0. Barang tidak bisa dijual. Segera terima barang atau buat PO ke supplier.</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-28 shrink-0" style="color:var(--warn)">HAMPIR HABIS</span>
				<span style="color:var(--text-dim)">Stok ≤ stok minimum. Masih bisa dijual, tapi segera reorder.</span>
			</div>
			<div class="flex items-center gap-3 p-2 rounded" style="background:var(--surface2)">
				<span class="font-bold w-28 shrink-0" style="color:var(--accent)">AMAN</span>
				<span style="color:var(--text-dim)">Stok > stok minimum. Tidak perlu tindakan segera.</span>
			</div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Riwayat Mutasi</h4>
		<p style="color:var(--text-dim)">Klik <strong style="color:var(--info)">Riwayat</strong> pada baris barang untuk melihat semua perubahan stok barang tersebut — dari mana datangnya dan kapan berkurangnya.</p>
		<div class="flex flex-col gap-1 text-xs" style="color:var(--text-dim)">
			<div class="flex gap-2"><span class="font-bold w-20 shrink-0" style="color:var(--accent)">masuk</span><span>Stok bertambah dari penerimaan barang.</span></div>
			<div class="flex gap-2"><span class="font-bold w-20 shrink-0" style="color:var(--danger)">keluar</span><span>Stok berkurang karena penjualan di kasir.</span></div>
			<div class="flex gap-2"><span class="font-bold w-20 shrink-0" style="color:var(--info)">koreksi</span><span>Penyesuaian manual dari stok opname.</span></div>
		</div>
	</section>

	<hr style="border-color:var(--border)" />

	<section class="flex flex-col gap-2">
		<h4 class="font-bold text-xs uppercase tracking-widest" style="color:var(--accent)">Tips</h4>
		<ul class="list-none flex flex-col gap-2 text-xs" style="color:var(--text-dim)">
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Gunakan filter nama untuk menemukan barang dengan cepat.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Stok minimum diatur di tab <strong style="color:var(--text)">Master Barang</strong>. Set nilai yang realistis agar alert tidak terlalu sering muncul.</span></li>
			<li class="flex gap-2"><span style="color:var(--accent)">→</span><span>Jika stok tidak sesuai kenyataan, lakukan <strong style="color:var(--text)">Stok Opname</strong> — jangan koreksi manual sembarangan.</span></li>
		</ul>
	</section>

	{/snippet}
</Panduan>
