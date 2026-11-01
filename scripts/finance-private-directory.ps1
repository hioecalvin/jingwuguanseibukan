param([Parameter(Mandatory)][string]$Directory)
# Read-only ACL/path verification. No credential reads or permission changes.
$ErrorActionPreference='Stop'
try {
 if([Environment]::OSVersion.Platform -ne 'Win32NT'){throw 'Windows required'}
 if($Directory -notmatch '^[A-Za-z]:\\' -or $Directory.Substring(3).Contains(':')){throw 'Local drive path required'}
 $full=[IO.Path]::GetFullPath($Directory)
 $current=$full
 while($current){
  $item=Get-Item -LiteralPath $current -Force
  if(-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Unsafe directory'}
  $parent=Split-Path -Path $current -Parent
  if($parent -eq $current){break}
  $current=$parent
 }
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl=[IO.Directory]::GetAccessControl($full)
 $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
 if(-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $rules.Count -ne 1){throw 'Unsafe owner or inheritance'}
 $rule=$rules[0]
 if($rule.IdentityReference.Value -ne $sid.Value -or $rule.AccessControlType -ne 'Allow' -or
    $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
    $rule.InheritanceFlags -ne ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit) -or
    $rule.PropagationFlags -ne [Security.AccessControl.PropagationFlags]::None){throw 'Unsafe access rule'}
 [Console]::Out.Write('PRIVATE_DIRECTORY_VERIFIED')
 exit 0
} catch {
 # Do not print paths, usernames, credential-bearing exceptions or raw ACLs.
 [Console]::Error.Write('PRIVATE_DIRECTORY_REJECTED')
 exit 1
}
