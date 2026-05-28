#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function collectPrismaClientAliases(root) {
  const aliases = new Set();
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !existsSync(current)) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile() || !/\.(?:js|json)$/.test(entry.name)) continue;
      const text = readFileSync(fullPath, 'utf8');
      for (const match of text.matchAll(/@prisma\/client-[A-Za-z0-9]+/g)) {
        aliases.add(match[0]);
      }
    }
  }
  return aliases;
}

function createPrismaClientAliases(nextDir, nodeModulesDir) {
  const aliases = collectPrismaClientAliases(nextDir);
  for (const alias of aliases) {
    const [, packageName] = alias.split('/');
    const aliasDir = join(nodeModulesDir, '@prisma', packageName);
    mkdirSync(aliasDir, { recursive: true });
    writeFileSync(
      join(aliasDir, 'package.json'),
      JSON.stringify({ name: alias, version: '0.0.0', main: 'index.js', private: true }, null, 2) + '\n',
    );
    writeFileSync(join(aliasDir, 'index.js'), "module.exports = require('@prisma/client')\n");
  }
  if (aliases.size > 0) {
    console.log(`Created ${aliases.size} Prisma client alias package(s).`);
  }
}

function generatePrismaClient(appRoot) {
  const prismaCli = join(uiDir, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = join(appRoot, 'prisma', 'schema.prisma');
  if (!existsSync(prismaCli)) {
    console.error(`Missing Prisma CLI: ${prismaCli}`);
    process.exit(1);
  }
  run('node', [prismaCli, 'generate', '--schema', schemaPath], {
    cwd: appRoot,
    env: {
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
  });
}

function writeWindowsOpenClawInstallerScript(dest) {
  writeFileSync(
    dest,
    [
      "$ErrorActionPreference = 'Continue'",
      "$Log = Join-Path $env:TEMP 'vclaw-openclaw-install.log'",
      "function Log([string]$Message) {",
      "  $Line = '[VClaw][' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $Message",
      "  Add-Content -LiteralPath $Log -Value $Line -Encoding UTF8",
      "  Write-Host $Line",
      "}",
      "function Copy-MissingTree([string]$Source, [string]$Dest) {",
      "  if (!(Test-Path -LiteralPath $Source)) { return }",
      "  New-Item -ItemType Directory -Force -Path $Dest | Out-Null",
      "  Get-ChildItem -LiteralPath $Source -Recurse -Force | ForEach-Object {",
      "    $Relative = $_.FullName.Substring($Source.Length).TrimStart([char[]]@('\\','/'))",
      "    $Target = Join-Path $Dest $Relative",
      "    if ($_.PSIsContainer) {",
      "      New-Item -ItemType Directory -Force -Path $Target | Out-Null",
      "    } elseif (!(Test-Path -LiteralPath $Target)) {",
      "      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Target) | Out-Null",
      "      Copy-Item -LiteralPath $_.FullName -Destination $Target -Force",
      "    }",
      "  }",
      "}",
      "function Repair-PluginManifests([string]$RuntimePkg) {",
      "  $SrcRoot = Join-Path $RuntimePkg 'extensions'",
      "  $DistRoot = Join-Path $RuntimePkg 'dist\\extensions'",
      "  if (!(Test-Path -LiteralPath $SrcRoot)) { return }",
      "  $Fixed = 0",
      "  Get-ChildItem -LiteralPath $SrcRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {",
      "    $SrcManifest = Join-Path $_.FullName 'openclaw.plugin.json'",
      "    if (!(Test-Path -LiteralPath $SrcManifest)) { return }",
      "    $DistDir = Join-Path $DistRoot $_.Name",
      "    $DistManifest = Join-Path $DistDir 'openclaw.plugin.json'",
      "    if (Test-Path -LiteralPath $DistManifest) { return }",
      "    New-Item -ItemType Directory -Force -Path $DistDir | Out-Null",
      "    Copy-Item -LiteralPath $SrcManifest -Destination $DistManifest -Force",
      "    $Fixed++",
      "  }",
      "  if ($Fixed -gt 0) { Log \"Fixed $Fixed OpenClaw plugin manifest(s).\" }",
      "}",
      "try {",
      "  Log 'Starting Windows OpenClaw postinstall.'",
      "  $AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
      "  $HomeDir = if ($env:USERPROFILE) { $env:USERPROFILE } else { [Environment]::GetFolderPath('UserProfile') }",
      "  $StateDir = Join-Path $HomeDir '.openclaw'",
      "  $RuntimeDir = Join-Path $StateDir 'runtime'",
      "  $BundleDir = Join-Path $StateDir 'bundled-packages'",
      "  $BundledTgz = Join-Path $AppDir 'openclaw-bundled.tgz'",
      "  $LocalTgz = Join-Path $BundleDir 'openclaw-bundled.tgz'",
      "  New-Item -ItemType Directory -Force -Path $StateDir,$RuntimeDir,$BundleDir | Out-Null",
      "  Copy-MissingTree (Join-Path $AppDir 'openclaw-state-template') $StateDir",
      "  if (!(Test-Path -LiteralPath $BundledTgz)) {",
      "    Log \"Missing bundled OpenClaw tarball: $BundledTgz\"",
      "    exit 0",
      "  }",
      "  Copy-Item -LiteralPath $BundledTgz -Destination $LocalTgz -Force",
      "  $RuntimePackageJson = Join-Path $RuntimeDir 'package.json'",
      "  if (!(Test-Path -LiteralPath $RuntimePackageJson)) {",
      "    Set-Content -LiteralPath $RuntimePackageJson -Value '{\"name\":\"openclaw-runtime\",\"version\":\"1.0.0\",\"private\":true}' -Encoding UTF8",
      "  }",
      "  $Npm = Get-Command npm -ErrorAction SilentlyContinue",
      "  if (!$Npm) {",
      "    Log 'npm was not found in PATH. VClaw will retry OpenClaw install on first launch.'",
      "    exit 0",
      "  }",
      "  Log \"npm=$($Npm.Source)\"",
      "  $env:NPM_CONFIG_CACHE = Join-Path $RuntimeDir '.npm-cache'",
      "  New-Item -ItemType Directory -Force -Path $env:NPM_CONFIG_CACHE | Out-Null",
      "  Push-Location $RuntimeDir",
      "  try {",
      "    & $Npm.Source install $LocalTgz --foreground-scripts --loglevel warn 2>&1 | Tee-Object -FilePath $Log -Append",
      "    $InstallCode = $LASTEXITCODE",
      "  } finally {",
      "    Pop-Location",
      "  }",
      "  $OpenClawCmd = Join-Path $RuntimeDir 'node_modules\\.bin\\openclaw.cmd'",
      "  if ($InstallCode -eq 0 -and (Test-Path -LiteralPath $OpenClawCmd)) {",
      "    Repair-PluginManifests (Join-Path $RuntimeDir 'node_modules\\openclaw')",
      "    Log \"OpenClaw runtime is ready: $OpenClawCmd\"",
      "  } else {",
      "    Log \"OpenClaw install did not complete. npm exit code=$InstallCode. VClaw will retry on first launch.\"",
      "  }",
      "} catch {",
      "  Log ('OpenClaw postinstall error: ' + $_.Exception.Message)",
      "}",
      "exit 0",
      "",
    ].join('\r\n'),
  );
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
for (const name of readdirSync(distDir)) {
  if (/\.nsis\.zip$/i.test(name) || /\.__uninstaller\.exe$/i.test(name)) {
    rmSync(join(distDir, name), { force: true });
  }
}

copyDir(standaloneDir, join(appDir, 'app'));
rmSync(join(appDir, 'app', 'macos'), { recursive: true, force: true });
rmSync(join(appDir, 'app', 'dist'), { recursive: true, force: true });
rmSync(join(appDir, 'app', 'prisma', 'business.sqlite'), { force: true });
rmSync(join(appDir, 'app', 'node_modules'), { recursive: true, force: true });
run('npm', ['install', '--omit=dev', '--package-lock=false', '--no-audit', '--no-fund'], {
  cwd: join(appDir, 'app'),
});
generatePrismaClient(join(appDir, 'app'));
createPrismaClientAliases(join(appDir, 'app', '.next'), join(appDir, 'app', 'node_modules'));

mkdirSync(join(appDir, 'launcher'), { recursive: true });
copyRequiredFile(join(launcherDir, 'main.js'), join(appDir, 'launcher', 'main.js'));
copyRequiredFile(join(launcherDir, 'electron-main.cjs'), join(appDir, 'launcher', 'electron-main.cjs'));
copyRequiredFile(join(launcherDir, 'electron-preload.cjs'), join(appDir, 'launcher', 'electron-preload.cjs'));

copyRequiredFile(join(packagingDir, 'openclaw-state-template', 'openclaw.json'), join(appDir, 'openclaw.default.json'));
copyRequiredFile(join(rootDir, 'scripts', 'vclaw-agent-tools-mcp-stdio.mjs'), join(appDir, 'vclaw-agent-tools-mcp-stdio.mjs'));
copyDir(join(packagingDir, 'openclaw-state-template'), join(appDir, 'openclaw-state-template'));
writeWindowsOpenClawInstallerScript(join(appDir, 'install-openclaw-runtime.ps1'));
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
  join(buildDir, 'after-pack.cjs'),
  [
    "const { existsSync } = require('node:fs');",
    "const { join } = require('node:path');",
    "const { spawnSync } = require('node:child_process');",
    '',
    'module.exports = async function afterPack(context) {',
    `  const iconPath = ${JSON.stringify(logoIco)};`,
    `  const rceditPath = ${JSON.stringify(join(launcherDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'))};`,
    "  const productFilename = context.packager.appInfo.productFilename || 'VClaw';",
    "  const exePath = join(context.appOutDir, `${productFilename}.exe`);",
    '  if (!existsSync(iconPath) || !existsSync(rceditPath) || !existsSync(exePath)) {',
    '    console.warn(`Skipping Windows icon patch. icon=${existsSync(iconPath)} rcedit=${existsSync(rceditPath)} exe=${existsSync(exePath)}`);',
    '    return;',
    '  }',
    "  const result = spawnSync(rceditPath, [exePath, '--set-icon', iconPath], { stdio: 'inherit' });",
    '  if (result.status !== 0) {',
    "    throw new Error(`Failed to apply Windows app icon with rcedit. Exit code: ${result.status}`);",
    '  }',
    '};',
    '',
  ].join('\n'),
);

writeFileSync(
  join(buildDir, 'installer.nsh'),
  [
    '!macro stopVClawProcesses',
    '  DetailPrint "Stopping running VClaw processes..."',
    '  nsExec::ExecToLog \'$\\"$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe$\\" -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference=$\\"SilentlyContinue$\\"; Get-Process VClaw | Stop-Process -Force; Get-CimInstance Win32_Process | Where-Object { $$_.Name -eq $\\"node.exe$\\" -and ($$_.CommandLine -match $\\"\\\\VClaw\\\\|\\\\.openclaw\\\\runtime|openclaw$\\" ) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"\'',
    '  Pop $0',
    '!macroend',
    '',
    '!macro customInit',
    '  !insertmacro stopVClawProcesses',
    '  ClearErrors',
    '  CreateDirectory "$INSTDIR"',
    '  FileOpen $R9 "$INSTDIR\\.vclaw-write-test" w',
    '  IfErrors +4 0',
    '    FileClose $R9',
    '    Delete "$INSTDIR\\.vclaw-write-test"',
    '    Goto +3',
    '    DetailPrint "Previous VClaw install path is not writable. Falling back to the current user profile."',
    '    StrCpy $INSTDIR "$LOCALAPPDATA\\Programs\\VClaw"',
    '    ClearErrors',
    '!macroend',
    '',
    '!macro customInstall',
    '  DetailPrint "Starting OpenClaw runtime installer in the background..."',
    '  Exec \'$\\"$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe$\\" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $\\"$INSTDIR\\resources\\app\\install-openclaw-runtime.ps1$\\"\'',
    ...(existsSync(logoIco)
      ? [
          '  DetailPrint "Refreshing VClaw shortcuts with the bundled icon..."',
          '  CreateShortCut "$DESKTOP\\VClaw.lnk" "$INSTDIR\\VClaw.exe" "" "$INSTDIR\\resources\\app\\branding\\app-icon.ico" 0',
          '  CreateShortCut "$SMPROGRAMS\\VClaw.lnk" "$INSTDIR\\VClaw.exe" "" "$INSTDIR\\resources\\app\\branding\\app-icon.ico" 0',
        ]
      : []),
    '!macroend',
    '',
    '!macro customUnInstall',
    '  !insertmacro stopVClawProcesses',
    '  IfSilent keepOpenClawData 0',
    '  MessageBox MB_YESNO "Ban co muon xoa du lieu VClaw tai $PROFILE\\.openclaw khong? Chon No de giu lai cau hinh, runtime va du lieu khach hang." IDNO keepOpenClawData',
    '  DetailPrint "Removing VClaw user data at $PROFILE\\.openclaw..."',
    '  RMDir /r "$PROFILE\\.openclaw"',
    '  keepOpenClawData:',
    '!macroend',
    '',
  ].join('\n'),
);

writeFileSync(
  join(buildDir, 'electron-builder.yml'),
  [
    'appId: com.solana8800.vclaw',
    'productName: VClaw',
    'asar: false',
    'compression: normal',
    `afterPack: ${JSON.stringify(join(buildDir, 'after-pack.cjs'))}`,
    `directories:`,
    `  app: ${JSON.stringify(appDir)}`,
    `  output: ${JSON.stringify(distDir)}`,
    'files:',
    '  - "**/*"',
    'extraResources:',
    `  - from: ${JSON.stringify(join(appDir, 'app', 'node_modules'))}`,
    '    to: app/app/node_modules',
    'win:',
    ...(existsSync(logoIco) ? [`  icon: ${JSON.stringify(logoIco)}`] : []),
    '  signAndEditExecutable: false',
    '  target:',
    '    - target: nsis',
    '      arch:',
    '        - x64',
    'nsis:',
    `  include: ${JSON.stringify(join(buildDir, 'installer.nsh'))}`,
    ...(existsSync(logoIco)
      ? [
          `  installerIcon: ${JSON.stringify(logoIco)}`,
          `  uninstallerIcon: ${JSON.stringify(logoIco)}`,
        ]
      : []),
    '  oneClick: false',
    '  perMachine: false',
    '  allowToChangeInstallationDirectory: true',
    '  differentialPackage: false',
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
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  },
});

console.log('');
console.log('Windows release artifacts:');
run(process.platform === 'win32' ? 'cmd' : 'ls', process.platform === 'win32' ? ['/c', 'dir', distDir] : ['-lh', distDir], {
  cwd: rootDir,
});
