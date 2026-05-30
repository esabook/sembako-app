<script lang="ts">
  import { api } from '$lib/utils/api.js'
  import { toast } from '$lib/stores/ui.store.js'
  import { rupiah } from './kasir.logic.js'

  type ShiftAktif = {
    id: number; tanggal: string; jam_buka: string; kas_awal: number;
    jumlah_transaksi: number; total_penjualan: number; status: string;
  }

  let {
    open = $bindable(false),
    onberhasil,
  }: {
    open?: boolean;
    onberhasil?: (shift: ShiftAktif) => void;
  } = $props()

  let kasAwal       = $state(0)
  let catatan       = $state('')
  let saving        = $state(false)

  $effect(() => {
    if (open) { kasAwal = 0; catatan = '' }
  })

  function focusEl(el: HTMLElement) { el.focus() }

  async function simpan() {
    saving = true
    const res = await api.post<ShiftAktif>('/shift/buka', {
      kas_awal: kasAwal,
      catatan: catatan || undefined,
    })
    saving = false
    if (!res.success) { toast.error(res.error ?? 'Gagal buka shift'); return }
    toast.sukses('Shift dibuka')
    open = false
    onberhasil?.(res.data!)
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    style="background:rgba(0,0,0,0.6)"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === 'Escape') open = false
      if (e.key === 'Enter' && !saving) void simpan()
    }}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl border overflow-hidden flex flex-col"
      style="background:var(--surface);border-color:var(--border);max-height:90svh"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- drag handle (mobile) -->
      <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
        <div class="w-10 h-1 rounded-full" style="background:var(--border)"></div>
      </div>
      <div class="overflow-y-auto flex-1 px-4 sm:px-6 pt-4 pb-2">
      <h2 class="mb-1 text-base font-bold">Buka Shift</h2>
      <p class="mb-4 text-xs" style="color:var(--text-dim)">
        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
        · {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div class="flex flex-col gap-3">
        <div>
          <label for="kas-awal" class="mb-1 block text-xs" style="color:var(--text-dim)">
            Kas Awal (uang di laci)
          </label>
          <input
            id="kas-awal"
            type="number"
            min="0"
            step="1000"
            bind:value={kasAwal}
            use:focusEl
            class="w-full rounded border px-3 py-2 text-sm outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)"
          />
          <div class="mt-1.5 flex gap-1 overflow-x-auto pb-0.5" style="scrollbar-width:none">
            {#each [0, 50000, 100000, 200000, 500000, 1000000,1500000,2000000] as nom (nom)}
              <button
                type="button"
                onclick={() => kasAwal = nom}
                class="rounded border px-2 py-0.5 text-xs transition-colors"
                style={kasAwal === nom
                  ? 'border-color:var(--accent);color:var(--accent)'
                  : 'border-color:var(--border);color:var(--text-dim)'}
              >
                {nom === 0 ? 'Rp0' : nom >= 1000000 ? (nom / 1000000) + 'jt' : (nom / 1000) + 'rb'}
              </button>
            {/each}
          </div>
          {#if kasAwal > 0}
            <p class="mt-1 rounded-lg border px-3 py-2 text-center font-mono text-lg"
              style="color:var(--accent);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)">
              {rupiah(kasAwal)}
            </p>
          {/if}
        </div>

        <div>
          <label for="catatan-buka" class="mb-1 block text-xs" style="color:var(--text-dim)">
            Catatan (opsional)
          </label>
          <textarea
            id="catatan-buka"
            bind:value={catatan}
            placeholder="..."
            class="w-full rounded border px-3 py-2 text-sm outline-none resize-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text);max-height:calc(4*1.5rem + 1rem)"
          ></textarea>
        </div>
      </div>

      </div><!-- end scroll -->

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t shrink-0"
        style="border-color:var(--border)">
        <button
          onclick={() => open = false}
          class="w-full sm:w-auto rounded border px-4 py-2 text-sm"
          style="border-color:var(--border);color:var(--text-dim)">Batal</button>
        <button
          onclick={simpan}
          disabled={saving}
          class="w-full sm:w-auto rounded px-4 py-2 text-sm font-bold disabled:opacity-60"
          style="background:var(--accent);color:var(--bg)">
          {saving ? 'Menyimpan...' : 'Buka Shift'}
        </button>
      </div>
    </div>
  </div>
{/if}
