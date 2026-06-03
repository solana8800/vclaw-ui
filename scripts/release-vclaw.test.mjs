import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RELEASE_REPO } from './release-config.mjs';
import { buildGhReleaseCommands, buildGhReleaseCreateCommand, updateNativeInstallerManifest } from './release-vclaw.mjs';

test('release scripts publish artifacts to the configured repository', () => {
  assert.equal(RELEASE_REPO, 'solana8800/vclaw');
});

test('buildGhReleaseCommands rejects repositories different from the configured release repo', () => {
  assert.throws(
    () =>
      buildGhReleaseCommands({
        repo: 'solana8800/claw',
        tag: 'v0.1.2',
        title: 'VClaw v0.1.2',
        notes: 'Cập nhật VClaw v0.1.2',
        assets: ['dist/vclaw-ui-update.json'],
        createRelease: true,
      }),
    /repo artifact-only/,
  );
});

test('buildGhReleaseCreateCommand creates release in the configured artifact repo', () => {
  const command = buildGhReleaseCreateCommand({
    repo: RELEASE_REPO,
    tag: 'v0.1.2',
    title: 'VClaw v0.1.2',
    notes: 'Cập nhật VClaw v0.1.2',
  });

  assert.deepEqual(command, [
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
});

test('buildGhReleaseCommands uploads payloads first and manifest last with clobber', () => {
  const commands = buildGhReleaseCommands({
    repo: RELEASE_REPO,
    tag: 'v0.1.2',
    title: 'VClaw v0.1.2',
    notes: 'Cập nhật VClaw v0.1.2',
    assets: ['dist/vclaw-ui-update.json', 'dist/openclaw-bundled-0.1.2.tgz'],
    createRelease: true,
  });

  assert.deepEqual(commands[0], [
    'gh',
    'release',
    'upload',
    'v0.1.2',
    'dist/openclaw-bundled-0.1.2.tgz',
    '--repo',
    'solana8800/vclaw',
    '--clobber',
  ]);
  assert.deepEqual(commands[1], [
    'gh',
    'release',
    'upload',
    'v0.1.2',
    'dist/vclaw-ui-update.json',
    '--repo',
    'solana8800/vclaw',
    '--clobber',
  ]);
  assert.equal(commands[0].includes('--clobber'), true);
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
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.nativeVersion, '1.0.0');
  assert.equal(
    manifest.nativeInstallers[0].url,
    'https://github.com/solana8800/vclaw/releases/download/v1.0.0/VClawInstaller-1.0.0-arm64.pkg',
  );
});

test('updateNativeInstallerManifest records Ubuntu native installers with linux platform and x64 asset names', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-native-release-linux-'));
  const installerPath = join(tempDir, 'VClawInstaller-1.0.0-x64.deb');
  writeFileSync(installerPath, 'installer');

  const manifestPath = updateNativeInstallerManifest({
    version: '1.0.0',
    platform: 'linux',
    arch: 'x64',
    installerPath,
    tag: 'v1.0.0',
    required: true,
    outputDirectory: join(tempDir, 'output'),
  });

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.nativeVersion, '1.0.0');
  assert.equal(manifest.nativeRequired, true);
  assert.deepEqual(manifest.nativeInstallers[0], {
    platform: 'linux',
    arch: 'x64',
    url: 'https://github.com/solana8800/vclaw/releases/download/v1.0.0/VClawInstaller-1.0.0-x64.deb',
  });
});
