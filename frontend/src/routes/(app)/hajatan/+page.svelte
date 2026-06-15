<script lang="ts">
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { STATUS_LABEL, STATUS_LIST, fmt } from './hajatan.logic.js';
	import { createHajatanStore } from './hajatan.store.svelte.js';
	import FormAcara from './FormAcara.svelte';

	const store = createHajatanStore();

	const STATUS_BADGE: Record<string, string> = {
		persiapan: 'warn',
		konfirmasi: 'info',
		selesai: 'sukses',
		batal: 'netral'
	};

	const statusOptions = [
		{ value: '', label: 'Semua Status' },
		...STATUS_LIST.map((s) => ({ value: s, label: STATUS_LABEL[s] }))
	];

	$effect(() => {
		store.filterStatus;
		store.filterBulan;
		store.muat();
	});
</script>

<svelte:head><title>Hajatan — Stokasir</title></svelte:head>

<div class="space-y-4">
	<PageHeader judul="Acara & Hajatan">
		{#snippet aksi()}
			<Button onclick={() => store.bukaFormTambah()}>+ Tambah Acara</Button>
		{/snippet}
	</PageHeader>

	<div class="flex flex-wrap gap-2">
		<input
			type="month"
			bind:value={store.filterBulan}
			class="rounded border px-2 py-1 text-sm"
			style="background:var(--surface);border-color:var(--border);color:var(--text)"
		/>
		<Select bind:value={store.filterStatus} options={statusOptions} />
	</div>

	{#if store.list.length > 0}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each STATUS_LIST as s (s)}
				{@const cnt = store.list.filter((x) => x.status === s).length}
				<div
					class="rounded-lg border p-3"
					style="background:var(--surface);border-color:var(--border)"
				>
					<p class="text-xs" style="color:var(--text-dim)">{STATUS_LABEL[s]}</p>
					<p class="text-xl font-bold" style="color:var(--text)">{cnt}</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if store.loading}
		<div class="flex justify-center py-6"><Spinner /></div>
	{:else if store.list.length === 0}
		<EmptyState pesan="Belum ada acara." ikon="🎉" />
	{:else}
		<div class="space-y-3">
			{#each store.list as a (a.id)}
				<div
					class="rounded-lg border p-4"
					style="background:var(--surface);border-color:var(--border)"
				>
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-sm font-semibold" style="color:var(--text)">{a.nama_acara}</h3>
								<Badge tipe={STATUS_BADGE[a.status] ?? 'netral'}>{STATUS_LABEL[a.status]}</Badge>
							</div>
							<p class="mt-1 text-xs" style="color:var(--text-dim)">
								Penyelenggara: <strong>{a.nama_penyelenggara}</strong>
								· {new Date(a.tanggal_acara).toLocaleDateString('id-ID', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
							</p>
							{#if a.alamat}
								<p class="mt-0.5 text-xs" style="color:var(--text-dim)">📍 {a.alamat}</p>
							{/if}
							<div class="mt-1 flex flex-wrap gap-3">
								{#if a.estimasi_tamu}
									<span class="text-xs" style="color:var(--text-dim)"
										>~{fmt(a.estimasi_tamu)} tamu</span
									>
								{/if}
								{#if a.total_order > 0}
									<span class="text-xs font-medium" style="color:var(--accent)"
										>Order: Rp {fmt(a.total_order)}</span
									>
								{/if}
							</div>
							{#if a.catatan}
								<p class="mt-1 text-xs italic" style="color:var(--text-dim)">{a.catatan}</p>
							{/if}
						</div>
						<div class="flex flex-shrink-0 gap-2">
							<Button variant="dim" size="sm" onclick={() => store.bukaFormEdit(a)}>Edit</Button>
							<Button variant="danger" size="sm" onclick={() => store.konfirmHapus(a.id)}
								>Hapus</Button
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<FormAcara {store} />

<ConfirmDialog
	bind:open={store.konfirmBuka}
	pesan="Hapus acara ini?"
	onkanan={store.hapus}
	onkiri={() => {
		store.konfirmBuka = false;
	}}
/>
