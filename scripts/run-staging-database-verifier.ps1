param(
  [string]$ExpectedProjectRef = "eomubndonbetszdbhsrj"
)

$ErrorActionPreference = "Stop"
if ($ExpectedProjectRef -ne "eomubndonbetszdbhsrj") {
  throw "This verifier runner is pinned to the approved staging project."
}

if (-not ("JwgSupabaseCredentialReader" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public static class JwgSupabaseCredentialReader
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
  $credentialRead = [JwgSupabaseCredentialReader]::CredRead(
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
    [type][JwgSupabaseCredentialReader+Credential]
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

  $sqlPath = Join-Path $PSScriptRoot "verify-database-security.sql"
  $body = @{
    query = [IO.File]::ReadAllText($sqlPath)
    read_only = $true
  } | ConvertTo-Json -Depth 4
  $null = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.supabase.com/v1/projects/$ExpectedProjectRef/database/query" `
    -Headers @{
      Authorization = "Bearer $accessToken"
      "Content-Type" = "application/json"
    } `
    -Body $body

  Write-Output "PASS: strict database verifier completed read-only against staging $ExpectedProjectRef."
}
finally {
  if ($null -ne $credentialBytes) {
    [Array]::Clear($credentialBytes, 0, $credentialBytes.Length)
  }
  $accessToken = $null
  if ($credentialPointer -ne [IntPtr]::Zero) {
    [JwgSupabaseCredentialReader]::CredFree($credentialPointer)
  }
}
