<svelte:head><title>Dashboard — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import TabBar from '$lib/components/ui/TabBar.svelte'
  import { createDashboardStore } from './dashboard.store.svelte'
  import DashboardOverview from './DashboardOverview.svelte'
  import DashboardSalesSummary from './DashboardSalesSummary.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  const store = createDashboardStore()
  onMount(() => store.muat())

  const TABS = [
    { key: 'overview',      label: 'Overview' },
    { key: 'sales-summary', label: 'Sales Summary' },
  ]
  const activeTab = $derived(page.url.searchParams.get('tab') ?? 'overview')
</script>

{#if store.loading}
  <div class="flex items-center justify-center h-40 text-sm" style="color:var(--text-dim)">Memuat dashboard...</div>
{:else if store.data}
  <div class="flex flex-col gap-5">

    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold">Dashboard</h2>
        <p class="text-xs mt-0.5" style="color:var(--text-dim)">
          Selamat datang, <strong>{$user?.nama}</strong> —
          {new Date(store.data.today + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>
      <button onclick={() => window.location.reload()}
        class="text-xs px-2 py-1 rounded border"
        style="border-color:var(--border);color:var(--text-dim)">Refresh</button>
    </div>

    <TabBar
      tabs={TABS}
      active={activeTab}
      storageKey="dashboard"
      onchange={(key) => goto(`?tab=${key}`, { replaceState: true })}
    />

    {#if activeTab === 'overview'}
      <DashboardOverview data={store.data} stokPrediktif={store.stokPrediktif} />
    {:else if activeTab === 'sales-summary'}
      <DashboardSalesSummary data={store.data} />
    {/if}

  </div>
{:else}
  <p class="text-sm" style="color:var(--danger)">Gagal memuat data dashboard.</p>
{/if}
