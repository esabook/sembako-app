<svelte:head><title>CRM — Stokasir</title></svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import TabBar from '$lib/components/ui/TabBar.svelte'
  import { createCrmStore } from './crm.store.svelte.js'
  import TabPermintaan from './components/TabPermintaan.svelte'
  import TabKomplain from './components/TabKomplain.svelte'
  import FormPermintaan from './FormPermintaan.svelte'
  import FormKomplain from './FormKomplain.svelte'
  import DetailKomplain from './DetailKomplain.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer', 'kasir', 'pelayanan'].includes($user.role)) goto('/kasir')
  })

  const store = createCrmStore()
  const tab = $derived<'permintaan' | 'komplain'>((page.url.searchParams.get('tab') as any) ?? 'permintaan')

  $effect(() => { if (tab === 'permintaan') { store.pBulan; store.pStatus; store.muatPermintaan() } })
  $effect(() => { if (tab === 'komplain') { store.kBulan; store.kStatus; store.muatKomplain() } })
</script>

<div class="flex flex-col gap-4">
  <TabBar
    tabs={[{key:'permintaan',label:'Permintaan Barang'},{key:'komplain',label:'Komplain'}]}
    active={tab}
    storageKey="crm"
    onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
  />

  {#if tab === 'permintaan'}
    <TabPermintaan {store} />
  {:else if tab === 'komplain'}
    <TabKomplain {store} />
  {/if}
</div>

<FormPermintaan {store} />
<FormKomplain {store} />
<DetailKomplain {store} />

<ConfirmDialog
  bind:open={store.konfirmPermintaanBuka}
  judul="Hapus permintaan?"
  pesan="Data permintaan barang ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => { store.konfirmPermintaanBuka = false }}
  onkanan={store.doHapusP}
/>

<ConfirmDialog
  bind:open={store.konfirmKomplainBuka}
  judul="Hapus komplain?"
  pesan="Data komplain pelanggan ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => { store.konfirmKomplainBuka = false }}
  onkanan={store.doHapusK}
/>
