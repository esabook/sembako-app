<script lang="ts">
	import type { createTugasStore } from '../tugas.store.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import EmptyState from '$lib/components/data/EmptyState.svelte'

	let { store, isManager }: { store: ReturnType<typeof createTugasStore>; isManager: boolean } =
		$props()
</script>

{#if !isManager}
	<p class="text-sm" style="color:var(--text-dim)">
		Hanya pemilik/manajer yang bisa mengelola item tugas.
	</p>
{:else}
	<div class="flex justify-end">
		<Button onclick={store.bukaFormTambah}>+ Tambah Item</Button>
	</div>

	{#if store.items.length === 0}
		<EmptyState pesan="Belum ada item tugas." />
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead>
					<tr style="border-bottom:1px solid var(--border)">
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Nama</th>
						<th
							class="hidden px-3 py-2 text-left font-semibold sm:table-cell"
							style="color:var(--text-dim)">Kategori</th
						>
						<th
							class="hidden px-3 py-2 text-left font-semibold sm:table-cell"
							style="color:var(--text-dim)">Urutan</th
						>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each store.items as item (item.id)}
						<tr style="border-bottom:1px solid var(--border)">
							<td class="px-3 py-2" style="color:var(--text)">{item.nama}</td>
							<td class="hidden px-3 py-2 sm:table-cell" style="color:var(--text-dim)">
								{item.kategori}
							</td>
							<td class="hidden px-3 py-2 sm:table-cell" style="color:var(--text-dim)">
								{item.urutan}
							</td>
							<td class="px-3 py-2">
								<div class="flex justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => store.bukaFormEdit(item)}>Edit</Button
									>
									<Button
										variant="danger"
										size="sm"
										onclick={() => (store.konfirmHapus = { buka: true, id: item.id })}
										>Hapus</Button
									>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}
