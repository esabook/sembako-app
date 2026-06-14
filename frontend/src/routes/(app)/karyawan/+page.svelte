<svelte:head><title>Karyawan — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import TabBar from '$lib/components/ui/TabBar.svelte'
  import { createKaryawanStore } from './karyawan.store.svelte.js'
  import type { Tab } from './karyawan.types.js'
  import TabData from './components/TabData.svelte'
  import TabAbsensi from './components/TabAbsensi.svelte'
  import TabPenggajian from './components/TabPenggajian.svelte'
  import TabKasbon from './components/TabKasbon.svelte'
  import TabJadwal from './components/TabJadwal.svelte'
  import TabPerforma from './components/TabPerforma.svelte'
  import TabIzin from './components/TabIzin.svelte'
  import TabEvaluasi from './components/TabEvaluasi.svelte'
  import TabSanksi from './components/TabSanksi.svelte'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'data',      label: 'Data Karyawan' },
    { key: 'absensi',   label: 'Absensi' },
    { key: 'penggajian', label: 'Penggajian' },
    { key: 'kasbon',    label: 'Kasbon' },
    { key: 'jadwal',    label: 'Jadwal Shift' },
    { key: 'performa',  label: 'Performa Shift' },
    { key: 'izin',      label: 'Cuti & Izin' },
    { key: 'evaluasi',  label: 'Evaluasi' },
    { key: 'sanksi',    label: 'Sanksi & Insentif' },
  ]

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  const tabKeys = new Set(TABS.map(t => t.key))
  let tab = $derived<Tab>(
    tabKeys.has(page.url.searchParams.get('tab') as Tab)
      ? page.url.searchParams.get('tab') as Tab
      : 'data'
  )

  const store = createKaryawanStore()

  onMount(() => store.muatKaryawan())

  function pindahTab(key: string) {
    goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })
  }
</script>

<div class="flex flex-col gap-4">
  <TabBar tabs={TABS} active={tab} storageKey="karyawan" onchange={pindahTab} />

  {#if tab === 'data'}       <TabData {store} />
  {:else if tab === 'absensi'}   <TabAbsensi {store} />
  {:else if tab === 'penggajian'} <TabPenggajian {store} />
  {:else if tab === 'kasbon'}    <TabKasbon {store} />
  {:else if tab === 'jadwal'}    <TabJadwal {store} />
  {:else if tab === 'performa'}  <TabPerforma {store} />
  {:else if tab === 'izin'}      <TabIzin {store} />
  {:else if tab === 'evaluasi'}  <TabEvaluasi {store} />
  {:else if tab === 'sanksi'}    <TabSanksi {store} />
  {/if}
</div>
