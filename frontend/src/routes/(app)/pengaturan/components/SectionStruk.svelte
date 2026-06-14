<script lang="ts">
	import type { createPengaturanStore } from '../pengaturan.store.svelte'
	import { UKURAN_STRUK_OPTS, COPY_OPTS } from '../pengaturan.logic'
	import RadioGroup from './RadioGroup.svelte'

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props()
</script>

<section class="space-y-4 rounded border p-4" style="background:var(--surface);border-color:var(--border)">
	<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">Struk</h2>

	<div class="space-y-1">
		<label for="struk_header" class="text-xs" style="color:var(--text-dim)">Header Struk</label>
		<textarea
			id="struk_header"
			bind:value={store.form.struk_header}
			placeholder="Teks di atas struk (nama toko, alamat, dll)"
			rows="2"
			class="w-full resize-none rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		></textarea>
	</div>

	<div class="space-y-1">
		<label for="struk_footer" class="text-xs" style="color:var(--text-dim)">Footer Struk</label>
		<textarea
			id="struk_footer"
			bind:value={store.form.struk_footer}
			placeholder="Teks di bawah struk (ucapan terima kasih, dll)"
			rows="2"
			class="w-full resize-none rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		></textarea>
	</div>

	<div class="space-y-1">
		<span class="text-xs" style="color:var(--text-dim)">Ukuran Kertas</span>
		<RadioGroup options={UKURAN_STRUK_OPTS} bind:group={store.form.struk_ukuran} />
	</div>

	<div class="space-y-1">
		<span class="text-xs" style="color:var(--text-dim)">Jumlah Salinan (Copy)</span>
		<RadioGroup options={COPY_OPTS} bind:group={store.form.struk_copy} />
	</div>

	<div
		class="flex items-center justify-between rounded border p-3"
		style="border-color:var(--border);background:var(--surface2)"
	>
		<div>
			<div class="text-sm font-medium" style="color:var(--text)">Auto-cetak setelah transaksi</div>
			<div class="mt-0.5 text-xs" style="color:var(--text-dim)">
				Struk langsung tercetak tanpa harus klik tombol Cetak Struk
			</div>
		</div>
		<button
			onclick={() => {
				store.form.auto_cetak = store.form.auto_cetak === 'true' ? 'false' : 'true'
			}}
			class="relative h-5 w-10 flex-shrink-0 rounded-full transition-colors"
			style="background:{store.form.auto_cetak === 'true' ? 'var(--accent)' : 'var(--border)'}"
			aria-label="Toggle auto-cetak"
			role="switch"
			aria-checked={store.form.auto_cetak === 'true'}
		>
			<span
				class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
				style="transform:translateX({store.form.auto_cetak === 'true' ? '1.25rem' : '0.125rem'})"
			></span>
		</button>
	</div>

	<div>
		<a href="/pengaturan/struk" class="text-xs underline" style="color:var(--accent)">
			Preview & test cetak struk →
		</a>
	</div>
</section>
