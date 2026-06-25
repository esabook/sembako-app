<script lang="ts">
	import type { createPengaturanStore } from '../pengaturan.store.svelte'
	import { emailInput } from '$lib/actions/email'

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props()
</script>

<section class="space-y-4 rounded border p-4" style="background:var(--surface);border-color:var(--border)">
	<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">
		Identitas Toko
	</h2>

	<div class="space-y-1">
		<label for="nama_toko" class="text-xs" style="color:var(--text-dim)">Nama Toko</label>
		<input
			id="nama_toko"
			type="text"
			bind:value={store.form.nama_toko}
			placeholder="Stokasir"
			class="w-full rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		/>
	</div>

	<div class="space-y-1">
		<label for="alamat" class="text-xs" style="color:var(--text-dim)">Alamat</label>
		<textarea
			id="alamat"
			bind:value={store.form.alamat}
			placeholder="Jl. ..."
			rows="2"
			class="w-full resize-none rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		></textarea>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="space-y-1">
			<label for="telepon" class="text-xs" style="color:var(--text-dim)">Telepon</label>
			<input
				id="telepon"
				type="tel"
				bind:value={store.form.telepon}
				placeholder="08xx..."
				class="w-full rounded border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
		</div>
		<div class="space-y-1">
			<label for="email" class="text-xs" style="color:var(--text-dim)">Email</label>
			<input
				id="email"
				use:emailInput
				bind:value={store.form.email}
				placeholder="toko@email.com"
				class="w-full rounded border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
		</div>
	</div>
</section>
