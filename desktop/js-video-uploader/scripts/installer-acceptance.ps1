[CmdletBinding()]
param(
    [string]$InstallerPath,
    [string]$EvidencePath,
    [ValidateRange(3, 300)]
    [int]$InspectionSeconds = 10,
    [ValidatePattern('^[A-Fa-f0-9]{64}$')]
    [string]$ExpectedSha256,
    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$productName = "JS Video Uploader"
$executableName = "JSVideoUploader.exe"
$uninstallRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall"
$startedAt = [DateTimeOffset]::Now
$steps = [System.Collections.Generic.List[object]]::new()
$installedEntry = $null
$installedDirectory = $null
$applicationProcess = $null
$outcome = "failed"
$script:installerInfo = $null

if ([string]::IsNullOrWhiteSpace($InstallerPath)) {
    $InstallerPath = Join-Path $PSScriptRoot "..\release\JS-Video-Uploader-Setup.exe"
}

function Add-Step {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Status,
        [string]$Detail = ""
    )
    $script:steps.Add([ordered]@{
        name = $Name
        status = $Status
        detail = $Detail
        observedAt = [DateTimeOffset]::Now.ToString("o")
    })
}

function Get-ProductEntries {
    if (-not (Test-Path -LiteralPath $uninstallRoot)) { return @() }
    return @(
        Get-ChildItem -LiteralPath $uninstallRoot -ErrorAction SilentlyContinue |
            ForEach-Object { Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue } |
            Where-Object { $_.DisplayName -eq $productName }
    )
}

function Get-ExecutableFromCommand {
    param([string]$Command)
    if ([string]::IsNullOrWhiteSpace($Command)) { return $null }
    $trimmed = $Command.Trim()
    if ($trimmed -match '^"([^"]+\.exe)"(?:\s|$)') { return $Matches[1] }
    if ($trimmed -match '^(.+?\.exe)(?:\s|$)') { return $Matches[1] }
    return $null
}

function Get-Sha256 {
    param([Parameter(Mandatory)][string]$Path)
    $stream = $null
    $algorithm = $null
    try {
        $stream = [IO.File]::OpenRead($Path)
        $algorithm = [Security.Cryptography.SHA256]::Create()
        return ([BitConverter]::ToString($algorithm.ComputeHash($stream)) -replace '-', '')
    } finally {
        if ($algorithm) { $algorithm.Dispose() }
        if ($stream) { $stream.Dispose() }
    }
}

function Get-EntryValue {
    param([Parameter(Mandatory)]$Entry, [Parameter(Mandatory)][string]$Name)
    $property = $Entry.PSObject.Properties[$Name]
    if ($property) { return [string]$property.Value }
    return ""
}

function Wait-ForProductEntries {
    param([int]$ExpectedCount, [int]$TimeoutSeconds = 30)
    $deadline = [DateTimeOffset]::Now.AddSeconds($TimeoutSeconds)
    do {
        $entries = @(Get-ProductEntries)
        if ($entries.Count -eq $ExpectedCount) { return $entries }
        Start-Sleep -Milliseconds 500
    } while ([DateTimeOffset]::Now -lt $deadline)
    return @(Get-ProductEntries)
}

