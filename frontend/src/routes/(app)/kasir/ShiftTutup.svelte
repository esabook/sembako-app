<script lang="ts">
  import { api } from '$lib/utils/api.js'
  import { toast } from '$lib/stores/ui.store.js'
  import { rupiah } from './kasir.logic.js'

  type ShiftAktif = {
    id: number; tanggal: string; jam_buka: string; kas_awal: number;
    jumlah_transaksi: number; total_penjualan: number; status: string;
  }

  type RekapShift = {
    shift_id: number; jam_buka: string; kas_awal: number; kas_sistem: number;
    jumlah_transaksi: number; total_semua: number;
    tunai: number; transfer: number; qris: number; hutang: number;
  }

  let {
    open = $bindable(false),
    shiftAktif,
    onberhasil,
  }: {
    open?: boolean;
    shiftAktif: ShiftAktif | null;
    onberhasil?: () => void;
  } = $props()

  let kasFisik      = $state(0)
  let catatan       = $state('')
  let saving        = $state(false)
  let rekapShift    = $state<RekapShift | null>(null)
  let loadingRekap  = $state(false)

  const selisihKas  = $derived(rekapShift ? kasFisik - rekapShift.kas_sistem : 0)

  $effect(() => {
    if (open && shiftAktif) {
      kasFisik = 0; catatan = ''; rekapShift = null
      loadingRekap = true
      api.get<RekapShift>('/shift/rekap-aktif').then((res) => {
        loadingRekap = false
        if (res.success) rekapShift = res.data
      })
    }
  })

  function focusEl(el: HTMLElement) { el.focus() }

  async function simpan() {
    saving = true
    const res = await api.post('/shift/tutup', {
      kas_fisik: kasFisik,
      catatan: catatan || undefined,
    })
    saving = false
    if (!res.success) { toast.error(res.error ?? 'Gagal tutup shift'); return }
    toast.sukses('Shift ditutup')
    open = false
    onberhasil?.()
  }
</script>

