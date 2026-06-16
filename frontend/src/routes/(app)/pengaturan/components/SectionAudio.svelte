<script lang="ts">
	import { playKasirSound } from '$lib/utils/audio.js';
	import type { createPengaturanStore } from '../pengaturan.store.svelte';
	import { AUDIO_MODE_OPTS } from '../pengaturan.logic';

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props();
</script>

<section
	class="space-y-4 rounded border p-4"
	style="background:var(--surface);border-color:var(--border)"
>
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">
			Audio Kasir
		</h2>
		<span class="text-xs" style="color:var(--text-dim)">Tersimpan di perangkat ini</span>
	</div>

	<label class="flex cursor-pointer items-center gap-3 select-none">
		<input
			type="checkbox"
			bind:checked={store.audioOn}
			onchange={store.simpanAudio}
			class="h-4 w-4"
			style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
		/>
		<span class="text-sm" style="color:var(--text)">
			Aktifkan suara saat item ditambahkan ke keranjang
		</span>
	</label>

	{#if store.audioOn}
		<div class="flex gap-5">
			{#each AUDIO_MODE_OPTS as [val, label] (val)}
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						bind:group={store.audioMode}
						value={val}
						onchange={store.simpanAudio}
						class="accent-green-500"
					/>
					<span class="text-sm" style="color:var(--text)">{label}</span>
				</label>
			{/each}
		</div>

		{#if store.audioMode === 'file'}
			<div class="space-y-2">
				<div class="flex flex-wrap items-center gap-3">
					<label
						class="cursor-pointer rounded border px-3 py-1.5 text-sm"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					>
						📂 Pilih file...
						<input type="file" accept="audio/*" class="hidden" onchange={store.pilihFileAudio} />
					</label>
					{#if store.audioFileName}
						<span class="max-w-48 truncate font-mono text-xs" style="color:var(--accent)">
							{store.audioFileName}
						</span>
						<button
							type="button"
							onclick={store.hapusFileAudio}
							class="shrink-0 text-xs"
							style="color:var(--danger)"
						>
							✕ hapus
						</button>
					{:else}
						<span class="text-xs" style="color:var(--text-dim)">Belum ada file dipilih</span>
					{/if}
				</div>
				{#if store.audioFileErr}
					<p class="text-xs" style="color:var(--danger)">{store.audioFileErr}</p>
				{:else}
					<p class="text-xs" style="color:var(--text-dim)">
						Format: MP3, WAV, OGG. Disarankan di bawah 500KB.
					</p>
				{/if}
			</div>
		{/if}

		<button
			type="button"
			onclick={() => playKasirSound()}
			class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		>
			▶ Preview suara
		</button>
	{/if}
</section>
