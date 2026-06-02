'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
  compareVersions,
  checkAndStageUpdate,
  resolveManifestPayload,
  resolveNativeInstaller,
  sha256File,
  writeActiveState,
  readActiveState,
  resolveActiveServerScript,
  activateVersion,
  markVersionFailed,
  stagePayloadArchive,
  validateArchiveEntry,
} = require('./ui-updater.cjs')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-ui-updater-'))
}

test('compareVersions compares numeric semantic versions', () => {
  assert.equal(compareVersions('0.2.0', '0.1.9'), 1)
  assert.equal(compareVersions('0.2.0', '0.2.0'), 0)
  assert.equal(compareVersions('0.2.0', '0.2.1'), -1)
})

test('resolveManifestPayload accepts matching stable payload for a newer compatible UI', () => {
  const payload = resolveManifestPayload(
    {
      schemaVersion: 1,
      channel: 'stable',
      uiVersion: '0.2.1',
      required: true,
      minimumLauncherVersion: '0.1.0',
      payloads: [
        {
          platform: 'darwin',
          arch: 'arm64',
          url: 'https://example.test/vclaw-ui.zip',
          sha256: 'a'.repeat(64),
        },
      ],
    },
    {
      channel: 'stable',
      currentUiVersion: '0.2.0',
      launcherVersion: '0.1.0',
      platform: 'darwin',
      arch: 'arm64',
    },
  )

  assert.equal(payload.uiVersion, '0.2.1')
  assert.equal(payload.required, true)
  assert.equal(payload.url, 'https://example.test/vclaw-ui.zip')
})

test('resolveManifestPayload rejects payload requiring a newer launcher', () => {
  assert.throws(
    () =>
      resolveManifestPayload(
        {
          schemaVersion: 1,
          channel: 'stable',
          uiVersion: '0.2.1',
          minimumLauncherVersion: '0.2.0',
          payloads: [
            {
              platform: 'darwin',
              arch: 'arm64',
              url: 'https://example.test/vclaw-ui.zip',
              sha256: 'b'.repeat(64),
            },
          ],
        },
        {
          channel: 'stable',
          currentUiVersion: '0.2.0',
          launcherVersion: '0.1.0',
          platform: 'darwin',
          arch: 'arm64',
        },
      ),
    /launcher 0\.2\.0/,
  )
})

test('sha256File returns the digest for a downloaded archive', async () => {
  const tempDir = makeTempDir()
  const filePath = path.join(tempDir, 'payload.zip')
  fs.writeFileSync(filePath, 'vclaw')
  const expected = crypto.createHash('sha256').update('vclaw').digest('hex')

  assert.equal(await sha256File(filePath), expected)
})

test('active state resolves a valid payload server and ignores a failed payload', () => {
  const tempDir = makeTempDir()
  const updateDir = path.join(tempDir, 'updates', 'ui')
  const payloadDir = path.join(updateDir, 'versions', '0.2.1')
  fs.mkdirSync(payloadDir, { recursive: true })
  fs.writeFileSync(path.join(payloadDir, 'server.js'), '// standalone')

  writeActiveState(updateDir, { activeVersion: '0.2.1' })
  assert.equal(
    resolveActiveServerScript(updateDir),
    path.join(payloadDir, 'server.js'),
  )

  writeActiveState(updateDir, {
    activeVersion: '0.2.1',
    failedVersions: ['0.2.1'],
  })
  assert.equal(resolveActiveServerScript(updateDir), null)
  assert.deepEqual(readActiveState(updateDir).failedVersions, ['0.2.1'])
})

test('activateVersion switches payload atomically and markVersionFailed blocks a broken version', () => {
  const tempDir = makeTempDir()
  const updateDir = path.join(tempDir, 'updates', 'ui')

  activateVersion(updateDir, '0.2.1')
  assert.equal(readActiveState(updateDir).activeVersion, '0.2.1')

  markVersionFailed(updateDir, '0.2.1', 'server exited')
  const state = readActiveState(updateDir)
  assert.deepEqual(state.failedVersions, ['0.2.1'])
  assert.equal(state.lastFailure.reason, 'server exited')
})

