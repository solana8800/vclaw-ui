#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { RELEASE_REPO, releaseDownloadBaseUrl } from './release-config.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repo = RELEASE_REPO;
const outputDir = join(rootDir, 'vclaw-ui', 'dist', 'ui-update');

export function buildGhReleaseCommands(options) {
  if (options.repo !== RELEASE_REPO) {
    throw new Error(`Chỉ được publish release vào repo artifact-only ${RELEASE_REPO}`);
  }
  const manifestAssets = options.assets.filter((asset) => basename(asset) === 'vclaw-ui-update.json');
  const payloadAssets = options.assets.filter((asset) => basename(asset) !== 'vclaw-ui-update.json');
  const uploads = [
    ...(payloadAssets.length > 0
      ? [['gh', 'release', 'upload', options.tag, ...payloadAssets, '--repo', options.repo, '--clobber']]
      : []),
    ...manifestAssets.map((asset) => [
      'gh',
      'release',
      'upload',
      options.tag,
      asset,
      '--repo',
      options.repo,
      '--clobber',
    ]),
  ];
  if (!options.createRelease) return uploads;
  return [
    ['gh', 'release', 'create', options.tag, '--repo', options.repo, '--title', options.title, '--notes', options.notes],
    ...uploads,
  ];
}

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(command) {
  console.log(`> ${command.join(' ')}`);
  const result = spawnSync(command[0], command.slice(1), { cwd: rootDir, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

export function updateNativeInstallerManifest({ version, platform, arch, installerPath, tag, required, outputDirectory = outputDir }) {
  mkdirSync(outputDirectory, { recursive: true });
  const manifestPath = join(outputDirectory, 'vclaw-ui-update.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { schemaVersion: 1, channel: 'stable' };
  const url = `${releaseDownloadBaseUrl(tag)}/${basename(installerPath)}`;
  const nativeInstallers = (manifest.nativeInstallers || [])
    .filter((entry) => entry.platform !== platform || entry.arch !== arch)
    .concat({ platform, arch, url });
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, nativeVersion: version, nativeRequired: required, nativeInstallers }, null, 2)}\n`,
  );
  return manifestPath;
}

async function promptMissing() {
  const rl = createInterface({ input, output });
  try {
    const type = readArg('--type') || (await rl.question('Loại release (ui/runtime/native): ')).trim();
    const version = readArg('--version') || (await rl.question('Phiên bản (vd 0.1.2): ')).trim();
    return { type, version };
  } finally {
    rl.close();
  }
}

async function promptReleaseNotes(defaultNotes) {
  const rl = createInterface({ input, output });
  try {
    console.log('Release note (nhập nhiều dòng, kết thúc bằng 1 dòng trống).');
    console.log(`Mặc định: ${defaultNotes}`);
    const lines = [];
    while (true) {
      const line = await rl.question(lines.length === 0 ? 'Notes> ' : '... ');
      if (!line.trim()) break;
      lines.push(line);
    }
    return lines.length > 0 ? lines.join('\n') : defaultNotes;
  } finally {
    rl.close();
  }
}

async function runCli() {
  if (hasFlag('--help')) {
    console.log('Dùng: node scripts/release-vclaw.mjs --type ui|runtime|native --version X.Y.Z [--upload] [--create-release]');
    console.log('UI:      thêm --platform darwin|win32|linux --arch arm64|x64 --min-launcher-version X.Y.Z [--required]');
    console.log('Native:  thêm --platform darwin|win32|linux --arch arm64|x64 --installer <file> [--native-required]');
    return;
  }
  const { type, version } = await promptMissing();
  const tag = readArg('--tag', `v${version}`);
  const platform = readArg('--platform', process.platform);
  const arch = readArg('--arch', process.arch);
  const defaultNotes = readArg('--notes', `Cập nhật VClaw v${version}`);
  const createRelease = hasFlag('--create-release');
  const notes = createRelease ? await promptReleaseNotes(defaultNotes) : defaultNotes;
  const assets = [];
  if (type === 'ui') {
    const minLauncherVersion = readArg('--min-launcher-version', readArg('--minimum-launcher-version', ''));
    run([
      'node',
      'scripts/package-vclaw-ui-update.mjs',
      '--version',
      version,
      '--tag',
      tag,
      '--platform',
      platform,
      '--arch',
      arch,
      ...(minLauncherVersion ? ['--min-launcher-version', minLauncherVersion] : []),
      ...(hasFlag('--required') ? ['--required'] : []),
    ]);
    assets.push(join(outputDir, `vclaw-ui-${version}-${platform}-${arch}.zip`), join(outputDir, 'vclaw-ui-update.json'));
  } else if (type === 'runtime') {
    run(['node', 'scripts/package-vclaw-openclaw-runtime.mjs', '--version', version, '--tag', tag]);
    assets.push(join(outputDir, `openclaw-bundled-${version}.tgz`), join(outputDir, 'vclaw-ui-update.json'));
  } else if (type === 'native') {
    const installer = readArg('--installer');
    if (!installer) throw new Error('Native release cần --installer trỏ tới file .pkg, .exe hoặc .deb');
    const installerPath = resolve(installer);
    if (!existsSync(installerPath)) throw new Error('Native release cần --installer trỏ tới file .pkg, .exe hoặc .deb');
    assets.push(installerPath, updateNativeInstallerManifest({ version, platform, arch, installerPath, tag, required: hasFlag('--native-required') }));
  } else {
    throw new Error(`Loại release không hợp lệ: ${type}`);
  }
  if (!hasFlag('--upload')) {
    console.log('Đã build xong. Thêm --upload để đẩy asset lên GitHub Release.');
    return;
  }
  for (const command of buildGhReleaseCommands({
    repo,
    tag,
    title: `VClaw v${version}`,
    notes,
    assets,
    createRelease,
  })) run(command);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli().catch((error) => {
    console.error(`Lỗi release: ${error.message}`);
    process.exit(1);
  });
}
