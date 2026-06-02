import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildOpenClawRuntimeRelease } from './package-vclaw-openclaw-runtime.mjs';

test('buildOpenClawRuntimeRelease copies tarball and adds SHA-256 to manifest', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-runtime-release-'));
  const sourceArchive = join(tempDir, 'openclaw-source.tgz');
  const outputDir = join(tempDir, 'output');
  writeFileSync(sourceArchive, 'runtime archive');

  const result = buildOpenClawRuntimeRelease({
    version: '0.1.2',
    sourceArchive,
    outputDir,
    baseUrl: 'https://github.com/solana8800/vclaw/releases/download/v0.1.2',
  });

  assert.equal(existsSync(result.archivePath), true);
  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  const sha256 = createHash('sha256').update(readFileSync(result.archivePath)).digest('hex');
  assert.equal(manifest.openclawRuntime.version, '0.1.2');
  assert.equal(manifest.openclawRuntime.sha256, sha256);
  assert.match(manifest.openclawRuntime.url, /openclaw-bundled-0\.1\.2\.tgz$/);
});
