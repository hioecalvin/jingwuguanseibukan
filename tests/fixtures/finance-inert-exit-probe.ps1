param([Parameter(Mandatory)][string]$ClientPath)
# Read-only test helper: match the exact synthetic executable, not a recyclable PID.
$ErrorActionPreference='Stop'
try {
 $full=[IO.Path]::GetFullPath($ClientPath)
 if([IO.Path]::GetFileName($full) -cnotin @('protected-inert.exe','baseline-inert.exe','witness-inert.exe') -or
    [IO.Path]::GetFileName([IO.Path]::GetDirectoryName($full)) -notlike 'finance-acl-test-*') { throw 'Synthetic client required' }
 foreach($process in [Diagnostics.Process]::GetProcessesByName([IO.Path]::GetFileNameWithoutExtension($full))) {
  try {
   if($process.HasExited){continue}
   try {$executable=$process.MainModule.FileName} catch {
    if($process.HasExited){continue};throw
   }
   if(-not $executable){if($process.HasExited){continue};throw 'Process identity unavailable'}
   if([IO.Path]::GetFullPath($executable) -ieq $full -and -not $process.HasExited){throw 'Synthetic client still running'}
  } finally {$process.Dispose()}
 }
 [Console]::Out.Write('EXACT_INERT_CLIENT_EXITED')
} catch { [Console]::Error.Write('INERT_EXIT_NOT_VERIFIED');exit 1 }
