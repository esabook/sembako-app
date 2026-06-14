<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import { rp, pct, marginColor } from '../harga.logic.js'
  import type { HargaStore } from '../harga.store.svelte.js'

  let { store, onDone }: { store: HargaStore; onDone: () => void } = $props()
</script>

<div class="space-y-4">
  <!-- Parameter -->
  <div class="rounded border p-4 space-y-3" style="background:var(--surface);border-color:var(--border)">
    <h2 class="text-xs font-bold uppercase" style="color:var(--text-dim)">Parameter Perubahan</h2>

    <div class="flex gap-4">
      {#each [['persen', 'Persentase (%)'], ['rupiah', 'Nominal (Rp)']] as [val, label] (val)}
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            bind:group={store.massalTipe}
            value={val}
            class="accent-green-500"
            onchange={() => store.resetSimulasi()}
          />
          <span class="text-sm" style="color:var(--text)">{label}</span>
        </label>
      {/each}
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <label for="nilai_eceran" class="text-xs" style="color:var(--text-dim)">
          Perubahan Harga Eceran {store.massalTipe === 'persen' ? '(%)' : '(Rp)'}
        </label>
        <input
          id="nilai_eceran"
          type="number"
          bind:value={store.massalNilaiEceran}
          placeholder={store.massalTipe === 'persen' ? '10 = naik 10%' : '500 = naik Rp500'}
          class="w-full rounded border px-3 py-2 text-sm"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)"
          onchange={() => store.resetSimulasi()}
        />
      </div>
      <div class="space-y-1">
        <label for="nilai_grosir" class="text-xs" style="color:var(--text-dim)">
          Perubahan Harga Grosir {store.massalTipe === 'persen' ? '(%)' : '(Rp)'}
        </label>
        <input
          id="nilai_grosir"
          type="number"
          bind:value={store.massalNilaiGrosir}
          placeholder={store.massalTipe === 'persen' ? '8 = naik 8%' : '400 = naik Rp400'}
          class="w-full rounded border px-3 py-2 text-sm"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)"
          onchange={() => store.resetSimulasi()}
        />
      </div>
    </div>
  </div>

  <!-- Pilih Barang -->
  <div class="rounded border" style="border-color:var(--border)">
    <div class="flex items-center gap-3 px-3 py-2 border-b" style="background:var(--surface2);border-color:var(--border)">
      <input
        type="checkbox"
        checked={store.massalChecked.size === store.barangList.length && store.barangList.length > 0}
        onchange={() => store.toggleAll()}
        class="accent-green-500"
      />
      <span class="text-xs font-bold" style="color:var(--text-dim)">
        {store.massalChecked.size} / {store.barangList.length} barang dipilih
      </span>
    </div>
    <div class="max-h-64 overflow-y-auto">
      {#each store.barangList as b (b.id)}
        <label class="flex items-center gap-3 px-3 py-2 border-b cursor-pointer hover:opacity-80" style="border-color:var(--border)">
          <input
            type="checkbox"
            checked={store.massalChecked.has(b.id)}
            onchange={() => store.toggleSatu(b.id)}
            class="accent-green-500"
          />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate" style="color:var(--text)">{b.nama_barang}</div>
            <div class="text-xs" style="color:var(--text-dim)">
              Eceran: {rp(b.harga_jual_eceran)} · Grosir: {rp(b.harga_jual_grosir)}
            </div>
          </div>
        </label>
      {/each}
    </div>
  </div>

  <!-- Tombol -->
  <div class="flex gap-2 justify-end">
    <Button variant="ghost" onclick={() => store.simulasi()} loading={store.loadingSimulasi}>
      Preview
    </Button>
    {#if store.sudahSimulasi}
      <Button onclick={() => store.terapkanMassal(onDone)} loading={store.loadingMassal}>
        Terapkan ({store.massalChecked.size} barang)
      </Button>
    {/if}
  </div>

  <!-- Preview Simulasi -->
  {#if store.massalPreview.length > 0}
    <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
      <table class="w-full text-xs">
        <thead>
          <tr style="background:var(--surface2);color:var(--text-dim)">
            <th class="px-3 py-2 text-left font-bold">Barang</th>
            <th class="px-3 py-2 text-right font-bold">Eceran Lama</th>
            <th class="px-3 py-2 text-right font-bold">Eceran Baru</th>
            <th class="px-3 py-2 text-right font-bold">Grosir Lama</th>
            <th class="px-3 py-2 text-right font-bold">Grosir Baru</th>
            <th class="px-3 py-2 text-right font-bold">Margin</th>
          </tr>
        </thead>
        <tbody>
          {#each store.massalPreview as p (p.id)}
            <tr class="border-t" style="border-color:var(--border)">
              <td class="px-3 py-2" style="color:var(--text)">{p.nama_barang}</td>
              <td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">{rp(p.harga_eceran_lama)}</td>
              <td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--accent)">{rp(p.harga_eceran_baru)}</td>
              <td class="px-3 py-2 text-right font-mono" style="color:var(--text-dim)">{rp(p.harga_grosir_lama)}</td>
              <td class="px-3 py-2 text-right font-mono font-bold" style="color:var(--accent)">{rp(p.harga_grosir_baru)}</td>
              <td class="px-3 py-2 text-right font-mono" style={marginColor(p.margin_eceran_baru)}>
                {pct(p.margin_eceran_baru)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
