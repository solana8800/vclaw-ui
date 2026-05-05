'use server'

import { execFile, exec as execShell, spawn } from 'child_process'
import { promisify } from 'util'

import path from 'path'
import fs from 'fs'

const exec = promisify(execFile)
const execCommand = promisify(execShell)

export type GatewayResult = {
  ok: boolean
  stdout?: string
  data?: unknown
  error?: string
}

function getOpenclawCommand(): { cmd: string, args: string[] } {
  const devPath = path.resolve(process.cwd(), '../core/openclaw-zero-token/openclaw.mjs')
  if (fs.existsSync(devPath)) return { cmd: 'node', args: [devPath] }

  const home = process.env.HOME || process.env.USERPROFILE || ''
  const packagedPath = path.join(home, '.openclaw/runtime/node_modules/.bin/openclaw')
  if (fs.existsSync(packagedPath)) return { cmd: packagedPath, args: [] }

  return { cmd: 'openclaw', args: [] }
}

function getOpenclawEnv(): NodeJS.ProcessEnv {
  const nodeDir = path.dirname(process.execPath)
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const isDev = fs.existsSync(path.resolve(process.cwd(), '../core/openclaw-zero-token/openclaw.mjs'))
  
  const stateDir = process.env.OPENCLAW_STATE_DIR || (isDev 
    ? path.resolve(process.cwd(), '../core/openclaw-zero-token/.openclaw-upstream-state')
    : path.join(home, '.openclaw'))
    
  const env: NodeJS.ProcessEnv = { 
    ...process.env, 
    ELECTRON_RUN_AS_NODE: '1',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_CONFIG_PATH: process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, 'openclaw.json'),
    OPENCLAW_GATEWAY_PORT: process.env.OPENCLAW_GATEWAY_PORT || '3001',
    // Thêm nodeDir và các path phổ biến vào PATH
    PATH: `${nodeDir}${path.delimiter}/usr/local/bin${path.delimiter}/opt/homebrew/bin${path.delimiter}${process.env.PATH || ''}`
  }
  
  return env
}

