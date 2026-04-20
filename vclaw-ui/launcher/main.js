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

// ── Chromium window ────────────────────────────────────────────────────────────

async function openWindow(url) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--app=${url}`,
      '--window-size=1440,900',
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
  })

  const ctx  = browser.contexts()[0] ?? await browser.newContext()
  const page = ctx.pages()[0]        ?? await ctx.newPage()

  if (!ctx.pages().length || page.url() === 'about:blank') {
    await page.goto(url).catch((e) => console.warn('[vclaw] goto error:', e.message))
  }

  // Remove Playwright's fixed viewport so window resize controls CSS viewport.
  // Playwright sets Emulation.setDeviceMetricsOverride by default, which pins
  // window.innerWidth/innerHeight regardless of physical window size.
  const cdp = await ctx.newCDPSession(page)
  const clearViewport = () => cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
  await clearViewport()
  page.on('load', clearViewport) // re-apply after navigation resets it

  // PRIMARY: window closed (X button, Cmd+Q)
  page.on('close', () => {
    console.log('[vclaw] Window closed — shutting down')
    shutdown(0)
  })

  // FALLBACK: Playwright lost connection to browser process
  browser.on('disconnected', () => {
    console.log('[vclaw] Browser disconnected — shutting down')
    shutdown(0)
  })

  return browser
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
