# Desktop Branding And Update Relaunch Design

**Goal:** Remove Electron branding artifacts from VClaw dialogs/dock and make UI update relaunches apply the new UI bundle immediately without window flicker.

**Architecture:** Keep branding concerns inside the Electron shell layer and keep update-selection state inside the launcher process. The shell process will always resolve a VClaw native image for Dock, About, and message boxes, while the launcher process will use the active UI version state to select the correct server bundle before window creation and after a UI update is activated.

**Tech Stack:** Electron, Node.js, existing launcher child-process flow, existing UI update manifest/state helpers, macOS Dock APIs, Electron dialog APIs.

---

### 1. Branding Surface

The Electron shell must not fall back to the default Electron icon when it shows:

- About dialog
- UI update prompt
- native installer prompt
- main application Dock icon on macOS
- BrowserWindow app icon

The implementation will use the existing VClaw raster branding asset as the single source of truth and pass that icon explicitly into every dialog and window path. If the asset is missing, the code may fall back to a second VClaw asset, but never to Electron’s default image.

### 2. UI Update Relaunch

UI updates remain a GitHub Release payload downloaded by the launcher. After the user accepts a staged UI update, the launcher must activate the new version and relaunch cleanly so the next boot reads the updated active server bundle before opening the Electron window.

The launcher must continue to:

- stage and verify the ZIP payload
- keep the previous bundle as fallback when the new UI fails to start
- persist active update state atomically
- skip updates that previously failed startup

The relaunch path must avoid reusing an already running window instance with stale version state.

### 3. Window Stability And Monitor Switches

The window should not visibly jump or recreate itself when the app changes display context or when the launcher restarts the UI. The design is:

- preserve the first valid window bounds and reuse them
- do not recenter on every relaunch
- avoid destroying/recreating the browser window unless a fatal failure forces recovery
- keep reloads focused on the current `BrowserWindow` rather than reopening a new instance

This keeps monitor transitions stable and removes the visual blink caused by unnecessary window recreation.

### 4. Error Handling

If the branding asset cannot be loaded, the shell should still continue, but it must log the failure and use the strongest available VClaw fallback instead of Electron defaults. If a UI update fails after activation, the launcher must mark that version failed and restart the bundled UI bundle.

### 5. Verification

Validation must cover:

- icon resolution for About, dialog, Dock, and main window paths
- UI update activation and relaunch state selection
- failure fallback from staged UI bundle back to bundled server
- no duplicate window creation on normal relaunch

Verification will use focused launcher tests plus a quick packaged smoke check where needed.

