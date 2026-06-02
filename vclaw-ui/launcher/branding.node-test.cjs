'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
  resolveAboutPanelIconPath,
  resolveBrandingIconPath,
} = require('./branding.cjs')

test('ưu tiên icon từ env trước icon bundled', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-branding-'))
  const envIcon = path.join(tempDir, 'env-icon.png')
  const launcherIcon = path.join(tempDir, 'app-icon.png')
  fs.writeFileSync(envIcon, 'env')
  fs.writeFileSync(launcherIcon, 'launcher')

  assert.equal(
    resolveBrandingIconPath({
      env: { VCLAW_ICON_PATH: envIcon },
      launcherDir: tempDir,
      repoRoot: tempDir,
    }),
    envIcon,
  )
})

test('dùng icon từ launcher khi env chưa có', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-branding-'))
  const launcherIcon = path.join(tempDir, 'app-icon.png')
  fs.writeFileSync(launcherIcon, 'launcher')

  assert.equal(
    resolveBrandingIconPath({
      env: {},
      launcherDir: tempDir,
      repoRoot: tempDir,
    }),
    launcherIcon,
  )
})

test('about panel cũng nhận icon PNG từ cùng nguồn branding', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-branding-about-'))
  const aboutIcon = path.join(tempDir, 'vclaw-logo.png')
  fs.writeFileSync(aboutIcon, 'about')

  assert.equal(
    resolveAboutPanelIconPath({
      env: { VCLAW_ABOUT_ICON_PATH: aboutIcon },
      launcherDir: tempDir,
      repoRoot: tempDir,
    }),
    aboutIcon,
  )
})
