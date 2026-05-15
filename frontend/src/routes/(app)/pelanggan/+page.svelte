<script lang="ts">
  import { goto } from '$app/navigation'
  import { user } from '$lib/stores/auth.js'
  import TabPelanggan from './TabPelanggan.svelte'
  import TabKartu from './TabKartu.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir')
  })

  type Tab = 'pelanggan' | 'kartu'
  let tab = $state<Tab>('pelanggan')

  let tabKartuRef = $state<{ muat: () => void } | null>(null)

  function gantiTab(t: Tab) {
    tab = t
    if (t === 'kartu') tabKartuRef?.muat()
  }

  let modalHelpOpen = $state(false)
</script>

<div class="space-y-4">
  <!-- Header + Tabs -->
  <div class="flex items-center gap-3 flex-wrap">
    <h1 class="text-lg font-bold tracking-wide" style="color:var(--text)">PELANGGAN</h1>
    <div class="flex gap-1 border rounded overflow-hidden" style="border-color:var(--border)">
        {#each [['pelanggan', 'Pelanggan'], ['kartu', 'Kartu Anggota']] as [val, label] (val)}
        <button
          onclick={() => gantiTab(val as Tab)}
          class="px-3 py-1.5 text-sm transition-colors"
          style="{tab === val ? 'background:var(--accent);color:var(--bg);font-weight:600' : 'color:var(--text-dim)'}"
        >{label}</button>
      {/each}
    </div>
  </div>

  {#if tab === 'pelanggan'}
    <TabPelanggan />
  {:else}
    <TabKartu bind:this={tabKartuRef} />
  {/if}
</div>

<!-- Help (fixed bottom-right) -->
<button
  onclick={() => (modalHelpOpen = true)}
  class="fixed bottom-5 right-5 w-10 h-10 rounded-full text-sm font-bold shadow-lg z-40 flex items-center justify-center"
  style="background:var(--surface2);border:1px solid var(--border);color:var(--text-dim)"
  title="Panduan modul Pelanggan & Kartu Anggota"
>?</button>

{#if modalHelpOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onclick={(e) => { if (e.target === e.currentTarget) modalHelpOpen = false }}
    style="background:rgba(0,0,0,0.5)">
    <div class="rounded-lg border max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 space-y-4 text-sm"
      style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <p class="font-bold text-base" style="color:var(--accent)">Panduan — Pelanggan & Kartu Anggota</p>

      <section>
        <p class="font-bold mb-1" style="color:var(--accent)">Tab Pelanggan</p>
        <ul class="space-y-1 text-xs" style="color:var(--text-dim)">
          <li>· Kelola data pelanggan: tambah, edit, nonaktifkan.</li>
          <li>· Kode pelanggan otomatis kapital semua huruf.</li>
          <li>· Pencarian bisa pakai nama, kode, nomor HP, atau nomor kartu anggota.</li>
          <li>· Tombol <strong style="color:var(--accent)">+ Kartu</strong>: ketik min. 3 digit nomor kartu untuk mencari kartu yang tersedia.</li>
          <li>· Tombol <strong style="color:var(--danger)">Lepas Kartu</strong> melepas kartu dari pelanggan; kartu kembali tersedia.</li>
          <li>· Simbol ♂ / ♀ menandakan jenis kelamin pelanggan.</li>
        </ul>
      </section>

      <section>
        <p class="font-bold mb-1" style="color:var(--accent)">Tab Kartu Anggota</p>
        <ul class="space-y-1 text-xs" style="color:var(--text-dim)">
          <li>· Kartu adalah entitas mandiri — generate dulu, assign ke pelanggan belakangan.</li>
          <li>· Tombol <strong style="color:var(--accent)">+ Generate Kartu</strong> membuat satu atau banyak kartu sekaligus (maks. 50).</li>
          <li>· Nomor kartu 10 digit, unik, digenerate secara acak.</li>
          <li>· Status kartu: <strong style="color:var(--accent)">Tersedia</strong> (belum di-assign) atau terikat ke pelanggan.</li>
          <li>· Tombol <strong style="color:var(--warn)">Lepas</strong> melepas kartu dari pelanggan tanpa menghapus data poin.</li>
          <li>· Tombol <strong style="color:var(--danger)">Nonaktif</strong> menonaktifkan kartu permanen.</li>
        </ul>
      </section>

      <section>
        <p class="font-bold mb-1" style="color:var(--accent)">Tier & Diskon Member</p>
        <ul class="space-y-1 text-xs" style="color:var(--text-dim)">
          <li>· <strong style="color:var(--text-dim)">Reguler</strong> — member baru.</li>
          <li>· <strong style="color:#b0b8c1">Silver</strong> — member aktif.</li>
          <li>· <strong style="color:#f5c518">Gold</strong> — member loyal.</li>
          <li>· Diskon member diterapkan otomatis di kasir saat pelanggan dipilih.</li>
        </ul>
      </section>

      <div class="flex justify-end pt-1">
        <button onclick={() => (modalHelpOpen = false)} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Tutup</button>
      </div>
    </div>
  </div>
{/if}
