import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildUiUpdate } from './package-vclaw-ui-update.mjs';

test('buildUiUpdate creates a standalone ZIP and GitHub Release manifest with SHA-256', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-ui-release-'));
  const standaloneDir = join(tempDir, 'standalone');
  const staticDir = join(tempDir, 'static');
  const publicDir = join(tempDir, 'public');
  const outputDir = join(tempDir, 'output');
  mkdirSync(standaloneDir, { recursive: true });
  mkdirSync(staticDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(join(standaloneDir, 'prisma'), { recursive: true });
  mkdirSync(join(standaloneDir, 'dist', 'ui-update'), { recursive: true });
  mkdirSync(join(standaloneDir, 'docs', 'assets'), { recursive: true });
  mkdirSync(join(publicDir, 'docs', 'assets'), { recursive: true });
  mkdirSync(join(publicDir, 'uploads'), { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(standaloneDir, 'server.js'), "require('node:http').createServer((_req, res) => res.end('ok')).listen(Number(process.env.PORT), process.env.HOSTNAME)\n");
  writeFileSync(join(standaloneDir, 'package.json'), '{"version":"0.2.1"}\n');
  writeFileSync(join(standaloneDir, 'prisma', 'business.sqlite'), 'private database\n');
  writeFileSync(join(standaloneDir, '.env'), 'PRIVATE_TOKEN=secret\n');
  writeFileSync(join(standaloneDir, 'dist', 'VClawInstaller-0.1.0-arm64.pkg'), 'installer\n');
  writeFileSync(join(standaloneDir, 'dist', 'ui-update', 'vclaw-ui-old.zip'), 'old update\n');
  writeFileSync(join(standaloneDir, 'docs', 'assets', 'dashboard.png'), 'duplicate docs asset\n');
  writeFileSync(join(staticDir, 'app.js'), '// static\n');
  writeFileSync(join(publicDir, 'logo.txt'), 'logo\n');
  writeFileSync(join(publicDir, 'docs', 'assets', 'dashboard.png'), 'public docs asset\n');
  writeFileSync(join(publicDir, '.DS_Store'), 'finder metadata\n');
  writeFileSync(join(publicDir, 'uploads', 'customer.txt'), 'private upload\n');
  writeFileSync(
    join(outputDir, 'vclaw-ui-update.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      channel: 'stable',
      openclawRuntime: {
        version: '0.1.2',
        url: 'https://example.test/openclaw-bundled-0.1.2.tgz',
        sha256: 'c'.repeat(64),
      },
    })}\n`,
  );

  const result = buildUiUpdate({
    version: '0.2.1',
    minLauncherVersion: '0.1.0',
    platform: 'darwin',
    arch: 'arm64',
    standaloneDir,
    staticDir,
    publicDir,
    outputDir,
    baseUrl: 'https://github.com/solana8800/vclaw/releases/download/v0.2.1',
    required: true,
    nativeVersion: '0.3.0',
    nativeRequired: true,
    nativeInstallerUrl:
      'https://github.com/solana8800/vclaw/releases/download/v0.3.0/VClawInstaller-0.3.0-arm64.pkg',
    skipStartupValidation: true,
  });

  assert.equal(existsSync(result.archivePath), true);
  assert.equal(existsSync(result.manifestPath), true);
  const archiveDigest = createHash('sha256').update(readFileSync(result.archivePath)).digest('hex');
  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.uiVersion, '0.2.1');
  assert.equal(manifest.required, true);
  assert.equal(manifest.minLauncherVersion, '0.1.0');
  assert.equal(manifest.nativeVersion, '0.3.0');
  assert.equal(manifest.nativeRequired, true);
  assert.equal(manifest.openclawRuntime.version, '0.1.2');
  assert.match(manifest.nativeInstallers[0].url, /\.pkg$/);
  assert.equal(manifest.payloads[0].sha256, archiveDigest);
  assert.equal(
    manifest.payloads[0].url,
    'https://github.com/solana8800/vclaw/releases/download/v0.2.1/vclaw-ui-0.2.1-darwin-arm64.zip',
  );
  const entries = execFileSync('unzip', ['-Z1', result.archivePath], { encoding: 'utf8' });
  assert.doesNotMatch(entries, /business\.sqlite|\.env|\.DS_Store|public\/uploads|^dist\//m);
  assert.doesNotMatch(entries, /^docs\/assets\//m);
  assert.match(entries, /^public\/docs\/assets\/dashboard\.png$/m);
});

test('buildUiUpdate preserves pnpm symlinks on macOS and Linux', { skip: process.platform === 'win32' }, () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-ui-release-links-'));
  const standaloneDir = join(tempDir, 'standalone');
  const outputDir = join(tempDir, 'output');
  const packageDir = join(standaloneDir, 'node_modules', '.pnpm', 'sample@1.0.0', 'node_modules', 'sample');
  mkdirSync(packageDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(standaloneDir, 'server.js'), "require('node:http').createServer((_req, res) => res.end('ok')).listen(Number(process.env.PORT), process.env.HOSTNAME)\n");
  writeFileSync(join(packageDir, 'index.js'), 'module.exports = true\n');
  symlinkSync('.pnpm/sample@1.0.0/node_modules/sample', join(standaloneDir, 'node_modules', 'sample'));

  const result = buildUiUpdate({
    version: '0.2.1',
    minLauncherVersion: '0.1.0',
    platform: 'darwin',
    arch: 'arm64',
    standaloneDir,
    outputDir,
    baseUrl: 'https://example.test/v0.2.1',
    skipStartupValidation: true,
  });

  const extractedDir = join(tempDir, 'extracted');
  mkdirSync(extractedDir, { recursive: true });
  execFileSync('unzip', ['-q', result.archivePath, '-d', extractedDir]);
  assert.equal(lstatSync(join(extractedDir, 'node_modules', 'sample')).isSymbolicLink(), true);
});

test('buildUiUpdate rejects a standalone server that cannot start', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-ui-release-broken-'));
  const standaloneDir = join(tempDir, 'standalone');
  const outputDir = join(tempDir, 'output');
  mkdirSync(standaloneDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(standaloneDir, 'server.js'), "require('./missing-runtime')\n");

  assert.throws(
    () =>
      buildUiUpdate({
        version: '0.2.1',
        minLauncherVersion: '0.1.0',
        platform: 'darwin',
        arch: 'arm64',
        standaloneDir,
        outputDir,
        baseUrl: 'https://example.test/v0.2.1',
      }),
    /UI payload không khởi động được/,
  );
});
