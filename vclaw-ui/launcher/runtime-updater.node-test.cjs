'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
  downloadAndVerifyRuntime,
  installRuntimeAtomically,
  readInstalledRuntimeVersion,
  resolveOpenClawRuntime,
  rollbackRuntimeSwap,
} = require('./runtime-updater.cjs')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-runtime-updater-'))
}

test('resolveOpenClawRuntime returns a newer HTTPS tarball with SHA-256', () => {
  const runtime = resolveOpenClawRuntime(
    {
      openclawRuntime: {
        version: '0.1.2',
        url: 'https://example.test/openclaw-bundled-0.1.2.tgz',
        sha256: 'a'.repeat(64),
      },
    },
    { currentVersion: '0.1.0' },
  )

  assert.equal(runtime.version, '0.1.2')
  assert.match(runtime.url, /\.tgz$/)
})

test('resolveOpenClawRuntime ignores current version and rejects missing checksum', () => {
  assert.equal(
    resolveOpenClawRuntime(
      {
        openclawRuntime: {
          version: '0.1.0',
          url: 'https://example.test/openclaw.tgz',
          sha256: 'b'.repeat(64),
        },
      },
      { currentVersion: '0.1.0' },
    ),
    null,
  )

  assert.throws(
    () =>
      resolveOpenClawRuntime(
        {
          openclawRuntime: {
            version: '0.1.2',
            url: 'https://example.test/openclaw.tgz',
          },
        },
        { currentVersion: '0.1.0' },
      ),
    /SHA-256/,
  )
})

test('downloadAndVerifyRuntime keeps a verified tarball', async () => {
  const tempDir = makeTempDir()
  const archive = Buffer.from('openclaw runtime')
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex')
  const archivePath = await downloadAndVerifyRuntime(
    { version: '0.1.2', url: 'https://example.test/openclaw.tgz', sha256 },
    {
      downloadDir: tempDir,
      fetchImpl: async () => new Response(archive),
    },
  )

  assert.equal(fs.readFileSync(archivePath, 'utf8'), 'openclaw runtime')
})

test('installRuntimeAtomically swaps staging runtime and rollback restores backup', async () => {
  const tempDir = makeTempDir()
  const runtimeDir = path.join(tempDir, 'runtime')
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(path.join(runtimeDir, 'old.txt'), 'old runtime')

  const swap = await installRuntimeAtomically({
    archivePath: path.join(tempDir, 'openclaw.tgz'),
    runtimeDir,
    version: '0.1.2',
    installImpl: async ({ stagingDir }) => {
      const binDir = path.join(stagingDir, 'node_modules', '.bin')
      fs.mkdirSync(binDir, { recursive: true })
      fs.writeFileSync(path.join(binDir, 'openclaw'), '#!/bin/sh\n')
      fs.writeFileSync(path.join(stagingDir, 'new.txt'), 'new runtime')
    },
  })

  assert.equal(readInstalledRuntimeVersion(runtimeDir), '0.1.2')
  assert.equal(fs.readFileSync(path.join(runtimeDir, 'new.txt'), 'utf8'), 'new runtime')
  rollbackRuntimeSwap(swap)
  assert.equal(fs.readFileSync(path.join(runtimeDir, 'old.txt'), 'utf8'), 'old runtime')
})
