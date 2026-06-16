<script lang="ts">
	import DataTable from '$lib/components/DataTable.svelte';
	import type { createKaryawanStore } from '../karyawan.store.svelte.js';
	import { ROLE_COLOR, rp } from '../karyawan.logic.js';
	import { thumbUrl } from '$lib/utils/upload.js';
	import FormKaryawan from '../FormKaryawan.svelte';

	let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props();
</script>

<DataTable
	columns={store.kolKaryawan}
	tableId="karyawan_data"
	bind:sortKey={store.sortKeyKaryawan}
	bind:sortDir={store.sortDirKaryawan}
	bind:currentPage={store.pageKaryawan}
	bind:pageSize={store.pageSizeKaryawan}
	totalRows={store.filteredKaryawan.length}
	rowCount={store.pagedKaryawan.length}
	emptyText="Tidak ada data"
	maxRows={12}
>
	{#snippet toolbarEnd()}
		<div class="flex items-center gap-2">
			<input
				type="search"
				placeholder="Cari nama/username..."
				bind:value={store.queryKaryawan}
				class="rounded border px-3 py-1 text-sm outline-none"
				style="border-color:var(--border);color:var(--text);width:180px"
			/>
			{#if store.isManager}
				<button
					onclick={() => store.bukaFormKaryawan()}
					class="shrink-0 rounded px-3 py-1 text-sm font-bold"
					style="background:var(--accent);color:var(--bg)">+ Tambah</button
				>
			{/if}
		</div>
	{/snippet}
	{#snippet body(hidden)}
		{#each store.pagedKaryawan as item (item.id)}
			<tr class="border-t" style="border-color:var(--border)">
				{#if !hidden.has('kode_karyawan')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_karyawan}</td>
				{/if}
				{#if !hidden.has('nama')}
					<td class="px-3 py-2">
						<div class="flex items-center gap-2">
							{#if item.foto_path}
								<img
									src={thumbUrl(item.foto_path) ?? ''}
									alt={item.nama}
									class="shrink-0 rounded-full object-cover"
									style="width:28px;height:28px;background:var(--surface2)"
								/>
							{:else}
								<span
									class="flex shrink-0 items-center justify-center rounded-full font-bold"
									style="width:28px;height:28px;background:var(--surface2);color:var(--text-dim);font-size:10px"
								>
									{item.nama
										.trim()
										.split(/\s+/)
										.slice(0, 2)
										.map((w) => w[0])
										.join('')
										.toUpperCase()}
								</span>
							{/if}
							{item.nama}
						</div>
					</td>
				{/if}
				{#if !hidden.has('role')}
					<td class="px-3 py-2">
						<span
							class="text-xs font-bold"
							style="color:{ROLE_COLOR[item.role] ?? 'var(--text-dim)'}"
						>
							{item.role.toUpperCase()}
						</span>
					</td>
				{/if}
				{#if !hidden.has('username')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.username}</td>
				{/if}
				{#if !hidden.has('gaji_pokok')}
					<td class="px-3 py-2 text-right">{rp(item.gaji_pokok)}</td>
				{/if}
				{#if !hidden.has('tipe_gaji')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.tipe_gaji}</td>
				{/if}
				{#if !hidden.has('aksi')}
					<td class="px-3 py-2 text-right">
						{#if store.isManager}
							<button
								onclick={() => store.bukaFormKaryawan(item)}
								class="mr-2 text-xs"
								style="color:var(--info)">Edit</button
							>
							<button
								onclick={() => store.hapusKaryawan(item.id)}
								class="text-xs"
								style="color:var(--danger)">Nonaktif</button
							>
						{/if}
					</td>
				{/if}
			</tr>
		{/each}
	{/snippet}
</DataTable>

<FormKaryawan {store} />
