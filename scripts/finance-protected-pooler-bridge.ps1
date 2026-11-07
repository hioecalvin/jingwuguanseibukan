# Internal stdin/receipt bridge. No secret or raw client output on stdout.
# Not a user-authorized live CLI: the reviewed fixed-journal orchestrator owns it.
$ErrorActionPreference='Stop'
$reservation=$null
try{
 . (Join-Path $PSScriptRoot 'finance-protected-pooler-process.ps1')
 $buffer=New-Object char[] 4096;$builder=[Text.StringBuilder]::new()
 while(($count=[Console]::In.Read($buffer,0,$buffer.Length)) -gt 0){
  if($builder.Length+$count -gt 3145728){throw 'Oversized request'}
  [void]$builder.Append($buffer,0,$count)
 }
 $r=ConvertFrom-Json $builder.ToString()
 $keys='bundleSha256,clientPath,clientSha256,credentialPath,credentialSha256,directory,inputBase64,inputSha256,nonce,phase,rootCertPath,rootCertSha256'
 if((@($r.PSObject.Properties.Name|Sort-Object)-join ',') -cne $keys -or
    $r.phase -cnotin @('mutation','closure','baseline','ledger','actors') -or $r.nonce -cnotmatch '^[a-f0-9]{32}$' -or
    $r.bundleSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Invalid bridge request'}
 $directory=Assert-FinanceCaptureDirectory $r.directory
 $claimPath=Join-Path $directory 'finance-059-060-attempt.json'
 Assert-FinanceCaptureFile $claimPath
 if((Get-Item -LiteralPath $claimPath).Length -gt 8192){throw 'Invalid claim size'}
 $claim=ConvertFrom-Json ([IO.File]::ReadAllText($claimPath))
 if($claim.schemaVersion -ne 2 -or $claim.closureKind -cne 'pooler-transaction' -or
    $claim.mode -cne 'staging-only' -or $claim.projectRef -cne 'eomubndonbetszdbhsrj' -or
    $claim.state -cne 'claimed-outcome-unknown' -or $claim.nonce -cne $r.nonce -or
    $claim.bundleSha256 -cne $r.bundleSha256 -or ($claim.migrations -join ',') -cne '059,060' -or
    $claim.automaticRetryAllowed -ne $false -or
    (Test-Path -LiteralPath (Join-Path $directory 'finance-059-060-outcome.json'))){throw 'Blocked or mismatched journal'}
 if($r.phase -eq 'mutation' -and ($r.inputSha256 -cne $claim.bundleSha256 -or
    (Test-Path -LiteralPath (Join-Path $directory 'pooler-baseline-capture.json')) -or
    (Test-Path -LiteralPath (Join-Path $directory 'pooler-closure-capture.json')) -or
    (Test-Path -LiteralPath (Join-Path $directory 'pooler-ledger-capture.json')) -or
    (Test-Path -LiteralPath (Join-Path $directory 'pooler-actors-capture.json')))){throw 'Mutation ordering/hash mismatch'}
 if($r.phase -eq 'ledger' -and $r.inputSha256 -cne '0d043880139e262695f90551031ba179c2fd3a7d5870fc98e5943328f8653635'){throw 'Unreviewed ledger query'}
 if($r.phase -eq 'actors' -and $r.inputSha256 -cne 'cb31b392ecdb8d293803ec19e659efe405fa0d94bc00cf0cfa79d3aec662182d'){throw 'Unreviewed actor query'}
 $bytes=[Convert]::FromBase64String($r.inputBase64)
 if($bytes.Length -gt 2097152){throw 'Oversized SQL'}
 # Reserve the exact phase before credential loading or client startup. Empty or
 # partial files are retained and permanently block repeating this phase.
 $capturePath=Join-Path $directory ('pooler-'+$r.phase+'-capture.json')
 $stream=[IO.File]::Open($capturePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 $reservation=[pscustomobject]@{Directory=$directory;Path=$capturePath;Stream=$stream}
 Assert-FinanceCaptureFile $capturePath
 $purpose=if($r.phase -eq 'mutation'){'rollback-rehearsal'}else{'read-only-evidence'}
 $result=Invoke-FinanceProtectedPoolerProcess -Purpose $purpose -CredentialPath $r.credentialPath -CredentialSha256 $r.credentialSha256 -ClientPath $r.clientPath -ClientSha256 $r.clientSha256 -RootCertificatePath $r.rootCertPath -RootCertificateSha256 $r.rootCertSha256 -InputBytes $bytes -InputSha256 $r.inputSha256
 $envelope=[ordered]@{schemaVersion=1;nonce=$r.nonce;phase=$r.phase;inputSha256=$r.inputSha256;result=$result}
 $captureHash=Save-FinanceCaptureFile $reservation (ConvertTo-Json -InputObject $envelope -Depth 20 -Compress)
 [Console]::Out.Write((ConvertTo-Json -Compress -InputObject @{captureSha256=$captureHash;phase=$r.phase}))
}catch{
 [Console]::Error.Write('FINANCE_POOLER_BRIDGE_REJECTED');exit 1
}finally{if($reservation){$reservation.Stream.Dispose()}}
