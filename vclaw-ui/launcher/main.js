'use strict'

const { spawn, execFile, execFileSync } = require('child_process')
const net = require('net')
const path = require('path')
const fs = require('fs')
const os = require('os')

function parseDotEnv(text) {
  const values = {}
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice('export '.length).trim()
    const equalIndex = line.indexOf('=')
    if (equalIndex <= 0) continue
    const key = line.slice(0, equalIndex).trim()
    let value = line.slice(equalIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

function loadDotEnvIfPresent() {
  const candidates = [
    path.join(__dirname, '..', 'app', '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), '.env'),
  ]
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue
    try {
      const values = parseDotEnv(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
      for (const [key, value] of Object.entries(values)) {
        if (process.env[key] === undefined) process.env[key] = value
      }
      console.log('[vclaw] Loaded runtime environment from %s', filePath)
      return filePath
    } catch (err) {
      console.warn('[vclaw] Failed to load runtime .env:', err.message)
      return ''
    }
  }
  return ''
}

loadDotEnvIfPresent()

const PREFERRED_PORT = parseInt(process.env.PORT ?? '12687', 10)
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT ?? '18789', 10)
const IS_DEV = process.env.VCLAW_DEV === '1'
const OPENCLAW_PID_FILE = path.join(os.homedir(), '.openclaw', '.vclaw-zero-gateway.pid')
const OPENCLAW_GATEWAY_LOG = path.join(os.tmpdir(), 'vclaw-zero-gateway.log')
const IS_ELECTRON_MAIN = Boolean(process.versions?.electron) && process.env.ELECTRON_RUN_AS_NODE !== '1'

if (IS_ELECTRON_MAIN) {
  try {
    const { app } = require('electron')
    app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
    app.commandLine.appendSwitch('remote-debugging-port', '9222')
  } catch (err) {
    console.warn('[vclaw] Failed to enable Electron CDP:', err.message)
  }
}

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
      if (process.platform === 'darwin') {
        try {
          execFileSync('open', ['-a', 'VClaw'], { stdio: 'ignore' })
        } catch {}
      }
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

function resolveVclawAgentToolsBridgeScript() {
  return IS_DEV
    ? path.join(__dirname, '..', '..', 'scripts', 'vclaw-agent-tools-mcp-stdio.mjs')
    : path.join(__dirname, '..', 'vclaw-agent-tools-mcp-stdio.mjs')
}

function replaceVclawBridgePlaceholder(configText) {
  const bridgeScript = resolveVclawAgentToolsBridgeScript()
  return configText
    .replaceAll('"__VCLAW_AGENT_TOOLS_MCP_STDIO__"', JSON.stringify(bridgeScript))
    .replaceAll('__VCLAW_AGENT_TOOLS_MCP_STDIO__', bridgeScript)
}

function syncOpenClawWorkspaceFromTemplate(templateDir, mode = 'if-missing') {
  const dest = process.env.OPENCLAW_WORKSPACE_DIR || path.join(os.homedir(), '.openclaw', 'workspace')
  if (!fs.existsSync(templateDir)) return
  fs.mkdirSync(dest, { recursive: true })

  for (const name of fs.readdirSync(templateDir)) {
    if (name === '.DS_Store') continue
    const src = path.join(templateDir, name)
    const target = path.join(dest, name)
    if (!fs.statSync(src).isFile()) continue
    if (mode === 'if-missing' && fs.existsSync(target)) continue
    fs.copyFileSync(src, target)
  }
}

function ensureVclawBusinessMcpConfig(configPath) {
  const config = readJsonFile(configPath)
  if (!config || typeof config !== 'object') return

  const bridgeScript = resolveVclawAgentToolsBridgeScript()
  const server = config?.mcp?.servers?.['vclaw-business']
  const secret =
    String(server?.env?.VCLAW_AGENT_TOOLS_SECRET || '').trim() ||
    String(server?.auth?.token || '').trim()
  const endpoint =
    String(server?.env?.VCLAW_AGENT_TOOLS_URL || '').trim() ||
    'http://127.0.0.1:12687/api/vclaw/agent-tools'

  const needsRepair =
    !server ||
    server.url ||
    server.command !== 'node' ||
    !Array.isArray(server.args) ||
    server.args[0] !== bridgeScript ||
    !server.env ||
    server.env.VCLAW_AGENT_TOOLS_SECRET !== secret

  if (!needsRepair) return

  config.mcp = config.mcp && typeof config.mcp === 'object' ? config.mcp : {}
  config.mcp.servers =
    config.mcp.servers && typeof config.mcp.servers === 'object' ? config.mcp.servers : {}
  config.mcp.servers['vclaw-business'] = {
    command: 'node',
    args: [bridgeScript],
    env: {
      VCLAW_AGENT_TOOLS_URL: endpoint,
      ...(secret ? { VCLAW_AGENT_TOOLS_SECRET: secret } : {}),
    },
    description: 'VClaw Business Tools — stdio MCP bridge vào database/catalog/order/payment của VClaw UI',
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(`[vclaw] Repaired vclaw-business MCP bridge path: ${bridgeScript}`)
}

function defaultOpenClawConfigPath() {
  if (process.env.OPENCLAW_CONFIG_PATH) {
    return path.resolve(process.env.OPENCLAW_CONFIG_PATH)
  }
  const stateDir = path.join(os.homedir(), '.openclaw')
  const configPath = path.join(stateDir, 'openclaw.json')
  
  if (!fs.existsSync(configPath)) {
    let defaultCfg = ''
    const templateDir = IS_DEV
      ? path.join(__dirname, '..', '..', 'scripts', 'packaging', 'openclaw-state-template')
      : path.join(__dirname, '..', 'openclaw-state-template')
    
    defaultCfg = path.join(templateDir, 'openclaw.json')
    
    if (fs.existsSync(defaultCfg)) {
      try {
        fs.mkdirSync(stateDir, { recursive: true })
        const configText = replaceVclawBridgePlaceholder(fs.readFileSync(defaultCfg, 'utf8'))
        fs.writeFileSync(configPath, configText)
        console.log(`[vclaw] Seeded default config to ${configPath}`)
        
        const syncScript = IS_DEV 
          ? path.join(__dirname, '..', '..', 'scripts', 'sync-openclaw-workspace.sh')
          : path.join(__dirname, '..', 'sync-openclaw-workspace.sh')
        
        const templateDir = IS_DEV
          ? path.join(__dirname, '..', '..', 'scripts', 'packaging', 'openclaw-state-template')
          : path.join(__dirname, '..', 'openclaw-state-template')

        if (process.platform !== 'win32' && fs.existsSync(syncScript) && fs.existsSync(templateDir)) {
          console.log(`[vclaw] Syncing default workspace...`)
          execFileSync('bash', [syncScript, '--if-missing', '--template', templateDir], { stdio: 'inherit' })
        } else if (fs.existsSync(templateDir)) {
          console.log(`[vclaw] Syncing default workspace...`)
          syncOpenClawWorkspaceFromTemplate(templateDir, 'if-missing')
        }
      } catch (e) {
        console.error(`[vclaw] Failed to seed default config or workspace: ${e.message}`)
      }
    }
  }

  ensureVclawBusinessMcpConfig(configPath)
  
  return configPath
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
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
  const stateDir = path.dirname(configPath)
  const config = readJsonFile(configPath)
  const configuredPort = Number(config?.gateway?.port)
  const port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : GATEWAY_PORT
  const token = String(config?.gateway?.auth?.token || '').trim()
  const httpUrl = (process.env.OPENCLAW_GATEWAY_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '')
  const wsUrl =
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL ||
    httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws'
  const gatewayVariant = inferGatewayVariant(config, port)
  const vclawBusiness = config?.mcp?.servers?.['vclaw-business']
  const agentToolsSecret =
    String(vclawBusiness?.env?.VCLAW_AGENT_TOOLS_SECRET || '').trim() ||
    String(vclawBusiness?.auth?.token || '').trim()

  return {
    VCLAW_RESOURCES_DIR: IS_DEV ? path.join(__dirname, '..', '..') : path.join(__dirname, '..'),
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_GATEWAY_PORT: String(port),
    OPENCLAW_GATEWAY_URL: httpUrl,
    OPENCLAW_GATEWAY_VARIANT: gatewayVariant,
    NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL: wsUrl,
    ...(agentToolsSecret
      ? {
          VCLAW_AGENT_TOOLS_SECRET: process.env.VCLAW_AGENT_TOOLS_SECRET || agentToolsSecret,
        }
      : {}),
    ...(token
      ? {
          OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN || token,
          NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN:
            process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN || token,
        }
      : {}),
  }
}

function execFileAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...options, shell: options.shell ?? (process.platform === 'win32' && /\.cmd$/i.test(cmd)) }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function openClawEnv(gatewayEnv) {
  const nodeDir = path.dirname(process.execPath)
  const homeLocalBin = path.join(os.homedir(), '.local', 'bin')
  const platformPath =
    process.platform === 'win32'
      ? [nodeDir, homeLocalBin, process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : '']
      : [nodeDir, homeLocalBin, '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin']
  return {
    ...process.env,
    ...gatewayEnv,
    ELECTRON_RUN_AS_NODE: '1',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: [...platformPath.filter(Boolean), process.env.PATH || ''].join(path.delimiter),
  }
}

function resolveBundledOpenClawTgz() {
  return IS_DEV
    ? path.join(__dirname, '..', '..', 'core', 'openclaw-zero-token', 'dist', '.build', 'openclaw-bundled.tgz')
    : path.join(__dirname, '..', 'openclaw-bundled.tgz')
}

function resolveOpenClawCommand(gatewayEnv) {
  const devPath = path.resolve(__dirname, '..', '..', 'core', 'openclaw-zero-token', 'openclaw.mjs')
  if (IS_DEV && fs.existsSync(devPath)) return { cmd: process.execPath, args: [devPath] }

  const stateDir = gatewayEnv.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw')
  const binName = process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw'
  const candidates = [
    path.join(__dirname, '..', 'openclaw-runtime', 'node_modules', '.bin', binName),
    path.join(stateDir, 'runtime', 'node_modules', '.bin', binName),
    path.join(os.homedir(), '.local', 'bin', binName),
    ...(process.platform === 'win32' ? [] : ['/usr/local/bin/openclaw', '/opt/homebrew/bin/openclaw']),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return { cmd: candidate, args: [] }
  }
  return { cmd: 'openclaw', args: [] }
}

async function ensurePackagedOpenClaw(gatewayEnv) {
  let command = resolveOpenClawCommand(gatewayEnv)
  if (command.cmd !== 'openclaw' || !IS_DEV) {
    if (command.cmd !== 'openclaw' && fs.existsSync(command.cmd)) return command
  }

  const stateDir = gatewayEnv.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw')
  const runtimeDir = path.join(stateDir, 'runtime')
  const bundledTgz = resolveBundledOpenClawTgz()
  if (!fs.existsSync(bundledTgz)) return command

  fs.mkdirSync(path.join(runtimeDir, '.npm-cache'), { recursive: true })
  const packageJson = path.join(runtimeDir, 'package.json')
  if (!fs.existsSync(packageJson)) {
    fs.writeFileSync(packageJson, '{"name":"openclaw-runtime","version":"1.0.0","private":true}\n')
  }

  console.log('[vclaw] Installing bundled OpenClaw runtime...')
  await execFileAsync('npm', ['install', bundledTgz, '--foreground-scripts', '--loglevel', 'warn'], {
    cwd: runtimeDir,
    env: {
      ...openClawEnv(gatewayEnv),
      NPM_CONFIG_CACHE: path.join(runtimeDir, '.npm-cache'),
    },
    timeout: 600_000,
  })

  command = resolveOpenClawCommand(gatewayEnv)
  if (command.cmd === 'openclaw') {
    throw new Error(`Installed ${bundledTgz} but OpenClaw command is still missing`)
  }
  return command
}

function repairRuntimePluginManifests(gatewayEnv) {
  const stateDir = gatewayEnv.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw')
  const runtimePkg = path.join(stateDir, 'runtime', 'node_modules', 'openclaw')
  const srcRoot = path.join(runtimePkg, 'extensions')
  const distRoot = path.join(runtimePkg, 'dist', 'extensions')
  if (!fs.existsSync(srcRoot)) return

  for (const extName of fs.readdirSync(srcRoot)) {
    const extDir = path.join(srcRoot, extName)
    if (!fs.statSync(extDir).isDirectory()) continue
    const srcManifest = path.join(extDir, 'openclaw.plugin.json')
    if (!fs.existsSync(srcManifest)) continue
    const distExtDir = path.join(distRoot, extName)
    const distManifest = path.join(distExtDir, 'openclaw.plugin.json')
    if (fs.existsSync(distManifest)) continue
    fs.mkdirSync(distExtDir, { recursive: true })
    fs.copyFileSync(srcManifest, distManifest)
    console.log(`[vclaw] Fixed OpenClaw plugin manifest: ${extName}`)
  }
}

function normalizeProviderId(value) {
  return String(value || '').trim().toLowerCase()
}

function resolveModelProvider(modelRef) {
  const value = typeof modelRef === 'string' ? modelRef.trim() : ''
  const slashIndex = value.indexOf('/')
  if (slashIndex <= 0) return ''
  return value.slice(0, slashIndex)
}

function resolvePrimaryWebAuthProvider(gatewayEnv) {
  const config = readJsonFile(gatewayEnv.OPENCLAW_CONFIG_PATH)
  const candidates = []
  const primary = config?.agents?.defaults?.model?.primary
  if (typeof primary === 'string') candidates.push(resolveModelProvider(primary))
  const fallbacks = config?.agents?.defaults?.model?.fallbacks
  if (Array.isArray(fallbacks)) {
    for (const fallback of fallbacks) {
      if (typeof fallback === 'string') candidates.push(resolveModelProvider(fallback))
    }
  }
  const providers = config?.models?.providers
  if (providers && typeof providers === 'object') {
    candidates.push(...Object.keys(providers))
  }
  return candidates.find((provider) => normalizeProviderId(provider).endsWith('-web')) || 'deepseek-web'
}

function normalizeAgentIdForPath(value) {
  const trimmed = String(value || '').trim().toLowerCase()
  if (!trimmed) return 'main'
  const normalized = trimmed
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)
  return normalized || 'main'
}

function resolveUserPath(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '~') return os.homedir()
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2))
  return path.resolve(raw)
}

