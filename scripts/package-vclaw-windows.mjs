#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const uiDir = join(rootDir, 'vclaw-ui');
const launcherDir = join(uiDir, 'launcher');
const openClawDir = join(rootDir, 'core', 'openclaw-zero-token');
const packagingDir = join(rootDir, 'scripts', 'packaging');
const logoPng = join(packagingDir, 'vclaw-logo.png');
const logoIco = join(packagingDir, 'vclaw-logo.ico');
const buildDir = join(uiDir, 'dist', '.build-windows');
const appDir = join(buildDir, 'electron-app');
const distDir = join(uiDir, 'dist');
const standaloneDir = join(uiDir, '.next', 'standalone');
const skipBuild = process.env.SKIP_BUILD === '1';

const pkg = JSON.parse(await readFile(join(uiDir, 'package.json'), 'utf8'));
const version = String(pkg.version || '0.1.0');

function run(command, args, options = {}) {
  console.log(`> ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: { ...process.env, ...(options.env || {}) },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function copyRequiredFile(src, dest) {
  if (!existsSync(src)) {
    console.error(`Missing required file: ${src}`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.error(`Missing required directory: ${src}`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
}

function findOpenClawPackedTarball() {
  const entries = readdirSync(buildDir)
    .filter((name) => /^openclaw-.*\.tgz$/.test(name))
    .map((name) => join(buildDir, name));
  if (entries.length !== 1) {
    console.error(`Expected exactly one openclaw-*.tgz in ${buildDir}, got ${entries.length}`);
    process.exit(1);
  }
  return entries[0];
}

function copyOpenClawPluginManifests() {
  const sources = [
    {
      sourceRoot: join(openClawDir, 'extensions'),
      distRoot: join(openClawDir, 'dist', 'extensions'),
    },
    {
      sourceRoot: join(openClawDir, 'src', 'zero-token', 'extensions'),
      distRoot: join(openClawDir, 'dist', 'zero-token', 'extensions'),
    },
  ];

  let copied = 0;
  for (const { sourceRoot, distRoot } of sources) {
    if (!existsSync(sourceRoot)) continue;
    for (const extensionName of readdirSync(sourceRoot)) {
      const sourceManifest = join(sourceRoot, extensionName, 'openclaw.plugin.json');
      if (!existsSync(sourceManifest)) continue;
      const distExtensionDir = join(distRoot, extensionName);
      mkdirSync(distExtensionDir, { recursive: true });
      copyFileSync(sourceManifest, join(distExtensionDir, 'openclaw.plugin.json'));
      copied += 1;
    }
  }
  console.log(`Staged ${copied} OpenClaw plugin manifests into dist.`);
}

function electronBuilderCommand() {
  const localBin = join(launcherDir, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
  if (existsSync(localBin)) return { cmd: localBin, args: [] };
  return { cmd: 'npx', args: ['electron-builder'] };
}

console.log('VClaw Windows release build');
console.log(`Version: ${version}`);
console.log(`Source : ${uiDir}`);
console.log('');

if (!existsSync(join(openClawDir, 'dist', 'entry.js')) && !existsSync(join(openClawDir, 'dist', 'entry.mjs'))) {
  console.error(`Missing OpenClaw build: ${join(openClawDir, 'dist', 'entry.js|mjs')}`);
  console.error(`Run first: cd "${openClawDir}" && pnpm install && pnpm build`);
  process.exit(1);
}

if (!existsSync(join(uiDir, 'node_modules'))) {
  run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: uiDir });
}

if (!skipBuild) {
  rmSync(join(uiDir, '.next'), { recursive: true, force: true });
  run('pnpm', ['build'], { cwd: uiDir });
} else if (!existsSync(standaloneDir)) {
  console.error(`SKIP_BUILD=1 but standalone build is missing: ${standaloneDir}`);
  process.exit(1);
}

copyDir(join(uiDir, '.next', 'static'), join(standaloneDir, '.next', 'static'));
copyDir(join(uiDir, 'public'), join(standaloneDir, 'public'));

run('npm', ['install'], { cwd: launcherDir });

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

copyDir(standaloneDir, join(appDir, 'app'));
rmSync(join(appDir, 'app', 'macos'), { recursive: true, force: true });
rmSync(join(appDir, 'app', 'dist'), { recursive: true, force: true });
rmSync(join(appDir, 'app', 'prisma', 'business.sqlite'), { force: true });
rmSync(join(appDir, 'app', 'node_modules'), { recursive: true, force: true });
run('npm', ['install', '--omit=dev', '--package-lock=false', '--no-audit', '--no-fund'], {
  cwd: join(appDir, 'app'),
});

mkdirSync(join(appDir, 'launcher'), { recursive: true });
copyRequiredFile(join(launcherDir, 'main.js'), join(appDir, 'launcher', 'main.js'));
copyRequiredFile(join(launcherDir, 'electron-main.cjs'), join(appDir, 'launcher', 'electron-main.cjs'));
copyRequiredFile(join(launcherDir, 'electron-preload.cjs'), join(appDir, 'launcher', 'electron-preload.cjs'));

copyRequiredFile(join(packagingDir, 'openclaw-state-template', 'openclaw.json'), join(appDir, 'openclaw.default.json'));
copyRequiredFile(join(rootDir, 'scripts', 'vclaw-agent-tools-mcp-stdio.mjs'), join(appDir, 'vclaw-agent-tools-mcp-stdio.mjs'));
copyDir(join(packagingDir, 'openclaw-state-template'), join(appDir, 'openclaw-state-template'));
copyRequiredFile(logoPng, join(appDir, 'branding', 'app-icon.png'));
if (existsSync(logoIco)) {
  copyRequiredFile(logoIco, join(appDir, 'branding', 'app-icon.ico'));
} else {
  console.warn(`Windows .exe icon skipped: add ${logoIco} for installer/taskbar icon.`);
}

copyOpenClawPluginManifests();
run('npm', ['pack', '--ignore-scripts', '--pack-destination', buildDir], { cwd: openClawDir });
const openClawTarball = findOpenClawPackedTarball();
copyRequiredFile(openClawTarball, join(appDir, 'openclaw-bundled.tgz'));

const openClawRuntimeDir = join(appDir, 'openclaw-runtime');
mkdirSync(openClawRuntimeDir, { recursive: true });
writeFileSync(
  join(openClawRuntimeDir, 'package.json'),
  '{"name":"vclaw-openclaw-runtime","version":"1.0.0","private":true}\n',
);

writeFileSync(
  join(appDir, 'package.json'),
  JSON.stringify(
    {
      name: 'vclaw',
      productName: 'VClaw',
      version,
      private: true,
      main: 'launcher/main.js',
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(buildDir, 'electron-builder.yml'),
  [
    'appId: com.solana8800.vclaw',
    'productName: VClaw',
    'asar: false',
    `directories:`,
    `  app: ${JSON.stringify(appDir)}`,
    `  output: ${JSON.stringify(distDir)}`,
    'files:',
    '  - "**/*"',
    'extraResources:',
    `  - from: ${JSON.stringify(join(appDir, 'app', 'node_modules'))}`,
    '    to: app/app/node_modules',
    'win:',
    ...(existsSync(logoIco) ? ['  icon: branding/app-icon.ico'] : []),
    '  signAndEditExecutable: false',
    '  target:',
    '    - target: nsis',
    '      arch:',
    '        - x64',
    'nsis:',
    '  oneClick: false',
    '  perMachine: false',
    '  allowToChangeInstallationDirectory: true',
    '  createDesktopShortcut: true',
    '  createStartMenuShortcut: true',
    '  artifactName: "VClawInstaller-${version}-${arch}.${ext}"',
    '',
  ].join('\n'),
);

const builder = electronBuilderCommand();
run(builder.cmd, [...builder.args, '--config', join(buildDir, 'electron-builder.yml'), '--win', 'nsis', '--x64'], {
  cwd: launcherDir,
  env: {
    ELECTRON_CACHE: join(buildDir, 'electron-cache'),
    ELECTRON_BUILDER_CACHE: join(buildDir, 'electron-builder-cache'),
  },
});

console.log('');
console.log('Windows release artifacts:');
run(process.platform === 'win32' ? 'cmd' : 'ls', process.platform === 'win32' ? ['/c', 'dir', distDir] : ['-lh', distDir], {
  cwd: rootDir,
});
