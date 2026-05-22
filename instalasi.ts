#!/usr/bin/env bun
// instalasi.ts — Stokasir Installer Server
// Jalankan: bun instalasi.ts  (atau double-click instal.command / instal.bat)
import { join, resolve, dirname } from 'path'
import * as fs from 'fs'
import * as os from 'os'

const ROOT   = resolve(import.meta.dir)
const PORT   = 7777

type OS = 'mac' | 'linux' | 'windows'
type SSEEvent =
  | { type: 'step';      step: number; name: string }
  | { type: 'step-done'; step: number }
  | { type: 'log';       text: string }
  | { type: 'done';      url: string }
  | { type: 'error';     message: string }

interface Config {
  dataDir:       string
  serverIp:      string
  jwtSecret:     string
  portBackend:   string
  portFrontend:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectOS(): OS {
  if (process.platform === 'darwin') return 'mac'
  if (process.platform === 'win32')  return 'windows'
  return 'linux'
}

function getAllIps(): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = [
    { label: 'localhost (hanya di perangkat ini)', value: '127.0.0.1' },
  ]
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.')) {
        result.push({ label: `${name} — ${a.address}`, value: a.address })
      }
    }
  }
  return result
}


function bunBin(): string {
  if (process.execPath.includes('bun')) return process.execPath
  const home = os.homedir()
  return process.platform === 'win32'
    ? join(home, '.bun', 'bin', 'bun.exe')
    : join(home, '.bun', 'bin', 'bun')
}

function sseEncode(event: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

// ── Spawn helper — yields SSE log events ──────────────────────────────────────

async function* spawnCmd(cmd: string[], cwd: string): AsyncGenerator<SSEEvent> {
  yield { type: 'log', text: `$ ${cmd.join(' ')}` }

  const proc = Bun.spawn(cmd, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const dec  = new TextDecoder()

  // Collect lines from a ReadableStream
  async function readAll(stream: ReadableStream<Uint8Array>): Promise<string[]> {
    const lines: string[] = []
    let buf = ''
    const reader = stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) { if (buf.trim()) lines.push(buf); break }
      buf += dec.decode(value)
      const parts = buf.split('\n')
      buf = parts.pop() ?? ''
      for (const p of parts) if (p.trim()) lines.push(p)
    }
    return lines
  }

  const [outLines, errLines] = await Promise.all([readAll(proc.stdout), readAll(proc.stderr)])
  const code = await proc.exited

  for (const l of [...outLines, ...errLines]) yield { type: 'log', text: l }
  if (code !== 0) throw new Error(`"${cmd[0]}" exited with code ${code}`)
}

// ── Install steps ─────────────────────────────────────────────────────────────

async function* runInstall(cfg: Config): AsyncGenerator<SSEEvent> {
  const currentOS = detectOS()
  const bun       = bunBin()

  // ── Step 1: Bun ──────────────────────────────────────────────────────────
  yield { type: 'step', step: 1, name: 'Verifikasi Bun' }
  yield { type: 'log',  text: `✓ Bun ${process.versions.bun}` }
  yield { type: 'log',  text: `  path: ${bun}` }
  yield { type: 'log',  text: `  os:   ${currentOS} (${process.arch})` }
  yield { type: 'step-done', step: 1 }

  // ── Step 2: Folders ──────────────────────────────────────────────────────
  yield { type: 'step', step: 2, name: 'Siapkan Folder Data' }
  const dirs = ['uploads/produk','uploads/invoice','uploads/karyawan','backup','logs']
  for (const d of dirs) {
    const full = join(cfg.dataDir, d)
    fs.mkdirSync(full, { recursive: true })
    yield { type: 'log', text: `mkdir -p ${full}` }
  }
  yield { type: 'step-done', step: 2 }

  // ── Step 3: Backend ──────────────────────────────────────────────────────
  yield { type: 'step', step: 3, name: 'Install Backend' }
  yield* spawnCmd([bun, 'install', '--production'], join(ROOT, 'backend'))
  yield { type: 'step-done', step: 3 }

  // ── Step 4: Frontend build ───────────────────────────────────────────────
  yield { type: 'step', step: 4, name: 'Build Frontend' }
  yield* spawnCmd([bun, 'install', '--production'], join(ROOT, 'frontend'))
  yield* spawnCmd([bun, 'run', 'build'],            join(ROOT, 'frontend'))
  yield { type: 'step-done', step: 4 }

  // ── Step 5: Config + service ─────────────────────────────────────────────
  yield { type: 'step', step: 5, name: 'Setup Service' }

  const envPath = join(ROOT, 'backend', '.env')
  fs.writeFileSync(envPath, [
    `DATABASE_URL=file:${cfg.dataDir.replace(/\\/g, '/')}/data.db`,
    `UPLOAD_DIR=${cfg.dataDir}/uploads`,
    `PORT=${cfg.portBackend}`,
    `NODE_ENV=production`,
    `JWT_SECRET=${cfg.jwtSecret}`,
  ].join('\n'))
  yield { type: 'log', text: `✓ backend/.env → ${envPath}` }

  if (currentOS === 'mac')     yield* setupMac(cfg, bun)
  else if (currentOS === 'linux') yield* setupLinux(cfg, bun)
  else                         yield* setupWindows(cfg, bun)

  yield { type: 'step-done', step: 5 }
  yield { type: 'done', url: `http://${cfg.serverIp}:${cfg.portFrontend}` }
}