{#if open && shiftAktif}
  <!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background:rgba(0,0,0,0.6)"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => { if (e.key === 'Escape') open = false }}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="w-[26rem] rounded-lg border p-6"
      style="background:var(--surface);border-color:var(--border)"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h2 class="mb-1 text-base font-bold">Tutup Shift</h2>
      <p class="mb-4 text-xs" style="color:var(--text-dim)">
        Dibuka {shiftAktif.jam_buka} ·
        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {#if loadingRekap}
        <div class="flex items-center justify-center py-8" style="color:var(--text-dim)">
          <span class="text-sm">Memuat rekap...</span>
        </div>
      {:else if rekapShift}
        <div class="flex flex-col gap-3">
          <!-- Rekap transaksi per metode -->
          <div class="rounded border text-xs" style="background:var(--surface2);border-color:var(--border)">
            <div class="border-b px-3 py-2 font-bold" style="border-color:var(--border);color:var(--text-dim)">
              REKAP TRANSAKSI
            </div>
            <table class="w-full">
              <tbody>
                {#if rekapShift.tunai > 0}
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="px-3 py-1.5" style="color:var(--text-dim)">Tunai</td>
                    <td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.tunai)}</td>
                  </tr>
                {/if}
                {#if rekapShift.transfer > 0}
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="px-3 py-1.5" style="color:var(--text-dim)">Transfer</td>
                    <td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.transfer)}</td>
                  </tr>
                {/if}
                {#if rekapShift.qris > 0}
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="px-3 py-1.5" style="color:var(--text-dim)">QRIS</td>
                    <td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.qris)}</td>
                  </tr>
                {/if}
                {#if rekapShift.hutang > 0}
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="px-3 py-1.5" style="color:var(--text-dim)">Hutang</td>
                    <td class="px-3 py-1.5 text-right font-mono">{rupiah(rekapShift.hutang)}</td>
                  </tr>
                {/if}
                {#if rekapShift.jumlah_transaksi === 0}
                  <tr>
                    <td colspan="2" class="px-3 py-2 text-center text-xs" style="color:var(--text-dim)">
                      Belum ada transaksi
                    </td>
                  </tr>
                {:else}
                  <tr>
                    <td class="px-3 py-1.5 font-bold">Total · {rekapShift.jumlah_transaksi} trx</td>
                    <td class="px-3 py-1.5 text-right font-mono font-bold" style="color:var(--accent)">
                      {rupiah(rekapShift.total_semua)}
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>

          <!-- Rekonsiliasi kas -->
          <div class="rounded border text-xs" style="background:var(--surface2);border-color:var(--border)">
            <div class="border-b px-3 py-2 font-bold" style="border-color:var(--border);color:var(--text-dim)">
              REKONSILIASI KAS
            </div>
            <div class="px-3 py-2 space-y-1">
              <div class="flex justify-between">
                <span style="color:var(--text-dim)">Kas Awal</span>
                <span class="font-mono">{rupiah(rekapShift.kas_awal)}</span>
              </div>
              <div class="flex justify-between">
                <span style="color:var(--text-dim)">+ Penjualan Tunai</span>
                <span class="font-mono" style="color:var(--accent)">+{rupiah(rekapShift.tunai)}</span>
              </div>
              <div class="flex justify-between border-t pt-1 font-bold" style="border-color:var(--border)">
                <span>= Kas Seharusnya</span>
                <span class="font-mono">{rupiah(rekapShift.kas_sistem)}</span>
              </div>
            </div>
          </div>

          <!-- Input kas fisik -->
          <div>
            <label for="kas-fisik" class="mb-1 block text-xs" style="color:var(--text-dim)">
              Kas Fisik (hitung uang di laci)
            </label>
            <input
              id="kas-fisik"
              type="number"
              min="0"
              step="1000"
              bind:value={kasFisik}
              use:focusEl
              class="w-full rounded border px-3 py-2 text-sm outline-none"
              style="background:var(--surface2);border-color:var(--border);color:var(--text)"
            />
            <div class="mt-1.5 flex flex-wrap gap-1">
              {#each [0, 50000, 100000, 200000, 500000, 1000000] as nom (nom)}
                <button
                  type="button"
                  onclick={() => kasFisik = nom}
                  class="rounded border px-2 py-0.5 text-xs transition-colors"
                  style={kasFisik === nom
                    ? 'border-color:var(--accent);color:var(--accent)'
                    : 'border-color:var(--border);color:var(--text-dim)'}
                >
                  {nom === 0 ? 'Rp 0' : nom >= 1000000 ? '1jt' : nom / 1000 + 'rb'}
                </button>
              {/each}
              <button
                type="button"
                onclick={() => kasFisik = rekapShift!.kas_sistem}
                class="rounded border px-2 py-0.5 text-xs transition-colors"
                style={kasFisik === rekapShift.kas_sistem
                  ? 'border-color:var(--accent);color:var(--accent)'
                  : 'border-color:var(--border);color:var(--text-dim)'}
              >
                = Sistem
              </button>
            </div>

            {#if kasFisik > 0 || selisihKas !== 0}
              <div class="mt-2 rounded border px-3 py-2 text-xs font-mono" style={
                selisihKas === 0
                  ? 'border-color:var(--accent);color:var(--accent);background:var(--surface2)'
                  : Math.abs(selisihKas) > 50000
                    ? 'border-color:var(--danger);color:var(--danger);background:var(--surface2)'
                    : 'border-color:var(--warn);color:var(--warn);background:var(--surface2)'
              }>
                {#if selisihKas === 0}
                  ✓ SESUAI — kas cocok dengan sistem
                {:else if selisihKas > 0}
                  + {rupiah(selisihKas)} lebih dari sistem
                {:else}
                  − {rupiah(Math.abs(selisihKas))} kurang dari sistem
                {/if}
              </div>
            {/if}

            {#if Math.abs(selisihKas) > 50000}
              <p class="mt-1 text-xs" style="color:var(--danger)">
                Selisih besar — pastikan hitungan benar sebelum tutup
              </p>
            {/if}
          </div>

          <!-- Catatan -->
          <div>
            <label for="catatan-tutup" class="mb-1 block text-xs" style="color:var(--text-dim)">
              Catatan (opsional)
            </label>
            <input
              id="catatan-tutup"
              type="text"
              bind:value={catatan}
              placeholder="..."
              class="w-full rounded border px-3 py-2 text-sm outline-none"
              style="background:var(--surface2);border-color:var(--border);color:var(--text)"
            />
          </div>
        </div>
      {/if}

      <div class="mt-5 flex justify-end gap-2">
        <button
          onclick={() => open = false}
          class="rounded border px-4 py-1.5 text-sm"
          style="border-color:var(--border);color:var(--text-dim)">Batal</button>
        <button
          onclick={simpan}
          disabled={saving || loadingRekap}
          class="rounded px-4 py-1.5 text-sm font-bold disabled:opacity-60"
          style="background:var(--warn);color:var(--bg)">
          {saving ? 'Menyimpan...' : 'Tutup Shift'}
        </button>
      </div>
    </div>
  </div>
{/if}
