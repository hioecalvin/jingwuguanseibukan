param([Parameter(Mandatory)][string]$Directory)
# Synthetic negative ACL case, exact file in a scoped temporary test directory.
$ErrorActionPreference='Stop'
$full=[IO.Path]::GetFullPath($Directory)
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
if((Split-Path $full -Parent) -ne $tempRoot -or (Split-Path $full -Leaf) -notmatch '^finance-acl-test-[A-Za-z0-9]+$'){throw 'Not an isolated ACL test directory'}
. (Join-Path $PSScriptRoot '../../scripts/finance-private-capture.ps1')
[void](Assert-FinanceCaptureDirectory $full)
$file=Join-Path $full 'public-baseline-capture.json'
Assert-FinanceCaptureFile $file
$acl=[IO.File]::GetAccessControl($file)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Read','Allow'))
[IO.File]::SetAccessControl($file,$acl)
