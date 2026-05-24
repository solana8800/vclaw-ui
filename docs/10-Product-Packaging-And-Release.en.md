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

### Step 3: Publish to Public Repository (vclaw-app)
Use a dedicated public repository for builds to keep your source code secure. Create **2 independent releases**, one per platform:

```bash
# Release for macOS (.pkg)
gh release create v0.1.0-macos \
  vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg \
  --repo solana8800/vclaw-app \
  --title "VClaw Desktop v0.1.0 (macOS)" \
  --notes "Beta Release v0.1.0: macOS (.pkg) installer for VClaw Desktop." \
  --generate-notes
```

```bash
# Release for Windows (.exe)
gh release create v0.1.0-windows \
  vclaw-ui/dist/VClawInstaller-0.1.0-win64.exe \
  --repo solana8800/vclaw-app \
  --title "VClaw Desktop v0.1.0 (Windows)" \
  --notes "Beta Release v0.1.0: Windows (.exe) installer for VClaw Desktop." \
  --generate-notes
```

---

## 3. Versioning & Security Workflow

To protect your business logic, VClaw utilizes a **Dual-Repo** model:
1. **Private Repo (`vclaw`)**: Where you write code and store core assets. Never create releases here.
2. **Public Repo (`vclaw-app`)**: The public "Showroom" for installers. Contains only builds for customers.

**Upgrade Cycle:**
1. Update the `version` field in `vclaw-ui/package.json`.
2. Run `bash scripts/package-vclaw.sh`.
3. Execute `gh release create` targeting the `--repo solana8800/vclaw-app`.

---

## 4. Future Roadmap

### Automatic Updates (Auto-update)
Version 0.2.0 is planned to feature a **Check-on-Launch** mechanism:
- Upon startup, the app fetches `version.json` from GitHub.
- Compares the local version with the server version.
- Displays an upgrade prompt to the user if a newer version is available.

### Release Infrastructure
- **GitHub Releases**: Official build repository.
- **Cloudflare R2**: Used for high-speed CDN and hosting large installer files.
