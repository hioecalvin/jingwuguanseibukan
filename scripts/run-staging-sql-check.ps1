param(
  [Parameter(Mandatory = $true)]
  [string]$SqlPath,

  [string]$ExpectedRollbackMessage = "",

  [string]$ExpectedProjectRef = "eomubndonbetszdbhsrj"
)

$ErrorActionPreference = "Stop"
$approvedProjectRef = "eomubndonbetszdbhsrj"

if ($ExpectedProjectRef -ne $approvedProjectRef) {
  throw "This SQL-check runner is pinned to the approved staging project."
}

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$resolvedSqlPath = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $SqlPath).Path)
if (-not $resolvedSqlPath.StartsWith($repositoryRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "The SQL check must be a file inside this repository."
}

if (-not ("JwgStagingSqlCredentialReader" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public static class JwgStagingSqlCredentialReader
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct Credential
    {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW",
        CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(
        string target,
        uint type,
        int reservedFlag,
        out IntPtr credentialPtr
    );

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
}
"@
}

$credentialPointer = [IntPtr]::Zero
$credentialBytes = $null
$accessToken = $null
try {
  $credentialRead = [JwgStagingSqlCredentialReader]::CredRead(
    "Supabase CLI:supabase",
    1,
    0,
    [ref]$credentialPointer
  )
  if (-not $credentialRead) {
    throw "The existing Supabase CLI credential could not be read."
  }

  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
    $credentialPointer,
    [type][JwgStagingSqlCredentialReader+Credential]
  )
  $credentialBytes = [byte[]]::new($credential.CredentialBlobSize)
  [Runtime.InteropServices.Marshal]::Copy(
    $credential.CredentialBlob,
    $credentialBytes,
    0,
    $credentialBytes.Length
  )
  $accessToken = [Text.Encoding]::UTF8.GetString($credentialBytes).Trim([char]0)
  if ([string]::IsNullOrWhiteSpace($accessToken)) {
    throw "The existing Supabase CLI credential is empty."
  }

  $body = @{
    query = [IO.File]::ReadAllText($resolvedSqlPath)
    read_only = [string]::IsNullOrWhiteSpace($ExpectedRollbackMessage)
  } | ConvertTo-Json -Depth 4

  try {
    $null = Invoke-RestMethod `
      -Method Post `
      -Uri "https://api.supabase.com/v1/projects/$approvedProjectRef/database/query" `
      -Headers @{
        Authorization = "Bearer $accessToken"
        "Content-Type" = "application/json"
      } `
      -Body $body

    if (-not [string]::IsNullOrWhiteSpace($ExpectedRollbackMessage)) {
      throw "The rollback-contained SQL unexpectedly completed without its rollback signal."
    }
  }
  catch {
    if ([string]::IsNullOrWhiteSpace($ExpectedRollbackMessage)) {
      throw
    }

    $safeErrorText = "$($_.Exception.Message)`n$($_.ErrorDetails.Message)"
    if (-not $safeErrorText.Contains($ExpectedRollbackMessage, [StringComparison]::Ordinal)) {
      throw "The SQL check failed without the exact expected rollback signal."
    }
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedRollbackMessage)) {
    Write-Output "PASS: read-only staging SQL check completed for $([IO.Path]::GetFileName($resolvedSqlPath))."
  }
  else {
    Write-Output "PASS: rollback-contained staging SQL check returned its exact expected signal for $([IO.Path]::GetFileName($resolvedSqlPath))."
  }
}
finally {
  if ($null -ne $credentialBytes) {
    [Array]::Clear($credentialBytes, 0, $credentialBytes.Length)
  }
  $accessToken = $null
  if ($credentialPointer -ne [IntPtr]::Zero) {
    [JwgStagingSqlCredentialReader]::CredFree($credentialPointer)
  }
}
