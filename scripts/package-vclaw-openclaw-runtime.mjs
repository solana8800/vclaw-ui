#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const openClawDir = join(rootDir, 'core', 'openclaw-zero-token');
const defaultOutputDir = join(rootDir, 'vclaw-ui', 'dist', 'ui-update');

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function readManifest(manifestPath) {
  if (!existsSync(manifestPath)) return { schemaVersion: 1, channel: 'stable' };
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function buildOpenClawRuntimeRelease(options) {
  const { version, sourceArchive, outputDir, baseUrl } = options;
  if (!/^\d+\.\d+\.\d+$/.test(String(version || ''))) {
    throw new Error(`Phiên bản OpenClaw runtime không hợp lệ: ${version}`);
  }
  mkdirSync(outputDir, { recursive: true });
  const archiveName = `openclaw-bundled-${version}.tgz`;
  const archivePath = join(outputDir, archiveName);
  copyFileSync(sourceArchive, archivePath);
  const manifestPath = join(outputDir, 'vclaw-ui-update.json');
  const manifest = {
    ...readManifest(manifestPath),
    schemaVersion: 1,
    channel: 'stable',
    openclawRuntime: {
      version,
      url: `${baseUrl.replace(/\/$/, '')}/${archiveName}`,
      sha256: hashFile(archivePath),
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { archivePath, manifestPath, manifest };
}

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function packOpenClaw() {
  const tempDir = mkdtempSync(join(tmpdir(), 'vclaw-openclaw-pack-'));
  execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', tempDir], {
    cwd: openClawDir,
    stdio: 'inherit',
  });
  const archives = readdirSync(tempDir).filter((name) => /^openclaw-.*\.tgz$/.test(name));
  if (archives.length !== 1) throw new Error(`Cần đúng một tarball OpenClaw, hiện có ${archives.length}`);
  return { archivePath: join(tempDir, archives[0]), cleanup: () => rmSync(tempDir, { recursive: true, force: true }) };
}

function runCli() {
  const version = readArg('--version');
  const tag = readArg('--tag', `v${version}`);
  const outputDir = resolve(readArg('--output', defaultOutputDir));
  const sourceArchive = readArg('--source-archive');
  const packed = sourceArchive ? null : packOpenClaw();
  try {
    const result = buildOpenClawRuntimeRelease({
      version,
      sourceArchive: sourceArchive ? resolve(sourceArchive) : packed.archivePath,
      outputDir,
      baseUrl: readArg('--base-url', `https://github.com/solana8800/vclaw/releases/download/${tag}`),
    });
    console.log('Đã tạo payload OpenClaw runtime:');
    console.log(`- TGZ:      ${result.archivePath}`);
    console.log(`- Manifest: ${result.manifestPath}`);
  } finally {
    packed?.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
