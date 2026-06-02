'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')

const DEFAULT_CHANNEL = 'stable'
const DEFAULT_MANIFEST_URL =
  'https://github.com/solana8800/vclaw/releases/latest/download/vclaw-ui-update.json'

function normalizeVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`Phiên bản không hợp lệ: ${value}`)
  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  const a = normalizeVersion(left)
  const b = normalizeVersion(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1
    if (a[index] < b[index]) return -1
  }
  return 0
}

function resolveManifestPayload(manifest, options) {
  if (!manifest || manifest.schemaVersion !== 1) {
    throw new Error('Manifest cập nhật không đúng schemaVersion=1')
  }
  const channel = options.channel || DEFAULT_CHANNEL
  if (manifest.channel !== channel) {
    throw new Error(`Manifest không thuộc kênh ${channel}`)
  }
  if (compareVersions(manifest.uiVersion, options.currentUiVersion) <= 0) return null
  const minLauncherVersion = manifest.minLauncherVersion || manifest.minimumLauncherVersion || '0.0.0'
  if (compareVersions(options.launcherVersion, minLauncherVersion) < 0) {
    throw new Error(`Bản cập nhật yêu cầu launcher ${minLauncherVersion}`)
  }
  const payloads = Array.isArray(manifest.payloads)
    ? manifest.payloads
    : manifest.payload
      ? [manifest.payload]
      : []
  const payload = payloads.find(
    (entry) => entry.platform === options.platform && entry.arch === options.arch,
  )
  if (!payload) {
    throw new Error(`Không có payload cho ${options.platform}-${options.arch}`)
  }
  if (!/^https:\/\//.test(String(payload.url || ''))) {
    throw new Error('Payload update phải dùng URL HTTPS')
  }
  if (!/^[a-f0-9]{64}$/i.test(String(payload.sha256 || ''))) {
    throw new Error('Payload update thiếu SHA-256 hợp lệ')
  }
  return {
    ...payload,
    uiVersion: manifest.uiVersion,
    required: manifest.required === true,
  }
}

function resolveNativeInstaller(manifest, options) {
  const nativeVersion = String(manifest?.nativeVersion || '').trim()
  if (!nativeVersion) return null
  if (compareVersions(nativeVersion, options.currentNativeVersion) <= 0) return null
  const installers = Array.isArray(manifest.nativeInstallers) ? manifest.nativeInstallers : []
  const installer = installers.find(
    (entry) => entry.platform === options.platform && entry.arch === options.arch,
  )
  if (!installer) return null
  if (!/^https:\/\//.test(String(installer.url || ''))) {
    throw new Error('Native installer phải dùng URL HTTPS')
  }
  return {
    ...installer,
    nativeVersion,
    required: manifest.nativeRequired === true,
  }
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  await pipeline(fs.createReadStream(filePath), hash)
  return hash.digest('hex')
}

function readActiveState(updateDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(updateDir, 'active.json'), 'utf8'))
  } catch {
    return {}
  }
}

function writeActiveState(updateDir, state) {
  fs.mkdirSync(updateDir, { recursive: true })
  const statePath = path.join(updateDir, 'active.json')
  const tempPath = `${statePath}.${process.pid}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`)
  fs.renameSync(tempPath, statePath)
}

function resolveActiveServerScript(updateDir) {
  const state = readActiveState(updateDir)
  const version = String(state.activeVersion || '').trim()
  const failedVersions = Array.isArray(state.failedVersions) ? state.failedVersions : []
  if (!version || failedVersions.includes(version)) return null
  const script = path.join(updateDir, 'versions', version, 'server.js')
  return fs.existsSync(script) ? script : null
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
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

async function extractZip(archivePath, outputDir) {
  if (process.platform === 'win32') {
    await run('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force',
      archivePath,
      outputDir,
    ])
    return
  }
  await run('unzip', ['-q', archivePath, '-d', outputDir])
}

function validateArchiveEntry(entry) {
  const normalized = String(entry || '').replaceAll('\\', '/')
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized)) return false
  return !normalized.split('/').includes('..')
}

