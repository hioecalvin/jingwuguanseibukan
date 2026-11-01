# Internal transport primitive, not a CLI or approval gate. The final orchestrator
# must claim the fixed journal BEFORE invoking a mutation, bind reviewed SQL,
# preserve private evidence, verify rollback/closure/baselines and forbid retries.
# staging-application is reserved for the separate approved application bridge;
# this primitive never treats a process exit as proof of a database commit.
# Never print/serialize the credential or raw transport result to a user-facing log.
. (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
. (Join-Path $PSScriptRoot 'finance-session-witness-capture.ps1')

function Open-FinancePinnedFile([string]$File,[string]$ExpectedHash){
 if($File -notmatch '^[A-Za-z]:\\' -or $File.Substring(3).Contains(':') -or
    $ExpectedHash -cnotmatch '^[a-f0-9]{64}$'){throw 'Invalid pinned local resource'}
 $full=[IO.Path]::GetFullPath($File);$current=$full
 while($current){
  $item=Get-Item -LiteralPath $current -Force -ErrorAction Stop
  if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
     ($current -eq $full -and $item.PSIsContainer)){throw 'Unsafe resource path'}
  $parent=Split-Path $current -Parent;if($parent -eq $current){break};$current=$parent
 }
 # Deny write/delete sharing while the caller consumes the checked resource.
 $stream=[IO.File]::Open($full,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 $hasher=[Security.Cryptography.SHA256]::Create()
 try{
  $actual=([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','').ToLowerInvariant()
  if($actual -cne $ExpectedHash){throw 'Resource hash mismatch'}
  $stream.Position=0
  return [pscustomobject]@{Path=$full;Stream=$stream}
 }catch{$stream.Dispose();throw}
 finally{$hasher.Dispose()}
}
function Read-FinancePinnedStagingCredential([string]$File,[string]$ExpectedHash){
 $resource=$null;$record=$null;$valid=$false
 try{
  if($File -notmatch '^[A-Za-z]:\\' -or $File.Substring(3).Contains(':')){throw 'Local credential required'}
  [void](Assert-FinanceCaptureDirectory (Split-Path ([IO.Path]::GetFullPath($File)) -Parent))
  $resource=Open-FinancePinnedFile $File $ExpectedHash
  Assert-FinanceCaptureFile $resource.Path
  if($resource.Stream.Length -lt 1 -or $resource.Stream.Length -gt 65536){throw 'Credential record size invalid'}
  $reader=[IO.StreamReader]::new($resource.Stream,[Text.UTF8Encoding]::new($false,$true),$true,1024,$true)
  try{$record=[Management.Automation.PSSerializer]::Deserialize($reader.ReadToEnd())}finally{$reader.Dispose()}
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $names=@($record.PSObject.Properties.Name|Sort-Object)
  $shape=$names -join ','
  # The existing staging credential writer records createdUtc. Accept only this
  # known metadata extension (or the historical six-field shape), not extra keys.
  if($shape -ceq 'createdUtc,credential,projectRef,purpose,schemaVersion,target,windowsSid'){
   $created=[DateTime]::MinValue
   if($record.createdUtc -isnot [string] -or $record.createdUtc -cnotmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$' -or
      -not [DateTime]::TryParseExact($record.createdUtc,'o',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind,[ref]$created) -or
      $created.Kind -ne [DateTimeKind]::Utc){throw 'Invalid credential creation metadata'}
  }elseif($shape -cne 'credential,projectRef,purpose,schemaVersion,target,windowsSid'){throw 'Unknown credential record shape'}
  if(
     $record.schemaVersion -ne 1 -or $record.target -cne 'staging' -or
     $record.projectRef -cne 'eomubndonbetszdbhsrj' -or $record.purpose -cne 'staging-only' -or
     $record.windowsSid -cne $sid -or $record.credential -isnot [Management.Automation.PSCredential] -or
     $record.credential.UserName -cne 'eomubndonbetszdbhsrj' -or $record.credential.Password.Length -eq 0){throw 'Credential binding invalid'}
  $valid=$true
  return $record.credential
 }finally{
  if($resource){$resource.Stream.Dispose()}
  if(-not $valid -and $record -and $record.credential -is [Management.Automation.PSCredential]){$record.credential.Password.Dispose()}
 }
}
function Invoke-FinanceProtectedPoolerProcess {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory)][ValidateSet('rollback-rehearsal','read-only-evidence','staging-application')][string]$Purpose,
  [Parameter(Mandatory)][string]$CredentialPath,[Parameter(Mandatory)][string]$CredentialSha256,
  [Parameter(Mandatory)][string]$ClientPath,[Parameter(Mandatory)][string]$ClientSha256,
  [Parameter(Mandatory)][string]$RootCertificatePath,[Parameter(Mandatory)][string]$RootCertificateSha256,
  [Parameter(Mandatory)][byte[]]$InputBytes,[Parameter(Mandatory)][string]$InputSha256
 )
 $credential=$null;$client=$null;$certificate=$null;$child=$null;$start=$null
 $started=$false;$closed=$false;$written=$false;$status=$null;$stdout='';$stderr='';$failure='INPUT_INVALID'
 try{
  $bytes=[byte[]]$InputBytes.Clone()
  if($bytes.Length -eq 0 -or $bytes.Length -gt 4194304 -or $InputSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Invalid bounded input'}
  $hasher=[Security.Cryptography.SHA256]::Create()
  try{$digest=([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}finally{$hasher.Dispose()}
  if($digest -cne $InputSha256){throw 'Input hash mismatch'}
  $text=[Text.UTF8Encoding]::new($false,$true).GetString($bytes)
  if($text.Contains([string][char]0) -or $text.StartsWith([string][char]0xFEFF,[StringComparison]::Ordinal)){throw 'Unsafe input encoding'}
  $failure='CLIENT_RESOURCE_INVALID'
  if([IO.Path]::GetExtension($ClientPath) -ine '.exe'){throw 'Windows executable required'}
  $client=Open-FinancePinnedFile $ClientPath $ClientSha256
  $failure='CA_RESOURCE_INVALID'
  $certificate=Open-FinancePinnedFile $RootCertificatePath $RootCertificateSha256
  $failure='CREDENTIAL_INVALID'
  $credential=Read-FinancePinnedStagingCredential $CredentialPath $CredentialSha256
  $failure='CLIENT_SETUP_FAILED'
  $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$client.Path
  $start.Arguments='-X -w -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=terse -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres'
  # Terse output omits SQLSTATE, so it cannot satisfy the exact rollback sentinel.
  # Verbose diagnostics remain private; the bridge never logs raw stderr.
  if($Purpose -ne 'read-only-evidence'){$start.Arguments=$start.Arguments.Replace('VERBOSITY=terse','VERBOSITY=verbose')}
  $start.UseShellExecute=$false;$start.CreateNoWindow=$true
  $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false,$true);$start.StandardErrorEncoding=[Text.UTF8Encoding]::new($false,$true)
  $start.EnvironmentVariables.Clear()
  foreach($name in @('SystemRoot','WINDIR','TEMP','TMP')){
   $value=[Environment]::GetEnvironmentVariable($name);if($value){$start.EnvironmentVariables[$name]=$value}
  }
  $readOnly=if($Purpose -eq 'read-only-evidence'){'on'}else{'off'}
  $start.EnvironmentVariables['PGOPTIONS']="-c default_transaction_read_only=$readOnly -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000"
  $start.EnvironmentVariables['PGAPPNAME']=if($readOnly -eq 'on'){'jwg-finance-pooler-evidence'}else{'jwg-finance-pooler-rehearsal'}
  if($Purpose -eq 'staging-application'){$start.EnvironmentVariables['PGAPPNAME']='jwg-finance-staging-application'}
  $start.EnvironmentVariables['PGSSLMODE']='verify-full';$start.EnvironmentVariables['PGSSLROOTCERT']=$certificate.Path
  $start.EnvironmentVariables['PGGSSENCMODE']='disable';$start.EnvironmentVariables['PGCONNECT_TIMEOUT']='8'
  $start.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
  $start.EnvironmentVariables['PGPASSWORD']=$credential.GetNetworkCredential().Password
  $failure='CLIENT_FAILED'
  $child=[Diagnostics.Process]::new();$child.StartInfo=$start
  $started=$child.Start();if(-not $started){throw 'Start failed'}
  $start.EnvironmentVariables.Remove('PGPASSWORD');$credential.Password.Dispose();$credential=$null
  $output=New-FinanceWitnessChannel $child.StandardOutput 1048576
  $errors=New-FinanceWitnessChannel $child.StandardError 65536
  $write=$child.StandardInput.BaseStream.WriteAsync($bytes,0,$bytes.Length)
  Wait-FinanceWitness @($output,$errors) {$write.IsCompleted} 5000
  [void]$write.GetAwaiter().GetResult();$written=$true;$child.StandardInput.BaseStream.Close()
  Wait-FinanceWitness @($output,$errors) {$output.Ended -and $errors.Ended -and $child.HasExited} 30000
  $status=$child.ExitCode;$closed=$true;$stdout=$output.Text.ToString();$stderr=$errors.Text.ToString()
  if([Text.Encoding]::UTF8.GetByteCount($stdout) -gt 1048576 -or [Text.Encoding]::UTF8.GetByteCount($stderr) -gt 65536){throw 'Output byte limit'}
  # Exit 3 may be the expected rollback sentinel; only the controller decides.
  $failure=$null
 }catch{$stdout='';$stderr=''}
 finally{
  if($start){$start.EnvironmentVariables.Remove('PGPASSWORD')}
  if($credential){$credential.Password.Dispose()}
  if($child){
   try{if($started -and -not $closed){if(-not $child.HasExited){$child.Kill()};$closed=$child.WaitForExit(5000)}}catch{$closed=$false}
   $child.Dispose()
  }
  if($client){$client.Stream.Dispose()};if($certificate){$certificate.Stream.Dispose()}
 }
 return [pscustomobject]@{status=$status;stdout=$stdout;stderr=$stderr;error=$failure;clientClosed=$closed;
  inputWritten=$written;inputSha256=$InputSha256;clientFinishedAt=[DateTime]::UtcNow.ToString('o')}
}
