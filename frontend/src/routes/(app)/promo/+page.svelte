<svelte:head><title>Promo — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { createPromoStore } from './promo.store.svelte'
  import PromoTable from './components/PromoTable.svelte'
  import FormPromo from './components/FormPromo.svelte'

  const store = createPromoStore()
  onMount(() => { store.muat(); store.muatMeta() })
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center gap-3">
    <h2 class="font-bold text-sm">Promo & Diskon</h2>
    <button
      onclick={() => store.bukaForm()}
      class="px-3 py-1 rounded text-sm font-bold"
      style="background:var(--accent);color:var(--bg)">
      + Buat Promo
    </button>
    <span class="text-xs ml-auto" style="color:var(--text-dim)">
      {store.aktifHariIni} promo aktif hari ini
    </span>
  </div>

  <PromoTable {store} />
</div>

<FormPromo {store} />
