<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { user } from '$lib/stores/auth.js';
	import type { createKaryawanStore } from '../karyawan.store.svelte.js';

	let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props();

	$effect(() => {
		store.izinBulan;
		store.izinKaryawanId;
		store.muatIzin();
	});
</script>

<div class="mb-3 flex flex-wrap items-end gap-2">
	<select
		bind:value={store.izinKaryawanId}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	>
		<option value="">Semua Karyawan</option>
		{#each store.karyawanList as k (k.id)}
			<option value={String(k.id)}>{k.nama}</option>
		{/each}
	</select>
	<input
		type="month"
		bind:value={store.izinBulan}
		class="rounded border px-2 py-1 text-sm"
		style="border-color:var(--border);color:var(--text)"
	/>
	<button
		onclick={() => store.bukaFormIzin()}
		class="ml-auto rounded px-3 py-1 text-sm font-bold"
		style="background:var(--accent);color:var(--bg)">+ Ajukan</button
	>
</div>
<div class="overflow-x-auto">
	<table class="min-w-full text-sm">
		<thead
			><tr class="text-xs" style="color:var(--text-dim)">
				<th class="py-2 pr-3 text-left">Karyawan</th>
				<th class="py-2 pr-3 text-left">Jenis</th>
				<th class="py-2 pr-3 text-left">Mulai</th>
				<th class="py-2 pr-3 text-left">Selesai</th>
				<th class="py-2 pr-3 text-left">Alasan</th>
				<th class="py-2 pr-3 text-left">Status</th>
				<th class="py-2"></th>
			</tr></thead
		>
		<tbody>
			{#each store.izinRows as row (row.id)}
				<tr class="border-t text-sm" style="border-color:var(--border)">
					<td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
					<td class="py-2 pr-3 capitalize">{row.jenis}</td>
					<td class="py-2 pr-3">{row.tanggal_mulai}</td>
					<td class="py-2 pr-3">{row.tanggal_selesai}</td>
					<td class="py-2 pr-3" style="color:var(--text-dim)">{row.alasan ?? '-'}</td>
					<td class="py-2 pr-3">
						{#if row.status === 'menunggu'}
							<span
								class="rounded-full px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn)"
								>Menunggu</span
							>
						{:else if row.status === 'disetujui'}
							<span
								class="rounded-full px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)"
								>Disetujui</span
							>
						{:else}
							<span
								class="rounded-full px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)"
								>Ditolak</span
							>
						{/if}
					</td>
					<td class="py-2 text-right">
						{#if row.status === 'menunggu' && $user && ['pemilik', 'manajer'].includes($user.role)}
							<button
								onclick={() => store.setujuiIzin(row.id)}
								class="mr-1 rounded px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)"
								>Setujui</button
							>
							<button
								onclick={() => store.tolakIzin(row.id)}
								class="rounded px-2 py-0.5 text-xs"
								style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)"
								>Tolak</button
							>
						{/if}
					</td>
				</tr>
			{/each}
			{#if store.izinLoading}
				<tr><td colspan="7" class="py-6 text-center"><Spinner /></td></tr>
			{:else if !store.izinRows.length}
				<tr
					><td colspan="7" class="py-6 text-center text-sm" style="color:var(--text-dim)"
						>Belum ada pengajuan</td
					></tr
				>
			{/if}
		</tbody>
	</table>
</div>

<!-- ── Modal: Ajukan Cuti/Izin ──────────────────────────────────────────────── -->
<SlideOver bind:open={store.izinFormOpen} title="Ajukan Cuti / Izin">
	{#snippet children()}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				store.simpanIzin();
			}}
			class="flex flex-col gap-3 text-sm"
		>
			{#if $user && ['pemilik', 'manajer'].includes($user.role)}
				<div class="flex flex-col gap-1">
					<label for="fi-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
					<select
						id="fi-karyw"
						bind:value={store.fIzinKaryawanId}
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					>
						<option value="">-- Saya Sendiri --</option>
						{#each store.karyawanList as k (k.id)}
							<option value={String(k.id)}>{k.nama}</option>
						{/each}
					</select>
				</div>
			{/if}
			<div class="flex flex-col gap-1">
				<span class="text-xs" style="color:var(--text-dim)">JENIS *</span>
				<div class="flex flex-wrap gap-3">
					{#each [['izin', 'Izin'], ['cuti', 'Cuti'], ['sakit', 'Sakit']] as const as [v, lbl] (v)}
						<label class="flex cursor-pointer items-center gap-1.5 text-sm">
							<input
								type="radio"
								bind:group={store.fIzinJenis}
								value={v}
								class="accent-[var(--accent)]"
							/>
							{lbl}
						</label>
					{/each}
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<label for="fi-mulai" class="text-xs" style="color:var(--text-dim)">TANGGAL MULAI *</label
					>
					<input
						id="fi-mulai"
						type="date"
						bind:value={store.fIzinMulai}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="fi-selesai" class="text-xs" style="color:var(--text-dim)"
						>TANGGAL SELESAI *</label
					>
					<input
						id="fi-selesai"
						type="date"
						bind:value={store.fIzinSelesai}
						required
						class="rounded border px-2 py-1 outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<label for="fi-alasan" class="text-xs" style="color:var(--text-dim)">ALASAN</label>
				<textarea
					id="fi-alasan"
					bind:value={store.fIzinAlasan}
					rows="3"
					placeholder="Opsional"
					class="resize-none rounded border px-2 py-1 outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>
			{#if store.izinError}
				<p class="text-xs" style="color:var(--danger)">{store.izinError}</p>
			{/if}
			<div class="mt-1 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (store.izinFormOpen = false)}
					class="rounded px-3 py-1 text-sm"
					style="color:var(--text-dim)">Batal</button
				>
				<button
					type="submit"
					class="rounded px-3 py-1 text-sm font-bold"
					style="background:var(--accent);color:var(--bg)">Kirim</button
				>
			</div>
		</form>
	{/snippet}
</SlideOver>
