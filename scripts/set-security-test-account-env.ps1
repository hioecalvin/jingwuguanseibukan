[CmdletBinding()]
param(
    [string] $EnvFile = 'C:\protected\jingwuguan-staging.env'
)

$ErrorActionPreference = 'Stop'
$expectedProjectRef = 'eomubndonbetszdbhsrj'
$expectedPath = [IO.Path]::GetFullPath('C:\protected\jingwuguan-staging.env')
$resolvedPath = [IO.Path]::GetFullPath($EnvFile)

if ($resolvedPath -ne $expectedPath) {
    throw 'Refusing to modify anything except the protected staging environment file.'
}
if (-not [IO.File]::Exists($resolvedPath)) {
    throw 'The protected staging environment file is missing.'
}

$content = [IO.File]::ReadAllText($resolvedPath)

function Get-EnvValue([string] $Name) {
    $pattern = '(?m)^\s*(?:export\s+)?' + [regex]::Escape($Name) + '\s*=([^\r\n]*)\r?$'
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -ne 1) {
        throw "Expected exactly one $Name entry."
    }
    return $matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
}

if ((Get-EnvValue 'STAGING_PROJECT_REF') -ne $expectedProjectRef) {
    throw 'The protected file does not name the approved staging project.'
}
if ((Get-EnvValue 'NEXT_PUBLIC_SUPABASE_URL') -ne "https://$expectedProjectRef.supabase.co") {
    throw 'The protected file does not contain the exact approved staging origin.'
}

function New-SecurityTestPassword {
    $bytes = New-Object byte[] 24
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    $random = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    return "JwS!9aA-$random"
}

$passwords = @()
do {
    $passwords = @(New-SecurityTestPassword; New-SecurityTestPassword; New-SecurityTestPassword)
} while (($passwords | Select-Object -Unique).Count -ne 3)

$updates = [ordered]@{
    SECURITY_TEST_MEMBER_EMAIL    = '0101@dummy.jingwuguan.test'
    SECURITY_TEST_MEMBER_PASSWORD = $passwords[0]
    SECURITY_TEST_ADMIN_EMAIL     = '0002@dummy.jingwuguan.test'
    SECURITY_TEST_ADMIN_PASSWORD  = $passwords[1]
    SECURITY_TEST_SUPER_EMAIL     = '0001@dummy.jingwuguan.test'
    SECURITY_TEST_SUPER_PASSWORD  = $passwords[2]
}

foreach ($entry in $updates.GetEnumerator()) {
    $name = [string] $entry.Key
    $pattern = '(?m)^(\s*(?:export\s+)?' + [regex]::Escape($name) + '\s*=)[^\r\n]*\r?$'
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -ne 1) {
        throw "Expected exactly one $name entry."
    }
    $replacement = '${1}' + [string] $entry.Value + "`r"
    $content = [regex]::Replace($content, $pattern, $replacement)
}

$tempPath = [IO.Path]::Combine(
    [IO.Path]::GetDirectoryName($resolvedPath),
    '.' + [IO.Path]::GetRandomFileName()
)
$backupPath = $resolvedPath + '.pre-security-rotation.bak'
if ([IO.File]::Exists($backupPath)) {
    throw 'A protected pre-rotation backup already exists; refusing to overwrite it.'
}
try {
    [IO.File]::WriteAllText($tempPath, $content, [Text.UTF8Encoding]::new($false))
    [IO.File]::Replace($tempPath, $resolvedPath, $backupPath, $true)
    [IO.File]::Delete($backupPath)
}
finally {
    if ([IO.File]::Exists($tempPath)) {
        [IO.File]::Delete($tempPath)
    }
}

Write-Output 'Updated exactly the six approved SECURITY_TEST_* entries; no values were printed.'
