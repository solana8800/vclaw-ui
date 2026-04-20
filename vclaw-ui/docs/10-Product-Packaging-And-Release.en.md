# VClaw Desktop Packaging and Release Strategy

This document outlines the technical process for packaging VClaw into a macOS professional installer (.pkg) and the workflow for public releases via GitHub.

---

## 1. Transparent Installation Logic

The VClaw .pkg installer is designed for stability with two automated phases:
- **Pre-install**: System cleanup and termination of background processes (port 12687).
- **Post-install**: Automatic deployment of OpenClaw Core and Ollama Engine directly via the Internet.

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

### Step 3: Create GitHub Release
Use the following command to create a new release and upload the installer:
```bash
# Replace 'v0.1.0' with your current version
gh release create v0.1.0 vclaw-ui/dist/VClawInstaller-0.1.0-arm64.pkg --title "VClaw Desktop v0.1.0" --notes "Add your release notes here."
```

---

## 3. Versioning Workflow

When you want to release a new version (e.g., from 0.1.0 to 0.2.0), follow this 3-step cycle:

1. **Update Metadata**: Open `vclaw-ui/package.json` and change the `"version"` field.
2. **Re-build**: Run `bash scripts/package-vclaw.sh`. The script automatically retrieves the new version to name the `.pkg` file.
3. **Publish**: Run the `gh release create` command with the corresponding version tag.

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