test('stagePayloadArchive extracts into a version directory and requires server.js', async () => {
  const tempDir = makeTempDir()
  const sourceDir = path.join(tempDir, 'source')
  const updateDir = path.join(tempDir, 'updates', 'ui')
  const archivePath = path.join(tempDir, 'vclaw-ui.zip')
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(sourceDir, 'server.js'), '// standalone')
  fs.writeFileSync(path.join(sourceDir, 'package.json'), '{"version":"0.2.1"}\n')

  const { execFileSync } = require('node:child_process')
  execFileSync('zip', ['-qr', archivePath, '.'], { cwd: sourceDir })

  const stagedDir = await stagePayloadArchive({
    archivePath,
    updateDir,
    uiVersion: '0.2.1',
  })

  assert.equal(stagedDir, path.join(updateDir, 'versions', '0.2.1'))
  assert.equal(fs.existsSync(path.join(stagedDir, 'server.js')), true)
})

test('validateArchiveEntry rejects ZIP paths escaping the staging directory', () => {
  assert.equal(validateArchiveEntry('server.js'), true)
  assert.equal(validateArchiveEntry('.next/static/app.js'), true)
  assert.equal(validateArchiveEntry('../outside.txt'), false)
  assert.equal(validateArchiveEntry('/tmp/outside.txt'), false)
  assert.equal(validateArchiveEntry('C:\\temp\\outside.txt'), false)
})

test('checkAndStageUpdate downloads, verifies and stages a matching payload', async () => {
  const tempDir = makeTempDir()
  const sourceDir = path.join(tempDir, 'source')
  const archivePath = path.join(tempDir, 'payload.zip')
  const updateDir = path.join(tempDir, 'updates', 'ui')
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(sourceDir, 'server.js'), '// standalone')
  require('node:child_process').execFileSync('zip', ['-qr', archivePath, '.'], { cwd: sourceDir })
  const archive = fs.readFileSync(archivePath)
  const digest = crypto.createHash('sha256').update(archive).digest('hex')
  const manifestUrl = 'https://example.test/vclaw-ui-update.json'
  const payloadUrl = 'https://example.test/vclaw-ui.zip'
  const fetchImpl = async (url) => {
    if (url === manifestUrl) {
      return new Response(
        JSON.stringify({
          schemaVersion: 1,
          channel: 'stable',
          uiVersion: '0.2.1',
          minimumLauncherVersion: '0.1.0',
          payloads: [{ platform: 'darwin', arch: 'arm64', url: payloadUrl, sha256: digest }],
        }),
      )
    }
    if (url === payloadUrl) return new Response(archive)
    return new Response('', { status: 404 })
  }

  const payload = await checkAndStageUpdate({
    channel: 'stable',
    currentUiVersion: '0.2.0',
    launcherVersion: '0.1.0',
    platform: 'darwin',
    arch: 'arm64',
    manifestUrl,
    updateDir,
    fetchImpl,
  })

  assert.equal(payload.uiVersion, '0.2.1')
  assert.equal(fs.existsSync(path.join(updateDir, 'versions', '0.2.1', 'server.js')), true)
})

test('resolveNativeInstaller returns a newer matching native installer', () => {
  const installer = resolveNativeInstaller(
    {
      schemaVersion: 1,
      nativeVersion: '0.3.0',
      nativeRequired: true,
      nativeInstallers: [
        {
          platform: 'darwin',
          arch: 'arm64',
          url: 'https://github.com/solana8800/vclaw/releases/download/v0.3.0/VClawInstaller-0.3.0-arm64.pkg',
        },
      ],
    },
    {
      currentNativeVersion: '0.2.0',
      platform: 'darwin',
      arch: 'arm64',
    },
  )

  assert.equal(installer.nativeVersion, '0.3.0')
  assert.equal(installer.required, true)
  assert.match(installer.url, /\.pkg$/)
})

test('resolveNativeInstaller ignores current native version and rejects non-HTTPS URLs', () => {
  assert.equal(
    resolveNativeInstaller(
      {
        nativeVersion: '0.2.0',
        nativeInstallers: [{ platform: 'win32', arch: 'x64', url: 'https://example.test/VClaw.exe' }],
      },
      { currentNativeVersion: '0.2.0', platform: 'win32', arch: 'x64' },
    ),
    null,
  )
  assert.throws(
    () =>
      resolveNativeInstaller(
        {
          nativeVersion: '0.3.0',
          nativeInstallers: [{ platform: 'win32', arch: 'x64', url: 'http://example.test/VClaw.exe' }],
        },
        { currentNativeVersion: '0.2.0', platform: 'win32', arch: 'x64' },
      ),
    /HTTPS/,
  )
})
