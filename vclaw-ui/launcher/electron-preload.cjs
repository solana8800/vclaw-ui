'use strict'

const { contextBridge, ipcRenderer } = require('electron')

/**
 * Minimal surface for recovery.html (data: URL) — no access to Node in page.
 */
contextBridge.exposeInMainWorld('__VCLAW_SHELL', {
  recoveryGoHome: () => {
    ipcRenderer.send('vclaw-shell:recovery-go-home')
  },
  recoveryQuit: () => {
    ipcRenderer.send('vclaw-shell:recovery-quit')
  },
})
