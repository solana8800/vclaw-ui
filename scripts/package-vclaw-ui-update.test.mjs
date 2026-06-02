import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
  mkdirSync(join(standaloneDir, 'dist'), { recursive: true });
  mkdirSync(join(publicDir, 'uploads'), { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(standaloneDir, 'server.js'), '// standalone\n');
  writeFileSync(join(standaloneDir, 'package.json'), '{"version":"0.2.1"}\n');
  writeFileSync(join(standaloneDir, 'prisma', 'business.sqlite'), 'private database\n');
  writeFileSync(join(standaloneDir, '.env'), 'PRIVATE_TOKEN=secret\n');
  writeFileSync(join(standaloneDir, 'dist', 'VClawInstaller-0.1.0-arm64.pkg'), 'installer\n');
  writeFileSync(join(staticDir, 'app.js'), '// static\n');
  writeFileSync(join(publicDir, 'logo.txt'), 'logo\n');
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
  assert.doesNotMatch(entries, /business\.sqlite|\.env|\.DS_Store|public\/uploads|VClawInstaller-0\.1\.0-arm64\.pkg/);
});
