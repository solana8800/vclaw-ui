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

import { RELEASE_REPO, releaseDownloadBaseUrl } from './release-config.mjs';

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

function readJsonFileIfPresent(filePath) {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function fetchJsonIfPresent(url) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        '-e',
        `
          const url = process.argv[1];
          const response = await fetch(url);
          if (!response.ok) process.exit(2);
          process.stdout.write(await response.text());
        `,
        url,
      ],
      { encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(stdout);
  } catch {
    return {};
  }
}

function mergeByPlatformArch(entries, replacement) {
  const existing = Array.isArray(entries) ? entries : [];
  return existing
    .filter((entry) => entry.platform !== replacement.platform || entry.arch !== replacement.arch)
    .concat(replacement);
}

function psSingleQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function zipDirectory(sourceDir, archivePath) {
  rmSync(archivePath, { force: true });
  if (process.platform === 'win32') {
    const command = [
      "$ErrorActionPreference = 'Stop'",
      '$ProgressPreference = "SilentlyContinue"',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem',
      `[System.IO.Compression.ZipFile]::CreateFromDirectory(${psSingleQuote(sourceDir)}, ${psSingleQuote(archivePath)})`,
    ].join('; ');
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      stdio: 'inherit',
    });
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

function packagePathSegments(packageName) {
  return packageName.split('/');
}

function pnpmPackagePrefix(packageName) {
  return packageName.replace('/', '+');
}

function findPnpmPackageDir(nodeModulesDir, packageName, versionHint = '') {
  const pnpmDir = join(nodeModulesDir, '.pnpm');
  if (!existsSync(pnpmDir)) return '';
  const prefix = `${pnpmPackagePrefix(packageName)}@`;
  const candidates = readdirSync(pnpmDir)
    .filter((name) => name.startsWith(prefix))
    .sort((left, right) => {
      const leftMatches = versionHint && left.startsWith(`${prefix}${versionHint}`) ? 0 : 1;
      const rightMatches = versionHint && right.startsWith(`${prefix}${versionHint}`) ? 0 : 1;
      return leftMatches - rightMatches || left.localeCompare(right);
    });

  for (const candidate of candidates) {
    const packageDir = join(pnpmDir, candidate, 'node_modules', ...packagePathSegments(packageName));
    if (existsSync(packageDir)) return packageDir;
  }
  return '';
}

function ensureRuntimePackage(stagingDir, packageName, versionHint = '') {
  const nodeModulesDir = join(stagingDir, 'node_modules');
  const target = join(nodeModulesDir, ...packagePathSegments(packageName));
  if (existsSync(target)) return;

  const source =
    findPnpmPackageDir(nodeModulesDir, packageName, versionHint) ||
    findPnpmPackageDir(join(uiDir, 'node_modules'), packageName, versionHint);
  if (!source) {
    throw new Error(`UI payload thiếu package runtime ${packageName}`);
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function ensureNextRuntimePackages(stagingDir) {
  const nextPackageJson = join(stagingDir, 'node_modules', 'next', 'package.json');
  if (!existsSync(nextPackageJson)) return;
  const nextPackage = JSON.parse(readFileSync(nextPackageJson, 'utf8'));
  for (const [packageName, versionHint] of Object.entries(nextPackage.dependencies || {})) {
    ensureRuntimePackage(stagingDir, packageName, versionHint);
  }
}

function hasPrismaSsrAlias(root) {
  if (!existsSync(root)) return false;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('client-') && current.endsWith(join('@prisma'))) return true;
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile() || !/\.(?:js|json)$/.test(entry.name)) continue;
      const text = readFileSync(entryPath, 'utf8');
      if (text.includes("@prisma/client-") || text.includes("require('.prisma/client/")) return true;
    }
  }
  return false;
}

function findPrismaGeneratedClient(stagingDir, prismaSourceDir = uiDir) {
  const pnpmPrismaCandidates = (nodeModulesDir) => {
    const pnpmDir = join(nodeModulesDir, '.pnpm');
    if (!existsSync(pnpmDir)) return [];
    return readdirSync(pnpmDir)
      .filter((name) => name.startsWith('@prisma+client@'))
      .map((name) => join(pnpmDir, name, 'node_modules', '.prisma'));
  };

  const candidates = [
    join(stagingDir, 'node_modules', '.prisma'),
    ...pnpmPrismaCandidates(join(stagingDir, 'node_modules')),
    ...(prismaSourceDir
      ? [
          join(prismaSourceDir, 'node_modules', '.prisma'),
          ...pnpmPrismaCandidates(join(prismaSourceDir, 'node_modules')),
        ]
      : []),
  ];
  return candidates.find((candidate) => existsSync(join(candidate, 'client', 'default.js'))) || '';
}

