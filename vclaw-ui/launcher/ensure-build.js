#!/usr/bin/env node
'use strict'

const { existsSync } = require('fs')
const { execSync } = require('child_process')
const path = require('path')

const UI_DIR = path.join(__dirname, '..')
const serverScript = path.join(UI_DIR, '.next', 'standalone', 'server.js')

if (!existsSync(serverScript)) {
  console.log('▶ .next/standalone not found — running pnpm build...')
  execSync('pnpm build', { stdio: 'inherit', cwd: UI_DIR })
  console.log('✓ Build complete\n')
}
