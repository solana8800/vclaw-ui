#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repo = 'solana8800/vclaw';
const outputDir = join(rootDir, 'vclaw-ui', 'dist', 'ui-update');

export function buildGhReleaseCommands(options) {
  const upload = ['gh', 'release', 'upload', options.tag, ...options.assets, '--repo', options.repo, '--clobber'];
  if (!options.createRelease) return [upload];
  return [
    ['gh', 'release', 'create', options.tag, '--repo', options.repo, '--title', options.title, '--notes', options.notes],
    upload,
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
  const url = `https://github.com/${repo}/releases/download/${tag}/${basename(installerPath)}`;
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

async function runCli() {
  if (hasFlag('--help')) {
    console.log('Dùng: node scripts/release-vclaw.mjs --type ui|runtime|native --version X.Y.Z [--upload] [--create-release]');
    console.log('UI:      thêm --platform darwin|win32 --arch arm64|x64 [--required]');
    console.log('Native:  thêm --platform darwin|win32 --arch arm64|x64 --installer <file> [--native-required]');
    return;
  }
  const { type, version } = await promptMissing();
  const tag = readArg('--tag', `v${version}`);
  const platform = readArg('--platform', process.platform);
  const arch = readArg('--arch', process.arch);
  const assets = [];
  if (type === 'ui') {
    run(['node', 'scripts/package-vclaw-ui-update.mjs', '--version', version, '--tag', tag, '--platform', platform, '--arch', arch, ...(hasFlag('--required') ? ['--required'] : [])]);
    assets.push(join(outputDir, `vclaw-ui-${version}-${platform}-${arch}.zip`), join(outputDir, 'vclaw-ui-update.json'));
  } else if (type === 'runtime') {
    run(['node', 'scripts/package-vclaw-openclaw-runtime.mjs', '--version', version, '--tag', tag]);
    assets.push(join(outputDir, `openclaw-bundled-${version}.tgz`), join(outputDir, 'vclaw-ui-update.json'));
  } else if (type === 'native') {
    const installer = readArg('--installer');
    if (!installer) throw new Error('Native release cần --installer trỏ tới file .pkg hoặc .exe');
    const installerPath = resolve(installer);
    if (!existsSync(installerPath)) throw new Error('Native release cần --installer trỏ tới file .pkg hoặc .exe');
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
    notes: readArg('--notes', `Cập nhật VClaw v${version}`),
    assets,
    createRelease: hasFlag('--create-release'),
  })) run(command);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli().catch((error) => {
    console.error(`Lỗi release: ${error.message}`);
    process.exit(1);
  });
}
