'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
  readSavedWindowBounds,
  resolveInitialWindowBounds,
  saveWindowBounds,
} = require('./window-state.cjs')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vclaw-window-state-'))
}

test('reuses saved bounds when visible on the current display', () => {
  assert.deepEqual(
    resolveInitialWindowBounds({
      savedBounds: { x: 120, y: 80, width: 1280, height: 860 },
      displayBounds: { x: 0, y: 0, width: 1440, height: 900 },
      defaultBounds: { width: 1280, height: 860 },
    }),
    { x: 120, y: 80, width: 1280, height: 860, center: false },
  )
})

test('fallback centers default bounds when saved bounds nằm ngoài màn hình', () => {
  assert.deepEqual(
    resolveInitialWindowBounds({
      savedBounds: { x: 5000, y: 5000, width: 1280, height: 860 },
      displayBounds: { x: 0, y: 0, width: 1440, height: 900 },
      defaultBounds: { width: 1280, height: 860 },
    }),
    { x: 80, y: 20, width: 1280, height: 860, center: false },
  )
})

test('saveWindowBounds persists and readSavedWindowBounds reads lại bounds gần nhất', () => {
  const tempDir = makeTempDir()
  const statePath = path.join(tempDir, 'window-state.json')
  saveWindowBounds(statePath, { x: 33, y: 44, width: 1200, height: 800 })

  assert.deepEqual(readSavedWindowBounds(statePath), {
    x: 33,
    y: 44,
    width: 1200,
    height: 800,
  })
})
