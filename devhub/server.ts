// DevHub — landing page + local dev-server control for Stokasir.
// Zero deps: uses Bun built-ins (Bun.serve, Bun.spawn). Linux/macOS dev tool.
//
//   bun run dev   ->   http://localhost:4321
//
// Boots empty; backend (:3000) and frontend (:5173) are started/stopped
// manually from the page. Stop walks the child's descendant tree (pgrep -P)
// so bun/vite/esbuild children are all killed — no orphans.

import type { Subprocess } from 'bun'
import { resolve } from 'node:path'

const PORT = 4321
const ROOT = resolve(import.meta.dir, '..')
const HTML = Bun.file(resolve(import.meta.dir, 'index.html'))

type Target = 'backend' | 'frontend' | 'omniroute'

const TARGETS: Record<Target, { port: number; cwd: string; cmd: string[] }> = {
  backend: {
    port: 3000,
    cwd: resolve(ROOT, 'backend'),
    cmd: ['bun', 'run', '--hot', 'src/index.ts'],
  },
  frontend: {
    port: 5173,
    cwd: resolve(ROOT, 'frontend'),
    cmd: ['bun', 'run', 'dev'],
  },
  // Local AI-tool router CLI (loads its own env from ~/.omniroute/.env).
  omniroute: {
    port: 20128,
    cwd: ROOT,
    cmd: ['omniroute'],
  },
}

const procs: Record<Target, Subprocess | null> = {
  backend: null,
  frontend: null,
  omniroute: null,
}

// Read git remote once at boot for the repo link on the page.
let gitRemote = ''
try {
  const out = await new Response(
    Bun.spawn(['git', 'remote', 'get-url', 'origin'], { cwd: ROOT }).stdout,
  ).text()
  gitRemote = out.trim()
} catch {
  gitRemote = ''
}

function isRunning(t: Target): boolean {
  const p = procs[t]
  return !!p && p.killed === false && p.exitCode === null
}

async function isHealthy(port: number): Promise<boolean> {
  try {
    await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(800) })
    return true
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The frontend's Vite proxy (/api -> :3000) crashes on startup if the backend
// is down. So always bring the backend up and wait until it answers before
// spawning the frontend.
async function ensureBackend(): Promise<void> {
  if (await isHealthy(TARGETS.backend.port)) return
  spawnProc('backend', false)
  for (let i = 0; i < 40; i++) {
    if (await isHealthy(TARGETS.backend.port)) return
    await sleep(500)
  }
}

async function start(t: Target, marketing: boolean): Promise<void> {
  if (isRunning(t)) return
  if (t === 'frontend') await ensureBackend()
  spawnProc(t, marketing)
}

function spawnProc(t: Target, marketing: boolean): void {
  if (isRunning(t)) return
  const { cwd, cmd } = TARGETS[t]
  const env: Record<string, string> = { ...(process.env as Record<string, string>) }
  if (t === 'frontend' && marketing) env.PUBLIC_DEPLOYMENT_MODE = 'online'

  // Spawn directly so proc.pid IS the real process (used for running/exitCode
  // detection). Child trees — bun --hot reloader, vite/esbuild — are taken down
  // on stop by walking descendants with pgrep.
  const proc = Bun.spawn(cmd, {
    cwd,
    env,
    stdout: 'inherit',
    stderr: 'inherit',
    onExit() {
      procs[t] = null
    },
  })
  procs[t] = proc
}

// All descendant pids of root (children before grandchildren), via `pgrep -P`.
function descendants(root: number): number[] {
  const out: number[] = []
  const stack = [root]
  while (stack.length) {
    const p = stack.pop() as number
    const res = Bun.spawnSync(['pgrep', '-P', String(p)])
    for (const k of res.stdout.toString().trim().split('\n').filter(Boolean).map(Number)) {
      out.push(k)
      stack.push(k)
    }
  }
  return out
}

function stop(t: Target): void {
  const proc = procs[t]
  if (!proc) return
  // Collect the whole tree BEFORE killing — once we signal, reparenting could
  // orphan descendants. Kill deepest-first (root last).
  const pids = [...descendants(proc.pid).reverse(), proc.pid]
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // ESRCH: already gone. Ignore.
    }
  }
  procs[t] = null
}

async function svcStatus(t: Target) {
  const healthy = isRunning(t) ? await isHealthy(TARGETS[t].port) : false
  return { running: isRunning(t), healthy, port: TARGETS[t].port }
}

async function status() {
  const [backend, frontend, omniroute] = await Promise.all([
    svcStatus('backend'),
    svcStatus('frontend'),
    svcStatus('omniroute'),
  ])
  return { gitRemote, backend, frontend, omniroute }
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  })
}

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/') return new Response(HTML)

    if (url.pathname === '/api/status') return json(await status())

    if (url.pathname === '/api/start' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { target?: Target; marketing?: boolean }
      if (body.target && body.target in TARGETS) await start(body.target, !!body.marketing)
      return json(await status())
    }

    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { target?: Target }
      if (body.target && body.target in TARGETS) stop(body.target)
      return json(await status())
    }

    return new Response('Not found', { status: 404 })
  },
})

// Never orphan children: stop both when devhub itself dies.
function shutdown() {
  stop('backend')
  stop('frontend')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log(`\n  DevHub  ->  http://localhost:${PORT}  (LAN: http://0.0.0.0:${PORT})\n`)
