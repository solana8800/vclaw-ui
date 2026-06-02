#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const uiDir = join(rootDir, 'vclaw-ui');

function hashFile(filePath) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const fd = openSync(filePath, 'r');
  try {
    let bytesRead;
    do {
      bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

function zipDirectory(sourceDir, archivePath) {
  rmSync(archivePath, { force: true });
  if (process.platform === 'win32') {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Compress-Archive -Path (Join-Path $args[0] "*") -DestinationPath $args[1] -Force',
        sourceDir,
        archivePath,
      ],
      { stdio: 'inherit' },
    );
    return;
  }
  execFileSync('zip', ['-qry', archivePath, '.'], { cwd: sourceDir, stdio: 'inherit' });
}

function copyDirIfPresent(source, target) {
  if (!source || !existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function removePrivatePayloadFiles(stagingDir) {
  const prismaDir = join(stagingDir, 'prisma');
  for (const file of ['business.sqlite', 'business.sqlite-shm', 'business.sqlite-wal']) {
    rmSync(join(prismaDir, file), { force: true });
  }
  rmSync(join(stagingDir, '.env'), { force: true });
  rmSync(join(stagingDir, '.env.local'), { force: true });
  rmSync(join(stagingDir, 'public', 'uploads'), { recursive: true, force: true });
  rmSync(join(stagingDir, 'docs', 'assets'), { recursive: true, force: true });
  rmSync(join(stagingDir, 'dist'), { recursive: true, force: true });

  const removeFinderMetadata = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);
      if (entry.name === '.DS_Store') {
        rmSync(entryPath, { force: true });
      } else if (entry.isDirectory()) {
        removeFinderMetadata(entryPath);
      }
    }
  };
  removeFinderMetadata(stagingDir);
}

function validateUiPayloadRuntime(stagingDir) {
  const nextConstants = join(stagingDir, 'node_modules', 'next', 'dist', 'shared', 'lib', 'constants.js');
  if (!existsSync(nextConstants)) return;
  try {
    execFileSync(
      process.execPath,
      ['-e', "require('./node_modules/next/dist/shared/lib/constants.js')"],
      { cwd: stagingDir, stdio: 'pipe' },
    );
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    throw new Error(`UI payload thiếu dependency runtime của Next.js${stderr ? `: ${stderr}` : ''}`);
  }
}

export function buildUiUpdate(options) {
  const {
    version,
    minLauncherVersion,
    minimumLauncherVersion,
    platform,
    arch,
    standaloneDir,
    staticDir,
    publicDir,
    outputDir,
    baseUrl,
    required = false,
    nativeVersion = '',
    nativeRequired = false,
    nativeInstallerUrl = '',
  } = options;

  if (!/^\d+\.\d+\.\d+$/.test(String(version || ''))) {
    throw new Error(`Phiên bản UI không hợp lệ: ${version}`);
  }
  if (!existsSync(join(standaloneDir, 'server.js'))) {
    throw new Error(`Không thấy standalone server.js tại ${standaloneDir}`);
  }

  const launcherFloor = minLauncherVersion || minimumLauncherVersion || '0.0.0';

  mkdirSync(outputDir, { recursive: true });
  const stagingDir = join(outputDir, `.staging-${version}-${platform}-${arch}`);
  rmSync(stagingDir, { recursive: true, force: true });
  cpSync(standaloneDir, stagingDir, { recursive: true });
  copyDirIfPresent(staticDir, join(stagingDir, '.next', 'static'));
  copyDirIfPresent(publicDir, join(stagingDir, 'public'));
  removePrivatePayloadFiles(stagingDir);
  validateUiPayloadRuntime(stagingDir);

  const archiveName = `vclaw-ui-${version}-${platform}-${arch}.zip`;
  const archivePath = join(outputDir, archiveName);
  zipDirectory(stagingDir, archivePath);
  rmSync(stagingDir, { recursive: true, force: true });

  const payload = {
    platform,
    arch,
    url: `${baseUrl.replace(/\/$/, '')}/${archiveName}`,
    sha256: hashFile(archivePath),
  };
  const manifestPath = join(outputDir, 'vclaw-ui-update.json');
  let existingManifest = {};
  if (existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {}
  }
  const existingPayloads = existingManifest.payloads || [];
  const payloads = existingPayloads
    .filter((entry) => entry.platform !== platform || entry.arch !== arch)
    .concat(payload);
  const existingNativeInstallers =
    existingManifest.nativeInstallers || [];
  const nativeInstallers = nativeInstallerUrl
    ? existingNativeInstallers
        .filter((entry) => entry.platform !== platform || entry.arch !== arch)
        .concat({ platform, arch, url: nativeInstallerUrl })
    : existingNativeInstallers;
  const manifest = {
    ...existingManifest,
    schemaVersion: 1,
    channel: 'stable',
    uiVersion: version,
    required: required === true,
    minLauncherVersion: launcherFloor,
    payloads,
    ...(nativeVersion
      ? {
          nativeVersion,
          nativeRequired: nativeRequired === true,
          nativeInstallers,
        }
      : {}),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { archivePath, manifestPath, manifest };
}

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function runCli() {
  const releaseVersions = JSON.parse(readFileSync(join(uiDir, 'release-versions.json'), 'utf8'));
  const version = readArg('--version', releaseVersions.uiVersion);
  const minLauncherVersion = readArg(
    '--min-launcher-version',
    readArg('--minimum-launcher-version', releaseVersions.nativeVersion),
  );
  const platform = readArg('--platform', process.platform);
  const arch = readArg('--arch', process.arch);
  const tag = readArg('--tag', `v${version}`);
  const outputDir = resolve(readArg('--output', join(uiDir, 'dist', 'ui-update')));
  const result = buildUiUpdate({
    version,
    minLauncherVersion,
    platform,
    arch,
    standaloneDir: resolve(readArg('--standalone', join(uiDir, '.next', 'standalone'))),
    staticDir: resolve(readArg('--static', join(uiDir, '.next', 'static'))),
    publicDir: resolve(readArg('--public', join(uiDir, 'public'))),
    outputDir,
    baseUrl: readArg(
      '--base-url',
      `https://github.com/solana8800/vclaw/releases/download/${tag}`,
    ),
    required: process.argv.includes('--required'),
    nativeVersion: readArg('--native-version'),
    nativeRequired: process.argv.includes('--native-required'),
    nativeInstallerUrl: readArg('--native-installer-url'),
  });

  console.log('Đã tạo payload cập nhật UI:');
  console.log(`- ZIP:      ${result.archivePath}`);
  console.log(`- Manifest: ${result.manifestPath}`);
  console.log('');
  console.log(`Upload cùng GitHub Release ${tag}:`);
  console.log(`gh release upload ${tag} "${result.archivePath}" "${result.manifestPath}" --repo solana8800/vclaw --clobber`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
