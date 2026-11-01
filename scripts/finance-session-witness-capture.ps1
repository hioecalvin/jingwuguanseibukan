# Called only after the protected preflight validates the explicit staging mode,
# DPAPI binding, pinned executable/CA and fixed connection environment.
# No arbitrary SQL, connection fallback or retry. Capture is NOT semantic acceptance.
function Get-FinanceWitnessSql([string]$Nonce,[int]$PeerPid=0){
 if($Nonce -cnotmatch '^[a-f0-9]{32}$' -or $PeerPid -lt 0){throw 'Invalid witness arguments'}
 $app='jwg-finance-witness-'+$Nonce
 $peer='null';$tail=''
 if($PeerPid -gt 0){
  $peer="(select jsonb_build_object('pid',pid,'backendStart',backend_start,`n    'transactionStart',xact_start,'database',datname,'user',usename,'state',state,'applicationName',application_name)`n    from pg_stat_activity where pid=$PeerPid and application_name='$app')"
  $app='jwg-finance-observer-'+$Nonce;$tail="rollback;`n"
 }
 $sql=@"
begin read only;
set local search_path=pg_catalog;
set local timezone='UTC';
set local statement_timeout='10s';
set local idle_in_transaction_session_timeout='20s';
set local application_name='$app';
select jsonb_build_object('nonce','$Nonce','capturedAt',clock_timestamp(),
 'database',current_database(),'sessionUser',session_user,'address',host(inet_server_addr()),'port',inet_server_port(),
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'backendStart',(select backend_start from pg_stat_activity where pid=pg_backend_pid()),
 'transactionStart',(select xact_start from pg_stat_activity where pid=pg_backend_pid()),
 'peer',$peer);
"@
 return $sql.Replace("`r`n","`n")+"`n"+$tail
}
function New-FinanceWitnessChannel($Reader,[int]$Limit=65536){
 if($Limit -lt 1 -or $Limit -gt 1048576){throw 'Invalid channel limit'}
 $buffer=New-Object char[] 1024
 return [pscustomobject]@{Reader=$Reader;Buffer=$buffer;Text=[Text.StringBuilder]::new();
  Task=$Reader.ReadAsync($buffer,0,$buffer.Length);Ended=$false;Limit=$Limit}
}
function Update-FinanceWitnessChannels($Channels){
 foreach($channel in $Channels){
  # Drain a bounded batch of completed reads before sleeping. One 1 KiB read
  # per 10 ms poll throttles a backpressured pipe enough to consume the timeout.
  # The bound preserves fairness for stderr and outer deadline/health checks.
  for($drained=0;$drained -lt 16 -and -not $channel.Ended -and $channel.Task.IsCompleted;$drained++){
   $count=$channel.Task.GetAwaiter().GetResult()
   if($count -eq 0){$channel.Ended=$true;break}
   if($channel.Text.Length+$count -gt $channel.Limit){throw 'Bounded witness output exceeded'}
   [void]$channel.Text.Append($channel.Buffer,0,$count)
   $channel.Task=$channel.Reader.ReadAsync($channel.Buffer,0,$channel.Buffer.Length)
  }
 }
}
function Wait-FinanceWitness($Channels,[scriptblock]$Complete,[int]$TimeoutMs){
 $timer=[Diagnostics.Stopwatch]::StartNew()
 while($true){
  Update-FinanceWitnessChannels $Channels
  if(& $Complete){return}
  if($timer.ElapsedMilliseconds -ge $TimeoutMs){throw 'Witness timeout; no retry'}
  Start-Sleep -Milliseconds 10
 }
}
function Get-FinanceWitnessRow([string]$Text){
 $row=ConvertFrom-Json -InputObject $Text
 if($row -is [array] -or $row.database -cne 'postgres' -or $row.sessionUser -cne 'postgres' -or
   $row.readOnly -cne 'on' -or $row.ssl -isnot [bool] -or -not $row.ssl -or
   $row.backendPid -isnot [int] -or $row.backendPid -lt 1){throw 'Unsafe witness response'}
 return $row
}
function Get-FinanceWitnessHash([string]$Text){
 $hash=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-','').ToLowerInvariant()}
 finally{$hash.Dispose()}
}
function Invoke-FinanceSessionWitnessCapture($Start,[string]$Directory){
 $reservation=$null;$primary=$null;$observer=$null;$observerStart=$null
 try {
  # CreateNew, owner-only ACLs and no reparse points; reserve before either client.
  $reservation=New-FinanceCaptureFile $Directory -Kind session-witness
  $nonce=[Guid]::NewGuid().ToString('N')
  $primarySql=Get-FinanceWitnessSql $nonce
  # Each ProcessStartInfo owns a separate child-only environment. Never put the
  # password in arguments, SQL, evidence, output or the parent process environment.
  $observerStart=[Diagnostics.ProcessStartInfo]::new()
  foreach($property in @('FileName','Arguments','UseShellExecute','CreateNoWindow',
    'RedirectStandardInput','RedirectStandardOutput','RedirectStandardError','StandardOutputEncoding','StandardErrorEncoding')){
   $observerStart.$property=$Start.$property
  }
  $observerStart.EnvironmentVariables.Clear()
  foreach($key in $Start.EnvironmentVariables.Keys){$observerStart.EnvironmentVariables[$key]=$Start.EnvironmentVariables[$key]}
  $primary=[Diagnostics.Process]::new();$primary.StartInfo=$Start
  if(-not $primary.Start()){throw 'Primary start failed'}
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  $po=New-FinanceWitnessChannel $primary.StandardOutput;$pe=New-FinanceWitnessChannel $primary.StandardError
  $primary.StandardInput.Write($primarySql);$primary.StandardInput.Flush()
  Wait-FinanceWitness @($po,$pe) { $po.Text.ToString().Contains("`n") -or $po.Ended -or $pe.Text.Length -gt 0 } 12000
  if($pe.Text.Length -gt 0 -or $po.Ended -or $primary.HasExited){throw 'Primary closed or failed'}
  $primaryRow=Get-FinanceWitnessRow $po.Text.ToString()
  $observerSql=Get-FinanceWitnessSql $nonce $primaryRow.backendPid
  $observer=[Diagnostics.Process]::new();$observer.StartInfo=$observerStart
  if(-not $observer.Start()){throw 'Observer start failed'}
  $observerStart.EnvironmentVariables.Remove('PGPASSWORD')
  $oo=New-FinanceWitnessChannel $observer.StandardOutput;$oe=New-FinanceWitnessChannel $observer.StandardError
  $observer.StandardInput.Write($observerSql);$observer.StandardInput.Close()
  Wait-FinanceWitness @($po,$pe,$oo,$oe) { $oo.Ended -and $oe.Ended -and $observer.HasExited } 12000
  if($observer.ExitCode -ne 0 -or $oe.Text.Length -gt 0 -or $pe.Text.Length -gt 0 -or $primary.HasExited){throw 'Observer failed or primary closed'}
  $observerRow=Get-FinanceWitnessRow $oo.Text.ToString()
  $primary.StandardInput.WriteLine('rollback;');$primary.StandardInput.Close()
  Wait-FinanceWitness @($po,$pe) { $po.Ended -and $pe.Ended -and $primary.HasExited } 5000
  if($primary.ExitCode -ne 0 -or $pe.Text.Length -gt 0){throw 'Primary close failed'}
  # Reparse the entire output: trailing unexpected rows/errors cannot be ignored.
  $primaryRow=Get-FinanceWitnessRow $po.Text.ToString()
  $envelope=[ordered]@{schemaVersion=1;kind='session-witness';projectRef='eomubndonbetszdbhsrj';
   transport='session-pooler';host='aws-0-ap-southeast-2.pooler.supabase.com';port=5432;
   connectionUser='postgres.eomubndonbetszdbhsrj';sslmode='verify-full';nonce=$nonce;
   primaryQuerySha256=(Get-FinanceWitnessHash $primarySql);observerQuerySha256=(Get-FinanceWitnessHash $observerSql);
   clientsExitedCleanly=$true;primary=$primaryRow;observer=$observerRow}
  $captureHash=Save-FinanceCaptureFile $reservation (ConvertTo-Json -InputObject $envelope -Depth 20 -Compress)
  # Exit-zero means capture only. Independent offline verification MUST follow.
  return [ordered]@{projectRef='eomubndonbetszdbhsrj';captureSaved=$true;captureSha256=$captureHash;
   evidencePath=$reservation.Path;clientsExitedCleanly=$true;sessionWitnessCompared=$false;
   serverClosureIndependentlyVerified=$false;readyForWriteRehearsal=$false;databaseWrites=$false}
 } finally {
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  if($observerStart){$observerStart.EnvironmentVariables.Remove('PGPASSWORD')}
  $closureUncertain=$false
  foreach($child in @($observer,$primary)){
   if($child){
    try {if(-not $child.HasExited){$child.Kill();if(-not $child.WaitForExit(5000)){throw 'Child closure uncertain'}}}
    catch {$closureUncertain=$true}
    finally {$child.Dispose()}
   }
  }
  if($reservation){$reservation.Stream.Dispose()}
  if($closureUncertain){throw 'Child closure uncertain; preserve evidence'}
 }
}
