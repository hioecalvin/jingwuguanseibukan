param([Parameter(Mandatory)][string]$EvidenceDirectory,[Parameter(Mandatory)][string]$CaptureSha256)
# Offline only. Same trusted capture receipt must supply the expected hash.
$ErrorActionPreference='Stop';$reservation=$null;$failureCode='PRIVATE_INPUT'
try{
 . (Join-Path $PSScriptRoot 'finance-private-capture.ps1')
 . (Join-Path $PSScriptRoot 'finance-identity-binding.ps1')
 $root=Assert-FinanceCaptureDirectory $EvidenceDirectory
 $file=Join-Path $root 'identity-capture.json';Assert-FinanceCaptureFile $file
 $bytes=[IO.File]::ReadAllBytes($file)
 $failureCode='CAPTURE_HASH'
 if($bytes.Length -gt 65536 -or $CaptureSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Invalid capture'}
 # Hash the actual in-memory bytes, not a separately reopened file.
 $hasher=[Security.Cryptography.SHA256]::Create()
 try{$memoryHash=([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}
 finally{$hasher.Dispose()}
 if($memoryHash -cne $CaptureSha256){throw 'Capture changed'}
 $failureCode='CAPTURE_PARSE'
 $e=ConvertFrom-Json -InputObject ([Text.UTF8Encoding]::new($false,$true).GetString($bytes))
 $failureCode='ENVELOPE'
 if($e.schemaVersion -ne 1 -or $e.kind -cne 'identity' -or $e.projectRef -cne 'eomubndonbetszdbhsrj' -or
   $e.transport -cne 'session-pooler' -or $e.host -cne 'aws-0-ap-southeast-2.pooler.supabase.com' -or
   $e.port -ne 5432 -or $e.connectionUser -cne 'postgres.eomubndonbetszdbhsrj' -or $e.sslmode -cne 'verify-full' -or
   $e.querySha256 -cne 'aaf3484bebe54f1dce348507b978261bd3eb0b509756032f615b6e5fe897afb2'){throw 'Capture binding mismatch'}
 $failureCode='IDENTITIES'
 $binding=Get-FinanceIdentityBinding $e.snapshot
 $binding['sourceCaptureSha256']=$CaptureSha256
 $binding['verifiedAt']=[DateTimeOffset]::UtcNow.ToString('o')
 $failureCode='RESERVATION'
 $reservation=New-FinanceCaptureFile $root -Kind bindings
 $failureCode='SAVE'
 $bindingHash=Save-FinanceCaptureFile $reservation (ConvertTo-Json -InputObject $binding -Depth 10 -Compress)
 [ordered]@{bindingSaved=$true;bindingSha256=$bindingHash;bindingPath=$reservation.Path;accountCount=3;remoteContact=$false}|ConvertTo-Json -Compress
}catch{[Console]::Error.Write(('IDENTITY_BINDING_SAVE_FAILED [{0}]: preserve evidence; no retry or raw details.' -f $failureCode));exit 1}
finally{if($reservation){$reservation.Stream.Dispose()}}