function copyPrismaGeneratedClientIfNeeded(stagingDir, prismaSourceDir) {
  const nextDir = join(stagingDir, '.next');
  if (!hasPrismaSsrAlias(nextDir)) return;

  const source = findPrismaGeneratedClient(stagingDir, prismaSourceDir);
  if (!source) {
    throw new Error('UI payload thiếu Prisma generated client. Hãy chạy pnpm prisma generate hoặc pnpm build trước khi đóng gói update.');
  }

  const targets = [
    join(stagingDir, 'node_modules', '.prisma'),
    join(stagingDir, '.next', 'node_modules', '.prisma'),
  ];
  for (const target of targets) {
    if (resolve(source) === resolve(target)) continue;
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true });
  }
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

function validateUiPayloadStartup(stagingDir) {
  const validationScript = `
    const { spawn } = require('node:child_process');
    const net = require('node:net');
    const path = require('node:path');
    const port = 32000 + (process.pid % 1000);
    const child = spawn(process.execPath, [path.join(process.cwd(), 'server.js')], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const finish = (code, message = '') => {
      try { child.kill('SIGTERM'); } catch {}
      if (message) process.stderr.write(message);
      process.exit(code);
    };
    const deadline = Date.now() + 10000;
    const attempt = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        finish(0);
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= deadline) finish(1, stderr || 'Server không listen trong 10 giây');
        else setTimeout(attempt, 100);
      });
    };
    child.once('exit', () => finish(1, stderr || 'Server thoát trước khi listen'));
    attempt();
  `;
  try {
    execFileSync(process.execPath, ['-e', validationScript], {
      cwd: stagingDir,
      stdio: 'pipe',
      timeout: 15_000,
    });
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    throw new Error(`UI payload không khởi động được${stderr ? `: ${stderr}` : ''}`);
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
    skipStartupValidation = false,
    prismaSourceDir = uiDir,
    existingManifest = {},
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
  ensureNextRuntimePackages(stagingDir);
  copyPrismaGeneratedClientIfNeeded(stagingDir, prismaSourceDir);
  removePrivatePayloadFiles(stagingDir);
  validateUiPayloadRuntime(stagingDir);
  if (!skipStartupValidation) validateUiPayloadStartup(stagingDir);

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
  const mergedExistingManifest = {
    ...existingManifest,
    ...readJsonFileIfPresent(manifestPath),
    payloads: [...(existingManifest.payloads || []), ...(readJsonFileIfPresent(manifestPath).payloads || [])],
    nativeInstallers: [
      ...(existingManifest.nativeInstallers || []),
      ...(readJsonFileIfPresent(manifestPath).nativeInstallers || []),
    ],
  };
  const payloads = mergeByPlatformArch(mergedExistingManifest.payloads, payload);
  const existingNativeInstallers = mergedExistingManifest.nativeInstallers || [];
  const nativeInstallers = nativeInstallerUrl
    ? mergeByPlatformArch(existingNativeInstallers, { platform, arch, url: nativeInstallerUrl })
    : existingNativeInstallers;
  const manifest = {
    ...mergedExistingManifest,
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
  const baseUrl = readArg('--base-url', releaseDownloadBaseUrl(tag));
  const existingManifest = fetchJsonIfPresent(`${baseUrl.replace(/\/$/, '')}/vclaw-ui-update.json`);
  const result = buildUiUpdate({
    version,
    minLauncherVersion,
    platform,
    arch,
    standaloneDir: resolve(readArg('--standalone', join(uiDir, '.next', 'standalone'))),
    staticDir: resolve(readArg('--static', join(uiDir, '.next', 'static'))),
    publicDir: resolve(readArg('--public', join(uiDir, 'public'))),
    outputDir,
    baseUrl,
    required: process.argv.includes('--required'),
    nativeVersion: readArg('--native-version'),
    nativeRequired: process.argv.includes('--native-required'),
    nativeInstallerUrl: readArg('--native-installer-url'),
    existingManifest,
  });

  console.log('Đã tạo payload cập nhật UI:');
  console.log(`- ZIP:      ${result.archivePath}`);
  console.log(`- Manifest: ${result.manifestPath}`);
  console.log('');
  console.log(`Upload cùng GitHub Release ${tag}:`);
  console.log(`gh release upload ${tag} "${result.archivePath}" --repo ${RELEASE_REPO} --clobber`);
  console.log(`gh release upload ${tag} "${result.manifestPath}" --repo ${RELEASE_REPO} --clobber`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
