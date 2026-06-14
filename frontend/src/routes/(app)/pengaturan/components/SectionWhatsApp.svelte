<script lang="ts">
	import type { createPengaturanStore } from '../pengaturan.store.svelte'

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props()
</script>

<section class="space-y-4 rounded border p-4" style="background:var(--surface);border-color:var(--border)">
	<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">WhatsApp</h2>

	<div class="space-y-1">
		<label for="wa_nomor" class="text-xs" style="color:var(--text-dim)">Nomor WhatsApp Toko</label>
		<input
			id="wa_nomor"
			type="tel"
			bind:value={store.form.wa_nomor}
			placeholder="628xx... (format internasional, tanpa +)"
			class="w-full rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		/>
		<p class="text-xs" style="color:var(--text-dim)">
			Digunakan untuk alert internal (stok habis, void, tutup shift)
		</p>
	</div>
</section>