function resolveDefaultAgentId(config) {
  const list = Array.isArray(config?.agents?.list)
    ? config.agents.list.filter((entry) => entry && typeof entry === 'object')
    : []
  const chosen = (list.find((entry) => entry.default) || list[0])?.id
  return normalizeAgentIdForPath(chosen || 'main')
}

function resolveAuthProfilesPath(gatewayEnv) {
  const explicitAgentDir = process.env.OPENCLAW_AGENT_DIR || process.env.PI_CODING_AGENT_DIR
  if (explicitAgentDir) return path.join(resolveUserPath(explicitAgentDir), 'auth-profiles.json')

  const stateDir = gatewayEnv.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw')
  const config = readJsonFile(gatewayEnv.OPENCLAW_CONFIG_PATH)
  const agentId = resolveDefaultAgentId(config)
  const agentEntry = Array.isArray(config?.agents?.list)
    ? config.agents.list.find((entry) => normalizeAgentIdForPath(entry?.id) === agentId)
    : null
  const configuredAgentDir = typeof agentEntry?.agentDir === 'string' ? agentEntry.agentDir.trim() : ''
  if (configuredAgentDir) return path.join(resolveUserPath(configuredAgentDir), 'auth-profiles.json')

  return path.join(stateDir, 'agents', agentId, 'agent', 'auth-profiles.json')
}

