<script lang="ts">
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import type { GrupModifier, ModifierItem, ModifierTerpilih } from '$lib/../routes/(kasir)/kasir/fnb/fnb.types';
	import { validasiModifier, totalHargaModifier, flattenModifier } from '$lib/../routes/(kasir)/kasir/fnb/fnb.logic';

	let {
		open = $bindable(false),
		nama_barang = '',
		harga_dasar = 0,
		grupList = [],
		onkonfirmasi,
	}: {
		open: boolean;
		nama_barang: string;
		harga_dasar: number;
		grupList: GrupModifier[];
		onkonfirmasi?: (modifiers: ModifierTerpilih[], catatan: string) => void;
	} = $props();

	// terpilih: Map<grup_id, ModifierTerpilih[]>
	let terpilih = $state<Map<number, ModifierTerpilih[]>>(new Map());
	let catatan = $state('');
	let errorMsg = $state('');

	const totalTambahan = $derived(totalHargaModifier(terpilih));
	const totalEfektif = $derived(harga_dasar + totalTambahan);

	function toggleModifier(grup: GrupModifier, mod: ModifierItem) {
		const sekarang = terpilih.get(grup.id) ?? [];
		const sudahAda = sekarang.find((m) => m.modifier_id === mod.id);

		if (sudahAda) {
			// hapus
			terpilih.set(grup.id, sekarang.filter((m) => m.modifier_id !== mod.id));
		} else if (grup.max_pilih === 1) {
			// radio — ganti
			terpilih.set(grup.id, [{ modifier_id: mod.id, nama_snapshot: mod.nama, harga_snapshot: mod.harga_tambahan }]);
		} else if (sekarang.length < grup.max_pilih) {
			// checkbox — tambah
			terpilih.set(grup.id, [...sekarang, { modifier_id: mod.id, nama_snapshot: mod.nama, harga_snapshot: mod.harga_tambahan }]);
		}
		terpilih = new Map(terpilih); // trigger reactivity
		errorMsg = '';
	}

	function dipilih(grup_id: number, mod_id: number): boolean {
		return (terpilih.get(grup_id) ?? []).some((m) => m.modifier_id === mod_id);
	}

	function konfirmasi() {
		const err = validasiModifier(grupList, terpilih);
		if (err) { errorMsg = err; return; }
		onkonfirmasi?.(flattenModifier(terpilih), catatan.trim());
		reset();
		open = false;
	}

	function reset() {
		terpilih = new Map();
		catatan = '';
		errorMsg = '';
	}

	$effect(() => {
		if (open) reset();
	});
</script>

<ModalWindow bind:open title="Pilih Modifier — {nama_barang}" maxWidth="sm">
	<div class="space-y-4">
		{#each grupList as grup (grup.id)}
			<div>
				<div class="mb-1.5 flex items-center gap-2">
					<span class="text-sm font-semibold">{grup.nama}</span>
					{#if grup.wajib}
						<span class="badge badge-sm badge-error">Wajib</span>
					{/if}
					{#if grup.max_pilih > 1}
						<span class="text-xs text-[var(--text-dim)]">max {grup.max_pilih}</span>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each grup.modifiers.filter((m) => m.is_active) as mod (mod.id)}
						{@const aktif = dipilih(grup.id, mod.id)}
						<button
							class="rounded-full border px-3 py-1 text-sm transition-colors
								{aktif
									? 'border-[var(--accent)] bg-[var(--accent)] text-black'
									: 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:border-[var(--accent)]'}"
							onclick={() => toggleModifier(grup, mod)}
						>
							{mod.nama}
							{#if mod.harga_tambahan > 0}
								<span class="ml-1 opacity-70">+{mod.harga_tambahan.toLocaleString('id-ID')}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Catatan -->
		<div>
			<label class="mb-1 block text-sm font-medium" for="catatan-item">Catatan (opsional)</label>
			<input
				id="catatan-item"
				bind:value={catatan}
				placeholder="mis. tanpa sambal, extra pedas..."
				class="input input-bordered w-full text-sm"
				maxlength="120"
			/>
		</div>

		{#if errorMsg}
			<p class="text-sm text-[var(--danger)]">{errorMsg}</p>
		{/if}

		<!-- Total -->
		<div class="flex items-center justify-between border-t border-[var(--border)] pt-3">
			<span class="text-sm text-[var(--text-dim)]">Total per item</span>
			<span class="font-mono font-semibold">Rp {totalEfektif.toLocaleString('id-ID')}</span>
		</div>

		<div class="flex gap-2">
			<button class="btn btn-ghost flex-1" onclick={() => { open = false; }}>Batal</button>
			<button class="btn btn-primary flex-1" onclick={konfirmasi}>Tambah ke Keranjang</button>
		</div>
	</div>
</ModalWindow>
