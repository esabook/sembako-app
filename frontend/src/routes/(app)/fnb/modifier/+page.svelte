<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import { withLoading } from '$lib/utils/async';
	import {
		fetchGrupMaster,
		createGrup,
		updateGrup,
		deleteGrup,
		createOpsi,
		updateOpsi,
		deleteOpsi,
		fetchGrupAssigned,
		setGrupAssigned
	} from '../../../(kasir)/kasir/fnb/fnb.api';
	import type { GrupModifierMaster } from '../../../(kasir)/kasir/fnb/fnb.types';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type MenuBarang = { id: number; nama_barang: string; tipe_produk: string };

	let tab = $state<'grup' | 'assign'>('grup');
	let grups = $state<GrupModifierMaster[]>([]);
	let menus = $state<MenuBarang[]>([]);
	let loading = $state(false);

	// form grup
	let grupOpen = $state(false);
	let editGrupId = $state<number | null>(null);
	let gNama = $state('');
	let gWajib = $state(false);
	let gMin = $state(0);
	let gMax = $state(1);
	let gErr = $state('');

	// form opsi
	let opsiOpen = $state(false);
	let editOpsiId = $state<number | null>(null);
	let opsiGrupId = $state<number | null>(null);
	let oNama = $state('');
	let oHarga = $state(0);
	let oErr = $state('');

	// assign
	let assignBarangId = $state<number | null>(null);
	let assignedIds = $state<number[]>([]);

	async function muat() {
		loading = true;
		grups = await fetchGrupMaster();
		loading = false;
	}

	async function muatMenu() {
		const r = await api.get<MenuBarang[]>('/barang');
		if (r.success) menus = r.data.filter((b) => b.tipe_produk === 'menu_item');
	}

	// ── Grup ──
	function bukaGrup(g?: GrupModifierMaster) {
		editGrupId = g?.id ?? null;
		gNama = g?.nama ?? '';
		gWajib = g?.wajib ?? false;
		gMin = g?.min_pilih ?? 0;
		gMax = g?.max_pilih ?? 1;
		gErr = '';
		grupOpen = true;
	}
	async function simpanGrup() {
		gErr = '';
		if (!gNama.trim()) {
			gErr = 'Nama grup wajib diisi';
			return;
		}
		if (gMax < 1) {
			gErr = 'Maksimal pilih minimal 1';
			return;
		}
		const body = { nama: gNama.trim(), wajib: gWajib, min_pilih: gMin, max_pilih: gMax };
		const ok = editGrupId
			? await withLoading(() => updateGrup(editGrupId!, body), {
					loadingKey: 'grup-save',
					modul: 'fnb',
					aksi: 'grup',
					errorPesan: 'Gagal simpan grup'
				})
			: await withLoading(() => createGrup(body), {
					loadingKey: 'grup-save',
					modul: 'fnb',
					aksi: 'grup',
					errorPesan: 'Gagal simpan grup'
				});
		if (ok !== null) {
			grupOpen = false;
			muat();
		}
	}
	async function hapusGrup(id: number) {
		await withLoading(() => deleteGrup(id), {
			loadingKey: `grup-del-${id}`,
			modul: 'fnb',
			aksi: 'grup',
			errorPesan: 'Gagal hapus grup'
		});
		muat();
	}

	// ── Opsi ──
	function bukaOpsi(grupId: number, o?: { id: number; nama: string; harga_tambahan: number }) {
		opsiGrupId = grupId;
		editOpsiId = o?.id ?? null;
		oNama = o?.nama ?? '';
		oHarga = o?.harga_tambahan ?? 0;
		oErr = '';
		opsiOpen = true;
	}
	async function simpanOpsi() {
		oErr = '';
		if (!oNama.trim()) {
			oErr = 'Nama opsi wajib diisi';
			return;
		}
		const ok = editOpsiId
			? await withLoading(
					() => updateOpsi(editOpsiId!, { nama: oNama.trim(), harga_tambahan: oHarga }),
					{ loadingKey: 'opsi-save', modul: 'fnb', aksi: 'opsi', errorPesan: 'Gagal simpan opsi' }
				)
			: await withLoading(
					() =>
						createOpsi({
							grup_modifier_id: opsiGrupId!,
							nama: oNama.trim(),
							harga_tambahan: oHarga
						}),
					{ loadingKey: 'opsi-save', modul: 'fnb', aksi: 'opsi', errorPesan: 'Gagal simpan opsi' }
				);
		if (ok !== null) {
			opsiOpen = false;
			muat();
		}
	}
	async function hapusOpsi(id: number) {
		await withLoading(() => deleteOpsi(id), {
			loadingKey: `opsi-del-${id}`,
			modul: 'fnb',
			aksi: 'opsi',
			errorPesan: 'Gagal hapus opsi'
		});
		muat();
	}

	// ── Assign ──
	async function pilihBarang(id: number | null) {
		assignBarangId = id;
		assignedIds = id ? await fetchGrupAssigned(id) : [];
	}
	function toggleAssign(grupId: number) {
		assignedIds = assignedIds.includes(grupId)
			? assignedIds.filter((x) => x !== grupId)
			: [...assignedIds, grupId];
	}
	async function simpanAssign() {
		if (!assignBarangId) return;
		await withLoading(() => setGrupAssigned(assignBarangId!, assignedIds), {
			loadingKey: 'assign-save',
			modul: 'fnb',
			aksi: 'assign',
			errorPesan: 'Gagal simpan assign'
		});
	}

	onMount(() => {
		muat();
		muatMenu();
	});
</script>

