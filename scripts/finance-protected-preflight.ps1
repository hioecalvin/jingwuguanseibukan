param(
 [Parameter(Mandatory)][string]$CredentialPath,
 [switch]$ValidateCredentialOnly,
 [switch]$ConfirmReadOnlyStaging,
 [switch]$ConfirmSessionPooler,
 [switch]$CaptureFullLedger,
 [switch]$CaptureActors,
 [switch]$CaptureIdentity,
 [switch]$CaptureSessionWitness,
 [switch]$CapturePublicInventory,
 [switch]$CapturePublicBaseline,
 [switch]$CaptureBaselinePrerequisites,
 [switch]$CapturePoolerCapabilities,
 [switch]$CaptureReleaseLedger,
 [switch]$CaptureReleaseActors,
 [string]$NodePath,[string]$NodeSha256,
 [string]$InventoryCapturePath,[string]$InventoryCaptureSha256,
 [string]$ActorBindingsPath,
 [string]$ActorBindingsSha256,
 [string]$EvidenceDirectory,
 [string]$ClientPath,[string]$ClientSha256,
 [string]$RootCertificatePath,[string]$RootCertificateSha256
)
# Fixed read-only connection probe. No arbitrary SQL, writes or migration execution.
# Credential values are never returned, put on the command line or saved as text.
$ErrorActionPreference='Stop'
$record=$null;$process=$null;$start=$null;$capture=$null
$failureCode='MODE_INVALID'
function Assert-LocalFile([string]$File){
 if($File -notmatch '^[A-Za-z]:\\' -or $File.Substring(3).Contains(':')){throw 'Invalid local file'}
 $full=[IO.Path]::GetFullPath($File)
 $current=$full
 while($current){
  $item=Get-Item -LiteralPath $current -Force
  if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or ($current -eq $full -and $item.PSIsContainer)){throw 'Unsafe file'}
  $parent=Split-Path $current -Parent
  if($parent -eq $current){break}
  $current=$parent
 }
 return $full
}
function Assert-PrivateFile([string]$File){
 $full=Assert-LocalFile $File
 $parent=Split-Path $full -Parent
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $directoryAcl=[IO.Directory]::GetAccessControl($parent)
 if(-not $directoryAcl.AreAccessRulesProtected){throw 'Inherited credential directory'}
 foreach($acl in @($directoryAcl,[IO.File]::GetAccessControl($full))){
  $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $rules.Count -ne 1 -or
     $rules[0].IdentityReference.Value -ne $sid.Value -or $rules[0].AccessControlType -ne 'Allow' -or
     $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'Credential is not owner-only'}
 }
 return $full
}
function Assert-Hash([string]$File,[string]$Expected){
 if($Expected -notmatch '^[a-f0-9]{64}$'){throw 'Reviewed SHA256 required'}
 $full=Assert-LocalFile $File
 $stream=[IO.File]::OpenRead($full);$hasher=[Security.Cryptography.SHA256]::Create()
 try{$actual=([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}
 finally{$stream.Dispose();$hasher.Dispose()}
 if($actual -cne $Expected){throw 'Resource digest mismatch'}
 return $full
}
try {
 if($ValidateCredentialOnly -eq $ConfirmReadOnlyStaging){throw 'Choose exactly one mode'}
 if(@(@($CaptureFullLedger,$CaptureActors,$CaptureIdentity,$CaptureSessionWitness,$CapturePublicInventory,$CapturePublicBaseline,$CaptureBaselinePrerequisites,$CapturePoolerCapabilities,$CaptureReleaseLedger,$CaptureReleaseActors)|Where-Object{$_}).Count -gt 1){throw 'Capture modes are exclusive'}
 $releaseCapture=$CaptureReleaseLedger -or $CaptureReleaseActors
 $publicCapture=$CapturePublicInventory -or $CapturePublicBaseline -or $CaptureBaselinePrerequisites -or $CapturePoolerCapabilities -or $releaseCapture
 if($publicCapture -and (-not $ConfirmReadOnlyStaging -or -not $ConfirmSessionPooler -or -not $EvidenceDirectory -or -not $NodePath -or -not $NodeSha256)){throw 'Explicit staging read-only mode, protected output and pinned Node required'}
 if($CapturePublicBaseline -and (-not $InventoryCapturePath -or -not $InventoryCaptureSha256)){throw 'Protected source inventory and receipt required'}
 if(($NodePath -or $NodeSha256) -and -not $publicCapture){throw 'Unexpected Node resource'}
 if(($InventoryCapturePath -or $InventoryCaptureSha256) -and -not $CapturePublicBaseline){throw 'Unexpected inventory source'}
 if($CaptureSessionWitness -and ($CaptureFullLedger -or $CaptureActors -or $CaptureIdentity -or -not $ConfirmReadOnlyStaging -or -not $ConfirmSessionPooler -or -not $EvidenceDirectory)){throw 'Witness requires exclusive explicit read-only session mode and private output'}
 if($CaptureIdentity -and ($CaptureFullLedger -or $CaptureActors -or -not $ConfirmReadOnlyStaging -or -not $ConfirmSessionPooler -or -not $EvidenceDirectory)){throw 'Identity lookup requires exclusive explicit read-only session mode and private output'}
 if($ConfirmSessionPooler -and -not $ConfirmReadOnlyStaging){throw 'Session pooler requires explicit live read-only mode'}
 if($CaptureFullLedger -and (-not $ConfirmReadOnlyStaging -or -not $ConfirmSessionPooler -or -not $EvidenceDirectory)){throw 'Full ledger requires explicit session mode and protected output'}
 if($CaptureActors -and ($CaptureFullLedger -or -not $ConfirmReadOnlyStaging -or -not $ConfirmSessionPooler -or -not $EvidenceDirectory -or -not $ActorBindingsPath)){throw 'Actor capture requires exclusive explicit session mode, protected output and independent bindings'}
 if($CaptureReleaseActors -and (-not $ActorBindingsPath -or $ActorBindingsSha256 -cnotmatch '^[a-f0-9]{64}$')){throw 'Pinned independent actor bindings required'}
 if($ActorBindingsSha256 -and -not $CaptureReleaseActors){throw 'Unexpected binding receipt'}
 if($ActorBindingsPath -and -not ($CaptureActors -or $CaptureReleaseActors)){throw 'Unexpected actor bindings'}
 if($EvidenceDirectory -and -not ($CaptureFullLedger -or $CaptureActors -or $CaptureIdentity -or $CaptureSessionWitness -or $publicCapture)){throw 'Unexpected evidence output'}
 $failureCode='CREDENTIAL_ACCESS_FAILED'
 $full=Assert-PrivateFile $CredentialPath
 $failureCode='CREDENTIAL_DECRYPT_FAILED'
 $record=Import-Clixml -LiteralPath $full
 $failureCode='CREDENTIAL_BINDING_FAILED'
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 if($record.schemaVersion -ne 1 -or $record.target -cne 'staging' -or
    $record.projectRef -cne 'eomubndonbetszdbhsrj' -or $record.purpose -cne 'staging-only' -or
    $record.windowsSid -cne $sid -or $record.credential -isnot [Management.Automation.PSCredential] -or
    $record.credential.UserName -cne 'eomubndonbetszdbhsrj' -or $record.credential.Password.Length -eq 0){throw 'Credential binding invalid'}
 if($ValidateCredentialOnly){
  [Console]::Out.Write('{"credentialValidated":true,"remoteContact":false}')
  exit 0
 }
 $failureCode='CLIENT_RESOURCE_INVALID'
 $client=Assert-Hash $ClientPath $ClientSha256
 $failureCode='CA_RESOURCE_INVALID'
 $certificate=Assert-Hash $RootCertificatePath $RootCertificateSha256
 $failureCode='CLIENT_RESOURCE_INVALID'
 if([IO.Path]::GetExtension($client) -ine '.exe'){throw 'Pinned Windows client required'}
 if($publicCapture){
  $failureCode='NODE_RESOURCE_INVALID'
  $node=Assert-Hash $NodePath $NodeSha256
  if([IO.Path]::GetExtension($node) -ine '.exe'){throw 'Pinned Windows Node required'}
  $inventoryText=''
  if($CapturePublicBaseline){
   $failureCode='INVENTORY_SOURCE_INVALID'
   $inventoryFile=Assert-PrivateFile $InventoryCapturePath
   if((Get-Item -LiteralPath $inventoryFile).Length -gt 1048576){throw 'Oversized source inventory'}
   $inventoryText=[Text.UTF8Encoding]::new($false,$true).GetString([IO.File]::ReadAllBytes($inventoryFile))
  }
 }
 if($CaptureActors -or $CaptureReleaseActors){
  $failureCode='ACTOR_BINDING_INVALID'
  $bindingPath=Assert-PrivateFile $ActorBindingsPath
  if((Get-Item -LiteralPath $bindingPath).Length -gt 8192){throw 'Oversized binding'}
  $bindingBytes=[IO.File]::ReadAllBytes($bindingPath)
  if($bindingBytes.Length -gt 8192){throw 'Oversized binding'}
  $binding=ConvertFrom-Json -InputObject ([Text.UTF8Encoding]::new($false,$true).GetString($bindingBytes))
  if($binding.schemaVersion -ne 1 -or $binding.projectRef -cne 'eomubndonbetszdbhsrj' -or
    (@($binding.bindings.PSObject.Properties.Name | Sort-Object)-join ',') -cne 'admin,member,superAdmin'){throw 'Independent staging binding required'}
  $ids=@('member','admin','superAdmin'|ForEach-Object{$binding.bindings.$_})
  if(@($ids|Select-Object -Unique).Count -ne 3){throw 'Distinct actors required'}
  foreach($id in $ids){if($id -isnot [string] -or $id -cnotmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' -or $id -eq '00000000-0000-0000-0000-000000000000'){throw 'Invalid actor binding'}}
  $hasher=[Security.Cryptography.SHA256]::Create()
  try{$bindingHash=([BitConverter]::ToString($hasher.ComputeHash($bindingBytes))).Replace('-','').ToLowerInvariant()}
  finally{$hasher.Dispose()}
  if($CaptureReleaseActors -and $bindingHash -cne $ActorBindingsSha256){throw 'Binding receipt mismatch'}
 }
 if($CaptureFullLedger){
  $failureCode='LEDGER_QUERY_INVALID'
  $queryPath=Assert-LocalFile (Join-Path $PSScriptRoot '../tests/sql/059_060_ledger_readonly.sql')
  $queryBytes=[IO.File]::ReadAllBytes($queryPath);$hasher=[Security.Cryptography.SHA256]::Create()
  try{$queryHash=([BitConverter]::ToString($hasher.ComputeHash($queryBytes))).Replace('-','').ToLowerInvariant()}
  finally{$hasher.Dispose()}
  if($queryHash -cne '2c80c6b732c80ff9ad3ad645ef672a31a3dcccd5804ab675a62dcd7405eed3e9'){throw 'Unreviewed ledger query'}
  $ledgerSql=[Text.UTF8Encoding]::new($false,$true).GetString($queryBytes)
  $failureCode='EVIDENCE_RESERVATION_FAILED'
  . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
  $capture=New-FinanceCaptureFile $EvidenceDirectory
 }
 if($CaptureActors){
  $failureCode='ACTOR_QUERY_INVALID'
  $queryPath=Assert-LocalFile (Join-Path $PSScriptRoot '../tests/sql/059_060_actors_readonly.sql')
  $queryBytes=[IO.File]::ReadAllBytes($queryPath);$hasher=[Security.Cryptography.SHA256]::Create()
  try{$queryHash=([BitConverter]::ToString($hasher.ComputeHash($queryBytes))).Replace('-','').ToLowerInvariant()}
  finally{$hasher.Dispose()}
  if($queryHash -cne '723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80'){throw 'Unreviewed actor query'}
  $actorSql=[Text.UTF8Encoding]::new($false,$true).GetString($queryBytes)
  $failureCode='EVIDENCE_RESERVATION_FAILED'
  . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
  $capture=New-FinanceCaptureFile $EvidenceDirectory -Kind actors
 }
 $failureCode='CLIENT_SETUP_FAILED'
 if($CaptureIdentity){
  $failureCode='IDENTITY_QUERY_INVALID'
  $queryPath=Assert-LocalFile (Join-Path $PSScriptRoot '../tests/sql/059_060_identity_readonly.sql')
  $queryBytes=[IO.File]::ReadAllBytes($queryPath);$hasher=[Security.Cryptography.SHA256]::Create()
  try{$queryHash=([BitConverter]::ToString($hasher.ComputeHash($queryBytes))).Replace('-','').ToLowerInvariant()}
  finally{$hasher.Dispose()}
  if($queryHash -cne 'aaf3484bebe54f1dce348507b978261bd3eb0b509756032f615b6e5fe897afb2'){throw 'Unreviewed identity query'}
  $identitySql=[Text.UTF8Encoding]::new($false,$true).GetString($queryBytes)
  $failureCode='EVIDENCE_RESERVATION_FAILED'
  . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
  $capture=New-FinanceCaptureFile $EvidenceDirectory -Kind identity
 }
 $failureCode='CLIENT_SETUP_FAILED'
 . (Join-Path $PSScriptRoot 'finance-preflight-failure.ps1')
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=$client
 $start.Arguments='-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h db.eomubndonbetszdbhsrj.supabase.co -p 5432 -U postgres -d postgres'
 # Explicit alternative, never failure-triggered fallback. Host/user observed from
 # this staging project's management metadata; documented session port is 5432.
 if($ConfirmSessionPooler){
  $start.Arguments='-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres'
 }
 $start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false,$true)
 $start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false,$true)
 $start.EnvironmentVariables.Clear()
 foreach($name in @('SystemRoot','WINDIR','TEMP','TMP')){
  $value=[Environment]::GetEnvironmentVariable($name)
  if($value){$start.EnvironmentVariables[$name]=$value}
 }
 $start.EnvironmentVariables['PGSSLMODE']='verify-full'
 $start.EnvironmentVariables['PGSSLROOTCERT']=$certificate
 $start.EnvironmentVariables['PGGSSENCMODE']='disable'
 $start.EnvironmentVariables['PGCONNECT_TIMEOUT']='8'
 $start.EnvironmentVariables['PGAPPNAME']='jwg-finance-readonly-preflight'
 $start.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
 $start.EnvironmentVariables['PGOPTIONS']='-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000'
 $start.EnvironmentVariables['PGPASSWORD']=$record.credential.GetNetworkCredential().Password
 if($publicCapture){
  $failureCode=if($releaseCapture){'RELEASE_CAPTURE_FAILED'}elseif($CapturePoolerCapabilities){'POOLER_CAPABILITY_CAPTURE_FAILED'}else{'PUBLIC_BASELINE_CAPTURE_FAILED'}
  . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
  . (Join-Path $PSScriptRoot 'finance-session-witness-capture.ps1')
  . (Join-Path $PSScriptRoot 'finance-protected-baseline-capture.ps1')
  if($releaseCapture){
   $kind=if($CaptureReleaseActors){'actors'}else{'ledger'}
   $bindingText=if($CaptureReleaseActors){[Text.UTF8Encoding]::new($false,$true).GetString($bindingBytes)}else{''}
   Invoke-FinanceReleaseCapture $start $node $EvidenceDirectory $kind $bindingText $ActorBindingsSha256 | ConvertTo-Json -Compress
   exit 0
  }
  Invoke-FinancePublicBaselineCapture $start $node $EvidenceDirectory ([bool]$CapturePublicInventory) $inventoryText $InventoryCaptureSha256 ([bool]$CaptureBaselinePrerequisites) ([bool]$CapturePoolerCapabilities) | ConvertTo-Json -Compress
  exit 0
 }
 if($CaptureSessionWitness){
  $failureCode='SESSION_WITNESS_CAPTURE_FAILED'
  . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
  . (Join-Path $PSScriptRoot 'finance-session-witness-capture.ps1')
  Invoke-FinanceSessionWitnessCapture $start $EvidenceDirectory | ConvertTo-Json -Compress
  exit 0
 }
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 $failureCode='CLIENT_START_FAILED'
 if(-not $process.Start()){throw 'Client start failed'}
 $failureCode='CLIENT_IO_FAILED'
 # The child inherits its own copy; remove the parent ProcessStartInfo copy now.
 $start.EnvironmentVariables.Remove('PGPASSWORD')
 $outTask=$process.StandardOutput.ReadToEndAsync();$errTask=$process.StandardError.ReadToEndAsync()
 $sql=@'
begin read only;
select jsonb_build_object(
 'database',current_database(),'sessionUser',session_user,
 'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'ledgerVersions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations)
);
commit;
'@
 if($CaptureFullLedger){$sql=$ledgerSql}
 if($CaptureActors){$sql=$actorSql}
 if($CaptureIdentity){$sql=$identitySql}
 $process.StandardInput.Write($sql);$process.StandardInput.Close()
 $failureCode='CLIENT_TIMEOUT'
 if(-not $process.WaitForExit(30000)){try{$process.Kill()}catch{};throw 'Client timeout; do not retry'}
 $failureCode='CLIENT_IO_FAILED'
 $stdout=$outTask.GetAwaiter().GetResult();$stderr=$errTask.GetAwaiter().GetResult()
 if($process.ExitCode -ne 0 -or $stderr){$failureCode=Get-FinanceClientFailureCode $stderr;throw 'Read-only probe failed'}
 $failureCode='RESPONSE_INVALID'
 $outputLimit=if($CaptureFullLedger -or $CaptureActors){4194304}else{65536}
 if($stdout.Length -gt $outputLimit){throw 'Read-only probe failed'}
 $result=ConvertFrom-Json -InputObject $stdout
 $expected=@(6..58|ForEach-Object{$_.ToString('000')})
 $failureCode='SERVER_EVIDENCE_MISMATCH'
 $versions=if($CaptureFullLedger){@($result.ledger | ForEach-Object {$_.version})}else{@($result.ledgerVersions)}
 if($result.database -cne 'postgres' -or $result.sessionUser -cne 'postgres' -or
    $result.readOnly -cne 'on' -or $result.ssl -ne $true -or
    (-not ($CaptureActors -or $CaptureIdentity) -and ($versions-join ',') -cne ($expected-join ','))){throw 'Read-only connection evidence invalid'}
 if($CaptureIdentity){
  $failureCode='EVIDENCE_SAVE_FAILED'
  $envelope=[ordered]@{schemaVersion=1;kind='identity';projectRef='eomubndonbetszdbhsrj';transport='session-pooler';
   host='aws-0-ap-southeast-2.pooler.supabase.com';port=5432;connectionUser='postgres.eomubndonbetszdbhsrj';
   sslmode='verify-full';querySha256=$queryHash;snapshot=$result}
  $captureHash=Save-FinanceCaptureFile $capture (ConvertTo-Json -InputObject $envelope -Depth 100 -Compress)
  $failureCode='IDENTITY_BINDING_MISMATCH'
  . (Join-Path $PSScriptRoot 'finance-identity-binding.ps1')
  [void](Get-FinanceIdentityBinding $result)
  [ordered]@{projectRef='eomubndonbetszdbhsrj';captureSaved=$true;captureSha256=$captureHash;
   evidencePath=$capture.Path;sslVerified=$true;serverReadOnlyVerified=$true;
   dedicatedIdentityMatched=$true;accountCount=3;databaseWrites=$false} | ConvertTo-Json -Compress
  exit 0
 }
 if($CaptureActors){
  $failureCode='ACTOR_IDENTITY_MISMATCH'
  if(@($result.actors).Count -ne 3){throw 'Exactly three actors required'}
  foreach($pair in @(@('member','0101'),@('admin','0002'),@('superAdmin','0001'))){
   $rows=@($result.actors|Where-Object{$_.jsId -ceq $pair[1]})
   if($rows.Count -ne 1 -or $rows[0].id -cne $binding.bindings.($pair[0])){throw 'Actor identity mismatch'}
  }
  $failureCode='EVIDENCE_SAVE_FAILED'
  $envelope=[ordered]@{schemaVersion=1;kind='actors';projectRef='eomubndonbetszdbhsrj';transport='session-pooler';
   host='aws-0-ap-southeast-2.pooler.supabase.com';port=5432;connectionUser='postgres.eomubndonbetszdbhsrj';
   sslmode='verify-full';querySha256=$queryHash;bindingSha256=$bindingHash;snapshot=$result}
  $captureHash=Save-FinanceCaptureFile $capture (ConvertTo-Json -InputObject $envelope -Depth 100 -Compress)
  [ordered]@{projectRef='eomubndonbetszdbhsrj';captureSaved=$true;captureSha256=$captureHash;
   evidencePath=$capture.Path;sslVerified=$true;serverReadOnlyVerified=$true;
   actorIdentitiesMatch=$true;actorEligibilityCompared=$false;databaseWrites=$false} | ConvertTo-Json -Compress
  exit 0
 }
 if($CaptureFullLedger){
  $failureCode='EVIDENCE_SAVE_FAILED'
  $envelope=[ordered]@{schemaVersion=1;projectRef='eomubndonbetszdbhsrj';transport='session-pooler';
   host='aws-0-ap-southeast-2.pooler.supabase.com';port=5432;connectionUser='postgres.eomubndonbetszdbhsrj';
   sslmode='verify-full';querySha256=$queryHash;snapshot=$result}
  $captureHash=Save-FinanceCaptureFile $capture (ConvertTo-Json -InputObject $envelope -Depth 100 -Compress)
  [ordered]@{projectRef='eomubndonbetszdbhsrj';captureSaved=$true;captureSha256=$captureHash;
   evidencePath=$capture.Path;sslVerified=$true;serverReadOnlyVerified=$true;
   ledgerVersionsExact006Through058=$true;ledgerContentsCompared=$false;databaseWrites=$false} | ConvertTo-Json -Compress
  exit 0
 }
 $transport=if($ConfirmSessionPooler){'session-pooler'}else{'direct'}
 [Console]::Out.Write(('{"projectRef":"eomubndonbetszdbhsrj","transport":"'+$transport+'","credentialValidated":true,"sslVerified":true,"serverReadOnlyVerified":true,"ledgerVersionsExact006Through058":true,"remoteContact":true,"databaseWrites":false}'))
 exit 0
} catch {
 [Console]::Error.Write(('FINANCE_PREFLIGHT_FAILED [{0}]: preserve evidence; no automatic retry. Raw details suppressed.' -f $failureCode))
 exit 1
} finally {
 if($capture){$capture.Stream.Dispose()}
 if($start){$start.EnvironmentVariables.Remove('PGPASSWORD')}
 if($process){try{if(-not $process.HasExited){$process.Kill()}}catch{};$process.Dispose()}
 if($record -and $record.credential -is [Management.Automation.PSCredential]){$record.credential.Password.Dispose()}
 $record=$null
}
