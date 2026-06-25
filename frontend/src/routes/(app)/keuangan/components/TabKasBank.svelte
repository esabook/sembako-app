<script lang="ts">
  import Skeleton from '$lib/components/ui/Skeleton.svelte'
  import { fmt } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.loading}
  <div style="display:grid; gap:.75rem">
    {#each [0, 1, 2] as i (i)}
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.9rem 1rem; display:flex; flex-direction:column; gap:.5rem">
        <div style="display:flex; justify-content:space-between">
          <Skeleton w="40%" h="0.875rem" />
          <Skeleton w="15%" h="0.875rem" br="rounded-full" />
        </div>
        <Skeleton w="55%" h="1.25rem" />
        <Skeleton w="30%" h="0.7rem" />
      </div>
    {/each}
  </div>
{:else if store.kasBankSaldo.length === 0}
  <p style="color:var(--text-dim); font-size:.85rem">Belum ada akun kas/bank.</p>
{:else}
  <div style="display:grid; gap:.75rem; margin-bottom:1rem">
    {#each store.kasBankSaldo as kb (kb.id)}
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.9rem 1rem">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.2rem">
              <span style="font-weight:700; color:var(--text)">{kb.nama}</span>
              <span style="font-size:.65rem; padding:.1rem .4rem; background:var(--surface2); border:1px solid var(--border); border-radius:3px; color:var(--text-dim); text-transform:uppercase">{kb.tipe}</span>
            </div>
            <div style="font-size:.75rem; color:var(--text-dim)">Saldo awal: Rp {fmt(kb.saldo_awal)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.1rem; font-weight:700; color:var(--info)">Rp {fmt(kb.saldo)}</div>
            <div style="font-size:.7rem; color:var(--text-dim); margin-top:.15rem">saldo saat ini</div>
          </div>
        </div>
        <div style="display:flex; gap:.75rem; margin-top:.75rem; padding-top:.6rem; border-top:1px solid var(--border)">
          <div style="font-size:.75rem">
            <span style="color:var(--text-dim)">Masuk: </span>
            <span style="color:var(--accent); font-weight:600">+Rp {fmt(kb.total_masuk)}</span>
          </div>
          <div style="font-size:.75rem">
            <span style="color:var(--text-dim)">Keluar: </span>
            <span style="color:var(--danger); font-weight:600">-Rp {fmt(kb.total_keluar)}</span>
          </div>
          <div style="margin-left:auto; display:flex; gap:.5rem">
            <button
              onclick={() => store.bukaEditKasBank(kb)}
              style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:3px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
            >Edit</button>
            <button
              onclick={() => store.nonaktifkanKasBank(kb.id)}
              style="padding:.25rem .6rem; background:transparent; border:1px solid var(--danger); border-radius:3px; color:var(--danger); font-family:inherit; font-size:.72rem; cursor:pointer"
            >Nonaktifkan</button>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Total footer -->
  <div style="background:var(--surface2); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem; display:flex; justify-content:space-between; align-items:center">
    <span style="font-size:.8rem; color:var(--text-dim); font-weight:600">TOTAL SEMUA AKUN</span>
    <span style="font-size:1.1rem; font-weight:700; color:var(--info)">Rp {fmt(store.totalSaldo)}</span>
  </div>
{/if}
