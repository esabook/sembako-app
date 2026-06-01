<script lang="ts">
  import { rp, rpFull, hariDariToday } from './dashboard.logic'
  import type { DashboardData, StokPrediktif } from './dashboard.types'

  let { data, stokPrediktif }: { data: DashboardData; stokPrediktif: StokPrediktif[] } = $props()

  // Dipindah dari @const di template agar tidak hitung ulang tiap render
  const prediktifBaru = $derived(
    stokPrediktif.filter(p => !data.stok_kritis.some(k => k.id === p.id))
  )
  const maxOmset = $derived(data.top_barang[0]?.total_omset ?? 1)
</script>

<div class="flex flex-col gap-5">

  <!-- ── ALERT ZONE ────────────────────────────────────────────────────────── -->
  {#if data.stok_kritis.length > 0 || data.piutang_macet.list.length > 0 || data.belum_absen.length > 0 || stokPrediktif.length > 0}
    <div class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--danger)">Alert</h3>
      <div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">

        {#if data.stok_kritis.length > 0}
          <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--danger)">
            <p class="text-xs font-bold mb-2" style="color:var(--danger)">STOK KRITIS — {data.stok_kritis.length} item</p>
            {#each data.stok_kritis.slice(0, 4) as item (item.id)}
              <div class="flex justify-between text-xs py-0.5">
                <span class="truncate mr-2" style="max-width:170px">{item.nama_barang}</span>
                <span class="font-bold shrink-0" style="color:{item.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--warn)'}">
                  {item.stok_sekarang <= 0 ? 'HABIS' : item.stok_sekarang}
                </span>
              </div>
            {/each}
            {#if data.stok_kritis.length > 4}
              <p class="text-xs mt-1" style="color:var(--text-dim)">+{data.stok_kritis.length - 4} lainnya →
                <a href="/gudang" style="color:var(--info)">Lihat stok</a>
              </p>
            {/if}
          </div>
        {/if}

        {#if prediktifBaru.length > 0}
            <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--info)">
              <p class="text-xs font-bold mb-2" style="color:var(--info)">
                PREDIKSI HABIS ≤7 HARI — {prediktifBaru.length} item
              </p>
              {#each prediktifBaru.slice(0, 5) as item (item.id)}
                <div class="flex justify-between text-xs py-0.5 gap-2">
                  <span class="truncate" style="max-width:150px">{item.nama_barang}</span>
                  <span class="shrink-0 font-bold tabular-nums"
                    style="color:{item.hari_tersisa <= 2 ? 'var(--danger)' : item.hari_tersisa <= 4 ? 'var(--warn)' : 'var(--info)'}">
                    ~{item.hari_tersisa}h
                  </span>
                </div>
              {/each}
              {#if prediktifBaru.length > 5}
                <p class="text-xs mt-1" style="color:var(--text-dim)">
                  +{prediktifBaru.length - 5} lainnya →
                  <a href="/gudang" style="color:var(--info)">Lihat stok</a>
                </p>
              {/if}
            </div>
        {/if}

        {#if data.piutang_macet.list.length > 0}
          <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--warn)">
            <p class="text-xs font-bold mb-2" style="color:var(--warn)">PIUTANG MACET — {rpFull(data.piutang_macet.total)}</p>
            {#each data.piutang_macet.list.slice(0, 4) as item (item.id)}
              <div class="flex justify-between text-xs py-0.5">
                <span class="truncate mr-2" style="max-width:170px">{item.nama_pelanggan}</span>
                <span class="font-bold shrink-0" style="color:var(--warn)">{rp(item.sisa_piutang)}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if data.belum_absen.length > 0}
          <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--border)">
            <p class="text-xs font-bold mb-2" style="color:var(--text-dim)">BELUM ABSEN — {data.belum_absen.length} karyawan</p>
            {#each data.belum_absen.slice(0, 4) as k (k.id)}
              <div class="flex gap-2 text-xs py-0.5">
                <span>{k.nama}</span>
                <span style="color:var(--text-dim)">{k.role}</span>
              </div>
            {/each}
          </div>
        {/if}

      </div>
    </div>
  {:else}
    <div class="text-xs px-3 py-2 rounded border" style="border-color:var(--accent);color:var(--accent);background:var(--surface)">
      ✓ Tidak ada alert — semua aman hari ini
    </div>
  {/if}

  <!-- ── BOTTOM: Top Barang + Hutang JT ────────────────────────────────────── -->
  <div class="grid gap-4" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">

    <div class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Top Barang (30 hari)</h3>
      <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
        {#if data.top_barang.length === 0}
          <p class="text-xs p-4" style="color:var(--text-dim)">Belum ada data</p>
        {:else}
          {#each data.top_barang as item, i (item.barang_id)}
            <div class="px-3 py-2 {i > 0 ? 'border-t' : ''}" style="border-color:var(--border)">
              <div class="flex justify-between items-center text-xs mb-1">
                <span class="font-medium truncate mr-2" style="max-width:160px">
                  <span style="color:var(--text-dim)" class="mr-1">#{i + 1}</span>{item.nama_barang}
                </span>
                <span class="shrink-0" style="color:var(--accent)">{rp(item.total_omset)}</span>
              </div>
              <div class="h-1 rounded-full" style="background:var(--surface2)">
                <div class="h-1 rounded-full" style="background:var(--accent);width:{(item.total_omset / maxOmset) * 100}%"></div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Hutang Jatuh Tempo (7 hari)</h3>
      <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
        {#if data.hutang_jatuh_tempo.list.length === 0}
          <p class="text-xs p-4" style="color:var(--accent)">✓ Tidak ada hutang jatuh tempo minggu ini</p>
        {:else}
          {#each data.hutang_jatuh_tempo.list as item (item.id)}
            {@const hari = hariDariToday(item.tanggal_jatuh_tempo ?? '')}
            <div class="px-3 py-2 border-b last:border-0 flex justify-between items-start text-xs"
              style="border-color:var(--border)">
              <div>
                <p class="font-medium">{item.nama_supplier}</p>
                <p style="color:var(--text-dim)">{item.tanggal_jatuh_tempo}
                  ({hari === 0 ? 'hari ini' : hari === 1 ? 'besok' : `${hari} hari`})</p>
              </div>
              <span class="font-bold ml-2 shrink-0" style="color:{hari <= 1 ? 'var(--danger)' : 'var(--warn)'}">
                {rp(item.sisa_hutang)}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    {#if data.piutang_macet.list.length > 0}
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Piutang Macet</h3>
        <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
          {#each data.piutang_macet.list as item (item.id)}
            {@const hari = Math.abs(hariDariToday(item.tanggal_jatuh_tempo ?? ''))}
            <div class="px-3 py-2 border-b last:border-0 flex justify-between items-start text-xs"
              style="border-color:var(--border)">
              <div>
                <p class="font-medium">{item.nama_pelanggan}</p>
                <p style="color:var(--danger)">lewat {hari} hari</p>
              </div>
              <span class="font-bold ml-2 shrink-0" style="color:var(--danger)">{rp(item.sisa_piutang)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  </div>

</div>
