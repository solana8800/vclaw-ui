'use strict'

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { execFile } = require('node:child_process')

const { compareVersions, downloadFile, sha256File } = require('./ui-updater.cjs')

const VERSION_FILE = '.vclaw-runtime-version'

function resolveOpenClawRuntime(manifest, options) {
  const runtime = manifest?.openclawRuntime
  const version = String(runtime?.version || '').trim()
  if (!version) return null
  if (compareVersions(version, options.currentVersion || '0.0.0') <= 0) return null
  if (!/^https:\/\//.test(String(runtime.url || ''))) {
    throw new Error('OpenClaw runtime phải dùng URL HTTPS')
  }
  if (!/^[a-f0-9]{64}$/i.test(String(runtime.sha256 || ''))) {
    throw new Error('OpenClaw runtime thiếu SHA-256 hợp lệ')
  }
  return { version, url: runtime.url, sha256: runtime.sha256 }
}

function readInstalledRuntimeVersion(runtimeDir) {
  try {
    return fs.readFileSync(path.join(runtimeDir, VERSION_FILE), 'utf8').trim() || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

async function downloadAndVerifyRuntime(runtime, options) {
  const archivePath = path.join(options.downloadDir, `openclaw-bundled-${runtime.version}.tgz`)
  await downloadFile(runtime.url, archivePath, options.fetchImpl)
  const digest = await sha256File(archivePath)
  if (digest.toLowerCase() !== runtime.sha256.toLowerCase()) {
    await fsp.rm(archivePath, { force: true })
    throw new Error(`SHA-256 không khớp cho OpenClaw runtime ${runtime.version}`)
  }
  return archivePath
}

function runInstall({ archivePath, stagingDir, env }) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  return new Promise((resolve, reject) => {
    execFile(
      npmCommand,
      ['install', archivePath, '--foreground-scripts', '--loglevel', 'warn'],
      { cwd: stagingDir, env, timeout: 600_000 },
      (error) => (error ? reject(error) : resolve()),
    )
  })
}

function hasOpenClawBinary(runtimeDir) {
  return ['openclaw', 'openclaw.cmd'].some((name) =>
    fs.existsSync(path.join(runtimeDir, 'node_modules', '.bin', name)),
  )
}

async function installRuntimeAtomically(options) {
  const { archivePath, runtimeDir, version } = options
  const stagingDir = `${runtimeDir}.staging-${version}-${process.pid}`
  const backupDir = `${runtimeDir}.backup-${Date.now()}`
  await fsp.rm(stagingDir, { recursive: true, force: true })
  await fsp.mkdir(path.join(stagingDir, '.npm-cache'), { recursive: true })
  await fsp.writeFile(
    path.join(stagingDir, 'package.json'),
    '{"name":"openclaw-runtime","version":"1.0.0","private":true}\n',
  )
  try {
    const installImpl = options.installImpl || runInstall
    await installImpl({
      archivePath,
      stagingDir,
      env: {
        ...process.env,
        ...(options.env || {}),
        NPM_CONFIG_CACHE: path.join(stagingDir, '.npm-cache'),
      },
    })
    if (!hasOpenClawBinary(stagingDir)) {
      throw new Error('OpenClaw runtime mới thiếu binary openclaw')
    }
    await fsp.writeFile(path.join(stagingDir, VERSION_FILE), `${version}\n`)
    if (fs.existsSync(runtimeDir)) await fsp.rename(runtimeDir, backupDir)
    await fsp.rename(stagingDir, runtimeDir)
    return { runtimeDir, backupDir }
  } catch (error) {
    await fsp.rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}

function rollbackRuntimeSwap({ runtimeDir, backupDir }) {
  fs.rmSync(runtimeDir, { recursive: true, force: true })
  if (fs.existsSync(backupDir)) fs.renameSync(backupDir, runtimeDir)
}

function finalizeRuntimeSwap({ backupDir }) {
  fs.rmSync(backupDir, { recursive: true, force: true })
}

module.exports = {
  downloadAndVerifyRuntime,
  finalizeRuntimeSwap,
  installRuntimeAtomically,
  readInstalledRuntimeVersion,
  resolveOpenClawRuntime,
  rollbackRuntimeSwap,
}