<div>
	<div class="mb-4 flex w-fit overflow-hidden rounded-lg border border-[var(--border)]">
		{#each [['grup', 'Grup & Opsi'], ['assign', 'Assign ke Menu']] as [v, l] (v)}
			<button
				class="px-4 py-2 text-sm transition-colors
				{tab === v ? 'bg-[var(--accent)] font-semibold text-black' : 'text-[var(--text)]'}"
				onclick={() => (tab = v as 'grup' | 'assign')}>{l}</button
			>
		{/each}
	</div>

	{#if loading}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else if tab === 'grup'}
		<div class="mb-3">
			<button class="btn btn-sm btn-primary" onclick={() => bukaGrup()}>+ Grup Modifier</button>
		</div>
		<div class="space-y-3">
			{#each grups.filter((g) => g.is_active) as g (g.id)}
				<div class="rounded-lg border border-[var(--border)] p-3">
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="font-semibold">{g.nama}</span>
							{#if g.wajib}<span class="badge badge-sm badge-error">Wajib</span>{/if}
							<span class="text-xs text-[var(--text-dim)]">pilih {g.min_pilih}–{g.max_pilih}</span>
						</div>
						<div class="flex gap-1">
							<button class="btn btn-ghost btn-xs" onclick={() => bukaOpsi(g.id)}>+ Opsi</button>
							<button class="btn btn-ghost btn-xs" onclick={() => bukaGrup(g)}>Edit</button>
							<button
								class="btn text-[var(--danger)] btn-ghost btn-xs"
								onclick={() => hapusGrup(g.id)}>Hapus</button
							>
						</div>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each g.modifiers.filter((m) => m.is_active) as m (m.id)}
							<button
								class="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-sm hover:border-[var(--accent)]"
								onclick={() => bukaOpsi(g.id, m)}
							>
								{m.nama}{#if m.harga_tambahan > 0}<span class="ml-1 opacity-70"
										>+{m.harga_tambahan.toLocaleString('id-ID')}</span
									>{/if}
								<span
									class="ml-2 text-[var(--danger)]"
									role="button"
									tabindex="0"
									onclick={(e) => {
										e.stopPropagation();
										hapusOpsi(m.id);
									}}
									onkeydown={() => {}}>×</span
								>
							</button>
						{:else}
							<span class="text-xs text-[var(--text-dim)]">Belum ada opsi.</span>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-sm text-[var(--text-dim)]">Belum ada grup modifier.</p>
			{/each}
		</div>
	{:else}
		<!-- Assign -->
		<div class="max-w-md space-y-3">
			<div>
				<label class="label text-sm" for="a-menu">Menu</label>
				<select
					id="a-menu"
					class="select-bordered select w-full text-sm"
					onchange={(e) => pilihBarang(Number((e.target as HTMLSelectElement).value) || null)}
				>
					<option value="">— pilih menu —</option>
					{#each menus as m (m.id)}<option value={m.id}>{m.nama_barang}</option>{/each}
				</select>
				{#if menus.length === 0}
					<p class="mt-1 text-xs text-[var(--warn)]">
						Belum ada barang tipe Menu. Buat di Gudang → Barang.
					</p>
				{/if}
			</div>

			{#if assignBarangId}
				<div class="space-y-2 rounded-lg border border-[var(--border)] p-3">
					{#each grups.filter((g) => g.is_active) as g (g.id)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								class="checkbox checkbox-sm"
								checked={assignedIds.includes(g.id)}
								onchange={() => toggleAssign(g.id)}
							/>
							{g.nama}
						</label>
					{/each}
					<button class="btn mt-2 w-full btn-sm btn-primary" onclick={simpanAssign}
						>Simpan Assign</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Grup -->
<ModalWindow
	bind:open={grupOpen}
	title="{editGrupId ? 'Edit' : 'Tambah'} Grup Modifier"
	maxWidth="sm"
>
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="g-nama">Nama Grup</label>
			<input
				id="g-nama"
				class="input-bordered input w-full text-sm"
				bind:value={gNama}
				placeholder="mis. Level Pedas"
			/>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" class="checkbox checkbox-sm" bind:checked={gWajib} /> Wajib dipilih
		</label>
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="g-min">Min pilih</label>
				<input
					id="g-min"
					type="number"
					min="0"
					placeholder="0"
					class="input-bordered input w-full text-sm"
					bind:value={gMin}
				/>
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="g-max">Max pilih</label>
				<input
					id="g-max"
					type="number"
					min="1"
					placeholder="1"
					class="input-bordered input w-full text-sm"
					bind:value={gMax}
				/>
			</div>
		</div>
		{#if gErr}<p class="text-sm text-[var(--danger)]">{gErr}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn flex-1 btn-ghost" onclick={() => (grupOpen = false)}>Batal</button>
			<button class="btn flex-1 btn-primary" onclick={simpanGrup}>Simpan</button>
		</div>
	</div>
</ModalWindow>

<!-- Modal Opsi -->
<ModalWindow bind:open={opsiOpen} title="{editOpsiId ? 'Edit' : 'Tambah'} Opsi" maxWidth="sm">
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="o-nama">Nama Opsi</label>
			<input
				id="o-nama"
				class="input-bordered input w-full text-sm"
				bind:value={oNama}
				placeholder="mis. Extra Pedas"
			/>
		</div>
		<div>
			<label class="label text-sm" for="o-harga">Harga Tambahan (Rp)</label>
			<input
				id="o-harga"
				type="number"
				min="0"
				placeholder="0"
				class="input-bordered input w-full text-sm"
				bind:value={oHarga}
			/>
		</div>
		{#if oErr}<p class="text-sm text-[var(--danger)]">{oErr}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn flex-1 btn-ghost" onclick={() => (opsiOpen = false)}>Batal</button>
			<button class="btn flex-1 btn-primary" onclick={simpanOpsi}>Simpan</button>
		</div>
	</div>
</ModalWindow>
