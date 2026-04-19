'use server'

import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

export type GatewayResult = {
  ok: boolean
  stdout?: string
  data?: unknown
  error?: string
}

async function runCli(args: string[], timeoutMs = 10_000): Promise<GatewayResult> {
  try {
    const { stdout } = await exec('openclaw', args, { timeout: timeoutMs })
    return { ok: true, stdout: stdout.trim() }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStatus(): Promise<GatewayResult> {
  try {
    const { stdout } = await exec('openclaw', ['gateway', 'status', '--json'], { timeout: 5_000 })
    return { ok: true, data: JSON.parse(stdout.trim()) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function gatewayStart():   Promise<GatewayResult> { return runCli(['gateway', 'start']) }
export async function gatewayStop():    Promise<GatewayResult> { return runCli(['gateway', 'stop']) }
export async function gatewayRestart(): Promise<GatewayResult> { return runCli(['gateway', 'restart']) }