function repairRuntimePluginManifests(): void {
  const env = getOpenclawEnv()
  const runtimePkg = path.join(env.OPENCLAW_STATE_DIR!, 'runtime/node_modules/openclaw')
  const srcRoot = path.join(runtimePkg, 'extensions')
  const distRoot = path.join(runtimePkg, 'dist/extensions')

  if (!fs.existsSync(srcRoot)) return

  const extensions = fs.readdirSync(srcRoot)
  for (const extName of extensions) {
    const extDir = path.join(srcRoot, extName)
    if (!fs.statSync(extDir).isDirectory()) continue

    const srcManifest = path.join(extDir, 'openclaw.plugin.json')
    if (!fs.existsSync(srcManifest)) continue

    const distExtDir = path.join(distRoot, extName)
    const distManifest = path.join(distExtDir, 'openclaw.plugin.json')

    if (!fs.existsSync(distManifest)) {
      if (!fs.existsSync(distExtDir)) fs.mkdirSync(distExtDir, { recursive: true })
      fs.copyFileSync(srcManifest, distManifest)
      console.log(`[Gateway] Fixed plugin manifest for ${extName}`)
    }
  }
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function normalizeProviderId(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function resolveModelProvider(modelRef: unknown): string {
  const value = typeof modelRef === 'string' ? modelRef.trim() : ''
  const slashIndex = value.indexOf('/')
  if (slashIndex <= 0) return ''
  return value.slice(0, slashIndex)
}

function resolvePrimaryWebAuthProvider(): string {
  const env = getOpenclawEnv()
  const config = readJsonFile(env.OPENCLAW_CONFIG_PATH!)
  const typed = config as {
    agents?: { defaults?: { model?: { primary?: unknown, fallbacks?: unknown } } }
    models?: { providers?: Record<string, unknown> }
  } | null
  const candidates: string[] = []
  candidates.push(resolveModelProvider(typed?.agents?.defaults?.model?.primary))
  const fallbacks = typed?.agents?.defaults?.model?.fallbacks
  if (Array.isArray(fallbacks)) {
    for (const fallback of fallbacks) candidates.push(resolveModelProvider(fallback))
  }
  if (typed?.models?.providers) candidates.push(...Object.keys(typed.models.providers))
  return candidates.find((provider) => normalizeProviderId(provider).endsWith('-web')) || 'deepseek-web'
}

function normalizeAgentIdForPath(value: unknown): string {
  const trimmed = String(value || '').trim().toLowerCase()
  if (!trimmed) return 'main'
  const normalized = trimmed
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)
  return normalized || 'main'
}

function resolveUserPath(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  if (raw === '~') return process.env.HOME || ''
  if (raw.startsWith('~/')) return path.join(process.env.HOME || '', raw.slice(2))
  return path.resolve(raw)
}

function resolveAuthProfilesPath(): string {
  const env = getOpenclawEnv()
  const explicitAgentDir = process.env.OPENCLAW_AGENT_DIR || process.env.PI_CODING_AGENT_DIR
  if (explicitAgentDir) return path.join(resolveUserPath(explicitAgentDir), 'auth-profiles.json')

  const config = readJsonFile(env.OPENCLAW_CONFIG_PATH!)
  const typed = config as {
    agents?: {
      list?: Array<{ id?: unknown, default?: unknown, agentDir?: unknown }>
    }
  } | null
  const list = Array.isArray(typed?.agents?.list)
    ? typed.agents.list.filter((entry) => entry && typeof entry === 'object')
    : []
  const chosen = list.find((entry) => entry.default) || list[0]
  const agentId = normalizeAgentIdForPath(chosen?.id || 'main')
  const agentEntry = list.find((entry) => normalizeAgentIdForPath(entry.id) === agentId)
  const configuredAgentDir = typeof agentEntry?.agentDir === 'string' ? agentEntry.agentDir.trim() : ''
  if (configuredAgentDir) return path.join(resolveUserPath(configuredAgentDir), 'auth-profiles.json')

  return path.join(env.OPENCLAW_STATE_DIR!, 'agents', agentId, 'agent', 'auth-profiles.json')
}

function isUsableAuthCredential(credential: unknown): boolean {
  if (!credential || typeof credential !== 'object') return false
  const typed = credential as Record<string, unknown>
  if (typed.type === 'api_key') return Boolean(typed.key || typed.keyRef)
  if (typed.type === 'token') {
    if (!typed.token && !typed.tokenRef) return false
    return typeof typed.expires !== 'number' || typed.expires > Date.now()
  }
  if (typed.type === 'oauth') {
    if (!typed.access && !typed.refresh) return false
    if (typed.refresh) return true
    return typeof typed.expires !== 'number' || typed.expires > Date.now()
  }
  return Boolean(typed.access || typed.refresh || typed.token || typed.key)
}

function hasUsableAuthProfileForProvider(provider: string): boolean {
  const authPath = resolveAuthProfilesPath()
  const store = readJsonFile(authPath) as { profiles?: Record<string, unknown> } | null
  const profiles = store?.profiles && typeof store.profiles === 'object' ? store.profiles : null
  if (!profiles) return false
  const expected = normalizeProviderId(provider)
  return Object.values(profiles).some((credential) => {
    if (!credential || typeof credential !== 'object') return false
    const typed = credential as Record<string, unknown>
    return normalizeProviderId(typed.provider) === expected && isUsableAuthCredential(typed)
  })
}

async function runCli(args: string[], timeoutMs = 10_000): Promise<GatewayResult> {
  try {
    const { cmd, args: baseArgs } = getOpenclawCommand()
    const { stdout } = await exec(cmd, [...baseArgs, ...args], { timeout: timeoutMs, env: getOpenclawEnv() })
    return { ok: true, stdout: stdout.trim() }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStatus(): Promise<GatewayResult> {
  try {
    const { cmd, args: baseArgs } = getOpenclawCommand()
    const { stdout } = await exec(cmd, [...baseArgs, 'gateway', 'status', '--json'], { timeout: 5_000, env: getOpenclawEnv() })
    return { ok: true, data: JSON.parse(stdout.trim()) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function getPidFilePath(): string {
  const env = getOpenclawEnv()
  return path.join(env.OPENCLAW_STATE_DIR!, '.vclaw-zero-gateway.pid')
}

export async function gatewayStart(): Promise<GatewayResult> {
  const { cmd, args: baseArgs } = getOpenclawCommand()
  const pidFile = getPidFilePath()
  const logFile = '/tmp/vclaw-zero-gateway.log'

  try {
    const onboard = await ensureGatewayWebauthReady()
    if (!onboard.ok) return onboard

    // 0. Sửa plugin manifests trước khi chạy
    repairRuntimePluginManifests()

    // Đảm bảo thư mục chứa pid file tồn tại
    const pidDir = path.dirname(pidFile)
    if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true })

    const out = fs.openSync(logFile, 'a')
    const err = fs.openSync(logFile, 'a')
    const port = process.env.OPENCLAW_GATEWAY_PORT || '3001'

    const child = spawn(cmd, [...baseArgs, 'gateway', 'run', '--port', port, '--force'], {
      detached: true,
      stdio: ['ignore', out, err],
      env: getOpenclawEnv()
    })

    child.unref()
    if (child.pid) {
      fs.writeFileSync(pidFile, String(child.pid))
    }

    return { ok: true, stdout: 'Gateway started in background' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStop(): Promise<GatewayResult> {
  const pidFile = getPidFilePath()
  try {
    // 1. Dừng theo PID file
    if (fs.existsSync(pidFile)) {
      const pidStr = fs.readFileSync(pidFile, 'utf8').trim()
      const pid = parseInt(pidStr)
      if (!isNaN(pid)) {
        try { process.kill(pid, 'SIGTERM') } catch (e) { console.log('Kill PID failed', e) }
      }
      try { fs.unlinkSync(pidFile) } catch {}
    }

    // 2. Dọn dẹp thêm bằng lsof nếu port vẫn bị chiếm
    try {
      const port = process.env.OPENCLAW_GATEWAY_PORT || '3001'
      const { stdout } = await execCommand(`lsof -ti:${port}`)
      const pids = stdout.trim().split('\n').filter(p => p)
      for (const p of pids) {
        const pid = parseInt(p)
        if (!isNaN(pid)) {
          try { process.kill(pid, 'SIGTERM') } catch {}
        }
      }
    } catch {
      // lsof trả về lỗi nếu không tìm thấy process nào, có thể bỏ qua
    }

    return { ok: true, stdout: 'Gateway stopped' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayRestart(): Promise<GatewayResult> {
  await gatewayStop()
  // Đợi một chút để port được giải phóng hoàn toàn
  await new Promise(r => setTimeout(r, 1000))
  return gatewayStart()
}

/**
 * Kích hoạt luồng xác thực WebAuth (DeepSeek, Gemini, etc.)
 * Sẽ kết nối vào CDP (port 9222) để thực hiện automation.
 */
export async function onboardWebauth(modelId = 'deepseek-web'): Promise<GatewayResult> {
  return runCli(['onboard', 'webauth', '--providers', modelId], 600_000)
}

async function ensureGatewayWebauthReady(): Promise<GatewayResult> {
  const provider = resolvePrimaryWebAuthProvider()
  if (hasUsableAuthProfileForProvider(provider)) {
    return { ok: true, stdout: `WebAuth ready: ${provider}` }
  }

  const onboard = await onboardWebauth(provider)
  if (!onboard.ok) return onboard
  if (!hasUsableAuthProfileForProvider(provider)) {
    return {
      ok: false,
      error: `WebAuth ${provider} chưa sẵn sàng. Hãy hoàn tất đăng nhập WebAuth rồi restart gateway.`,
    }
  }
  return { ok: true, stdout: `WebAuth ready: ${provider}` }
}
