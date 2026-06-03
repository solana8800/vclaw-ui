# Desktop Branding And Update Relaunch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Electron branding artifacts from VClaw dialogs and Dock, and make UI update relaunches apply the new bundle immediately without window flicker.

**Architecture:** Move branding resolution into a shared launcher helper so both the Node launcher and the Electron shell resolve the same VClaw icon path for Dock, About, dialogs, and window chrome. Move window bounds persistence into a second shared helper so relaunches reuse the last valid bounds, avoid recentering, and only fall back to a default layout when no safe bounds exist. Keep UI update selection in the launcher’s active-version state, but make the relaunch path always start a fresh app instance after an update is activated.

**Tech Stack:** Electron, Node.js, existing launcher child-process flow, existing UI update manifest/state helpers, macOS Dock APIs, Electron dialog APIs, node:test.

---

### Task 1: Centralize VClaw branding icon resolution and use it everywhere Electron can show an icon

**Files:**
- Create: `vclaw-ui/launcher/branding.cjs`
- Create: `vclaw-ui/launcher/branding.node-test.cjs`
- Modify: `vclaw-ui/launcher/electron-main.cjs`
- Modify: `vclaw-ui/launcher/main.js`

- [ ] **Step 1: Write the failing test for icon precedence and fallback**

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const { resolveBrandingIconPath } = require('./branding.cjs')

test('prefers VCLAW_ICON_PATH over bundled branding assets', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-branding-'))
  const envIcon = path.join(tempDir, 'env-icon.png')
  const bundledIcon = path.join(tempDir, 'app-icon.png')
  fs.writeFileSync(envIcon, 'env')
  fs.writeFileSync(bundledIcon, 'bundled')

  assert.equal(
    resolveBrandingIconPath({
      env: { VCLAW_ICON_PATH: envIcon },
      launcherDir: tempDir,
      repoRoot: tempDir,
    }),
    envIcon,
  )
})
```

- [ ] **Step 2: Implement the minimal shared resolver**

```js
function resolveBrandingIconPath({ env, launcherDir, repoRoot }) {
  const candidates = [
    env.VCLAW_ICON_PATH,
    env.VCLAW_ABOUT_ICON_PATH,
    path.join(launcherDir, 'branding', 'app-icon.png'),
    path.join(repoRoot, 'assets', 'vclaw-logo.png'),
  ]
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null
}
```

- [ ] **Step 3: Wire both launcher entrypoints to the shared resolver**

```js
const iconPath = resolveBrandingIconPath({
  env: process.env,
  launcherDir: __dirname,
  repoRoot: path.join(__dirname, '..'),
})
const brandIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined
```

Apply that path to:

```js
app.dock.setIcon(brandIcon)
new BrowserWindow({ icon: brandIcon, ... })
dialog.showMessageBox(parent, { icon: brandIcon, ... })
```

- [ ] **Step 4: Pass the icon path from `main.js` into the Electron shell child process**

```js
const child = spawn(electronBin, [mainScript], {
  env: {
    ...process.env,
    VCLAW_URL: url,
    VCLAW_WINDOW_TITLE: process.env.VCLAW_WINDOW_TITLE || 'VClaw',
    VCLAW_ELECTRON_USER_DATA: userData,
    VCLAW_ICON_PATH: path.join(__dirname, 'branding', 'app-icon.png'),
    VCLAW_ABOUT_ICON_PATH: path.join(__dirname, 'branding', 'app-icon.png'),
  },
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
})
```

- [ ] **Step 5: Run the focused branding test and confirm it fails before implementation, then passes after wiring**

Run:
```bash
node --test vclaw-ui/launcher/branding.node-test.cjs
```
Expected: first run fails before the helper exists; after implementation it passes and resolves the correct icon path.

- [ ] **Step 6: Commit**

```bash
git add vclaw-ui/launcher/branding.cjs vclaw-ui/launcher/branding.node-test.cjs vclaw-ui/launcher/electron-main.cjs vclaw-ui/launcher/main.js
git commit -m "feat: centralize VClaw branding icons"
```

### Task 2: Persist window bounds and make UI update relaunches start fresh without flicker

**Files:**
- Create: `vclaw-ui/launcher/window-state.cjs`
- Create: `vclaw-ui/launcher/window-state.node-test.cjs`
- Modify: `vclaw-ui/launcher/electron-main.cjs`
- Modify: `vclaw-ui/launcher/main.js`

- [ ] **Step 1: Write the failing test for bounds reuse and off-screen recovery**

```js
const assert = require('node:assert/strict')
const test = require('node:test')

const { resolveInitialWindowBounds } = require('./window-state.cjs')

