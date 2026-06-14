<script lang="ts">
	import { font, FONT_LABEL, FONT_CSS, type FontPilihan } from '$lib/stores/font.js'
	import { ukuranFont, UKURAN_MIN, UKURAN_MAX } from '$lib/stores/ukuran-font.js'
	import type { createPengaturanStore } from '../pengaturan.store.svelte'
	import { TEMA_OPTS, HARGA_OPTS } from '../pengaturan.logic'
	import RadioGroup from './RadioGroup.svelte'

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props()
</script>

<section class="space-y-5 rounded border p-4" style="background:var(--surface);border-color:var(--border)">
	<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">
		Preferensi
	</h2>

	<div class="space-y-2">
		<span class="text-xs" style="color:var(--text-dim)">Tema Default</span>
		<RadioGroup options={TEMA_OPTS} bind:group={store.form.tema_default} />
	</div>

	<div class="space-y-2">
		<span class="text-xs" style="color:var(--text-dim)">Harga Default Kasir</span>
		<RadioGroup options={HARGA_OPTS} bind:group={store.form.harga_default} />
	</div>

	<!-- Font Family -->
	<div class="space-y-2">
		<span class="text-xs" style="color:var(--text-dim)">Font</span>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each Object.entries(FONT_LABEL) as [id, label] (id)}
				<button
					type="button"
					onclick={() => font.set(id as FontPilihan)}
					class="rounded border px-3 py-2 text-left transition-colors"
					style="
						background:{$font === id
						? 'color-mix(in srgb,var(--accent) 12%,var(--surface2))'
						: 'var(--surface2)'};
						border-color:{$font === id ? 'var(--accent)' : 'var(--border)'};
						color:var(--text);
						font-family:{FONT_CSS[id as FontPilihan]}
					"
				>
					<div class="truncate text-xs" style="color:var(--text-dim)">{label}</div>
					<div class="text-base leading-tight">Aa 0123</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Font Size -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-xs" style="color:var(--text-dim)">Ukuran Font</span>
			<span class="font-mono text-xs" style="color:var(--accent)">{$ukuranFont}px</span>
		</div>
		<input
			type="range"
			min={UKURAN_MIN}
			max={UKURAN_MAX}
			bind:value={$ukuranFont}
			class="w-full accent-green-500"
		/>
		<p
			class="rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		>
			Preview: Stokasir — Rp 1.234.567 — stok 99 pcs
		</p>
	</div>
</section>
