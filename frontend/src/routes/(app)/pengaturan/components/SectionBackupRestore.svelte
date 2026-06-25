<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { createPengaturanStore } from '../pengaturan.store.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { store }: { store: ReturnType<typeof createPengaturanStore> } = $props();
</script>

<section
	class="space-y-4 rounded border p-4"
	style="background:var(--surface);border-color:var(--border)"
>
	<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">
		Backup & Restore Database
	</h2>

	<!-- Export -->
	<div class="space-y-2">
		<p class="text-xs font-semibold" style="color:var(--text)">Export / Download Backup</p>
		<p class="text-xs" style="color:var(--text-dim)">
			Download salinan penuh database. Simpan di tempat aman sebagai cadangan sebelum update besar.
		</p>
		<label class="flex cursor-pointer items-center gap-2 text-xs" style="color:var(--text-dim)">
			<input
				type="checkbox"
				bind:checked={store.backupIncludeMedia}
				style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px;flex-shrink:0"
			/>
			Sertakan file gambar uploads/ (hanya untuk storage lokal)
		</label>
		<button
			onclick={store.downloadBackup}
			disabled={store.backing}
			class="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
			style="background:var(--surface2);border-color:var(--border);color:var(--text);cursor:{store.backing
				? 'default'
				: 'pointer'};opacity:{store.backing ? 0.6 : 1}"
		>
			{#if store.backing}
				<Spinner size={14} /> Mengunduh...
			{:else}
				↓ Download Backup
			{/if}
		</button>
	</div>

	<hr style="border-color:var(--border)" />

	<!-- Restore -->
	<div class="space-y-2">
		<p class="text-xs font-semibold" style="color:var(--text)">Restore dari Backup</p>
		<p class="text-xs" style="color:var(--text-dim)">
			Upload file <code class="font-mono">.db</code> (SQLite) atau
			<code class="font-mono">.json.gz</code>
			hasil backup.
			<strong style="color:var(--danger)">Semua data saat ini akan diganti.</strong> Lakukan hanya jika
			yakin.
		</p>

		<input
			type="file"
			accept=".db,.json.gz"
			onchange={store.pilihFileRestore}
			class="rounded border px-3 py-2 text-sm"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			disabled={store.restoring}
		/>

		{#if store.restoreFile && !store.restoreConfirm}
			<div
				class="flex items-center gap-3 rounded border px-3 py-2"
				style="border-color:var(--warn);background:rgba(255,193,7,.08)"
			>
				<span class="text-xs" style="color:var(--warn)">
					File: <strong>{store.restoreFile.name}</strong> ({(
						store.restoreFile.size /
						1024 /
						1024
					).toFixed(1)} MB)
				</span>
				<Button onclick={() => (store.restoreConfirm = true)}>Yakin? Restore Sekarang</Button>
				<Button
					onclick={() => {
						store.restoreFile = null;
						store.restoreConfirm = false;
					}}
				>
					Batal
				</Button>
			</div>
		{/if}

		{#if store.restoreConfirm}
			<div
				class="space-y-2 rounded border px-3 py-2"
				style="border-color:var(--danger);background:rgba(255,82,82,.08)"
			>
				<p class="text-xs font-bold" style="color:var(--danger)">⚠ Konfirmasi Restore</p>
				<p class="text-xs" style="color:var(--text-dim)">
					Data saat ini akan hilang dan diganti dengan isi file backup. Server akan restart
					otomatis.
				</p>
				<div class="flex gap-2">
					<Button onclick={store.jalankanRestore} disabled={store.restoring}>
						{store.restoring ? 'Memproses...' : 'Restore & Restart Server'}
					</Button>
					<Button
						onclick={() => {
							store.restoreConfirm = false;
							store.restoreFile = null;
						}}
					>
						Batal
					</Button>
				</div>
			</div>
		{/if}
	</div>
</section>