test('reuses saved bounds when they are visible on the current display', () => {
  assert.deepEqual(
    resolveInitialWindowBounds({
      savedBounds: { x: 120, y: 80, width: 1280, height: 860 },
      displayBounds: { x: 0, y: 0, width: 1440, height: 900 },
      defaultBounds: { width: 1280, height: 860 },
    }),
    { x: 120, y: 80, width: 1280, height: 860, center: false },
  )
})
```

- [ ] **Step 2: Implement the minimal state helper**

```js
function resolveInitialWindowBounds({ savedBounds, displayBounds, defaultBounds }) {
  if (savedBounds && isVisibleOnDisplay(savedBounds, displayBounds)) {
    return { ...savedBounds, center: false }
  }
  return centerWithinDisplay(defaultBounds, displayBounds)
}
```

- [ ] **Step 3: Persist bounds from both launcher entrypoints**

```js
const windowStatePath = path.join(userData, 'window-state.json')
const initialBounds = resolveInitialWindowBounds({
  savedBounds: readWindowState(windowStatePath),
  displayBounds: screen.getDisplayMatching(savedBoundsOrDefault).workArea,
  defaultBounds: { width: 1280, height: 860 },
})

const win = new BrowserWindow({
  ...initialBounds,
  center: false,
  show: true,
  ...
})

win.on('close', () => {
  writeWindowState(windowStatePath, win.getBounds())
})
```

- [ ] **Step 4: Make the UI update relaunch always start a fresh app instance**

```js
function relaunchApplication() {
  const env = { ...process.env, VCLAW_RESTARTED_AFTER_UI_UPDATE: '1' }
  if (process.platform === 'darwin') {
    spawn('/bin/sh', ['-c', 'sleep 1; open -n -a VClaw'], {
      detached: true,
      stdio: 'ignore',
      env,
    }).unref()
    return
  }
  spawn(process.execPath, process.argv.slice(1), {
    detached: true,
    stdio: 'ignore',
    env,
  }).unref()
}
```

- [ ] **Step 5: Keep the single-instance check from collapsing the post-update relaunch back into the stale window**

```js
if (process.env.VCLAW_RESTARTED_AFTER_UI_UPDATE === '1') {
  // Chuyển sang instance mới sau update, không focus lại cửa sổ cũ.
}
```

- [ ] **Step 6: Run the focused window-state and update tests**

Run:
```bash
node --test vclaw-ui/launcher/window-state.node-test.cjs vclaw-ui/launcher/ui-updater.node-test.cjs vclaw-ui/launcher/runtime-updater.node-test.cjs
```
Expected: the helper test covers bounds reuse/recovery and the existing updater tests continue to pass.

- [ ] **Step 7: Commit**

```bash
git add vclaw-ui/launcher/window-state.cjs vclaw-ui/launcher/window-state.node-test.cjs vclaw-ui/launcher/electron-main.cjs vclaw-ui/launcher/main.js
git commit -m "feat: persist window bounds and relaunch fresh after updates"
```

### Task 3: Verify packaged icon delivery and relaunch behavior on a real app bundle

**Files:**
- Modify: `vclaw-ui/launcher/electron-main.cjs`
- Modify: `vclaw-ui/launcher/main.js`
- Test: `scripts/package-vclaw-ui-update.test.mjs`

- [ ] **Step 1: Add/adjust a smoke assertion that UI ZIPs never carry installer artifacts**

```js
assert.doesNotMatch(entries, /VClawInstaller-.*\.(pkg|deb|exe)/)
```

- [ ] **Step 2: Build the UI and package a macOS app bundle without rebuilding everything twice**

Run:
```bash
cd vclaw-ui
pnpm build
cd ..
SKIP_BUILD=1 bash scripts/package-vclaw.sh --arm64
```
Expected: `VClaw.app` is staged successfully and the packaged resources contain the VClaw branding asset, not Electron defaults.

- [ ] **Step 3: Smoke the update flow manually**

Run:
```bash
open -a VClaw
```
Expected: About dialog, UI update prompt, and Dock icon all show VClaw branding; after accepting a staged UI update, the app relaunches into the new `uiVersion` and the window opens with the previous bounds rather than a visible recenter blink.

- [ ] **Step 4: Run the final regression suite**

Run:
```bash
node --test scripts/package-vclaw-ui-update.test.mjs scripts/release-vclaw.test.mjs vclaw-ui/launcher/branding.node-test.cjs vclaw-ui/launcher/window-state.node-test.cjs vclaw-ui/launcher/ui-updater.node-test.cjs vclaw-ui/launcher/runtime-updater.node-test.cjs
pnpm lint
pnpm build
git diff --check
```
Expected: all tests and build/lint checks pass before shipping.

