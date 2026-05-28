<script lang="ts">
  import { onMount } from 'svelte'

  type Phase = 'idle' | 'loading' | 'confirm' | 'success' | 'error'
  type StatusHariIni = 'belum' | 'masuk' | 'selesai'

  let phase       = $state<Phase>('idle')
  let digits      = $state('')
  let karyawan    = $state<{ id: number; nama: string; status_hari_ini: StatusHariIni } | null>(null)
  let pesan       = $state('')
  let jam         = $state('')
  let tgl         = $state('')
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  function updateClock() {
    const now = new Date()
    jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  onMount(() => {
    updateClock()
    const id = setInterval(updateClock, 1000)
    return () => clearInterval(id)
  })

  function tapDigit(d: string) {
    if (phase !== 'idle') return
    if (digits.length >= 4) return
    digits += d
    if (digits.length === 4) autoSubmit()
  }

  function tapBackspace() {
    if (phase !== 'idle') return
    digits = digits.slice(0, -1)
  }

  function reset() {
    if (resetTimer) clearTimeout(resetTimer)
    phase = 'idle'
    karyawan = null
    digits = ''
    pesan = ''
  }

  function scheduleReset(ms: number) {
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(reset, ms)
  }

  async function autoSubmit() {
    phase = 'loading'
    try {
      const res = await fetch('/api/absensi-kiosk/check-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: digits }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'PIN tidak valid')
      karyawan = json.data
      digits = ''
      phase = 'confirm'
    } catch (e) {
      pesan = e instanceof Error ? e.message : 'Terjadi kesalahan'
      digits = ''
      phase = 'error'
      scheduleReset(2500)
    }
  }

  async function doMasuk() {
    if (!karyawan) return
    phase = 'loading'
    try {
      const res = await fetch('/api/absensi-kiosk/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ karyawan_id: karyawan.id }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      pesan = `Selamat datang, ${karyawan.nama}!`
      phase = 'success'
      scheduleReset(4000)
    } catch (e) {
      pesan = e instanceof Error ? e.message : 'Gagal clock in'
      phase = 'error'
      scheduleReset(2500)
    }
  }

  async function doPulang() {
    if (!karyawan) return
    phase = 'loading'
    try {
      const res = await fetch('/api/absensi-kiosk/pulang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ karyawan_id: karyawan.id }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      pesan = `Sampai jumpa, ${karyawan.nama}!`
      phase = 'success'
      scheduleReset(4000)
    } catch (e) {
      pesan = e instanceof Error ? e.message : 'Gagal clock out'
      phase = 'error'
      scheduleReset(2500)
    }
  }

  const pinSlots = $derived(Array.from({ length: 4 }, (_, i) => i < digits.length ? '●' : '○'))
</script>

<svelte:window onkeydown={(e) => {
  if (e.key >= '0' && e.key <= '9') tapDigit(e.key)
  else if (e.key === 'Backspace') tapBackspace()
  else if (e.key === 'Escape') reset()
}} />

<div class="min-h-screen flex" style="background:var(--bg);color:var(--text);font-family:'JetBrains Mono',monospace">

  <!-- Kolom kiri: jam & tanggal -->
  <div class="flex flex-col items-center justify-center flex-1 gap-3 p-8 border-r"
    style="border-color:var(--border)">
    <div class="text-6xl font-bold tracking-widest" style="color:var(--accent)">{jam}</div>
    <div class="text-sm capitalize" style="color:var(--text-dim)">{tgl}</div>
    <div class="mt-8 text-lg font-bold tracking-wider" style="color:var(--text-dim)">ABSENSI KARYAWAN</div>
    <div class="text-xs text-center max-w-48" style="color:var(--text-dim)">
      Masukkan PIN 4 digit untuk clock in / clock out
    </div>
  </div>

  <!-- Kolom kanan: numpad / konfirmasi / feedback -->
  <div class="flex flex-col items-center justify-center flex-1 p-8 gap-6">

    {#if phase === 'idle' || phase === 'loading'}
      <!-- Slot PIN -->
      <div class="flex gap-4 mb-2">
        {#each pinSlots as slot}
          <span class="text-4xl font-bold" style="color:{slot === '●' ? 'var(--accent)' : 'var(--border)'}">{slot}</span>
        {/each}
      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-3">
        {#each ['1','2','3','4','5','6','7','8','9','','0','⌫'] as key}
          {#if key === ''}
            <div></div>
          {:else}
            <button
              onclick={() => key === '⌫' ? tapBackspace() : tapDigit(key)}
              disabled={phase === 'loading'}
              class="flex items-center justify-center rounded-xl font-bold text-2xl transition-all active:scale-95"
              style="width:80px;height:80px;background:var(--surface);border:1px solid var(--border);color:var(--text);{phase==='loading'?'opacity:.5':''}"
            >{key}</button>
          {/if}
        {/each}
      </div>
      {#if phase === 'loading'}
        <p class="text-sm animate-pulse" style="color:var(--text-dim)">Memverifikasi...</p>
      {/if}

    {:else if phase === 'confirm'}
      <!-- Card konfirmasi -->
      <div class="flex flex-col items-center gap-4 p-6 rounded-2xl border w-full max-w-xs text-center"
        style="background:var(--surface);border-color:var(--border)">
        <div class="rounded-full flex items-center justify-center font-bold text-2xl"
          style="width:72px;height:72px;background:var(--surface2);color:var(--accent)">
          {karyawan?.nama.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div class="text-xl font-bold">{karyawan?.nama}</div>
        <div class="text-xs" style="color:var(--text-dim)">
          {#if karyawan?.status_hari_ini === 'belum'}
            Belum absen hari ini
          {:else if karyawan?.status_hari_ini === 'masuk'}
            Sudah masuk — siap pulang
          {:else}
            Sudah selesai hari ini
          {/if}
        </div>
      </div>

      <div class="flex gap-3 w-full max-w-xs">
        {#if karyawan?.status_hari_ini === 'belum'}
          <button onclick={doMasuk}
            class="flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
            style="background:var(--accent);color:var(--bg)">MASUK</button>
        {:else if karyawan?.status_hari_ini === 'masuk'}
          <button onclick={doPulang}
            class="flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
            style="background:var(--warn);color:var(--bg)">PULANG</button>
        {:else}
          <div class="flex-1 py-4 rounded-xl font-bold text-sm text-center"
            style="background:var(--surface2);color:var(--text-dim)">Sudah selesai</div>
        {/if}
        <button onclick={reset}
          class="px-4 py-4 rounded-xl text-sm"
          style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim)">Batal</button>
      </div>

    {:else if phase === 'success'}
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="text-6xl">✓</div>
        <div class="text-xl font-bold" style="color:var(--accent)">{pesan}</div>
        <div class="text-xs" style="color:var(--text-dim)">Layar akan reset otomatis...</div>
      </div>

    {:else if phase === 'error'}
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="text-6xl">✗</div>
        <div class="text-xl font-bold" style="color:var(--danger)">{pesan}</div>
        <div class="text-xs" style="color:var(--text-dim)">Coba lagi sebentar...</div>
      </div>
    {/if}

  </div>
</div>
