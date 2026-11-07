# Internal local-only reader. Stdout is private IPC, never a user-facing log.
# No credentials, database clients, network, capture creation or journal writes.
$ErrorActionPreference='Stop'
$stream=$null
try {
 . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
 $chars=New-Object char[] 8193
 $count=0
 while($count -lt $chars.Length){
  $n=[Console]::In.Read($chars,$count,$chars.Length-$count)
  if($n -eq 0){break};$count+=$n
 }
 if($count -eq 0 -or $count -gt 8192){throw 'Invalid request size'}
 $request=ConvertFrom-Json (-join $chars[0..($count-1)])
 if((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'directory,kind,sha256'){throw 'Invalid request'}
 $names=@{baseline='public-baseline-capture.json';ledger='ledger-v2-capture.json';actors='actors-v2-capture.json';capabilities='capabilities-capture.json';bindings='bindings-capture.json'}
 if($request.kind -isnot [string] -or -not $names.ContainsKey($request.kind) -or
    $request.sha256 -isnot [string] -or $request.sha256 -cnotmatch '^[a-f0-9]{64}$' -or
    $request.directory -isnot [string] -or $request.directory -match '[\x00-\x1f<>"|?*]'){throw 'Invalid request values'}
 $directory=Assert-FinanceCaptureDirectory $request.directory
 $file=Join-Path $directory $names[$request.kind]
 Assert-FinanceCaptureFile $file
 # Deny write/delete sharing for the full read and final ACL check.
 $stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 $limit=700000
 if($request.kind -ceq 'capabilities'){$limit=65536}
 if($request.kind -ceq 'bindings'){$limit=8192}
 if($stream.Length -lt 1 -or $stream.Length -gt $limit){throw 'Invalid evidence size'}
 $bytes=New-Object byte[] ([int]$stream.Length)
 $offset=0
 while($offset -lt $bytes.Length){
  $n=$stream.Read($bytes,$offset,$bytes.Length-$offset)
  if($n -eq 0){throw 'Incomplete read'};$offset+=$n
 }
 if($stream.ReadByte() -ne -1){throw 'Changed evidence size'}
 $sha=[Security.Cryptography.SHA256]::Create()
 try{$digest=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
 if($digest -cne $request.sha256){throw 'Receipt mismatch'}
 $decoded=[Text.UTF8Encoding]::new($false,$true).GetString($bytes)
 if($decoded[0] -eq [char]0xfeff -or $decoded.Contains([string][char]0)){throw 'Invalid evidence encoding'}
 [void](Assert-FinanceCaptureDirectory $directory)
 Assert-FinanceCaptureFile $file
 [Console]::Out.Write((ConvertTo-Json -Compress @{kind=$request.kind;sha256=$digest;base64=[Convert]::ToBase64String($bytes)}))
}catch{
 [Console]::Error.Write('FINANCE_PRIVATE_EVIDENCE_REJECTED')
 exit 1
}finally{if($null -ne $stream){$stream.Dispose()}}
