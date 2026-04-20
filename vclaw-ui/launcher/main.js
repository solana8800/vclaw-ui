/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

const { chromium } = require('playwright-chromium')
const { spawn, execFileSync } = require('child_process')
const net  = require('net')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

const PREFERRED_PORT = parseInt(process.env.PORT        ?? '12687', 10)
const GATEWAY_PORT   = parseInt(process.env.GATEWAY_PORT ?? '18789', 10)
const IS_DEV         = process.env.VCLAW_DEV === '1'

/** @type {import('playwright-chromium').BrowserContext | null} */
let shellContext = null

/**
 * Persistent Chromium profile (cookies, localStorage, đăng nhập Shopee/Zalo/Telegram Web…).
 * Ghi đè bằng VCLAW_CHROMIUM_USER_DATA=/đường/dẫn
 */
function resolveShellUserDataDir() {
  if (process.env.VCLAW_CHROMIUM_USER_DATA) {
    return path.resolve(process.env.VCLAW_CHROMIUM_USER_DATA)
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'VClaw', 'ShellChromium')
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'VClaw', 'ShellChromium')
  }
  return path.join(os.homedir(), '.local', 'share', 'vclaw', 'shell-chromium')
}

// Lock file stores "PID:port" so second launch can read both
const LOCK_FILE = path.join(os.tmpdir(), 'vclaw-next.lock')

// ── Single-instance check ──────────────────────────────────────────────────────

function isAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

// Call BEFORE finding a port. If another instance is live, focus it and exit.
function checkSingleInstance() {
  if (!fs.existsSync(LOCK_FILE)) return
  try {
    const [pidStr] = fs.readFileSync(LOCK_FILE, 'utf8').trim().split(':')
    const pid = parseInt(pidStr, 10)
    if (!isNaN(pid) && isAlive(pid)) {
      try { execFileSync('open', ['-a', 'VClaw'], { stdio: 'ignore' }) } catch {}
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
// Try preferred port first. If taken, let the OS assign any free port.
// Returns a Promise<number> that resolves immediately (no retry loop needed).

function findFreePort(preferred) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(preferred, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', () => {
      // Preferred port is occupied — ask OS for any free port
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

// ── Port polling ───────────────────────────────────────────────────────────────

function waitForPort(port, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout
    ;(function attempt() {
      const sock = net.connect({ port, host: '127.0.0.1' }, () => { sock.destroy(); resolve() })
      sock.on('error', () => {
        // If Next.js process already exited, no point waiting further
        if (nextProcess === null && !IS_DEV) {
          return reject(new Error('Next.js process exited before becoming ready'))
        }
        if (Date.now() >= deadline) return reject(new Error(`Port ${port} not ready after ${timeout}ms`))
        setTimeout(attempt, 200)
      })
    })()
  })
}

// ── Next.js server ─────────────────────────────────────────────────────────────

let nextProcess = null

function startNextServer(port) {
  const script = getServerScript()
  if (!fs.existsSync(script)) {
    console.error('[vclaw] standalone server not found:', script)
    return false
  }

  nextProcess = spawn(process.execPath, [script], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      OPENCLAW_GATEWAY_URL: `http://127.0.0.1:${GATEWAY_PORT}`,
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

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  releaseLock()

  if (shellContext) {
    try {
      void shellContext.close()
    } catch {}
    shellContext = null
  }

  if (!nextProcess) { process.exit(exitCode); return }

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

// ── Chromium window (Playwright) ─────────────────────────────────────────────
// - launchPersistentContext + viewport:null: nội dung scale theo cửa sổ (không bị pin kích thước).
// - user-data-dir bền: session/cookie giữ giữa các lần mở app (tiền đề mở tab Shopee/Zalo/Telegram…).
// - Tên trên menu bar macOS vẫn theo bundle Chromium (thường "Google Chrome for Testing"):
//   đặt VCLAW_USE_SYSTEM_CHROME=1 để dùng Chrome cài trên máy, hoặc VCLAW_CHROMIUM_PATH trỏ tới binary.

async function openWindow(url) {
  const userDataDir = resolveShellUserDataDir()
  fs.mkdirSync(userDataDir, { recursive: true })

  /** @type {import('playwright-chromium').LaunchPersistentContextOptions} */
  const launchOpts = {
    headless: false,
    viewport: null,
    locale: 'vi-VN',
    ignoreDefaultArgs: ['--enable-automation'],
    handleSIGINT: false,
    handleSIGTERM: false,
    args: [
      `--app=${url}`,
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-translate',
      '--disable-features=TranslateUI,Translate',
      '--lang=vi',
      '--disable-infobars',
      '--disable-background-mode',
      '--disable-background-networking',
    ],
  }

  if (process.env.VCLAW_CHROMIUM_PATH) {
    launchOpts.executablePath = process.env.VCLAW_CHROMIUM_PATH
  } else if (process.env.VCLAW_USE_SYSTEM_CHROME === '1') {
    launchOpts.channel = 'chrome'
  }

  const context = await chromium.launchPersistentContext(userDataDir, launchOpts)
  shellContext = context

  let page = context.pages()[0]
  if (!page) page = await context.newPage()

  const u = page.url()
  if (u === 'about:blank' || !u.startsWith('http')) {
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((e) =>
      console.warn('[vclaw] goto error:', e.message),
    )
  }

  // Đảm bảo không còn emulation viewport (một số bản vẫn set sau load / SPA).
  const wireViewportClear = async (p) => {
    try {
      const cdp = await context.newCDPSession(p)
      const clear = () => cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
      await clear()
      p.on('load', () => {
        void clear()
      })
      p.on('framenavigated', () => {
        void clear()
      })
    } catch {
      /* ignore */
    }
  }
  await wireViewportClear(page)
  context.on('page', (p) => {
    void wireViewportClear(p)
  })

  context.on('close', () => {
    console.log('[vclaw] Shell closed — shutting down')
    shutdown(0)
  })

  const browser = context.browser()
  if (browser) {
    browser.on('disconnected', () => {
      console.log('[vclaw] Browser disconnected — shutting down')
      shutdown(0)
    })
  }

  return context
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Exit immediately if another VClaw instance is already running
  checkSingleInstance()

  // 2. Find an available port (prefer 12687, fallback to OS-assigned)
  const port = IS_DEV ? PREFERRED_PORT : await findFreePort(PREFERRED_PORT)

  // 3. Claim the lock so a second launch during startup also gets redirected
  writeLock(port)

  if (IS_DEV) {
    console.log(`[vclaw] DEV — expecting http://127.0.0.1:${port} (run pnpm dev first)`)
    await waitForPort(port, 30_000).catch((err) => {
      console.error('[vclaw]', err.message); process.exit(1)
    })
  } else {
    if (!startNextServer(port)) process.exit(1)

    console.log(`[vclaw] Starting Next.js on port ${port}...`)
    await waitForPort(port, 30_000).catch((err) => {
      console.error('[vclaw]', err.message); shutdown(1)
    })
  }

  console.log(`[vclaw] Opening http://127.0.0.1:${port}`)
  await openWindow(`http://127.0.0.1:${port}`)
}

process.on('SIGINT',  () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('exit', releaseLock)

main().catch((err) => {
  console.error('[vclaw] Fatal:', err)
  shutdown(1)
})