function isUsableAuthCredential(credential) {
  if (!credential || typeof credential !== 'object') return false
  if (credential.type === 'api_key') return Boolean(credential.key || credential.keyRef)
  if (credential.type === 'token') {
    if (!credential.token && !credential.tokenRef) return false
    return typeof credential.expires !== 'number' || credential.expires > Date.now()
  }
  if (credential.type === 'oauth') {
    if (!credential.access && !credential.refresh) return false
    if (credential.refresh) return true
    return typeof credential.expires !== 'number' || credential.expires > Date.now()
  }
  return Boolean(credential.access || credential.refresh || credential.token || credential.key)
}

function hasUsableAuthProfileForProvider(gatewayEnv, provider, options = {}) {
  const expected = normalizeProviderId(provider)
  if (!expected) return false
  const authPath = resolveAuthProfilesPath(gatewayEnv)
  const store = readJsonFile(authPath)
  const profiles = store?.profiles && typeof store.profiles === 'object' ? store.profiles : null
  if (!profiles) {
    if (!options.quiet) console.warn(`[vclaw] OpenClaw webauth profile store is missing: ${authPath}`)
    return false
  }

  for (const credential of Object.values(profiles)) {
    if (normalizeProviderId(credential?.provider) !== expected) continue
    if (isUsableAuthCredential(credential)) return true
  }

  if (!options.quiet) {
    console.warn(`[vclaw] OpenClaw webauth provider "${provider}" has no usable profile in ${authPath}`)
  }
  return false
}

