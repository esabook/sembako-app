<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';

	type Karyawan = {
		id: number; kode_karyawan: string; nama: string;
		role: string; username: string; gaji_pokok: number;
		tipe_gaji: string; kontak: string | null; is_active: boolean;
	};

	let list = $state<Karyawan[]>([]);
	let query = $state('');
	let loading = $state(false);
	let error = $state('');
	let modalOpen = $state(false);
	let editItem = $state<Partial<Karyawan> | null>(null);
	let form = $state({ kode_karyawan: '', nama: '', role: 'kasir', username: '',
		password: '', gaji_pokok: '', tipe_gaji: 'bulanan', kontak: '' });

	async function muat() {
		loading = true;
		const res = await api.get<Karyawan[]>(`/karyawan?q=${query}`);
		if (res.success) list = res.data;
		loading = false;
	}

	onMount(muat);
	$effect(() => { query; muat(); });

	function bukaForm(item?: Karyawan) {
		editItem = item ?? null;
		form = {
			kode_karyawan: item?.kode_karyawan ?? '',
			nama: item?.nama ?? '',
			role: item?.role ?? 'kasir',
			username: item?.username ?? '',
			password: '',
			gaji_pokok: String(item?.gaji_pokok ?? ''),
			tipe_gaji: item?.tipe_gaji ?? 'bulanan',
			kontak: item?.kontak ?? '',
		};
		modalOpen = true;
	}

	async function simpan() {
		error = '';
		const payload: Record<string, unknown> = {
			kode_karyawan: form.kode_karyawan,
			nama: form.nama,
			role: form.role,
			username: form.username,
			gaji_pokok: Number(form.gaji_pokok) || 0,
			tipe_gaji: form.tipe_gaji,
			kontak: form.kontak || undefined,
		};
		if (form.password) payload.password = form.password;
		if (!editItem?.id) payload.password = form.password;

		const res = editItem?.id
			? await api.put(`/karyawan/${editItem.id}`, payload)
			: await api.post('/karyawan', payload);

		if (!res.success) { error = (res as { success: false; error: string }).error; return; }
		modalOpen = false;
		muat();
	}

	async function hapus(id: number) {
		if (!confirm('Nonaktifkan karyawan ini?')) return;
		await api.delete(`/karyawan/${id}`);
		muat();
	}

	const ROLE_COLOR: Record<string, string> = {
		pemilik: 'var(--accent)', manajer: 'var(--info)',
		kasir: 'var(--warn)', gudang: 'var(--text-dim)',
	};
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center gap-4">
		<h2 class="font-bold">KARYAWAN</h2>
		<input type="search" placeholder="Cari nama..." bind:value={query}
			class="px-3 py-1 rounded border text-sm flex-1 max-w-xs outline-none"
			style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<button onclick={() => bukaForm()} class="px-3 py-1 rounded text-sm font-bold"
			style="background:var(--accent);color:var(--bg)">+ Tambah</button>
	</div>

	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead>
				<tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">Kode</th>
					<th class="text-left px-3 py-2 font-medium">Nama</th>
					<th class="text-left px-3 py-2 font-medium">Role</th>
					<th class="text-left px-3 py-2 font-medium">Username</th>
					<th class="text-left px-3 py-2 font-medium">Kontak</th>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else if list.length === 0}
					<tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
				{:else}
					{#each list as item}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-2" style="color:var(--text-dim)">{item.kode_karyawan}</td>
							<td class="px-3 py-2">{item.nama}</td>
							<td class="px-3 py-2">
								<span class="text-xs font-bold" style="color:{ROLE_COLOR[item.role] ?? 'var(--text-dim)'}">
									{item.role.toUpperCase()}
								</span>
							</td>
							<td class="px-3 py-2" style="color:var(--text-dim)">{item.username}</td>
							<td class="px-3 py-2" style="color:var(--text-dim)">{item.kontak ?? '-'}</td>
							<td class="px-3 py-2 text-right">
								<button onclick={() => bukaForm(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
								<button onclick={() => hapus(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<Modal bind:open={modalOpen} title={editItem?.id ? 'Edit Karyawan' : 'Tambah Karyawan'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpan(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<label for="f1" style="color:var(--text-dim)" class="text-xs">KODE *</label>				<input id="f1" bind:value={form.kode_karyawan} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f2" style="color:var(--text-dim)" class="text-xs">NAMA *</label>				<input id="f2" bind:value={form.nama} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f3" style="color:var(--text-dim)" class="text-xs">ROLE *</label>				<select id="f3" bind:value={form.role} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)">
					{#each ['pemilik','manajer','kasir','gudang'] as r}
						<option value={r}>{r}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="f4" style="color:var(--text-dim)" class="text-xs">USERNAME *</label>				<input id="f4" bind:value={form.username} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f5" style="color:var(--text-dim)" class="text-xs">PASSWORD {editItem?.id ? '(kosongkan = tidak ubah)' : '*'}</label>				<input id="f5" type="password" bind:value={form.password} required={!editItem?.id} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f6" style="color:var(--text-dim)" class="text-xs">KONTAK</label>				<input id="f6" bind:value={form.kontak} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f7" style="color:var(--text-dim)" class="text-xs">GAJI POKOK</label>				<input id="f7" type="number" min="0" bind:value={form.gaji_pokok} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f8" style="color:var(--text-dim)" class="text-xs">TIPE GAJI</label>				<select id="f8" bind:value={form.tipe_gaji} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)">
					<option value="bulanan">Bulanan</option>
					<option value="harian">Harian</option>
				</select>
			</div>
		</div>
		<div class="flex justify-end gap-2 mt-1">
			<button type="button" onclick={() => modalOpen = false} class="px-3 py-1 rounded text-sm"
				style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold"
				style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>
