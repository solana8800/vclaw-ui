'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

let aboutIconTempFile = null

function resolveCandidatePaths({ env = process.env, launcherDir = __dirname, repoRoot = path.join(__dirname, '..') } = {}) {
  const resolvedEnvIcon = env.VCLAW_ICON_PATH ? path.resolve(env.VCLAW_ICON_PATH) : ''
  const resolvedAboutIcon = env.VCLAW_ABOUT_ICON_PATH ? path.resolve(env.VCLAW_ABOUT_ICON_PATH) : ''
  return [
    resolvedEnvIcon,
    resolvedAboutIcon,
    path.join(launcherDir, 'app-icon.png'),
    path.join(launcherDir, 'app-icon.jpg'),
    path.join(launcherDir, 'branding', 'app-icon.png'),
    path.join(launcherDir, 'branding', 'app-icon.jpg'),
    path.join(repoRoot, 'app-icon.png'),
    path.join(repoRoot, 'app-icon.jpg'),
    path.join(repoRoot, 'app', 'icon.png'),
    path.join(repoRoot, 'public', 'vclaw-logo.png'),
    path.join(repoRoot, '..', 'scripts', 'packaging', 'vclaw-logo.png'),
    path.join(repoRoot, '..', 'assets', 'vclaw-logo.png'),
    path.join(repoRoot, '..', 'vclaw-ui', 'public', 'vclaw-logo.png'),
  ].filter(Boolean)
}

function resolveBrandingIconPath(options = {}) {
  for (const candidate of resolveCandidatePaths(options)) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return null
}

function loadBrandingNativeImage(options = {}) {
  const iconPath = resolveBrandingIconPath(options)
  if (!iconPath) return undefined
  try {
    const { nativeImage } = require('electron')
    const image = nativeImage.createFromPath(iconPath)
    return image.isEmpty() ? undefined : image
  } catch {
    return undefined
  }
}

function resolveAboutPanelIconPath(options = {}) {
  const env = options.env || process.env
  const explicit = env.VCLAW_ABOUT_ICON_PATH || env.VCLAW_ICON_PATH
  const candidates = [
    explicit ? path.resolve(explicit) : '',
    path.join(options.launcherDir || __dirname, 'branding', 'app-icon.png'),
    path.join(options.repoRoot || path.join(__dirname, '..'), 'app', 'icon.png'),
    path.join(options.repoRoot || path.join(__dirname, '..'), 'public', 'vclaw-logo.png'),
    path.join(options.repoRoot || path.join(__dirname, '..'), '..', 'scripts', 'packaging', 'vclaw-logo.png'),
    path.join(options.repoRoot || path.join(__dirname, '..'), '..', 'assets', 'vclaw-logo.png'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue
    if (/\.(png|jpe?g)$/i.test(candidate)) return candidate
  }

  const icnsPath = path.join(options.launcherDir || __dirname, '..', 'AppIcon.icns')
  if (!fs.existsSync(icnsPath)) return null
  try {
    const { nativeImage } = require('electron')
    const img = nativeImage.createFromPath(icnsPath)
    if (img.isEmpty()) return null
    aboutIconTempFile = path.join(os.tmpdir(), `vclaw-about-${process.pid}.png`)
    fs.writeFileSync(aboutIconTempFile, img.toPNG())
    return aboutIconTempFile
  } catch {
    return null
  }
}

function loadAboutDialogNativeImage(options = {}) {
  const { nativeImage } = require('electron')
  const iconPath = resolveAboutPanelIconPath(options)
  if (!iconPath) return loadBrandingNativeImage(options)
  try {
    const img = nativeImage.createFromPath(iconPath)
    return img.isEmpty() ? loadBrandingNativeImage(options) : img
  } catch {
    return loadBrandingNativeImage(options)
  }
}

function cleanupBrandingArtifacts() {
  if (!aboutIconTempFile) return
  try {
    fs.unlinkSync(aboutIconTempFile)
  } catch {}
  aboutIconTempFile = null
}

module.exports = {
  cleanupBrandingArtifacts,
  loadAboutDialogNativeImage,
  loadBrandingNativeImage,
  resolveAboutPanelIconPath,
  resolveBrandingIconPath,
}
