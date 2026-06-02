import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildGhReleaseCommands, updateNativeInstallerManifest } from './release-vclaw.mjs';

test('buildGhReleaseCommands creates release then uploads assets with clobber', () => {
  const commands = buildGhReleaseCommands({
    repo: 'solana8800/vclaw',
    tag: 'v0.1.2',
    title: 'VClaw v0.1.2',
    notes: 'Cập nhật VClaw v0.1.2',
    assets: ['dist/openclaw-bundled-0.1.2.tgz', 'dist/vclaw-ui-update.json'],
    createRelease: true,
  });

  assert.deepEqual(commands[0], [
    'gh',
    'release',
    'create',
    'v0.1.2',
    '--repo',
    'solana8800/vclaw',
    '--title',
    'VClaw v0.1.2',
    '--notes',
    'Cập nhật VClaw v0.1.2',
  ]);
  assert.deepEqual(commands[1].slice(0, 4), ['gh', 'release', 'upload', 'v0.1.2']);
  assert.equal(commands[1].includes('--clobber'), true);
});

test('updateNativeInstallerManifest creates output directory for the first native release', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-native-release-'));
  const installerPath = join(tempDir, 'VClawInstaller-1.0.0-arm64.pkg');
  writeFileSync(installerPath, 'installer');

  const manifestPath = updateNativeInstallerManifest({
    version: '1.0.0',
    platform: 'darwin',
    arch: 'arm64',
    installerPath,
    tag: 'v1.0.0',
    required: false,
    outputDirectory: join(tempDir, 'new-output'),
  });

  assert.equal(existsSync(manifestPath), true);
  assert.equal(JSON.parse(readFileSync(manifestPath, 'utf8')).nativeVersion, '1.0.0');
});