// ── Platform: Mac (launchd) ───────────────────────────────────────────────────

async function* setupMac(cfg: Config, bun: string): AsyncGenerator<SSEEvent> {
  const agentsDir = join(os.homedir(), 'Library', 'LaunchAgents')
  fs.mkdirSync(agentsDir, { recursive: true })

  function plist(label: string, args: string[], dir: string, env: Record<string,string>, log: string): string {
    const envXml = Object.entries(env)
      .map(([k,v]) => `    <key>${k}</key><string>${v}</string>`)
      .join('\n')
    const argsXml = args.map(a => `    <string>${a}</string>`).join('\n')
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>WorkingDirectory</key><string>${dir}</string>
  <key>EnvironmentVariables</key>
  <dict>
${envXml}
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${cfg.dataDir}/logs/${label.split('.')[1]}.log</string>
  <key>StandardErrorPath</key><string>${cfg.dataDir}/logs/${label.split('.')[1]}.error.log</string>
</dict>
</plist>`
  }

  const backendPlist = join(agentsDir, 'stokasir.backend.plist')
  const frontendPlist = join(agentsDir, 'stokasir.frontend.plist')

  fs.writeFileSync(backendPlist, plist(
    'stokasir.backend',
    [bun, 'run', 'src/index.ts'],
    join(ROOT, 'backend'),
    { DATABASE_URL: `file:${cfg.dataDir}/data.db`, UPLOAD_DIR: `${cfg.dataDir}/uploads`,
      PORT: cfg.portBackend, NODE_ENV: 'production', JWT_SECRET: cfg.jwtSecret },
    'backend'
  ))

  fs.writeFileSync(frontendPlist, plist(
    'stokasir.frontend',
    [bun, 'build/index.js'],
    join(ROOT, 'frontend'),
    { PORT: cfg.portFrontend, HOST: '0.0.0.0', NODE_ENV: 'production',
      PUBLIC_API_URL: `http://${cfg.serverIp}/api` },
    'frontend'
  ))

  yield { type: 'log', text: `✓ launchd plist → ${agentsDir}` }

  // Stop existing then load
  await Bun.spawn(['launchctl', 'unload', backendPlist]).exited.catch(() => {})
  await Bun.spawn(['launchctl', 'unload', frontendPlist]).exited.catch(() => {})
  yield* spawnCmd(['launchctl', 'load', backendPlist],  ROOT)
  yield* spawnCmd(['launchctl', 'load', frontendPlist], ROOT)
  yield { type: 'log', text: '✓ launchd service aktif' }
}

// ── Platform: Linux / Pi (systemd) ───────────────────────────────────────────

async function* setupLinux(cfg: Config, bun: string): AsyncGenerator<SSEEvent> {
  const user = os.userInfo().username

  const backendSvc = `[Unit]
Description=Stokasir Backend
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${join(ROOT, 'backend')}
ExecStart=${bun} run src/index.ts
Restart=on-failure
RestartSec=5
EnvironmentFile=${join(ROOT, 'backend', '.env')}

[Install]
WantedBy=multi-user.target`

  const frontendSvc = `[Unit]
Description=Stokasir Frontend
After=network.target stokasir-backend.service

[Service]
Type=simple
User=${user}
WorkingDirectory=${join(ROOT, 'frontend')}
ExecStart=${bun} build/index.js
Restart=on-failure
RestartSec=5
Environment=PORT=${cfg.portFrontend}
Environment=HOST=0.0.0.0
Environment=NODE_ENV=production
Environment=PUBLIC_API_URL=http://${cfg.serverIp}/api

[Install]
WantedBy=multi-user.target`

  for (const [path, content] of [
    ['/etc/systemd/system/stokasir-backend.service',  backendSvc],
    ['/etc/systemd/system/stokasir-frontend.service', frontendSvc],
  ] as const) {
    const proc = Bun.spawn(['sudo', 'tee', path], {
      stdin: new Blob([content]),
      stdout: 'pipe', stderr: 'pipe',
    })
    await proc.exited
    yield { type: 'log', text: `✓ ${path}` }
  }

  yield* spawnCmd(['sudo', 'systemctl', 'daemon-reload'], ROOT)
  yield* spawnCmd(['sudo', 'systemctl', 'enable', 'stokasir-backend', 'stokasir-frontend'], ROOT)
  yield* spawnCmd(['sudo', 'systemctl', 'restart', 'stokasir-backend', 'stokasir-frontend'], ROOT)
  yield { type: 'log', text: '✓ systemd service aktif' }
}

