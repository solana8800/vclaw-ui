/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

const { spawn, execFileSync } = require('child_process')
const net = require('net')
const path = require('path')
const fs = require('fs')
const os = require('os')

const PREFERRED_PORT = parseInt(process.env.PORT ?? '12687', 10)
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT ?? '18789', 10)
const IS_DEV = process.env.VCLAW_DEV === '1'

/** @type {import('child_process').ChildProcess | null} */
let electronChild = null

/**
 * Electron userData (cookie, localStorage, session).
 * Ghi đè: VCLAW_ELECTRON_USER_DATA=/đường/dẫn
 */
function readVclawAppVersion() {
  const paths = [
    path.join(__dirname, '..', 'app', 'package.json'),
    path.join(__dirname, '..', 'package.json'),
    path.join(__dirname, '..', '..', 'package.json'),
  ]
  for (const p of paths) {
    try {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')).version
      if (v) return String(v)
    } catch {}
  }
  return ''
}

function resolveElectronUserData() {
  if (process.env.VCLAW_ELECTRON_USER_DATA) {
    return path.resolve(process.env.VCLAW_ELECTRON_USER_DATA)
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'VClaw', 'ShellElectron')
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'VClaw', 'ShellElectron')
  }
  return path.join(os.homedir(), '.local', 'share', 'vclaw', 'shell-electron')
}

// Lock file stores "PID:port" so second launch can read both
const LOCK_FILE = path.join(os.tmpdir(), 'vclaw-next.lock')

// ── Single-instance check ──────────────────────────────────────────────────────

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// Call BEFORE finding a port. If another instance is live, focus it and exit.
function checkSingleInstance() {
  if (!fs.existsSync(LOCK_FILE)) return
  try {
    const [pidStr] = fs.readFileSync(LOCK_FILE, 'utf8').trim().split(':')
    const pid = parseInt(pidStr, 10)
    if (!isNaN(pid) && isAlive(pid)) {
      try {
        execFileSync('open', ['-a', 'VClaw'], { stdio: 'ignore' })
      } catch {}
      console.log('[vclaw] Already running (PID %d) — activated existing window', pid)
      process.exit(0)
    }
  } catch {}
}

function writeLock(port) {
  fs.writeFileSync(LOCK_FILE, `${process.pid}:${port}`)
}

function releaseLock() {
  try {
    const [pidStr] = fs.readFileSync(LOCK_FILE, 'utf8').trim().split(':')
    if (parseInt(pidStr, 10) === process.pid) fs.unlinkSync(LOCK_FILE)
  } catch {}
}

// ── Port discovery ─────────────────────────────────────────────────────────────

function findFreePort(preferred) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(preferred, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', () => {
      const fallback = net.createServer()
      fallback.listen(0, '127.0.0.1', () => {
        const { port } = fallback.address()
        fallback.close(() => {
          console.log(`[vclaw] Port ${preferred} occupied — using ${port}`)
          resolve(port)
        })
      })
    })
  })
}

// ── Path resolution ────────────────────────────────────────────────────────────

function getServerScript() {
  if (IS_DEV) return path.join(__dirname, '..', '.next', 'standalone', 'server.js')
  return path.join(__dirname, '..', 'app', 'server.js')
}

function defaultOpenClawConfigPath() {
  if (process.env.OPENCLAW_CONFIG_PATH) {
    return path.resolve(process.env.OPENCLAW_CONFIG_PATH)
  }
  return path.join(os.homedir(), '.openclaw', 'openclaw.json')
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function inferGatewayVariant(config, port) {
  const configured = (process.env.OPENCLAW_GATEWAY_VARIANT || '').trim()
  if (configured) return configured
  if (port === 3001) return 'zero-token'
  const providers = config?.models?.providers
  if (providers && typeof providers === 'object') {
    const providerKeys = Object.keys(providers)
    if (providerKeys.some((key) => key.endsWith('-web'))) {
      return 'zero-token'
    }
  }
  return 'upstream'
}

function resolveGatewayRuntimeEnv() {
  const configPath = defaultOpenClawConfigPath()
  const config = readJsonFile(configPath)
  const configuredPort = Number(config?.gateway?.port)
  const port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : GATEWAY_PORT
  const token = String(config?.gateway?.auth?.token || '').trim()
  const httpUrl = (process.env.OPENCLAW_GATEWAY_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '')
  const wsUrl =
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL ||
    httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws'
  const gatewayVariant = inferGatewayVariant(config, port)

  return {
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_GATEWAY_URL: httpUrl,
    OPENCLAW_GATEWAY_VARIANT: gatewayVariant,
    NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL: wsUrl,
    ...(token
      ? {
          OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN || token,
          NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN:
            process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN || token,
        }
      : {}),
  }
}

// ── Port polling ───────────────────────────────────────────────────────────────

let nextProcess = null

function waitForPort(port, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout
    ;(function attempt() {
      const sock = net.connect({ port, host: '127.0.0.1' }, () => {
        sock.destroy()
        resolve()
      })
      sock.on('error', () => {
        if (nextProcess === null && !IS_DEV) {
          return reject(new Error('Next.js process exited before becoming ready'))
        }
        if (Date.now() >= deadline) {
          return reject(new Error(`Port ${port} not ready after ${timeout}ms`))
        }
        setTimeout(attempt, 200)
      })
    })()
  })
}

