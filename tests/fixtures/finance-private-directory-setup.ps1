param([Parameter(Mandatory)][string]$Directory,[switch]$ExtraReader)
# Test-only ACL setup: exactly one existing direct child of the temp directory.
$ErrorActionPreference='Stop'
$full=[IO.Path]::GetFullPath($Directory)
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
if((Split-Path $full -Parent) -ne $tempRoot -or (Split-Path $full -Leaf) -notmatch '^finance-acl-test-[A-Za-z0-9]+$'){throw 'Not an isolated ACL test directory'}
$item=Get-Item -LiteralPath $full -Force
if(-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Unsafe ACL test directory'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=[Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true,$false)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
if($ExtraReader){
 $everyone=[Security.Principal.SecurityIdentifier]::new('S-1-1-0')
 $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($everyone,'ReadAndExecute','ContainerInherit,ObjectInherit','None','Allow'))
}
[IO.Directory]::SetAccessControl($full,$acl)
