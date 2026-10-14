# Local evidence only. Callers must not return raw capture text to the console.
function Assert-FinanceCaptureDirectory([string]$Directory){
 if($Directory -notmatch '^[A-Za-z]:\\' -or $Directory.Substring(3).Contains(':')){throw 'Local absolute directory required'}
 $full=[IO.Path]::GetFullPath($Directory);$current=$full
 while($current){
  $item=Get-Item -LiteralPath $current -Force
  if(-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Unsafe directory'}
  $parent=Split-Path $current -Parent;if($parent -eq $current){break};$current=$parent
 }
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 $acl=[IO.Directory]::GetAccessControl($full)
 $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
 if(-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid -or $rules.Count -ne 1){throw 'Unsafe directory ACL'}
 $r=$rules[0]
 if($r.IdentityReference.Value -ne $sid -or $r.AccessControlType -ne 'Allow' -or
    $r.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
    $r.InheritanceFlags -ne ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit) -or
    $r.PropagationFlags -ne [Security.AccessControl.PropagationFlags]::None){throw 'Unsafe inherited access'}
 return $full
}
function Assert-FinanceCaptureFile([string]$File){
 $item=Get-Item -LiteralPath $File -Force
 if($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Unsafe evidence file'}
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 $acl=[IO.File]::GetAccessControl($File);$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
 if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid -or $rules.Count -ne 1 -or
    $rules[0].IdentityReference.Value -ne $sid -or $rules[0].AccessControlType -ne 'Allow' -or
    $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'Unsafe evidence file ACL'}
}
function New-FinanceCaptureFile([string]$Directory,[ValidateSet('ledger','actors','identity','bindings','session-witness','public-inventory','public-baseline','public-prerequisites','capabilities','ledger-v2','actors-v2')][string]$Kind='ledger'){
 $full=Assert-FinanceCaptureDirectory $Directory
 $file=Join-Path $full ($Kind+'-capture.json')
 # Reserve before any client starts. Existing/empty/partial evidence blocks reuse.
 $stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 try {
  Assert-FinanceCaptureFile $file
  return [pscustomobject]@{Directory=$full;Path=$file;Stream=$stream}
 }catch{$stream.Dispose();throw}
}
function Save-FinanceCaptureFile($Reservation,[string]$Text){
 [void](Assert-FinanceCaptureDirectory $Reservation.Directory)
 Assert-FinanceCaptureFile $Reservation.Path
 $bytes=[Text.UTF8Encoding]::new($false).GetBytes($Text)
 if($bytes.Length -eq 0 -or $bytes.Length -gt 4194304){throw 'Invalid capture size'}
 $Reservation.Stream.Write($bytes,0,$bytes.Length);$Reservation.Stream.Flush($true)
 $Reservation.Stream.Dispose()
 if([IO.File]::ReadAllText($Reservation.Path,[Text.Encoding]::UTF8) -cne $Text){throw 'Capture readback mismatch'}
 $hash=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($hash.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}
 finally{$hash.Dispose()}
}
