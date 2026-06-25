<svelte:head><title>Aset — Stokasir</title></svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import TabBar from '$lib/components/ui/TabBar.svelte'
  import { createAsetStore } from './aset.store.svelte.js'
  import TabAset from './components/TabAset.svelte'
  import TabUtilitas from './components/TabUtilitas.svelte'
  import FormAset from './FormAset.svelte'
  import FormUtilitas from './FormUtilitas.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  const store = createAsetStore()
  const tab = $derived<'aset' | 'utilitas'>((page.url.searchParams.get('tab') as any) ?? 'aset')

  $effect(() => { if (tab === 'aset') { store.asetKondisiFilter; store.asetKategoriFilter; store.muatAset() } })
  $effect(() => { if (tab === 'utilitas') { store.utJenisFilter; store.utBulanFilter; store.muatUtilitas() } })
</script>

<div class="flex flex-col gap-4">
  <TabBar
    tabs={[{key:'aset',label:'Inventaris Aset'},{key:'utilitas',label:'Tagihan Utilitas'}]}
    active={tab}
    storageKey="aset"
    onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
  />

  {#if tab === 'aset'}
    <TabAset {store} />
  {:else if tab === 'utilitas'}
    <TabUtilitas {store} />
  {/if}
</div>

<FormAset {store} />
<FormUtilitas {store} />

<ConfirmDialog
  bind:open={store.konfirmAsetBuka}
  judul="Nonaktifkan aset?"
  pesan={`Aset "${store.konfirmAsetNama}" akan dinonaktifkan.`}
  labelKanan="Nonaktifkan"
  warnaKanan="var(--danger)"
  onkiri={() => { store.konfirmAsetBuka = false }}
  onkanan={store.doHapusAset}
/>

<ConfirmDialog
  bind:open={store.konfirmUtBuka}
  judul="Hapus tagihan?"
  pesan="Tagihan ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => { store.konfirmUtBuka = false }}
  onkanan={store.doHapusUt}
/>
