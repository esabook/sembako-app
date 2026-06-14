<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import Button from '$lib/components/ui/Button.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import TabBar from '$lib/components/ui/TabBar.svelte'
  import { createKeuanganStore } from './keuangan.store.svelte'
  import { fmt } from './keuangan.logic'
  import type { TabKey } from './keuangan.types'
  import TabHutang from './components/TabHutang.svelte'
  import TabPiutang from './components/TabPiutang.svelte'
  import TabJurnal from './components/TabJurnal.svelte'
  import TabKasBank from './components/TabKasBank.svelte'
  import TabBudget from './components/TabBudget.svelte'
  import TabPinjaman from './components/TabPinjaman.svelte'
  import ModalBayarHutang from './components/ModalBayarHutang.svelte'
  import ModalBayarPiutang from './components/ModalBayarPiutang.svelte'
  import ModalJurnal from './components/ModalJurnal.svelte'
  import ModalKasBank from './components/ModalKasBank.svelte'
  import ModalPinjaman from './components/ModalPinjaman.svelte'
  import ModalCicilPinjaman from './components/ModalCicilPinjaman.svelte'

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'hutang', label: 'Hutang' },
    { key: 'piutang', label: 'Piutang' },
    { key: 'jurnal', label: 'Jurnal Kas' },
    { key: 'kasbank', label: 'Kas/Bank' },
    { key: 'budget', label: 'Budget & Target' },
    { key: 'pinjaman', label: 'Pinjaman & Investasi' },
  ]

  const store = createKeuanganStore()
  const tabKeys = new Set(TABS.map(t => t.key))
  let tab = $derived<TabKey>(
    tabKeys.has(page.url.searchParams.get('tab') as TabKey)
      ? page.url.searchParams.get('tab') as TabKey
      : 'hutang'
  )

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  onMount(() => {
    store.muatKasBank()
  })

  let prevTab: string | null = null
  $effect(() => {
    const currentTab = tab
    if (prevTab === currentTab) return
    prevTab = currentTab

    if (currentTab === 'hutang') store.muatHutang()
    else if (currentTab === 'piutang') store.muatPiutang()
    else if (currentTab === 'jurnal') store.muatJurnal()
    else if (currentTab === 'kasbank') store.muatKasBankSaldo()
    else if (currentTab === 'pinjaman') store.muatPinjaman()
  })

  function pindahTab(key: string) {
    goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })
  }
</script>

<svelte:head><title>Keuangan — Stokasir</title></svelte:head>

<!-- ───────────────────────────────────────────────── HEADER ── -->
<div>
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
    <h1 style="font-size:1.1rem; font-weight:700; color:var(--text)">Keuangan</h1>
    {#if tab === 'jurnal' || tab === 'kasbank'}
      <Button onclick={() => tab === 'jurnal' ? store.bukaModalJurnal() : store.bukaTambahKasBank()}>
        {tab === 'kasbank' ? '+ Tambah Akun' : '+ Catat Jurnal'}
      </Button>
    {/if}
  </div>

  <!-- Ringkasan -->
  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:.6rem; margin-bottom:1rem">
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">HUTANG SUPPLIER</div>
      <div style="font-size:1rem; font-weight:700; color:var(--danger)">Rp {fmt(store.totalHutangBelum)}</div>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">PIUTANG PELANGGAN</div>
      <div style="font-size:1rem; font-weight:700; color:var(--warn)">Rp {fmt(store.totalPiutangBelum)}</div>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">TOTAL SALDO KAS</div>
      <div style="font-size:1rem; font-weight:700; color:var(--info)">Rp {fmt(store.totalSaldo)}</div>
    </div>
  </div>

  <TabBar tabs={TABS} active={tab} storageKey="keuangan" onchange={pindahTab} />
</div>

<div style="padding:0 1.25rem 2rem">
  {#if tab === 'hutang'}
    <TabHutang {store} />
  {:else if tab === 'piutang'}
    <TabPiutang {store} />
  {:else if tab === 'jurnal'}
    <TabJurnal {store} />
  {:else if tab === 'kasbank'}
    <TabKasBank {store} />
  {:else if tab === 'budget'}
    <TabBudget />
  {:else if tab === 'pinjaman'}
    <TabPinjaman {store} />
  {/if}
</div>

<ModalPinjaman {store} />
<ModalCicilPinjaman {store} />
<ModalBayarHutang {store} />
<ModalBayarPiutang {store} />
<ModalJurnal {store} />
<ModalKasBank {store} />

<ConfirmDialog
  bind:open={store.konfirmKasBankBuka}
  judul="Nonaktifkan akun?"
  pesan="Akun kas/bank ini akan dinonaktifkan. Riwayat transaksi tetap tersimpan."
  labelKanan="Nonaktifkan"
  warnaKanan="var(--danger)"
  onkiri={() => {}}
  onkanan={() => store.doNonaktifkanKasBank()}
/>

<ConfirmDialog
  bind:open={store.konfirmPiBuka}
  judul="Hapus data pinjaman/investasi?"
  pesan="Data ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => {}}
  onkanan={() => store.doHapusPi()}
/>
