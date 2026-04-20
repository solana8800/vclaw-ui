'use strict'

/**
 * Electron shell — branding VClaw (tên app, Dock, About, icon cửa sổ).
 * Env: VCLAW_URL, VCLAW_WINDOW_TITLE, VCLAW_ELECTRON_USER_DATA, VCLAW_APP_VERSION,
 * VCLAW_ICON_PATH, VCLAW_ABOUT_ICON_PATH (PNG; dùng cho hộp thoại Giới thiệu)
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { app, BrowserWindow, nativeImage, Menu, dialog } = require('electron')

const BRAND_NAME = 'VClaw'

function defaultUserDataDir() {
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

const userDataDir = defaultUserDataDir()
try {
  fs.mkdirSync(userDataDir, { recursive: true })
  app.setPath('userData', userDataDir)
} catch (err) {
  console.error('[vclaw-electron] userData:', err.message)
}

// Tên hiển thị trên menu macOS / Activity Monitor (thay "Electron")
app.setName(BRAND_NAME)
try {
  process.title = BRAND_NAME
} catch {}

const startUrl = process.env.VCLAW_URL
const windowTitle = process.env.VCLAW_WINDOW_TITLE || BRAND_NAME
const appVersion = (process.env.VCLAW_APP_VERSION || '').trim()

function readFallbackVersion() {
  const candidates = [
    path.join(__dirname, '..', 'app', 'package.json'),
    path.join(__dirname, '..', 'package.json'),
    path.join(__dirname, '..', '..', 'package.json'),
  ]
  for (const p of candidates) {
    try {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')).version
      if (v) return String(v)
    } catch {}
  }
  return ''
}

const resolvedVersion = appVersion || readFallbackVersion()

if (!startUrl || !/^https?:\/\//.test(startUrl)) {
  console.error('[vclaw-electron] Missing or invalid VCLAW_URL')
  app.quit()
  process.exit(1)
}

/** @returns {string | null} */
function resolveBrandingIconPath() {
  const extra = process.env.VCLAW_ICON_PATH
  const candidates = [
    extra && path.resolve(extra),
    path.join(__dirname, 'branding', 'app-icon.png'),
    path.join(__dirname, '..', 'AppIcon.icns'),
    path.join(__dirname, '..', '..', 'assets', 'vclaw-logo.png'),
  ].filter(Boolean)
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p
  }
  return null
}

/**
 * About panel macOS chỉ dùng được PNG/JPEG cho iconPath — .icns bị bỏ qua → logo Electron.
 * Trả về đường dẫn tuyệt đối tới file ảnh raster; có thể tạo PNG tạm từ AppIcon.icns.
 */
let aboutIconTempFile = null

/** @returns {string | null} */
function resolveAboutPanelIconPath() {
  const rasterCandidates = [
    process.env.VCLAW_ABOUT_ICON_PATH,
    process.env.VCLAW_ICON_PATH,
    path.join(__dirname, 'branding', 'app-icon.png'),
    path.join(__dirname, '..', '..', 'assets', 'vclaw-logo.png'),
  ]
    .filter(Boolean)
    .map((p) => path.resolve(p))

  for (const p of rasterCandidates) {
    if (fs.existsSync(p) && /\.(png|jpe?g)$/i.test(p)) {
      return p
    }
  }

  const icnsPath = path.resolve(path.join(__dirname, '..', 'AppIcon.icns'))
  if (!fs.existsSync(icnsPath)) return null
  try {
    const img = nativeImage.createFromPath(icnsPath)
    if (img.isEmpty()) return null
    aboutIconTempFile = path.join(os.tmpdir(), `vclaw-about-${process.pid}.png`)
    fs.writeFileSync(aboutIconTempFile, img.toPNG())
    return aboutIconTempFile
  } catch {
    return null
  }
}

/** @returns {import('electron').NativeImage | undefined} */
function loadBrandingNativeImage() {
  const iconPath = resolveBrandingIconPath()
  if (!iconPath) return undefined
  try {
    const img = nativeImage.createFromPath(iconPath)
    return img.isEmpty() ? undefined : img
  } catch {
    return undefined
  }
}

/**
 * Không dùng role:about — macOS vẫn gắn panel Electron (logo nguyên tử).
 * Hộp thoại tùy chỉnh hiển thị đúng icon VClaw và chỉ phiên bản app.
 */
function loadAboutDialogIcon() {
  const pngPath = resolveAboutPanelIconPath()
  if (!pngPath) return loadBrandingNativeImage()
  try {
    const img = nativeImage.createFromPath(pngPath)
    return img.isEmpty() ? loadBrandingNativeImage() : img
  } catch {
    return loadBrandingNativeImage()
  }
}

function showVclawAbout() {
  const icon = loadAboutDialogIcon()
  const copyright = process.env.VCLAW_COPYRIGHT || `© ${BRAND_NAME}`
  const detail = resolvedVersion
    ? `Phiên bản: ${resolvedVersion}\n\n${copyright}`
    : copyright
  const parent =
    mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
  void dialog.showMessageBox(parent, {
    type: 'info',
    title: BRAND_NAME,
    message: BRAND_NAME,
    detail,
    icon: icon && !icon.isEmpty() ? icon : undefined,
    buttons: ['OK'],
    defaultId: 0,
    noLink: true,
  })
}

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin'

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = []

  if (isMac) {
    template.push({
      label: BRAND_NAME,
      submenu: [
        {
          label: `Giới thiệu ${BRAND_NAME}`,
          click: () => showVclawAbout(),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Thoát ${BRAND_NAME}` },
      ],
    })
  } else {
    template.push({
      label: 'File',
      submenu: [
        {
          label: `Giới thiệu ${BRAND_NAME}`,
          click: () => showVclawAbout(),
        },
        { type: 'separator' },
        { role: 'quit', label: `Thoát ${BRAND_NAME}` },
      ],
    })
  }

  if (isMac) {
    template.push({ role: 'editMenu' })
  } else {
    template.push({
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    })
  }

  template.push({ role: 'viewMenu' })
  template.push({ role: 'windowMenu' })

  return Menu.buildFromTemplate(template)
}

let mainWindow = null

function createWindow() {
  const brandIcon = loadBrandingNativeImage()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: windowTitle,
    backgroundColor: '#0a0a0a',
    ...(brandIcon ? { icon: brandIcon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.setTitle(windowTitle)
  mainWindow.maximize()
  mainWindow.loadURL(startUrl)

  // Không để document.title của Next đổi title cửa sổ thành "Electron" / tên generic
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow?.setTitle(windowTitle)
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const dockImg = loadBrandingNativeImage()
    if (dockImg && app.dock) {
      try {
        app.dock.setIcon(dockImg)
      } catch (err) {
        console.warn('[vclaw-electron] dock.setIcon:', err.message)
      }
    }
  }

  Menu.setApplicationMenu(buildApplicationMenu())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  if (aboutIconTempFile) {
    try {
      fs.unlinkSync(aboutIconTempFile)
    } catch {}
    aboutIconTempFile = null
  }
})