function stopOpenClawGateway() {
  try {
    if (fs.existsSync(OPENCLAW_PID_FILE)) {
      const pid = parseInt(fs.readFileSync(OPENCLAW_PID_FILE, 'utf8').trim(), 10)
      if (!Number.isNaN(pid)) {
        try {
          process.kill(pid, 'SIGTERM')
        } catch {}
      }
      fs.unlinkSync(OPENCLAW_PID_FILE)
    }
  } catch (err) {
    console.warn('[vclaw] Failed to stop OpenClaw from pid file:', err.message)
  }

  const port = process.env.OPENCLAW_GATEWAY_PORT || '3001'
  try {
    if (process.platform === 'win32') return
    const stdout = execFileSync('lsof', [`-ti:${port}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    for (const value of stdout.split('\n')) {
      const pid = parseInt(value.trim(), 10)
      if (!Number.isNaN(pid)) {
        try {
          process.kill(pid, 'SIGTERM')
        } catch {}
      }
    }
  } catch {}
}

async function waitForGatewayUrl(url, timeout = 30_000) {
  const parsed = new URL(url)
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  await waitForPort(port, timeout)
}

async function runOpenClawOnboard(command, gatewayEnv) {
  const provider = resolvePrimaryWebAuthProvider(gatewayEnv)
  if (hasUsableAuthProfileForProvider(gatewayEnv, provider, { quiet: true })) {
    console.log(`[vclaw] OpenClaw webauth already ready for ${provider}`)
    return true
  }

  try {
    console.log(`[vclaw] Ensuring OpenClaw webauth for ${provider}...`)
    await execFileAsync(
      command.cmd,
      [...command.args, 'onboard', 'webauth', '--providers', provider],
      {
        env: openClawEnv(gatewayEnv),
        timeout: 600_000,
      },
    )
  } catch (err) {
    console.warn('[vclaw] OpenClaw webauth did not complete:', err.message)
    return false
  }

  if (!hasUsableAuthProfileForProvider(gatewayEnv, provider)) {
    return false
  }
  console.log('[vclaw] OpenClaw webauth ready')
  return true
}

async function ensureOpenClawGateway(gatewayEnv) {
  if (gatewayEnv.OPENCLAW_GATEWAY_VARIANT !== 'zero-token') return

  const command = await ensurePackagedOpenClaw(gatewayEnv)
  repairRuntimePluginManifests(gatewayEnv)
  const onboardReady = await runOpenClawOnboard(command, gatewayEnv)
  if (!onboardReady) {
    console.warn('[vclaw] OpenClaw webauth is not ready; starting gateway so VClaw can finish WebAuth from the app.')
  }

  stopOpenClawGateway()
  fs.mkdirSync(path.dirname(OPENCLAW_PID_FILE), { recursive: true })
  const out = fs.openSync(OPENCLAW_GATEWAY_LOG, 'a')
  const err = fs.openSync(OPENCLAW_GATEWAY_LOG, 'a')
  const port = gatewayEnv.OPENCLAW_GATEWAY_PORT || '3001'

  console.log(`[vclaw] Starting OpenClaw gateway on port ${port}...`)
  let child
  try {
    child = spawn(command.cmd, [...command.args, 'gateway', 'run', '--port', port, '--force'], {
      detached: true,
      stdio: ['ignore', out, err],
      env: openClawEnv(gatewayEnv),
      shell: process.platform === 'win32' && /\.cmd$/i.test(command.cmd),
    })
  } catch (err) {
    console.warn(`[vclaw] Failed to start OpenClaw gateway: ${err.message}`)
    return
  }

  child.once('error', (err) => {
    console.warn(`[vclaw] Failed to start OpenClaw gateway: ${err.message}`)
  })
  child.unref()
  if (child.pid) fs.writeFileSync(OPENCLAW_PID_FILE, String(child.pid))

  try {
    await waitForGatewayUrl(gatewayEnv.OPENCLAW_GATEWAY_URL, 30_000)
    console.log('[vclaw] OpenClaw gateway ready')
  } catch (err) {
    console.warn(`[vclaw] OpenClaw gateway did not become ready: ${err.message}`)
    console.warn(`[vclaw] Gateway log: ${OPENCLAW_GATEWAY_LOG}`)
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

function startNextServer(port, gatewayEnv) {
  const script = getServerScript()
  if (!fs.existsSync(script)) {
    console.error('[vclaw] standalone server not found:', script)
    return false
  }

  const nodeCommand = IS_ELECTRON_MAIN ? (process.env.VCLAW_NODE_PATH || 'node') : process.execPath
  nextProcess = spawn(nodeCommand, [script], {
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

async function openElectronWindowInProcess(url) {
  const { app, BrowserWindow } = require('electron')
  await app.whenReady()

  const userData = resolveElectronUserData()
  fs.mkdirSync(userData, { recursive: true })
  app.setPath('userData', userData)
  app.setName(process.env.VCLAW_WINDOW_TITLE || 'VClaw')
  try {
    app.setAppUserModelId('com.solana8800.vclaw')
  } catch {}

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: process.env.VCLAW_WINDOW_TITLE || 'VClaw',
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const reveal = () => {
    if (win.isDestroyed()) return
    if (!win.isVisible()) win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  win.once('ready-to-show', reveal)
  win.webContents.on('did-finish-load', reveal)
  win.on('closed', () => {
    if (!shuttingDown) shutdown(0)
  })
  await win.loadURL(url).catch((err) => {
    console.error('[vclaw] Electron loadURL:', err.message)
    throw err
  })
  console.log('[vclaw] Electron shell started in packaged main process')
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  releaseLock()
  stopOpenClawGateway()

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
    stopOpenClawGateway()
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
  if (IS_ELECTRON_MAIN) {
    return openElectronWindowInProcess(url)
  }

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
  const gatewayEnv = resolveGatewayRuntimeEnv()

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
    if (!startNextServer(port, gatewayEnv)) process.exit(1)

    console.log(`[vclaw] Starting Next.js on port ${port}...`)
    await waitForPort(port, 30_000).catch((err) => {
      console.error('[vclaw]', err.message)
      shutdown(1)
    })
  }

  const url = `http://127.0.0.1:${port}`
  console.log(`[vclaw] Opening ${url} in Electron`)
  await openElectronWindow(url)
  if (!IS_ELECTRON_MAIN) {
    await waitForPort(9222, 30_000).catch((err) => {
      console.warn(`[vclaw] Electron CDP was not ready before OpenClaw onboard: ${err.message}`)
    })
  }
  await ensureOpenClawGateway(gatewayEnv)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('exit', () => {
  stopOpenClawGateway()
  releaseLock()
})

main().catch((err) => {
  console.error('[vclaw] Fatal:', err)
  shutdown(1)
})
