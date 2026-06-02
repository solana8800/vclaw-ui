'use strict'

const fs = require('node:fs')
const path = require('node:path')

function isFinitePositiveNumber(value) {
  return Number.isFinite(value) && value > 0
}

function normalizeBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return null
  const x = Number(bounds.x)
  const y = Number(bounds.y)
  const width = Number(bounds.width)
  const height = Number(bounds.height)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (!isFinitePositiveNumber(width) || !isFinitePositiveNumber(height)) return null
  return { x, y, width, height }
}

function intersectsDisplay(bounds, displayBounds) {
  if (!bounds || !displayBounds) return false
  const left = Math.max(bounds.x, displayBounds.x)
  const top = Math.max(bounds.y, displayBounds.y)
  const right = Math.min(bounds.x + bounds.width, displayBounds.x + displayBounds.width)
  const bottom = Math.min(bounds.y + bounds.height, displayBounds.y + displayBounds.height)
  return right - left >= Math.min(bounds.width, 128) && bottom - top >= Math.min(bounds.height, 128)
}

function centerWithinDisplay(defaultBounds, displayBounds) {
  const width = Math.max(800, Math.round(Number(defaultBounds?.width) || 1280))
  const height = Math.max(600, Math.round(Number(defaultBounds?.height) || 860))
  const display = displayBounds || { x: 0, y: 0, width, height }
  const x = Math.round(display.x + (display.width - width) / 2)
  const y = Math.round(display.y + (display.height - height) / 2)
  return { x, y, width, height, center: false }
}

function resolveInitialWindowBounds({ savedBounds, displayBounds, defaultBounds }) {
  const normalizedSaved = normalizeBounds(savedBounds)
  if (normalizedSaved && intersectsDisplay(normalizedSaved, displayBounds)) {
    return { ...normalizedSaved, center: false }
  }
  return centerWithinDisplay(defaultBounds, displayBounds)
}

function readWindowState(windowStatePath) {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath, 'utf8'))
  } catch {
    return {}
  }
}

function writeWindowState(windowStatePath, state) {
  fs.mkdirSync(path.dirname(windowStatePath), { recursive: true })
  const tempPath = `${windowStatePath}.${process.pid}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`)
  fs.renameSync(tempPath, windowStatePath)
}

function saveWindowBounds(windowStatePath, bounds) {
  const normalized = normalizeBounds(bounds)
  if (!normalized) return
  const current = readWindowState(windowStatePath)
  writeWindowState(windowStatePath, {
    ...current,
    bounds: normalized,
    savedAt: new Date().toISOString(),
  })
}

function readSavedWindowBounds(windowStatePath) {
  const state = readWindowState(windowStatePath)
  return normalizeBounds(state.bounds)
}

module.exports = {
  centerWithinDisplay,
  normalizeBounds,
  readSavedWindowBounds,
  readWindowState,
  resolveInitialWindowBounds,
  saveWindowBounds,
  writeWindowState,
}
