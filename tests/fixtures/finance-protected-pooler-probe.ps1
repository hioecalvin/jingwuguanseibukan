param([Parameter(Mandatory)][ValidateSet('setup','run','credential')][string]$Mode,[string]$Directory)
$ErrorActionPreference='Stop'
$credential=$null
try{
 if($Mode -eq 'setup'){
  $full=[IO.Path]::GetFullPath($Directory)
  if((Split-Path $full -Parent) -ne [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') -or
     (Split-Path $full -Leaf) -notmatch '^finance-acl-test-[A-Za-z0-9]+$'){throw 'Synthetic test directory required'}
  $output=Join-Path $full 'protected-inert.exe'
  if(Test-Path -LiteralPath $output){throw 'No overwrite'}
  Add-Type -Path (Join-Path $PSScriptRoot 'finance-protected-inert.cs') -OutputAssembly $output -OutputType ConsoleApplication
  exit 0
 }
 . (Join-Path $PSScriptRoot '../../scripts/finance-protected-pooler-process.ps1')
 $request=ConvertFrom-Json ([Console]::In.ReadToEnd())
 if($Mode -eq 'credential'){
  $credential=Read-FinancePinnedStagingCredential $request.CredentialPath $request.CredentialSha256
  if($credential.GetNetworkCredential().Password -cne 'SYNTHETIC-NOT-A-LIVE-PASSWORD'){throw 'Only synthetic tests allowed'}
  [Console]::Out.Write('SYNTHETIC_CREDENTIAL_VERIFIED');exit 0
 }
 $params=@{}
 foreach($property in $request.PSObject.Properties){$params[$property.Name]=$property.Value}
 $params['InputBytes']=[Convert]::FromBase64String($params['InputBase64']);$params.Remove('InputBase64')
 $result=Invoke-FinanceProtectedPoolerProcess @params
 $json=ConvertTo-Json -InputObject $result -Compress
 if($json.Contains('SYNTHETIC-NOT-A-LIVE-PASSWORD')){throw 'Secret disclosure'}
 [Console]::Out.Write($json)
}catch{[Console]::Error.Write('SYNTHETIC_PROBE_REJECTED');exit 1}
finally{if($credential){$credential.Password.Dispose()}}