// ── Platform: Windows (Task Scheduler) ───────────────────────────────────────

async function* setupWindows(cfg: Config, bun: string): AsyncGenerator<SSEEvent> {
  const wrapper = join(ROOT, 'start-frontend.ps1')
  fs.writeFileSync(wrapper, [
    `$env:PORT           = '${cfg.portFrontend}'`,
    `$env:HOST           = '0.0.0.0'`,
    `$env:NODE_ENV       = 'production'`,
    `$env:PUBLIC_API_URL = 'http://${cfg.serverIp}/api'`,
    `Set-Location '${join(ROOT, 'frontend')}'`,
    `& '${bun}' build\\index.js`,
  ].join('\n'))
  yield { type: 'log', text: `✓ start-frontend.ps1 ditulis` }

  const ps = `
$s = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 365) -StartWhenAvailable
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ab = New-ScheduledTaskAction -Execute '${bun.replace(/\\/g,'\\\\') }' -Argument 'run src\\index.ts' -WorkingDirectory '${join(ROOT,'backend').replace(/\\/g,'\\\\')}'
try{Unregister-ScheduledTask 'Stokasir Backend' -Confirm:$false 2>$null}catch{}
Register-ScheduledTask 'Stokasir Backend'  -Action $ab -Trigger $t -Settings $s -RunLevel Highest -Force|Out-Null
$af = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-ExecutionPolicy Bypass -NonInteractive -File "${wrapper.replace(/\\/g,'\\\\')}"'
try{Unregister-ScheduledTask 'Stokasir Frontend' -Confirm:$false 2>$null}catch{}
Register-ScheduledTask 'Stokasir Frontend' -Action $af -Trigger $t -Settings $s -RunLevel Highest -Force|Out-Null
Start-ScheduledTask 'Stokasir Backend'
Start-Sleep 2
Start-ScheduledTask 'Stokasir Frontend'
Write-Host 'OK'
`
  yield* spawnCmd(['powershell', '-ExecutionPolicy', 'Bypass', '-Command', ps], ROOT)
  yield { type: 'log', text: '✓ Task Scheduler terdaftar & dimulai' }
}

// ── SSE stream factory ────────────────────────────────────────────────────────

function streamInstall(cfg: Config): Response {
  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const event of runInstall(cfg)) {
          ctrl.enqueue(sseEncode(event))
        }
      } catch (err) {
        ctrl.enqueue(sseEncode({ type: 'error', message: err instanceof Error ? err.message : String(err) }))
      } finally {
        ctrl.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
    }

    if (url.pathname === '/' || url.pathname === '/instalasi.html') {
      return new Response(Bun.file(join(ROOT, 'instalasi.html')), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (url.pathname === '/api/platform') {
      return Response.json({
        os:          detectOS(),
        arch:        process.arch,
        ips:         getAllIps(),
        bunVersion:  process.versions.bun,
        defaultData: process.platform === 'win32' ? 'C:\\stokasir-data' : `${os.homedir()}/stokasir-data`,
      })
    }

    if (url.pathname === '/api/browse') {
      const raw      = url.searchParams.get('path') || os.homedir()
      const current  = resolve(raw)
      const parent   = dirname(current)
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true })
        const dirs = entries
          .filter(e => e.isDirectory() && !e.name.startsWith('.'))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(e => ({ name: e.name, path: join(current, e.name) }))
        return Response.json({
          current,
          parent: parent !== current ? parent : null,
          dirs,
        })
      } catch {
        return Response.json({ error: 'Tidak bisa membaca folder ini' }, { status: 400 })
      }
    }

    if (url.pathname === '/api/install' && req.method === 'POST') {
      return streamInstall(await req.json() as Config)
    }

    if (url.pathname === '/api/stop') {
      setTimeout(() => process.exit(0), 500)
      return new Response('OK')
    }

    return new Response('Not found', { status: 404 })
  },
})

// ── Startup ───────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗')
console.log(`║  Stokasir Installer → http://localhost:${PORT}  ║`)
console.log('╚══════════════════════════════════════════╝\n')

// Auto-open browser
const currentOS = detectOS()
if (currentOS === 'mac') {
  Bun.spawn(['open', `http://localhost:${PORT}`])
} else if (currentOS === 'linux') {
  Bun.spawn(['xdg-open', `http://localhost:${PORT}`]).exited.catch(() => {})
}
// Windows: instal.bat opens the browser