function Resolve-InstalledExecutable {
    param([Parameter(Mandatory)]$Entry)
    $candidates = [System.Collections.Generic.List[string]]::new()
    $installLocation = Get-EntryValue -Entry $Entry -Name "InstallLocation"
    if (-not [string]::IsNullOrWhiteSpace($installLocation)) {
        $candidates.Add((Join-Path $installLocation $executableName))
    }
    $uninstaller = Get-ExecutableFromCommand (Get-EntryValue -Entry $Entry -Name "UninstallString")
    if ($uninstaller) { $candidates.Add((Join-Path (Split-Path -Parent $uninstaller) $executableName)) }
    $displayIcon = Get-EntryValue -Entry $Entry -Name "DisplayIcon"
    if (-not [string]::IsNullOrWhiteSpace($displayIcon)) {
        $icon = ($displayIcon -replace ',\d+$', '').Trim('"')
        if ([IO.Path]::GetFileName($icon) -eq $executableName) { $candidates.Add($icon) }
    }
    $matches = @($candidates | Select-Object -Unique | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
    if ($matches.Count -ne 1) {
        throw "Expected exactly one installed $executableName, found $($matches.Count)."
    }
    return (Resolve-Path -LiteralPath $matches[0]).Path
}

function Write-Evidence {
    param([string]$FailureMessage)
    $target = $EvidencePath
    if ([string]::IsNullOrWhiteSpace($target)) {
        $kind = if ($PreflightOnly) { "installer-preflight" } else { "installer-acceptance" }
        $target = Join-Path $PSScriptRoot "..\test-results\$kind-$($startedAt.ToString('yyyyMMdd-HHmmss')).json"
    }
    $parent = Split-Path -Parent $target
    if (-not [string]::IsNullOrWhiteSpace($parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $report = [ordered]@{
        schemaVersion = 1
        product = $productName
        mode = if ($PreflightOnly) { "preflight" } else { "interactive-install-launch-uninstall" }
        outcome = $outcome
        startedAt = $startedAt.ToString("o")
        finishedAt = [DateTimeOffset]::Now.ToString("o")
        machine = $env:COMPUTERNAME
        user = $env:USERNAME
        installer = if ($script:installerInfo) { $script:installerInfo } else { $null }
        installedDirectory = $installedDirectory
        steps = @($steps)
        failure = $FailureMessage
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $target -Encoding utf8
    Write-Host "Evidence: $((Resolve-Path -LiteralPath $target).Path)"
}

$failure = $null
try {
    if (-not [Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([Runtime.InteropServices.OSPlatform]::Windows)) {
        throw "Installer acceptance must run on Windows."
    }

    $resolvedInstaller = (Resolve-Path -LiteralPath $InstallerPath).Path
    $item = Get-Item -LiteralPath $resolvedInstaller
    if ($item.Extension -ne ".exe" -or $item.Length -le 0) { throw "Installer must be a non-empty .exe file." }
    $hash = Get-Sha256 -Path $resolvedInstaller
    $signatureStatus = "Unavailable"
    $signer = $null
    try {
        $signature = Get-AuthenticodeSignature -LiteralPath $resolvedInstaller
        $signatureStatus = [string]$signature.Status
        if ($signature.SignerCertificate) { $signer = $signature.SignerCertificate.Subject }
    } catch {
        Add-Step "authenticode-inspection" "warning" "Authenticode inspection is unavailable in this PowerShell host: $($_.Exception.Message)"
    }
    $script:installerInfo = [ordered]@{
        path = $resolvedInstaller
        bytes = $item.Length
        sha256 = $hash
        authenticodeStatus = $signatureStatus
        signer = $signer
        fileVersion = $item.VersionInfo.FileVersion
        productVersion = $item.VersionInfo.ProductVersion
    }
    if ($ExpectedSha256 -and $hash -ne $ExpectedSha256.ToUpperInvariant()) {
        throw "Installer SHA-256 does not match the approved value."
    }
    Add-Step "installer-fingerprint" "passed" "SHA-256 $hash; Authenticode $signatureStatus."

    $baseline = @(Get-ProductEntries)
    if ($baseline.Count -ne 0) {
        throw "An existing exact '$productName' per-user installation was found. Uninstall it manually before running this isolated acceptance flow."
    }
    Add-Step "clean-baseline" "passed" "No exact per-user product registration exists."

    if ($PreflightOnly) {
        $outcome = "passed"
        Add-Step "preflight" "passed" "Installer is ready for the interactive acceptance flow."
        return
    }

    Write-Host "The normal installer will open. Complete it without signing in to the app."
    $installerProcess = Start-Process -FilePath $resolvedInstaller -PassThru -Wait
    if ($installerProcess.ExitCode -ne 0) { throw "Installer exited with code $($installerProcess.ExitCode)." }
    $entries = @(Wait-ForProductEntries -ExpectedCount 1)
    if ($entries.Count -ne 1) { throw "Expected one exact product registration after install; found $($entries.Count)." }
    $installedEntry = $entries[0]
    Add-Step "interactive-install" "passed" "Installer exited successfully and registered one exact product."

    $installedExecutable = Resolve-InstalledExecutable -Entry $installedEntry
    $installedDirectory = Split-Path -Parent $installedExecutable
    $applicationProcess = Start-Process -FilePath $installedExecutable -PassThru
    $windowDeadline = [DateTimeOffset]::Now.AddSeconds(60)
    do {
        Start-Sleep -Milliseconds 500
        $applicationProcess.Refresh()
    } while (-not $applicationProcess.HasExited -and $applicationProcess.MainWindowHandle -eq 0 -and [DateTimeOffset]::Now -lt $windowDeadline)
    if ($applicationProcess.HasExited -or $applicationProcess.MainWindowHandle -eq 0) {
        throw "The installed application did not expose a visible main window within 60 seconds."
    }
    Add-Step "installed-app-launch" "passed" "PID $($applicationProcess.Id), window '$($applicationProcess.MainWindowTitle)'."
    Write-Host "Inspect the visible sign-in screen. It will close in $InspectionSeconds seconds. Do not enter credentials."
    Start-Sleep -Seconds $InspectionSeconds
    [void]$applicationProcess.CloseMainWindow()
    if (-not $applicationProcess.WaitForExit(10000)) {
        $applicationProcess.Kill()
        $applicationProcess.WaitForExit()
    }
    Add-Step "installed-app-close" "passed" "Only the process started by this script was closed."

    $uninstaller = Get-ExecutableFromCommand (Get-EntryValue -Entry $installedEntry -Name "UninstallString")
    if (-not $uninstaller -or -not (Test-Path -LiteralPath $uninstaller -PathType Leaf)) {
        throw "The exact product registration does not contain a usable uninstaller."
    }
    Write-Host "The normal uninstaller will open. Confirm removal of JS Video Uploader."
    $uninstallerProcess = Start-Process -FilePath $uninstaller -PassThru -Wait
    if ($uninstallerProcess.ExitCode -ne 0) { throw "Uninstaller exited with code $($uninstallerProcess.ExitCode)." }
    $remainingEntries = @(Wait-ForProductEntries -ExpectedCount 0)
    if ($remainingEntries.Count -ne 0) { throw "The exact product registration remains after uninstall." }
    $directoryDeadline = [DateTimeOffset]::Now.AddSeconds(30)
    while ($installedDirectory -and (Test-Path -LiteralPath $installedDirectory) -and [DateTimeOffset]::Now -lt $directoryDeadline) {
        Start-Sleep -Milliseconds 500
    }
    if ($installedDirectory -and (Test-Path -LiteralPath $installedDirectory)) {
        throw "The installed application directory remains after uninstall: $installedDirectory"
    }
    Add-Step "interactive-uninstall" "passed" "Product registration and captured install directory were removed."
    $outcome = "passed"
} catch {
    $failure = $_.Exception.Message
    Add-Step "failure" "failed" $failure
    throw
} finally {
    if ($applicationProcess -and -not $applicationProcess.HasExited) {
        try { $applicationProcess.Kill(); $applicationProcess.WaitForExit() } catch { }
    }
    Write-Evidence -FailureMessage $failure
}