// ── Next.js server ─────────────────────────────────────────────────────────────

function startNextServer(port) {
  const script = getServerScript()
  if (!fs.existsSync(script)) {
    console.error('[vclaw] standalone server not found:', script)
    return false
  }
  const gatewayEnv = resolveGatewayRuntimeEnv()

  nextProcess = spawn(process.execPath, [script], {
    env: {
      ...process.env,
      ...gatewayEnv,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: path.dirname(script),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  nextProcess.stdout.on('data', (d) => process.stdout.write('[next] ' + d))
  nextProcess.stderr.on('data', (d) => process.stderr.write('[next] ' + d))
  nextProcess.on('exit', (code, sig) => {
    if (code !== 0 && code !== null) console.error(`[next] exited code=${code} signal=${sig}`)
    nextProcess = null
  })
  return true
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────

let shuttingDown = false

function killElectronChild() {
  if (!electronChild || electronChild.killed) {
    electronChild = null
    return
  }
  try {
    electronChild.kill('SIGTERM')
  } catch {}
  electronChild = null
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  releaseLock()

  killElectronChild()

  if (!nextProcess) {
    process.exit(exitCode)
    return
  }

  console.log('[vclaw] Stopping Next.js server...')
  nextProcess.kill('SIGTERM')

  const forceKill = setTimeout(() => {
    if (nextProcess) {
      console.log('[vclaw] Force-killing Next.js (SIGKILL)')
      nextProcess.kill('SIGKILL')
    }
  }, 5000)
  forceKill.unref()

  nextProcess.on('exit', () => {
    clearTimeout(forceKill)
    nextProcess = null
    process.exit(exitCode)
  })
}

// ── Electron window (child process) ───────────────────────────────────────────
// Next.js proxy (i18n) / server không đổi — chỉ thay lớp hiển thị desktop.

function resolveElectronBinary() {
  if (process.env.VCLAW_ELECTRON_PATH) {
    return process.env.VCLAW_ELECTRON_PATH
  }
  try {
    return require('electron')
  } catch {
    throw new Error(
      'Electron not found. In vclaw-ui/launcher run: npm install',
    )
  }
}

function openElectronWindow(url) {
  return new Promise((resolve, reject) => {
    let electronBin
    try {
      electronBin = resolveElectronBinary()
    } catch (err) {
      reject(err)
      return
    }

    const mainScript = path.join(__dirname, 'electron-main.cjs')
    if (!fs.existsSync(mainScript)) {
      reject(new Error(`Missing ${mainScript}`))
      return
    }

    const userData = resolveElectronUserData()
    fs.mkdirSync(userData, { recursive: true })

    const appVersion =
      (process.env.VCLAW_APP_VERSION || '').trim() || readVclawAppVersion()

    const child = spawn(electronBin, [mainScript, '--remote-debugging-port=9222'], {
      env: {
        ...process.env,
        VCLAW_URL: url,
        VCLAW_WINDOW_TITLE: process.env.VCLAW_WINDOW_TITLE || 'VClaw',
        VCLAW_ELECTRON_USER_DATA: userData,
        ...(appVersion ? { VCLAW_APP_VERSION: appVersion } : {}),
      },
      stdio: 'inherit',
      detached: false,
    })

    electronChild = child
    child.on('error', (err) => {
      electronChild = null
      reject(err)
    })
    child.once('spawn', () => {
      console.log('[vclaw] Electron shell started (PID %d)', child.pid)
      resolve()
    })
    child.on('exit', (code, sig) => {
      electronChild = null
      if (!shuttingDown) {
        console.log(
          `[vclaw] Electron exited code=${code ?? 'null'} signal=${sig ?? 'null'} — shutting down`,
        )
        shutdown(0)
      }
    })
  })
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  checkSingleInstance()

  const port = IS_DEV ? PREFERRED_PORT : await findFreePort(PREFERRED_PORT)

  writeLock(port)

  if (IS_DEV) {
    console.log(
      `[vclaw] DEV — expecting http://127.0.0.1:${port} (run: cd vclaw-ui && pnpm dev — default port 12687)`,
    )
    await waitForPort(port, 30_000).catch((err) => {
      console.error('[vclaw]', err.message)
      process.exit(1)
    })
  } else {
    if (!startNextServer(port)) process.exit(1)

    console.log(`[vclaw] Starting Next.js on port ${port}...`)
    await waitForPort(port, 30_000).catch((err) => {
      console.error('[vclaw]', err.message)
      shutdown(1)
    })
  }

  const url = `http://127.0.0.1:${port}`
  console.log(`[vclaw] Opening ${url} in Electron`)
  await openElectronWindow(url)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('exit', releaseLock)

main().catch((err) => {
  console.error('[vclaw] Fatal:', err)
  shutdown(1)
})
