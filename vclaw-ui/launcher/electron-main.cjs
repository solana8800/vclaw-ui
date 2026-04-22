'use strict'

/**
 * Electron shell — branding VClaw (tên app, Dock, About, icon cửa sổ).
 * Env: VCLAW_URL, VCLAW_WINDOW_TITLE, VCLAW_ELECTRON_USER_DATA, VCLAW_APP_VERSION,
 * VCLAW_ICON_PATH, VCLAW_ABOUT_ICON_PATH (PNG; dùng cho hộp thoại Giới thiệu)
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { app, BrowserWindow, nativeImage, Menu, dialog, ipcMain, screen } = require('electron')

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

let shellIpcRegistered = false

function registerShellIpcHandlers() {
  if (shellIpcRegistered) return
  shellIpcRegistered = true
  ipcMain.on('vclaw-shell:recovery-go-home', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(startUrl)
    }
  })
  ipcMain.on('vclaw-shell:recovery-quit', () => {
    app.quit()
  })
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildRecoveryDataUrl(code, description) {
  const codeStr = escapeHtml(code)
  const descStr = escapeHtml(description)
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VClaw — không tải được màn hình</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #0a0a0a; color: #fafafa; display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 520px; width: 100%; background: #171717; border: 1px solid #2e2e2e; border-radius: 16px;
      padding: 28px 24px;
    }
    h1 { font-size: 1.25rem; margin: 0 0 12px; }
    p.detail { font-size: 0.85rem; color: #a3a3a3; margin: 0 0 8px; word-break: break-word; }
    .hint { font-size: 0.75rem; color: #737373; margin: 16px 0 0; line-height: 1.45; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    button {
      cursor: pointer; border: none; border-radius: 10px; padding: 10px 16px; font-size: 0.875rem; font-weight: 600;
    }
    .primary { background: #e11d48; color: #fff; }
    .secondary { background: #262626; color: #fafafa; border: 1px solid #404040; }
    .danger { background: transparent; color: #f87171; border: 1px solid #7f1d1d; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Không tải được màn hình / Screen could not load</h1>
    <p class="detail">Mã lỗi / code: ${codeStr}</p>
    <p class="detail">${descStr}</p>
    <div class="actions">
      <button class="primary" type="button" id="retry">Thử lại / Retry</button>
      <button class="secondary" type="button" id="home">Về màn hình chính / Home</button>
      <button class="danger" type="button" id="quit">Thoát / Quit</button>
    </div>
    <p class="hint">macOS: menu <strong>${BRAND_NAME}</strong> → Thoát (Cmd+Q). Dùng <strong>Điều hướng</strong> để Tải lại / Về màn hình chính / Quay lại. Use <strong>Điều hướng</strong> (Navigate) for Reload / Home / Back.</p>
  </div>
  <script>
    function go() {
      if (window.__VCLAW_SHELL && window.__VCLAW_SHELL.recoveryGoHome) window.__VCLAW_SHELL.recoveryGoHome()
    }
    function quit() {
      if (window.__VCLAW_SHELL && window.__VCLAW_SHELL.recoveryQuit) window.__VCLAW_SHELL.recoveryQuit()
    }
    document.getElementById('retry').addEventListener('click', go)
    document.getElementById('home').addEventListener('click', go)
    document.getElementById('quit').addEventListener('click', quit)
  </script>
</body>
</html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

function isRecoveryUrl(url) {
  return typeof url === 'string' && url.startsWith('data:text/html')
}

/**
 * @param {import('electron').WebContents} webContents
 */
function showRecoveryPage(webContents, code, description) {
  if (!webContents || webContents.isDestroyed()) return
  try {
    if (isRecoveryUrl(webContents.getURL())) return
  } catch {
    // getURL can throw if destroyed mid-flight
    return
  }
  try {
    void webContents.loadURL(buildRecoveryDataUrl(code, description))
  } catch (err) {
    console.error('[vclaw-electron] recovery loadURL:', err.message)
  }
}

function focusedOrMainWindow() {
  return BrowserWindow.getFocusedWindow() || mainWindow
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

  template.push({
    label: 'Điều hướng',
    submenu: [
      {
        label: 'Tải lại',
        click: () => {
          const w = focusedOrMainWindow()
          if (w && !w.isDestroyed()) w.webContents.reload()
        },
      },
      {
        label: 'Về màn hình chính',
        accelerator: 'CmdOrCtrl+Shift+H',
        click: () => {
          const w = focusedOrMainWindow()
          if (w && !w.isDestroyed()) w.loadURL(startUrl)
        },
      },
      { type: 'separator' },
      {
        label: 'Quay lại',
        accelerator: 'CmdOrCtrl+[',
        click: () => {
          const w = focusedOrMainWindow()
          if (w && !w.isDestroyed() && w.webContents.canGoBack()) w.webContents.goBack()
        },
      },
      {
        label: 'Tiến',
        accelerator: 'CmdOrCtrl+]',
        click: () => {
          const w = focusedOrMainWindow()
          if (w && !w.isDestroyed() && w.webContents.canGoForward()) w.webContents.goForward()
        },
      },
    ],
  })

  template.push({ role: 'viewMenu' })
  template.push({ role: 'windowMenu' })

  return Menu.buildFromTemplate(template)
}

let mainWindow = null

function createWindow() {
  const brandIcon = loadBrandingNativeImage()
  const preloadPath = path.join(__dirname, 'electron-preload.cjs')

  const { width: workW, height: workH } = screen.getPrimaryDisplay().workAreaSize
  const maxW = Math.floor(workW * 0.92)
  const maxH = Math.floor(workH * 0.92)
  const preferredW = 1280
  const preferredH = 800
  const winW = Math.min(preferredW, maxW)
  const winH = Math.min(preferredH, maxH)

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false,
    title: windowTitle,
    backgroundColor: '#0a0a0a',
    ...(brandIcon ? { icon: brandIcon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
    },
  })

  mainWindow.setTitle(windowTitle)
  mainWindow.loadURL(startUrl)

  // Không để document.title của Next đổi title cửa sổ thành "Electron" / tên generic
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow?.setTitle(windowTitle)
  })

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    if (errorCode === -3) return // ERR_ABORTED (navigation cancelled / replaced)
    console.warn(
      '[vclaw-electron] did-fail-load',
      errorCode,
      errorDescription,
      validatedURL,
      'isMainFrame=',
      isMainFrame,
    )
    if (mainWindow && !mainWindow.isDestroyed()) {
      showRecoveryPage(mainWindow.webContents, errorCode, errorDescription)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'crashed' && details.reason !== 'killed') return
    console.error('[vclaw-electron] render-process-gone', details.reason, details.exitCode)
    if (mainWindow && !mainWindow.isDestroyed()) {
      showRecoveryPage(
        mainWindow.webContents,
        details.exitCode ?? -1,
        `Renderer process ${details.reason}`,
      )
    }
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

  registerShellIpcHandlers()
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
