<script lang="ts">
  import { CalendarDate, parseDate } from '@internationalized/date'
  import type { DateValue } from '@internationalized/date'
  import { Calendar } from '$lib/components/ui/calendar/index.js'
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js'

  let {
    value = $bindable(''),
    label = null,
    placeholder = 'Pilih tanggal',
    disabled = false,
  }: {
    value?: string
    label?: string | null
    placeholder?: string
    disabled?: boolean
  } = $props()

  function toDateValue(iso: string): DateValue | undefined {
    if (!iso) return undefined
    try { return parseDate(iso) } catch { return undefined }
  }

  function toIso(dv: DateValue | undefined): string {
    if (!dv) return ''
    return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`
  }

  let calValue = $state<DateValue | undefined>(toDateValue(value))

  $effect(() => { calValue = toDateValue(value) })

  function onSelect(dv: DateValue | undefined) {
    calValue = dv
    value = toIso(dv)
  }

  function formatDisplay(iso: string): string {
    if (!iso) return ''
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    } catch { return iso }
  }

  let open = $state(false)
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <span class="text-xs" style="color:var(--text-dim)">{label}</span>
  {/if}
  <Popover bind:open>
    <PopoverTrigger
      {disabled}
      class="w-full flex items-center justify-between rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-50"
      style="background:var(--bg);border-color:var(--border);color:{value ? 'var(--text)' : 'var(--text-dim)'};--tw-ring-color:var(--accent)"
    >
      <span>{value ? formatDisplay(value) : placeholder}</span>
      <span class="text-xs" style="color:var(--text-dim)">📅</span>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        type="single"
        locale="id-ID"
        value={calValue as DateValue}
        onValueChange={(dv: DateValue | undefined) => { onSelect(dv); open = false }}
      />
    </PopoverContent>
  </Popover>
</div>
