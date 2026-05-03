'use server'

import { execFile, exec as execShell } from 'child_process'
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

async function runCli(args: string[], timeoutMs = 10_000): Promise<GatewayResult> {
  try {
    const { cmd, args: baseArgs } = getOpenclawCommand()
    const { stdout } = await exec(cmd, [...baseArgs, ...args], { timeout: timeoutMs })
    return { ok: true, stdout: stdout.trim() }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStatus(): Promise<GatewayResult> {
  try {
    const { cmd, args: baseArgs } = getOpenclawCommand()
    const { stdout } = await exec(cmd, [...baseArgs, 'gateway', 'status', '--json'], { timeout: 5_000 })
    return { ok: true, data: JSON.parse(stdout.trim()) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStart():   Promise<GatewayResult> { return runCli(['gateway', 'start']) }
export async function gatewayStop():    Promise<GatewayResult> { return runCli(['gateway', 'stop']) }
export async function gatewayRestart(): Promise<GatewayResult> { return runCli(['gateway', 'restart']) }

/**
 * Kích hoạt luồng xác thực WebAuth (Zalo, Facebook, Google, etc.)
 * Sẽ kết nối vào CDP (port 9222) để thực hiện automation.
 */
export async function onboardWebauth(): Promise<GatewayResult> {
  try {
    const { cmd, args: baseArgs } = getOpenclawCommand()
    // Tự động chọn 5 (Gemini Web)
    const fullCmd = [cmd, ...baseArgs, 'onboard', 'webauth'].map(a => `"${a}"`).join(' ')
    const { stdout } = await execCommand(`echo "5" | ${fullCmd}`, { timeout: 60_000 })
    return { ok: true, stdout: stdout.trim() }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
