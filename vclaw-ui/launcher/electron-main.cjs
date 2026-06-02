'use strict'

/**
 * Electron shell — branding VClaw (tên app, Dock, About, icon cửa sổ).
 * Env: VCLAW_URL, VCLAW_WINDOW_TITLE, VCLAW_ELECTRON_USER_DATA, VCLAW_APP_VERSION,
 * VCLAW_ICON_PATH, VCLAW_ABOUT_ICON_PATH (PNG; dùng cho hộp thoại Giới thiệu)
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { app, BrowserWindow, Menu, dialog, ipcMain, screen, shell } = require('electron')
const {
  cleanupBrandingArtifacts,
  loadAboutDialogNativeImage,
  loadBrandingNativeImage,
} = require('./branding.cjs')
const {
  readSavedWindowBounds,
  resolveInitialWindowBounds,
  saveWindowBounds,
} = require('./window-state.cjs')

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

// Thiết lập thương hiệu cực sớm để macOS Dock nhận diện đúng (thay vì "Electron")
app.setName(BRAND_NAME)
if (process.platform === 'darwin' && app.dock) {
  const brandIcon = loadBrandingNativeImage({
    env: process.env,
    launcherDir: __dirname,
    repoRoot: path.join(__dirname, '..'),
  })
  if (brandIcon) {
    try {
      app.dock.setIcon(brandIcon)
    } catch (err) {
      console.warn('[vclaw-electron] early dock.setIcon:', err.message)
    }
  }
}

try {
  process.title = BRAND_NAME
  app.setAppUserModelId('com.solana8800.vclaw')
} catch {}

const startUrl = process.env.VCLAW_URL
const windowTitle = process.env.VCLAW_WINDOW_TITLE || BRAND_NAME
const appVersion = (process.env.VCLAW_APP_VERSION || '').trim()
const ALLOW_DEVTOOLS = process.env.VCLAW_ENABLE_DEVTOOLS === '1'

function readFallbackVersion() {
  try {
    const nativeVersion = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'release-versions.json'), 'utf8'),
    ).nativeVersion
    if (nativeVersion) return String(nativeVersion)
  } catch {}
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

/**
 * Không dùng role:about — macOS vẫn gắn panel Electron (logo nguyên tử).
 * Hộp thoại tùy chỉnh hiển thị đúng icon VClaw và chỉ phiên bản app.
 */
function loadAboutDialogIcon() {
  return loadAboutDialogNativeImage({
    env: process.env,
    launcherDir: __dirname,
    repoRoot: path.join(__dirname, '..'),
  })
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

if (typeof process.on === 'function') {
  process.on('message', async (message) => {
    const dialogIcon = loadBrandingNativeImage({
      env: process.env,
      launcherDir: __dirname,
      repoRoot: path.join(__dirname, '..'),
    })
    if (message?.type === 'vclaw-native-update:prompt') {
      const payload = message.payload || {}
      const required = payload.required === true
      const buttons = required
        ? ['Tải installer mới']
        : ['Tải installer mới', 'Để sau']
      const detail = required
        ? `VClaw ${payload.nativeVersion} có thay đổi launcher hoặc bộ cài. Bạn cần tải installer mới và cài lại để tiếp tục cập nhật.`
        : `VClaw ${payload.nativeVersion} có thay đổi launcher hoặc bộ cài. Bạn có muốn tải installer mới để cài đặt không?`
      const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
      const result = await dialog.showMessageBox(parent, {
        type: 'info',
        title: 'Có bản VClaw mới',
        message: 'Cần cài đặt bản VClaw mới',
        detail,
        buttons,
        defaultId: 0,
        cancelId: required ? 0 : 1,
        noLink: true,
        ...(dialogIcon ? { icon: dialogIcon } : {}),
      })
      if (result.response === 0 && /^https:\/\//.test(String(payload.url || ''))) {
        await shell.openExternal(payload.url)
      }
      return
    }
    if (!message || message.type !== 'vclaw-ui-update:prompt') return
    const payload = message.payload || {}
    const required = payload.required === true
    const buttons = required
      ? ['Khởi động lại để cập nhật']
      : ['Khởi động lại để cập nhật', 'Để sau']
    const detail = required
      ? `VClaw cần khởi động lại để cài bản giao diện ${payload.uiVersion}. Đây là bản cập nhật bắt buộc.`
      : `VClaw đã tải xong bản giao diện ${payload.uiVersion}. Bạn có muốn khởi động lại để cập nhật ngay không?`
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
    const result = await dialog.showMessageBox(parent, {
      type: 'info',
      title: 'Cập nhật VClaw',
      message: 'Đã tải xong bản cập nhật',
      detail,
      buttons,
      defaultId: 0,
      cancelId: required ? 0 : 1,
      noLink: true,
      ...(dialogIcon ? { icon: dialogIcon } : {}),
    })
    if (typeof process.send === 'function') {
      process.send({
        type: 'vclaw-ui-update:response',
        id: message.id,
        accepted: result.response === 0,
      })
    }
  })
}

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isVisible()) mainWindow.show()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function createWindow() {
  const brandIcon = loadBrandingNativeImage({
    env: process.env,
    launcherDir: __dirname,
    repoRoot: path.join(__dirname, '..'),
  })
  const preloadPath = path.join(__dirname, 'electron-preload.cjs')
  const windowStatePath = path.join(app.getPath('userData'), 'window-state.json')
  const savedBounds = readSavedWindowBounds(windowStatePath)
  const displayBounds = savedBounds
    ? screen.getDisplayMatching(savedBounds).workArea
    : screen.getPrimaryDisplay().workArea
  const initialBounds = resolveInitialWindowBounds({
    savedBounds,
    displayBounds,
    defaultBounds: { width: 1280, height: 800 },
  })

  mainWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: 800,
    minHeight: 600,
    show: true,
    title: windowTitle,
    backgroundColor: '#0a0a0a',
    ...(brandIcon ? { icon: brandIcon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: ALLOW_DEVTOOLS,
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
    },
  })
  mainWindow.setMenu(null)

  mainWindow.setTitle(windowTitle)
  mainWindow.loadURL(startUrl).catch((err) => {
    console.error('[vclaw-electron] loadURL:', err.message)
    if (mainWindow && !mainWindow.isDestroyed()) {
      showRecoveryPage(mainWindow.webContents, -1, err.message)
    }
  })

  // Không để document.title của Next đổi title cửa sổ thành "Electron" / tên generic
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow?.setTitle(windowTitle)
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toLowerCase()
    if (
      key === 'f12' ||
      (input.control && input.shift && ['i', 'j', 'c'].includes(key)) ||
      (input.meta && input.alt && key === 'i')
    ) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
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

  mainWindow.webContents.on('did-finish-load', revealMainWindow)

  mainWindow.once('ready-to-show', () => {
    revealMainWindow()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('close', () => {
    try {
      saveWindowBounds(windowStatePath, mainWindow.getBounds())
    } catch (err) {
      console.warn('[vclaw-electron] window-state save:', err.message)
    }
  })
}

app.whenReady().then(() => {
  registerShellIpcHandlers()
  Menu.setApplicationMenu(process.platform === 'darwin' ? buildApplicationMenu() : null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  cleanupBrandingArtifacts()
})
