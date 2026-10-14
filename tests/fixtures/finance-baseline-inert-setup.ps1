param([Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
$full=[IO.Path]::GetFullPath($Directory)
$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
if(-not $full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase) -or
 (Split-Path $full -Leaf) -notmatch '^finance-acl-test-[A-Za-z0-9]+$'){throw 'Synthetic temp directory required'}
$output=Join-Path $full 'baseline-inert.exe'
if(Test-Path -LiteralPath $output){throw 'No overwrite'}
Add-Type -Path (Join-Path $PSScriptRoot 'finance-baseline-inert.cs') -OutputAssembly $output -OutputType ConsoleApplication
