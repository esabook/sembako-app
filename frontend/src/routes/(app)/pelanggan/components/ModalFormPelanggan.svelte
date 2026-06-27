<script lang="ts">
	import SlideOver from '$lib/components/SlideOver.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { api } from '$lib/utils/api.js';
	import type { Pelanggan } from '../pelanggan.helpers.js';

	let {
		open = $bindable(false),
		pelanggan = null as Pelanggan | null,
		onSuccess
	}: {
		open: boolean;
		pelanggan?: Pelanggan | null;
		onSuccess: () => void;
	} = $props();

	let form = $state({
		kode_pelanggan: '',
		nama: '',
		gender: '' as '' | 'pria' | 'wanita',
		tipe: 'eceran' as Pelanggan['tipe'],
		kontak: '',
		alamat: '',
		limit_piutang: '0'
	});
	let err = $state('');

	$effect(() => {
		if (!open) return;
		err = '';
		if (pelanggan) {
			form = {
				kode_pelanggan: pelanggan.kode_pelanggan,
				nama: pelanggan.nama,
				gender: pelanggan.gender ?? '',
				tipe: pelanggan.tipe,
				kontak: pelanggan.kontak ?? '',
				alamat: pelanggan.alamat ?? '',
				limit_piutang: String(pelanggan.limit_piutang)
			};
		} else {
			form = {
				kode_pelanggan: '',
				nama: '',
				gender: '',
				tipe: 'eceran',
				kontak: '',
				alamat: '',
				limit_piutang: '0'
			};
		}
	});

	async function simpan() {
		err = '';
		if (!form.kode_pelanggan.trim() || !form.nama.trim()) {
			err = 'Kode dan nama wajib diisi';
			return;
		}
		const payload = {
			kode_pelanggan: form.kode_pelanggan.trim().toUpperCase(),
			nama: form.nama.trim(),
			gender: form.gender || undefined,
			tipe: form.tipe,
			kontak: form.kontak || undefined,
			alamat: form.alamat || undefined,
			limit_piutang: Number(form.limit_piutang) || 0
		};
		const res = pelanggan
			? await api.put(`/pelanggan/${pelanggan.id}`, payload)
			: await api.post('/pelanggan', payload);
		if (!res.success) {
			err = (res as { success: false; error: string }).error;
			return;
		}
		open = false;
		onSuccess();
	}
</script>

<SlideOver bind:open title={pelanggan ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
	<div class="space-y-3">
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="plg-kode" class="mb-1 block text-xs" style="color:var(--text-dim)">
					Kode * <span class="text-xs">(otomatis kapital)</span>
				</label>
				<input
					id="plg-kode"
					bind:value={form.kode_pelanggan}
					oninput={() => (form.kode_pelanggan = form.kode_pelanggan.toUpperCase())}
					placeholder="PLG001"
					class="input input-bordered w-full uppercase text-sm"
				/>
			</div>
			<div>
				<Select
					bind:value={form.tipe}
					label="Tipe"
					options={[
						{ value: 'eceran', label: 'Eceran' },
						{ value: 'grosir', label: 'Grosir' },
						{ value: 'langganan', label: 'Langganan' }
					]}
				/>
			</div>
		</div>

		<div>
			<label for="plg-nama" class="mb-1 block text-xs" style="color:var(--text-dim)">Nama *</label>
			<input
				id="plg-nama"
				bind:value={form.nama}
				placeholder="Nama pelanggan"
				class="w-full rounded border px-3 py-1.5 text-sm"
				style="background:var(--bg);border-color:var(--border);color:var(--text)"
			/>
		</div>

		<div>
			<p class="mb-1 block text-xs" style="color:var(--text-dim)">Jenis Kelamin</p>
			<div class="flex gap-2">
				{#each [{ val: 'pria', sym: '♂', color: '#40c4ff', label: 'Pria' }, { val: 'wanita', sym: '♀', color: '#ff80ab', label: 'Wanita' }, { val: '', sym: '', color: '', label: 'Tidak diisi' }] as g}
					<label
						for="gender-{g.val || 'kosong'}"
						class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-sm"
						style="border-color:var(--border);{form.gender === g.val ? 'background:var(--surface2);border-color:var(--accent)' : ''}"
					>
						<input
							id="gender-{g.val || 'kosong'}"
							type="radio"
							bind:group={form.gender}
							value={g.val}
							class="sr-only"
						/>
						{#if g.sym}<span style="color:{g.color}">{g.sym}</span>{/if}
						<span style={g.val ? '' : 'color:var(--text-dim)'}>{g.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="plg-kontak" class="mb-1 block text-xs" style="color:var(--text-dim)">No. HP</label>
				<input
					id="plg-kontak"
					bind:value={form.kontak}
					placeholder="08xx..."
					class="w-full rounded border px-3 py-1.5 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div>
				<label for="plg-limit" class="mb-1 block text-xs" style="color:var(--text-dim)">
					Limit Piutang (Rp)
				</label>
				<input
					id="plg-limit"
					type="number"
					bind:value={form.limit_piutang}
					min="0"
					placeholder="0"
					class="input input-bordered w-full text-sm"
				/>
			</div>
		</div>

		<div>
			<label for="plg-alamat" class="mb-1 block text-xs" style="color:var(--text-dim)">Alamat</label>
			<textarea
				id="plg-alamat"
				bind:value={form.alamat}
				rows="2"
				placeholder="Opsional"
				class="w-full resize-none rounded border px-3 py-1.5 text-sm"
				style="background:var(--bg);border-color:var(--border);color:var(--text)"
			></textarea>
		</div>

		{#if err}<p class="text-xs" style="color:var(--danger)">{err}</p>{/if}
		<div class="flex justify-end gap-2 pt-1">
			<Button variant="ghost" onclick={() => (open = false)}>Batal</Button>
			<Button onclick={simpan}>Simpan</Button>
		</div>
	</div>
</SlideOver>
