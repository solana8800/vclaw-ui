param(
  [string]$Type,
  [string]$Version,
  [string]$Platform,
  [string]$Arch,
  [string]$MinLauncherVersion,
  [switch]$Upload,
  [switch]$CreateRelease,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir '..')
$NodeScript = Join-Path $RootDir 'scripts/release-vclaw.mjs'

function Show-Usage {
  @'
Dùng: powershell -File scripts/release-vclaw.ps1 [-Type ui|runtime|native] [-Version X.Y.Z] [-Platform darwin|win32] [-Arch arm64|x64] [-MinLauncherVersion X.Y.Z] [-Notes "nội dung"] [-Upload] [-CreateRelease]

Nếu không truyền tham số, script sẽ hỏi tương tác trong console.

Ví dụ:
  powershell -File scripts/release-vclaw.ps1
  powershell -File scripts/release-vclaw.ps1 -Type ui -Version 0.1.1 -Upload
  powershell -File scripts/release-vclaw.ps1 -Type ui -Version 0.1.1 -Notes "Sửa icon và relaunch"
  powershell -File scripts/release-vclaw.ps1 -Type runtime -Version 0.1.1 -Upload -CreateRelease
'@ | Write-Host
}

function Read-Choice {
  param(
    [string]$Prompt,
    [string]$Default
  )

  $value = Read-Host $Prompt
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Read-MultilineNotes {
  param(
    [string]$Default
  )

  Write-Host 'Release note (dán nhiều dòng, kết thúc bằng một dòng trống).'
  Write-Host "Mặc định: $Default"
  $lines = New-Object System.Collections.Generic.List[string]
  while ($true) {
    $prompt = if ($lines.Count -eq 0) { 'Notes> ' } else { '... ' }
    $line = Read-Host $prompt
    if ([string]::IsNullOrWhiteSpace($line)) { break }
    $lines.Add($line)
  }

  if ($lines.Count -gt 0) { return ($lines -join "`n") }
  return $Default
}

function Get-NextVersionForType {
  param(
    [string]$Type,
    [string]$Version
  )

  if ($Version -match '^(\d+)\.(\d+)\.(\d+)$') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]

    switch ($Type) {
      'ui' { return "$major.$minor.$($patch + 1)" }
      'runtime' {
        if ($major -eq 0) { return "0.$($minor + 1).0" }
        return "$major.$minor.$($patch + 1)"
      }
      'native' {
        if ($major -eq 0) { return '1.0.0' }
        return "$($major + 1).0.0"
      }
      default { return "$major.$minor.$($patch + 1)" }
    }
  }

  throw "Phiên bản không hợp lệ: $Version"
}

if ($Help) {
  Show-Usage
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Type)) {
  Write-Host 'Chọn loại release:'
  Write-Host '  1) ui        - Gói cập nhật giao diện Next.js'
  Write-Host '  2) runtime   - Gói OpenClaw runtime'
  Write-Host '  3) native    - Bộ cài Electron/native'
  $choice = Read-Choice 'Chọn [1-3] (mặc định 1)' '1'
  switch ($choice) {
    '2' { $Type = 'runtime' }
    '3' { $Type = 'native' }
    default { $Type = 'ui' }
  }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $defaults = Get-Content (Join-Path $RootDir 'vclaw-ui/release-versions.json') -Raw | ConvertFrom-Json
  $currentVersion = switch ($Type) {
    'runtime' { $defaults.openclawRuntime.version }
    'native' { $defaults.nativeVersion }
    default { $defaults.uiVersion }
  }
  $defaultVersion = Get-NextVersionForType $Type $currentVersion
  $Version = Read-Choice "Phiên bản release [$defaultVersion]" $defaultVersion
}

if ($Type -eq 'ui' -and [string]::IsNullOrWhiteSpace($MinLauncherVersion)) {
  $defaults = Get-Content (Join-Path $RootDir 'vclaw-ui/release-versions.json') -Raw | ConvertFrom-Json
  $defaultMinLauncherVersion = $defaults.nativeVersion
  $MinLauncherVersion = Read-Choice "Phiên bản launcher tối thiểu [$defaultMinLauncherVersion]" $defaultMinLauncherVersion
}

if ($Type -ne 'native') {
  if ([string]::IsNullOrWhiteSpace($Platform)) {
    $Platform = Read-Choice 'Nền tảng [darwin/win32] (mặc định win32)' 'win32'
  }
  if ([string]::IsNullOrWhiteSpace($Arch)) {
    $defaultArch = if ($env:PROCESSOR_ARCHITECTURE -match 'ARM64') { 'arm64' } else { 'x64' }
    $Arch = Read-Choice "Kiến trúc [arm64/x64] (mặc định $defaultArch)" $defaultArch
  }
}

if (-not $Upload) {
  $Upload = (Read-Choice 'Upload lên GitHub Release? [y/N]' 'n') -match '^[Yy]$'
}

if (-not $CreateRelease) {
  $CreateRelease = (Read-Choice 'Tạo release nếu chưa có tag? [y/N]' 'n') -match '^[Yy]$'
}

if ([string]::IsNullOrWhiteSpace($Notes) -and $CreateRelease) {
  $Notes = Read-MultilineNotes "Cập nhật VClaw v$Version"
}

$args = @('--type', $Type, '--version', $Version)
if ($Platform) { $args += @('--platform', $Platform) }
if ($Arch) { $args += @('--arch', $Arch) }
if ($MinLauncherVersion) { $args += @('--min-launcher-version', $MinLauncherVersion) }
if ($Notes) { $args += @('--notes', $Notes) }
if ($Upload) { $args += '--upload' }
if ($CreateRelease) { $args += '--create-release' }

node $NodeScript @args
