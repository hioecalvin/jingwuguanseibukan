# Trusted caller: fixed staging preflight, pinned Node/psql/CA, private input/output.
# Uses the tested bounded stream pump. No retries or arbitrary SQL entry point.
function Invoke-FinanceReleaseCapture($Start,[string]$Node,[string]$Directory,[ValidateSet('ledger','actors')][string]$Kind,
 [string]$BindingText,[string]$BindingHash){
 $reservation=$null
 try {
  $reservation=New-FinanceCaptureFile $Directory -Kind ($Kind+'-v2')
  $request=@{mode='plan-release';kind=$Kind}
  if($Kind -ceq 'actors'){$request.bindingText=$BindingText;$request.bindingHash=$BindingHash}
  $plan=Invoke-FinanceBaselineBridge $Node $request
  $raw=Invoke-FinanceBoundedChild $Start $plan.sql
  $snapshot=ConvertFrom-Json -InputObject $raw
  $envelope=[ordered]@{schemaVersion=2;kind=$Kind;clientsExitedCleanly=$true;
   projectRef=$plan.target.projectRef;transport=$plan.target.transport;host=$plan.target.host;
   port=$plan.target.port;connectionUser=$plan.target.user;sslmode=$plan.target.sslmode;
   querySha256=$plan.querySha256;sourceQuerySha256=$plan.sourceQuerySha256;snapshot=$snapshot}
  if($Kind -ceq 'actors'){$envelope.bindingSha256=$BindingHash}
  $text=ConvertTo-Json -InputObject $envelope -Depth 100 -Compress
  # Preserve actual response before content verification; never synthesize identity.
  $receipt=Save-FinanceCaptureFile $reservation $text
  $request.mode='verify-release';$request.captureText=$text;$request.captureHash=$receipt
  [void](Invoke-FinanceBaselineBridge $Node $request)
  return [ordered]@{projectRef='eomubndonbetszdbhsrj';kind=$Kind;schemaVersion=2;
   captureSaved=$true;captureSha256=$receipt;captureVerifiedOffline=$true;clientsExitedCleanly=$true;
   databaseWrites=$false;rollbackVerified=$false;serverClosureIndependentlyVerified=$false;readyForWriteRehearsal=$false}
 }finally{
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  if($reservation){$reservation.Stream.Dispose()}
 }
}
function Invoke-FinanceBoundedChild($Start,[string]$InputText){
 $child=[Diagnostics.Process]::new();$child.StartInfo=$Start
 try {
  if(-not $child.Start()){throw 'Child start failed'}
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  $output=New-FinanceWitnessChannel $child.StandardOutput 1048576
  $errorOutput=New-FinanceWitnessChannel $child.StandardError 65536
  # WriteAsync avoids a blocked pipe if a child stops consuming input.
  # Windows PowerShell/.NET Framework can use an OEM codepage for StandardInput.
  # Write exact UTF-8 bytes so non-ASCII identifiers and hashed evidence survive.
  $inputBytes=[Text.UTF8Encoding]::new($false,$true).GetBytes($InputText)
  $inputTask=$child.StandardInput.BaseStream.WriteAsync($inputBytes,0,$inputBytes.Length)
  Wait-FinanceWitness @($output,$errorOutput) { $inputTask.IsCompleted } 5000
  [void]$inputTask.GetAwaiter().GetResult();$child.StandardInput.BaseStream.Close()
  Wait-FinanceWitness @($output,$errorOutput) { $output.Ended -and $errorOutput.Ended -and $child.HasExited } 30000
  if($child.ExitCode -ne 0 -or $errorOutput.Text.Length -gt 0){throw 'Bounded child failed; raw details suppressed'}
  return $output.Text.ToString()
 } finally {
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  try {if(-not $child.HasExited){$child.Kill();if(-not $child.WaitForExit(5000)){throw 'Child closure uncertain'}}}
  finally {$child.Dispose()}
 }
}
function Invoke-FinanceBaselineBridge([string]$Node,$Request){
 $bridge=[Diagnostics.ProcessStartInfo]::new()
 $bridge.FileName=$Node
 $bridge.Arguments='"'+(Join-Path $PSScriptRoot 'finance-baseline-bridge.mjs')+'"'
 $bridge.UseShellExecute=$false;$bridge.CreateNoWindow=$true
 $bridge.RedirectStandardInput=$true;$bridge.RedirectStandardOutput=$true;$bridge.RedirectStandardError=$true
 $bridge.StandardOutputEncoding=[Text.UTF8Encoding]::new($false,$true)
 $bridge.StandardErrorEncoding=[Text.UTF8Encoding]::new($false,$true)
 $bridge.EnvironmentVariables.Clear()
 foreach($name in @('SystemRoot','WINDIR','TEMP','TMP')){
  $value=[Environment]::GetEnvironmentVariable($name);if($value){$bridge.EnvironmentVariables[$name]=$value}
 }
 # No PG*, NODE_OPTIONS, tokens, credentials, proxy settings or PATH inherited.
 $result=Invoke-FinanceBoundedChild $bridge (ConvertTo-Json -InputObject $Request -Depth 100 -Compress)
 return ConvertFrom-Json -InputObject $result
}
function Invoke-FinancePublicBaselineCapture($Start,[string]$Node,[string]$Directory,[bool]$InventoryMode,
 [string]$InventoryText,[string]$InventoryHash,[bool]$PrerequisitesMode=$false,[bool]$CapabilitiesMode=$false){
 $reservation=$null
 try {
  if(@(@($InventoryMode,$PrerequisitesMode,$CapabilitiesMode)|Where-Object{$_}).Count -gt 1){throw 'Exclusive capture mode required'}
  $kind=if($CapabilitiesMode){'capabilities'}elseif($PrerequisitesMode){'public-prerequisites'}elseif($InventoryMode){'public-inventory'}else{'public-baseline'}
  # Claim before planner or DB child. Failed/empty captures block future reuse.
  $reservation=New-FinanceCaptureFile $Directory -Kind $kind
  $request=if($CapabilitiesMode){@{mode='plan-capabilities'}}elseif($PrerequisitesMode){@{mode='plan-prerequisites'}}elseif($InventoryMode){@{mode='plan-inventory'}}else{@{mode='plan-baseline';inventoryText=$InventoryText;inventoryHash=$InventoryHash}}
  $plan=Invoke-FinanceBaselineBridge $Node $request
  $raw=Invoke-FinanceBoundedChild $Start $plan.sql
  $snapshot=ConvertFrom-Json -InputObject $raw
  if($InventoryMode -or $PrerequisitesMode -or $CapabilitiesMode){
   $captureKind=if($CapabilitiesMode){'finance-pooler-capabilities'}elseif($PrerequisitesMode){'public-finance-prerequisites'}else{'public-finance-inventory'}
   $envelope=[ordered]@{schemaVersion=1;kind=$captureKind;target=$plan.target;
    clientsExitedCleanly=$true;querySha256=$plan.querySha256;snapshot=$snapshot}
  }else{
   $envelope=[ordered]@{schemaVersion=1;kind='public-finance-baseline';target=$plan.target;
    clientsExitedCleanly=$true;inventory=$plan.inventory;inventoryQuerySha256=$plan.inventoryQuerySha256;
    baselineQuerySha256=$plan.querySha256;snapshot=$snapshot;
    sourceInventoryText=$InventoryText;sourceInventorySha256=$InventoryHash}
  }
  $text=ConvertTo-Json -InputObject $envelope -Depth 100 -Compress
  # Save before semantic verification so mismatched server evidence is preserved.
  $receiptHash=Save-FinanceCaptureFile $reservation $text
  $verifyMode=if($CapabilitiesMode){'verify-capabilities'}elseif($PrerequisitesMode){'verify-prerequisites'}elseif($InventoryMode){'verify-inventory'}else{'verify-baseline'}
  $verification=Invoke-FinanceBaselineBridge $Node @{mode=$verifyMode;captureText=$text;captureHash=$receiptHash}
  $reviewBlockers=@()
  if($PrerequisitesMode){$reviewBlockers=@($verification.blockers)}
  return [ordered]@{projectRef='eomubndonbetszdbhsrj';kind=$kind;captureSaved=$true;captureSha256=$receiptHash;
   evidencePath=$reservation.Path;captureVerifiedOffline=$true;clientsExitedCleanly=$true;
   serverClosureIndependentlyVerified=$false;fullManagedSchemaVerified=$false;
   rollbackVerified=$false;readyForWriteRehearsal=$false;databaseWrites=$false;
   dependencyReviewRequired=$PrerequisitesMode;prerequisiteBlockers=@($reviewBlockers)}
 }finally{
  $Start.EnvironmentVariables.Remove('PGPASSWORD')
  if($reservation){$reservation.Stream.Dispose()}
 }
}
