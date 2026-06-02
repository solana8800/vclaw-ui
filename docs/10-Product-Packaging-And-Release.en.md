# VClaw Desktop Packaging and Release Strategy

This document outlines the technical process for packaging VClaw into a macOS professional installer (.pkg) and the workflow for public releases via GitHub.

---

## 1. Transparent Installation Logic

The VClaw .pkg installer is designed for stability with two automated phases:
- **Pre-install**: System cleanup and termination of background processes (port 12687).
- **Post-install**: Automatically installs OpenClaw into the **User-space** area (`~/.openclaw/runtime`). This process drops root privileges to run as the current console user, preventing permission issues (EACCES) when installing extensions later. It also configures a LaunchAgent to manage the background Gateway service.

> [!TIP]
> **Track Progress**: Press **`Cmd + L`** during installation to open the Installer Log window and view the real-time download logs.

---

## 2. Release Workflow

To publish a new build to GitHub, follow these steps:

### Step 1: GitHub CLI Authentication (One-time)
Authenticate your machine with your GitHub account:
```bash
gh auth login
```

### Step 2: Build the Product
Ensure you have the latest clean build before releasing:
```bash
bash scripts/package-vclaw.sh
```

### Step 3: Publish to Public Repository (vclaw)
Use a dedicated public repository for builds to keep your source code secure. To publish both platforms under **the same tag** (e.g., `v0.1.0`), you can create the release for macOS first, and then append the Windows build later:

#### 1. Create the Initial Release with the macOS Build (`.pkg`)
This command initializes the Release on GitHub with the tag `v0.1.0` and attaches the `.pkg` file:

```bash
# Create a release with the shared tag v0.1.0 and attach the macOS installer
gh release create v0.1.0 \
  vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg \
  --repo solana8800/vclaw \
  --title "VClaw Desktop v0.1.0" \
  --notes "Beta Release v0.1.0: Installers for macOS and Windows." \
  --generate-notes
```

#### 2. Append the Windows Installer (`.exe`) to the Same Tag
Once the Windows installer is built and ready, simply use the `upload` command to attach the file to the existing `v0.1.0` release (use `--clobber` to automatically overwrite if the file already exists):

```bash
# Upload the Windows .exe installer to the Release (overwrite if exists)
gh release upload v0.1.0 \
  vclaw-ui/dist/VClawInstaller-0.1.0-x64.exe \
  --repo solana8800/vclaw \
  --clobber
```

> [!NOTE]
> The `gh release upload` command allows you to append additional installer assets to an existing release without modifying the previously set title, description, or release notes.


---

## 3. Versioning & Security Workflow

To protect your business logic, VClaw utilizes a **Dual-Repo** model:
1. **Private Repo (`vclaw-ui`)**: Where you write code and store core assets. Never create releases here.
2. **Public Repo (`vclaw`)**: The public "Showroom" for installers. Contains only builds for customers.

**Upgrade Cycle:**
1. Update the relevant version in `vclaw-ui/release-versions.json`.
2. Run `bash scripts/package-vclaw.sh`.
3. Execute `gh release create` (or `gh release upload` for subsequent platforms) targeting the public repository `--repo solana8800/vclaw`.

---

## 4. Automatic Updates

VClaw supports three independent update layers through public GitHub Releases:
- The launcher fetches `vclaw-ui-update.json` after the application opens.
- When a compatible UI update exists, the launcher downloads the ZIP in the background
  and verifies its SHA-256 checksum.
- When a newer `openclawRuntime.version` exists, the launcher downloads the tarball,
  verifies SHA-256, installs into staging, and swaps `~/.openclaw/runtime`. It rolls
  back when the new runtime fails.
- Electron asks the user before restarting. The manifest can set `required: true` for a
  mandatory patch.
- When an active payload fails to start, the launcher marks it as failed and falls back
  to the UI bundled with the installer.
- Releases changing the Electron launcher or installer hooks can declare `nativeVersion`,
  `nativeRequired`, and `nativeInstallers`. The launcher shows the correct installer
  download for the user's platform.

See `scripts/PACKAGING.md` for the canonical helper commands. Build UI payloads separately
on macOS and Windows. The OpenClaw runtime tarball is cross-platform. Publish a native
installer only when the launcher or installer hooks change.

Common commands:

```bash
# Short interactive console prompts
node scripts/release-vclaw.mjs

# UI-only
node scripts/release-vclaw.mjs --type ui --version 0.1.0 --platform darwin --arch arm64 --upload

# OpenClaw runtime-only, after running pnpm build in core/openclaw-zero-token
node scripts/release-vclaw.mjs --type runtime --version 0.1.0 --upload

# macOS native installer
node scripts/release-vclaw.mjs --type native --version 0.1.0 --platform darwin --arch arm64 \
  --installer vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg --upload
```

Use the same Node.js helper on Windows with `--platform win32 --arch x64` and an `.exe`
installer. Add `--create-release` when the GitHub Release tag does not exist yet.

### Release Infrastructure
- **GitHub Releases**: Official build repository.