async function listZipEntries(archivePath) {
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::OpenRead($args[0]).Entries | ForEach-Object FullName',
      archivePath,
    ])
    return stdout.split(/\r?\n/).filter(Boolean)
  }
  const { stdout } = await run('unzip', ['-Z1', archivePath])
  return stdout.split(/\r?\n/).filter(Boolean)
}

async function stagePayloadArchive({ archivePath, updateDir, uiVersion }) {
  normalizeVersion(uiVersion)
  const versionsDir = path.join(updateDir, 'versions')
  const targetDir = path.join(versionsDir, uiVersion)
  const stagingDir = path.join(versionsDir, `.staging-${uiVersion}-${process.pid}`)
  await fsp.rm(stagingDir, { recursive: true, force: true })
  await fsp.mkdir(stagingDir, { recursive: true })
  try {
    const entries = await listZipEntries(archivePath)
    if (entries.length === 0 || entries.some((entry) => !validateArchiveEntry(entry))) {
      throw new Error('Payload update chứa đường dẫn ZIP không an toàn')
    }
    await extractZip(archivePath, stagingDir)
    if (!fs.existsSync(path.join(stagingDir, 'server.js'))) {
      throw new Error('Payload update thiếu server.js')
    }
    await fsp.rm(targetDir, { recursive: true, force: true })
    await fsp.rename(stagingDir, targetDir)
    return targetDir
  } catch (error) {
    await fsp.rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}

function defaultUpdateDir() {
  if (process.env.VCLAW_UI_UPDATE_DIR) return path.resolve(process.env.VCLAW_UI_UPDATE_DIR)
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'VClaw', 'updates', 'ui')
  }
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    return path.join(base, 'VClaw', 'updates', 'ui')
  }
  return path.join(os.homedir(), '.local', 'share', 'vclaw', 'updates', 'ui')
}

async function downloadFile(url, outputPath, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`Không tải được ${url}: HTTP ${response.status}`)
  }
  await fsp.mkdir(path.dirname(outputPath), { recursive: true })
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(outputPath))
}

async function checkAndStageUpdate(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const manifestUrl = options.manifestUrl || DEFAULT_MANIFEST_URL
  const response = await fetchImpl(manifestUrl, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Không tải được manifest update: HTTP ${response.status}`)
  }
  const manifest = await response.json()
  const payload = resolveManifestPayload(manifest, options)
  if (!payload) return null

  const updateDir = options.updateDir || defaultUpdateDir()
  const archivePath = path.join(updateDir, 'downloads', `vclaw-ui-${payload.uiVersion}.zip`)
  if (fs.existsSync(path.join(updateDir, 'versions', payload.uiVersion, 'server.js'))) {
    return payload
  }
  await downloadFile(payload.url, archivePath, fetchImpl)
  const digest = await sha256File(archivePath)
  if (digest.toLowerCase() !== payload.sha256.toLowerCase()) {
    await fsp.rm(archivePath, { force: true })
    throw new Error(`SHA-256 không khớp cho UI ${payload.uiVersion}`)
  }
  await stagePayloadArchive({ archivePath, updateDir, uiVersion: payload.uiVersion })
  return payload
}

function activateVersion(updateDir, uiVersion) {
  const state = readActiveState(updateDir)
  writeActiveState(updateDir, {
    ...state,
    activeVersion: uiVersion,
    failedVersions: (state.failedVersions || []).filter((version) => version !== uiVersion),
    activatedAt: new Date().toISOString(),
  })
}

function markVersionFailed(updateDir, uiVersion, reason) {
  const state = readActiveState(updateDir)
  const failedVersions = new Set(state.failedVersions || [])
  if (uiVersion) failedVersions.add(uiVersion)
  writeActiveState(updateDir, {
    ...state,
    failedVersions: [...failedVersions],
    lastFailure: {
      uiVersion,
      reason: String(reason || ''),
      failedAt: new Date().toISOString(),
    },
  })
}

module.exports = {
  DEFAULT_MANIFEST_URL,
  activateVersion,
  checkAndStageUpdate,
  compareVersions,
  defaultUpdateDir,
  downloadFile,
  markVersionFailed,
  readActiveState,
  resolveActiveServerScript,
  resolveManifestPayload,
  resolveNativeInstaller,
  sha256File,
  stagePayloadArchive,
  validateArchiveEntry,
  writeActiveState,
}
